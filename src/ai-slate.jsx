import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bot, Code2, Copy, GraduationCap, Menu,
  MessageSquarePlus, PenLine, Send, ShieldCheck, Sparkles, Trash2, X, Square
} from 'lucide-react'

const STORAGE_KEY = 'tools-slate-ai-chats-v1'
const MODES = [
  { id: 'general', name: 'Asisten', icon: Sparkles, prompt: 'Tanya apa saja…' },
  { id: 'coding', name: 'Coding', icon: Code2, prompt: 'Ceritakan masalah coding atau tempel error…' },
  { id: 'writing', name: 'Menulis', icon: PenLine, prompt: 'Apa yang ingin kamu tulis atau perbaiki?' },
  { id: 'study', name: 'Belajar', icon: GraduationCap, prompt: 'Konsep apa yang ingin kamu pelajari?' },
  { id: 'summarize', name: 'Ringkas', icon: PenLine, prompt: 'Tempel teks atau materi yang ingin diringkas…' },
  { id: 'tools', name: 'Panduan Tools', icon: Bot, prompt: 'Alat Tools Slate mana yang ingin kamu gunakan?' },
]
const SUGGESTIONS = [
  'Jelaskan konsep ini dengan contoh sederhana',
  'Bantu debug error dan susun langkah perbaikannya',
  'Buat rencana belajar 7 hari untuk topik pilihan saya',
]
const newChat = mode => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: 'Chat baru', mode, messages: [], updatedAt: Date.now() })
function loadChats() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored.filter(chat => chat && typeof chat.id === 'string' && Array.isArray(chat.messages)).slice(0, 12) : []
  } catch { return [] }
}

function MarkdownAnswer({ text }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener">{children}</a>,
    code: ({ children, className, ...props }) => <code className={className || ''} {...props}>{children}</code>,
  }}>{text}</ReactMarkdown>
}

export function AISlateModal({ onClose }) {
  const [chats, setChats] = useState(loadChats)
  const [activeId, setActiveId] = useState(() => loadChats()[0]?.id || null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const textareaRef = useRef(null)
  const endRef = useRef(null)
  const requestRef = useRef(null)
  const activeChat = useMemo(() => chats.find(chat => chat.id === activeId) || null, [chats, activeId])
  const mode = MODES.find(item => item.id === activeChat?.mode) || MODES[0]

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 12).map(chat => ({ ...chat, messages: chat.messages.slice(-20) })))) } catch { /* Storage may be full or disabled. */ }
  }, [chats])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [activeChat?.messages, busy])
  useEffect(() => () => requestRef.current?.abort(), [])

  const createChat = () => {
    const chat = newChat(mode.id)
    setChats(current => [chat, ...current].slice(0, 12))
    setActiveId(chat.id); setDraft(''); setError(''); setSidebarOpen(false)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
  const chooseMode = nextMode => {
    if (!activeChat) {
      const chat = newChat(nextMode)
      setChats(current => [chat, ...current].slice(0, 12)); setActiveId(chat.id)
      return
    }
    setChats(current => current.map(chat => chat.id === activeChat.id ? { ...chat, mode: nextMode } : chat))
  }
  const removeChat = id => {
    const remaining = chats.filter(chat => chat.id !== id)
    setChats(remaining)
    if (id === activeId) setActiveId(remaining[0]?.id || null)
  }
  const updateChat = (id, updater) => setChats(current => current.map(chat => chat.id === id ? updater(chat) : chat))

  const send = async value => {
    const text = (value ?? draft).trim()
    if (!text || busy) return
    let chat = activeChat
    if (!chat) {
      chat = newChat(mode.id)
      setChats(current => [chat, ...current].slice(0, 12)); setActiveId(chat.id)
    }
    const chatId = chat.id
    const userMessage = { id: `${Date.now()}-u`, role: 'user', content: text }
    const history = [...chat.messages, userMessage].slice(-18)
    const title = chat.messages.length ? chat.title : text.replace(/\s+/g, ' ').slice(0, 42) || 'Chat baru'
    updateChat(chatId, current => ({ ...current, title, mode: chat.mode, updatedAt: Date.now(), messages: [...current.messages, userMessage] }))
    setDraft(''); setError(''); setBusy(true)
    const controller = new AbortController(); requestRef.current = controller
    try {
      const response = await fetch('/api/ai-slate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: chat.mode, messages: history.map(message => ({ role: message.role, content: message.content })) }),
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Slate merespons (${response.status}).`)
      if (!payload.answer || typeof payload.answer !== 'string') throw new Error('Jawaban AI tidak valid.')
      updateChat(chatId, current => ({ ...current, updatedAt: Date.now(), messages: [...current.messages, { id: `${Date.now()}-a`, role: 'assistant', content: payload.answer }].slice(-20) }))
    } catch (error) {
      if (error.name !== 'AbortError') setError(error.message || 'Gagal menghubungi Slate.')
    } finally { setBusy(false); requestRef.current = null }
  }
  const copyAnswer = async (id, text) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) } catch { setError('Clipboard tidak tersedia di browser ini.') }
  }
  const submit = event => { event.preventDefault(); send() }
  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() }
  }

  return <div className="ai-slate-backdrop">
    <section id="slate-chat-panel" className="ai-slate-window" role="dialog" aria-modal="false" aria-labelledby="slate-widget-title">
      <aside className={`ai-slate-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ai-sidebar-top"><div className="ai-brand-mark"><Bot size={19}/></div><div><b>Slate</b><small>PERSONAL WORKSPACE</small></div><button className="ai-icon-button ai-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Tutup riwayat"><X size={17}/></button></div>
        <button className="ai-new-chat" onClick={createChat}><MessageSquarePlus size={16}/> Chat baru</button>
        <div className="ai-chat-history-label">RIWAYAT CHAT <span>{chats.length}/12</span></div>
        <div className="ai-chat-history">{chats.length ? chats.map(chat => <div className={`ai-history-row ${chat.id === activeId ? 'active' : ''}`} key={chat.id}><button onClick={() => {setActiveId(chat.id);setError('');setSidebarOpen(false)}}><span>{MODES.find(item => item.id === chat.mode)?.name || 'Asisten'}</span><b>{chat.title}</b></button><button className="ai-delete-chat" onClick={() => removeChat(chat.id)} aria-label={`Hapus ${chat.title}`}><Trash2 size={14}/></button></div>) : <p className="ai-history-empty">Chat yang kamu simpan akan muncul di sini.</p>}</div>
        <div className="ai-sidebar-foot"><ShieldCheck size={14}/><span>Riwayat tersimpan lokal di perangkat ini.</span></div>
      </aside>
      {sidebarOpen && <button className="ai-sidebar-scrim" aria-label="Tutup riwayat" onClick={() => setSidebarOpen(false)}/>}
      <main className="ai-slate-main">
        <header className="ai-slate-header"><div className="ai-header-left"><button className="ai-icon-button ai-history-toggle" onClick={() => setSidebarOpen(value => !value)} aria-label={sidebarOpen ? 'Tutup riwayat chat' : 'Buka riwayat chat'} aria-expanded={sidebarOpen}><Menu size={17}/></button><span className="ai-header-icon"><Bot size={19}/></span><div><b id="slate-widget-title">Slate</b></div></div><div className="ai-header-actions"><button className="ai-icon-button" onClick={createChat} aria-label="Chat baru"><MessageSquarePlus size={17}/></button><button className="ai-icon-button" onClick={onClose} aria-label="Tutup Slate"><X size={18}/></button></div></header>
        <div className="ai-mode-bar" role="tablist" aria-label="Mode AI">{MODES.map(item => {const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={mode.id === item.id} className={mode.id === item.id ? 'active' : ''} onClick={() => chooseMode(item.id)}><Icon size={14}/>{item.name}</button>})}</div>
        <div className="ai-message-scroll">
          {!activeChat?.messages.length ? <div className="ai-welcome"><div className="ai-welcome-orb"><Sparkles size={25}/></div><span className="ai-kicker">SLATE</span><h2>Ada yang bisa kubantu?</h2><p>Tanya, rancang, debug, atau pelajari sesuatu. Pilih mode agar jawaban lebih sesuai.</p><div className="ai-suggestion-grid">{SUGGESTIONS.map((suggestion, index) => <button key={suggestion} onClick={() => send(suggestion)}><span>0{index + 1}</span>{suggestion}</button>)}</div></div> : activeChat.messages.map(message => <article className={`ai-message ${message.role}`} key={message.id}><div className="ai-message-avatar">{message.role === 'assistant' ? <Bot size={16}/> : 'K'}</div><div className="ai-message-body"><div className="ai-message-label">{message.role === 'assistant' ? 'SLATE' : 'KAMU'}</div><div className="ai-message-content">{message.role === 'assistant' ? <MarkdownAnswer text={message.content}/> : <p>{message.content}</p>}</div>{message.role === 'assistant' && <button className="ai-copy-answer" onClick={() => copyAnswer(message.id, message.content)}><Copy size={13}/>{copiedId === message.id ? 'Tersalin' : 'Salin jawaban'}</button>}</div></article>)}
          {busy && <div className="ai-message assistant"><div className="ai-message-avatar"><Bot size={16}/></div><div className="ai-message-body"><div className="ai-message-label">SLATE</div><div className="ai-typing"><i/><i/><i/><span>sedang berpikir</span></div></div></div>}
          <div ref={endRef}/>
        </div>
        <div className="ai-composer-wrap"><div className="ai-transient-error" aria-live="polite">{error && <span role="alert">{error}</span>}</div><form className="ai-composer" onSubmit={submit}><textarea ref={textareaRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={mode.prompt} rows={1} maxLength={8000} aria-label="Pesan untuk Slate" disabled={busy}/><div className="ai-composer-footer"><div><span>Enter untuk kirim · Shift+Enter baris baru</span><span>{draft.length}/8000</span></div>{busy ? <button className="ai-send-button stop" type="button" onClick={() => requestRef.current?.abort()} aria-label="Hentikan jawaban"><Square size={15} fill="currentColor"/></button> : <button className="ai-send-button" type="submit" disabled={!draft.trim()} aria-label="Kirim pesan"><Send size={16}/></button>}</div></form><div className="ai-privacy-note">Hindari mengirim informasi sensitif. Pesan dikirim ke layanan AI saat kamu mengirimnya.</div></div>
      </main>
    </section>
  </div>
}
