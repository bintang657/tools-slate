import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeHistory, searchChats } from './ai-history.js'
import {
  Bot, Code2, Copy, Download, FileText, GraduationCap, Menu, Paperclip,
  MessageSquarePlus, PenLine, RotateCcw, Send, Sparkles, Trash2, X, Square, Search
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
const FOLLOW_UPS = {
  general: ['Jelaskan lebih sederhana', 'Beri contoh konkret', 'Apa langkah berikutnya?'],
  coding: ['Jelaskan solusi ini', 'Buat test untuk kode ini', 'Periksa risiko keamanannya'],
  writing: ['Buat lebih singkat', 'Ubah nada tulisannya', 'Buat versi alternatif'],
  study: ['Beri contoh tambahan', 'Uji pemahaman saya', 'Jelaskan bagian tersulit'],
  summarize: ['Ringkas menjadi 3 poin', 'Apa tindak lanjutnya?', 'Buat versi lebih singkat'],
  tools: ['Tunjukkan langkah penggunaan', 'Ada tool alternatif?', 'Jelaskan opsi terkait'],
}
const newChat = mode => ({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: 'Chat baru', mode, messages: [], updatedAt: Date.now() })
const MAX_IMAGE_BYTES = 900_000
const MAX_FILE_TEXT = 14_000

async function imageAttachment(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Pilih gambar JPG, PNG, atau WebP.')
  if (file.size > 15_000_000) throw new Error('Gambar asli maksimal 15 MB sebelum dikompres.')
  if (!globalThis.createImageBitmap) throw new Error('Browser ini belum mendukung pemrosesan gambar. Coba browser terbaru.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) { bitmap.close(); throw new Error('Tidak dapat menyiapkan gambar di browser ini.') }
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  let quality = .78; let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  while (blob && blob.size > MAX_IMAGE_BYTES && quality > .4) { quality -= .1; blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality)) }
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar masih terlalu besar setelah dikompres.')
  const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Gagal membaca gambar.')); reader.readAsDataURL(blob) })
  return { name: file.name, mimeType: 'image/jpeg', inlineData: data }
}

async function textAttachment(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (file.size > 5_000_000) throw new Error('File maksimal 5 MB.')
  let text = ''
  if (file.type === 'application/pdf' || extension === 'pdf') {
    const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ])
    GlobalWorkerOptions.workerSrc = workerModule.default
    const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages = []
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 20); pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map(item => item.str || '').join(' '))
      if (pages.join('\n').length >= MAX_FILE_TEXT) break
    }
    text = pages.join('\n').slice(0, MAX_FILE_TEXT)
    if (!text.trim()) throw new Error('PDF tidak berisi teks yang dapat dibaca. Untuk PDF scan, gunakan OCR Gambar di Tools Slate.')
    if (pdf.numPages > 20) text += '\n[Dokumen dipotong: maksimal 20 halaman pertama.]'
  } else if (extension === 'docx') {
    const { default: JSZip } = await import('jszip')
    const archive = await JSZip.loadAsync(await file.arrayBuffer())
    const documentXml = await archive.file('word/document.xml')?.async('text')
    if (!documentXml) throw new Error('Dokumen Word tidak memiliki isi yang dapat dibaca.')
    const xml = new DOMParser().parseFromString(documentXml, 'application/xml')
    if (xml.querySelector('parsererror')) throw new Error('Struktur dokumen Word tidak valid.')
    text = Array.from(xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't')).map(node => node.textContent || '').join(' ').slice(0, MAX_FILE_TEXT)
    if (!text.trim()) throw new Error('Dokumen Word tidak berisi teks yang dapat dibaca.')
  } else if (['txt', 'md', 'csv', 'json'].includes(extension) || file.type.startsWith('text/')) {
    text = (await file.text()).slice(0, MAX_FILE_TEXT)
    if (!text.trim()) throw new Error('File teks kosong.')
  } else throw new Error('Format didukung: gambar JPG/PNG/WebP, PDF, Word DOCX, TXT, Markdown, CSV, atau JSON.')
  return { name: file.name, mimeType: file.type || 'text/plain', text }
}
function loadChats() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored.filter(chat => chat && typeof chat.id === 'string' && Array.isArray(chat.messages)).slice(0, 12) : []
  } catch { return [] }
}
function persistChats(chats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 12).map(chat => ({ ...chat, messages: chat.messages.slice(-20).map(message => ({ ...message, attachments: message.attachments?.map(({ name, mimeType }) => ({ name, mimeType })) })) })))) } catch { /* Storage may be full or disabled. */ }
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
  const [historyQuery, setHistoryQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingContext, setEditingContext] = useState('')
  const [attachments, setAttachments] = useState([])
  const [readingFiles, setReadingFiles] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const endRef = useRef(null)
  const requestRef = useRef(null)
  const pendingRequestRef = useRef(null)
  const chatsRef = useRef(chats)
  chatsRef.current = chats
  const visibleChats = useMemo(() => searchChats(chats, historyQuery), [chats, historyQuery])
  const activeChat = useMemo(() => chats.find(chat => chat.id === activeId) || null, [chats, activeId])
  const mode = MODES.find(item => item.id === activeChat?.mode) || MODES[0]

  useEffect(() => {
    const timer = setTimeout(() => persistChats(chats), 250)
    return () => clearTimeout(timer)
  }, [chats])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: busy ? 'auto' : 'smooth', block: 'end' }) }, [activeChat?.messages, busy])
  useEffect(() => () => { requestRef.current?.abort(); persistChats(chatsRef.current) }, [])

  const createChat = () => {
    const chat = newChat(mode.id)
    setChats(current => [chat, ...current].slice(0, 12))
    setActiveId(chat.id); setDraft(''); setError(''); setEditingId(null); setEditingContext(''); setAttachments([]); setSidebarOpen(false)
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
    if (id === activeId) { setActiveId(remaining[0]?.id || null); setDraft(''); setEditingId(null); setEditingContext(''); setAttachments([]) }
  }
  const updateChat = (id, updater) => setChats(current => current.map(chat => chat.id === id ? updater(chat) : chat))
  const addFiles = async fileList => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setError('')
    const remaining = Math.max(0, 3 - attachments.length)
    if (!remaining) { setError('Maksimal 3 lampiran per pesan.'); return }
    const prepared = []
    setReadingFiles(true)
    try {
      for (const file of files.slice(0, remaining)) {
        if (file.type.startsWith('image/') && [...attachments, ...prepared].filter(item => item.inlineData).length >= 2) throw new Error('Maksimal 2 gambar dalam lampiran pesan ini.')
        prepared.push(file.type.startsWith('image/') ? await imageAttachment(file) : await textAttachment(file))
      }
      setAttachments(current => [...current, ...prepared].slice(0, 3))
      if (files.length > remaining) setError('Maksimal 3 lampiran per pesan; file tambahan tidak disertakan.')
    } catch (error) { setError(error.message || 'Gagal membaca lampiran.') }
    finally { setReadingFiles(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const requestAnswer = async request => {
    const { chatId, mode: modeId, history, assistantId } = request
    const normalizedHistory = normalizeHistory(history)
    const answerId = assistantId || `${Date.now()}-a`
    pendingRequestRef.current = { chatId, mode: modeId, history: normalizedHistory, assistantId: answerId }
    updateChat(chatId, current => {
      const existingIndex = current.messages.findIndex(message => message.id === answerId)
      const placeholder = { id: answerId, role: 'assistant', content: '' }
      const messages = existingIndex < 0
        ? [...current.messages, placeholder]
        : current.messages.map(message => message.id === answerId ? placeholder : message)
      return { ...current, updatedAt: Date.now(), messages: messages.slice(-20) }
    })
    setDraft(''); setError(''); setBusy(true)
    const controller = new AbortController(); requestRef.current = controller
    let answer = ''
    const updateAnswer = text => {
      answer += text
      updateChat(chatId, current => ({ ...current, updatedAt: Date.now(), messages: current.messages.map(message => message.id === answerId ? { ...message, content: answer } : message) }))
    }
    try {
      let imagesLeft = 2
      const imageAttachments = new Map()
      for (let index = normalizedHistory.length - 1; index >= 0 && imagesLeft > 0; index--) {
        const images = (normalizedHistory[index].attachments || []).filter(file => file.inlineData).slice(0, imagesLeft)
        if (images.length) { imageAttachments.set(index, images); imagesLeft -= images.length }
      }
      const messages = normalizedHistory.map((message, index) => {
        const included = imageAttachments.get(index) || []
        const missingImages = (message.attachments || []).filter(file => file.mimeType?.startsWith('image/') && !included.includes(file))
        const note = missingImages.length ? '\n[Catatan: sebagian gambar dari pesan ini tidak tersedia dalam permintaan saat ini. Jangan menganggap gambar tersebut dapat dilihat; minta pengguna mengunggahnya kembali jika diperlukan.]' : ''
        return { role: message.role, content: message.content.slice(0, 24000 - note.length) + note, ...(included.length ? { attachments: included.map(file => ({ mimeType: file.mimeType, data: file.inlineData })) } : {}) }
      })
      const response = await fetch('/api/ai-slate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeId, messages }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const wait = Number(payload.retryAfterSeconds)
        const waitHint = Number.isFinite(wait) && wait > 0 ? ` Coba lagi dalam sekitar ${wait} detik.` : ''
        throw new Error((payload.error || `Slate merespons (${response.status}).`) + waitHint)
      }
      if (response.headers.get('content-type')?.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''; let eventName = 'message'
        const consumeLine = line => {
          if (!line) { eventName = 'message'; return }
          if (line.startsWith('event:')) { eventName = line.slice(6).trim(); return }
          if (!line.startsWith('data:')) return
          const raw = line.slice(5).trim()
          if (!raw) return
          let payload
          try { payload = JSON.parse(raw) } catch { return }
          if (eventName === 'token') updateAnswer(payload.text || '')
          if (eventName === 'error') throw new Error(payload.error || 'Jawaban terputus. Coba lagi.')
        }
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ''
          for (const line of lines) consumeLine(line)
        }
        buffer += decoder.decode()
        if (buffer) consumeLine(buffer)
        reader.releaseLock()
      } else {
        const payload = await response.json().catch(() => ({}))
        if (typeof payload.answer === 'string') answer = payload.answer
        if (!answer) throw new Error('Jawaban AI tidak valid.')
        updateChat(chatId, current => ({ ...current, messages: current.messages.map(message => message.id === answerId ? { ...message, content: answer } : message) }))
      }
      if (!answer.trim()) throw new Error('Slate tidak mengembalikan jawaban. Coba lagi.')
      pendingRequestRef.current = null
    } catch (error) {
      if (!answer.trim()) updateChat(chatId, current => ({ ...current, messages: current.messages.filter(message => message.id !== answerId) }))
      setError(error.name === 'AbortError' ? 'Jawaban dihentikan. Kamu bisa coba lagi.' : error.message || 'Gagal menghubungi Slate.')
    } finally { setBusy(false); requestRef.current = null }
  }

  const send = value => {
    const text = (value ?? draft).trim()
    if ((!text && !attachments.length) || busy) return
    let chat = activeChat
    if (!chat) {
      chat = newChat(mode.id)
      setChats(current => [chat, ...current].slice(0, 12)); setActiveId(chat.id)
    }
    const chatId = chat.id
    const priorMessages = chat.messages.filter(message => !(message.role === 'assistant' && !message.content?.trim()))
    const editIndex = editingId ? priorMessages.findIndex(message => message.id === editingId && message.role === 'user') : -1
    const selectedAttachments = [...attachments]
    let fileContext = ''; let contextLeft = MAX_FILE_TEXT
    if (editingId && editIndex >= 0 && !selectedAttachments.length) fileContext = editingContext
    else for (const file of selectedAttachments) {
      if (file.text && contextLeft > 0) {
        const textPart = file.text.slice(0, contextLeft)
        fileContext += `\n\n[Isi lampiran ${file.name}]\n${textPart}`
        contextLeft -= textPart.length
      } else if (file.inlineData) fileContext += `\n\n[Gambar terlampir: ${file.name}]`
    }
    const displayContent = text || 'Tolong analisis lampiran yang saya unggah.'
    const content = `${displayContent}${fileContext}`
    const userMessage = { id: editIndex >= 0 ? editingId : `${Date.now()}-u`, role: 'user', content, displayContent, attachments: selectedAttachments.map(file => ({ ...file })) }
    const history = (editIndex >= 0 ? [...priorMessages.slice(0, editIndex), userMessage] : [...priorMessages, userMessage]).slice(-18)
    const title = chat.messages.some(message => message.role === 'user') ? chat.title : (text || selectedAttachments[0]?.name || 'Lampiran').replace(/\s+/g, ' ').slice(0, 42)
    updateChat(chatId, current => ({ ...current, title, mode: chat.mode, updatedAt: Date.now(), messages: history }))
    setEditingId(null); setEditingContext(''); setAttachments([])
    requestAnswer({ chatId, mode: chat.mode, history })
  }

  const retryLast = () => { const pending = pendingRequestRef.current; if (pending && !busy) requestAnswer(pending) }
  const regenerateAnswer = messageIndex => {
    if (!activeChat || busy) return
    const message = activeChat.messages[messageIndex]
    if (!message || message.role !== 'assistant') return
    const history = activeChat.messages.slice(0, messageIndex).slice(-18)
    updateChat(activeChat.id, current => ({ ...current, messages: current.messages.slice(0, messageIndex) }))
    requestAnswer({ chatId: activeChat.id, mode: activeChat.mode, history, assistantId: message.id })
  }
  const editUserMessage = message => {
    const editableText = message.displayContent ?? message.content
    const files = message.attachments || []
    const imageUnavailable = files.some(file => file.mimeType?.startsWith('image/') && !file.inlineData)
    let context = message.content.slice(editableText.length)
    if (imageUnavailable) context = context.replace(/\n*\[Gambar terlampir: [^\]]+\]/g, '')
    setEditingId(message.id); setEditingContext(context); setDraft(editableText); setAttachments(files.filter(file => file.text || file.inlineData)); setError(imageUnavailable ? 'Gambar dari chat lama tidak disimpan. Lampirkan ulang jika ingin menganalisisnya.' : '')
    requestAnimationFrame(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(editableText.length, editableText.length) })
  }
  const exportChat = chat => {
    if (!chat) return
    const markdown = `# ${chat.title || 'Percakapan Slate'}\n\n_${new Date().toLocaleString('id-ID')} · Mode ${MODES.find(item => item.id === chat.mode)?.name || 'Asisten'}_\n\n${chat.messages.map(message => `## ${message.role === 'assistant' ? 'Slate' : 'Kamu'}\n\n${message.content}`).join('\n\n---\n\n')}\n`
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${(chat.title || 'slate-chat').replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 48)}.md`
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
  }
  const copyAnswer = async (id, text) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) } catch { setError('Clipboard tidak tersedia di browser ini.') }
  }
  const submit = event => { event.preventDefault(); send() }
  const handleKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() }
  }

  return <div className="ai-slate-backdrop">
    <section id="slate-chat-panel" className="ai-slate-window" role="dialog" aria-modal="false" aria-labelledby="slate-widget-title">
      <aside className={`ai-slate-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ai-sidebar-top"><div className="ai-brand-mark"><img className="ai-logo-image" src="/media/slate-logo.png" alt="" aria-hidden="true" onError={event => { event.currentTarget.style.visibility = 'hidden' }}/></div><div><b>Slate</b></div><button className="ai-icon-button ai-mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Tutup riwayat"><X size={17}/></button></div>
        <button className="ai-new-chat" onClick={createChat} disabled={busy || readingFiles}><MessageSquarePlus size={16}/> Chat baru</button>
        <label className="ai-history-search"><Search size={15}/><input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder="Cari riwayat..." aria-label="Cari riwayat chat"/></label>
        <div className="ai-chat-history-label">RIWAYAT CHAT <span>{chats.length}/12</span></div>
        <div className="ai-chat-history">{visibleChats.length ? visibleChats.map(chat => <div className={`ai-history-row ${chat.id === activeId ? 'active' : ''}`} key={chat.id}><button disabled={busy || readingFiles} onClick={() => {setActiveId(chat.id);setError('');setDraft('');setEditingId(null);setEditingContext('');setAttachments([]);setSidebarOpen(false)}}><span>{MODES.find(item => item.id === chat.mode)?.name || 'Asisten'}</span><b>{chat.title}</b></button><button className="ai-delete-chat" disabled={busy || readingFiles} onClick={() => removeChat(chat.id)} aria-label={`Hapus ${chat.title}`}><Trash2 size={14}/></button></div>) : <p className="ai-history-empty">{historyQuery.trim() ? 'Tidak ada chat yang cocok.' : 'Chat yang kamu simpan akan muncul di sini.'}</p>}</div>
        <div className="ai-sidebar-foot"><button className="ai-export-chat" onClick={() => exportChat(activeChat)} disabled={busy || !activeChat?.messages.length} aria-label="Ekspor chat sebagai Markdown" title="Ekspor chat sebagai Markdown"><Download size={15}/></button></div>
      </aside>
      {sidebarOpen && <button className="ai-sidebar-scrim" aria-label="Tutup riwayat" onClick={() => setSidebarOpen(false)}/>}
      <main className="ai-slate-main">
        <header className="ai-slate-header"><div className="ai-header-left"><button className="ai-icon-button ai-history-toggle" onClick={() => setSidebarOpen(value => !value)} aria-label={sidebarOpen ? 'Tutup riwayat chat' : 'Buka riwayat chat'} aria-expanded={sidebarOpen}><Menu size={17}/></button><span className="ai-header-icon"><img className="ai-logo-image" src="/media/slate-logo.png" alt="" aria-hidden="true" onError={event => { event.currentTarget.style.visibility = 'hidden' }}/></span><div><b id="slate-widget-title">Slate</b></div></div><div className="ai-header-actions"><button className="ai-icon-button" onClick={createChat} disabled={busy || readingFiles} aria-label="Chat baru"><MessageSquarePlus size={17}/></button><button className="ai-icon-button" onClick={onClose} aria-label="Tutup Slate"><X size={18}/></button></div></header>
        <div className="ai-mode-bar" role="tablist" aria-label="Mode AI">{MODES.map(item => {const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={mode.id === item.id} className={mode.id === item.id ? 'active' : ''} onClick={() => chooseMode(item.id)} disabled={busy || readingFiles}><Icon size={14}/>{item.name}</button>})}</div>
        <div className="ai-message-scroll">
          {!activeChat?.messages.length ? <div className="ai-welcome"><div className="ai-welcome-orb"><img className="ai-logo-image" src="/media/slate-logo.png" alt="" aria-hidden="true" onError={event => { event.currentTarget.style.visibility = 'hidden' }}/></div><span className="ai-kicker">SLATE</span><h2>Ada yang bisa kubantu?</h2><p>Tanya, rancang, debug, atau pelajari sesuatu. Pilih mode agar jawaban lebih sesuai.</p><div className="ai-suggestion-grid">{SUGGESTIONS.map((suggestion, index) => <button key={suggestion} onClick={() => send(suggestion)}><span>0{index + 1}</span>{suggestion}</button>)}</div></div> : activeChat.messages.map((message, index) => { if (busy && message.role === 'assistant' && !message.content?.trim()) return null; const latest = index === activeChat.messages.length - 1; return <article className={`ai-message ${message.role}`} key={message.id}><div className="ai-message-avatar">{message.role === 'assistant' ? <img className="ai-logo-image" src="/media/slate-logo.png" alt="" aria-hidden="true" onError={event => { event.currentTarget.style.visibility = 'hidden' }}/> : 'K'}</div><div className="ai-message-body"><div className="ai-message-label">{message.role === 'assistant' ? 'SLATE' : 'KAMU'}</div><div className="ai-message-content">{message.role === 'assistant' ? <MarkdownAnswer text={message.content}/> : <p>{message.displayContent ?? message.content}</p>}</div>{message.role === 'user' && message.attachments?.length > 0 && <div className="ai-message-attachments">{message.attachments.map((file, fileIndex) => <span key={`${file.name}-${fileIndex}`}><FileText size={13}/>{file.name}</span>)}</div>}<div className="ai-message-actions">{message.role === 'assistant' && message.content && <button className="ai-copy-answer" onClick={() => copyAnswer(message.id, message.content)}><Copy size={13}/>{copiedId === message.id ? 'Tersalin' : 'Salin jawaban'}</button>}{message.role === 'user' && !busy && <button className="ai-copy-answer" onClick={() => editUserMessage(message)}><PenLine size={13}/>Edit</button>}{message.role === 'assistant' && latest && !busy && message.content && <button className="ai-copy-answer" onClick={() => regenerateAnswer(index)}><RotateCcw size={13}/>Buat ulang</button>}</div>{message.role === 'assistant' && latest && !busy && message.content && <div className="ai-followups">{(FOLLOW_UPS[activeChat.mode] || FOLLOW_UPS.general).map(prompt => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div>}</div></article> })}
          {busy && !activeChat?.messages.some(message => message.id === pendingRequestRef.current?.assistantId && message.content?.trim()) && <div className="ai-message assistant"><div className="ai-message-avatar"><img className="ai-logo-image" src="/media/slate-logo.png" alt="" aria-hidden="true" onError={event => { event.currentTarget.style.visibility = 'hidden' }}/></div><div className="ai-message-body"><div className="ai-message-label">SLATE</div><div className="ai-typing"><i/><i/><i/><span>sedang berpikir</span></div></div></div>}
          <div ref={endRef}/>
        </div>
        <div className="ai-composer-wrap">{editingId && <div className="ai-editing-notice">Mengedit pesan <button type="button" onClick={() => { setEditingId(null); setEditingContext(''); setDraft(''); setAttachments([]) }}>Batal</button></div>}<div className="ai-transient-error" aria-live="polite">{error && <div role="alert"><span>{error}</span>{pendingRequestRef.current && <button type="button" onClick={retryLast} disabled={busy}><RotateCcw size={13}/> Coba lagi</button>}</div>}</div>{readingFiles && <div className="ai-reading-status">Membaca dan menyiapkan file secara lokal…</div>}{attachments.length > 0 && <div className="ai-attachment-preview">{attachments.map((file, index) => <span key={`${file.name}-${index}`}><FileText size={13}/>{file.name}<button type="button" onClick={() => setAttachments(current => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Hapus lampiran ${file.name}`}><X size={13}/></button></span>)}</div>}<form className="ai-composer" onSubmit={submit}><textarea ref={textareaRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={mode.prompt} rows={1} maxLength={8000} aria-label={editingId ? 'Edit pesan untuk Slate' : 'Pesan untuk Slate'} disabled={busy}/><div className="ai-composer-footer"><div className="ai-composer-controls"><button className="ai-attach-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={busy || readingFiles || attachments.length >= 3} aria-label="Lampirkan gambar atau dokumen" title="Lampirkan gambar atau dokumen"><Paperclip size={16}/></button><input ref={fileInputRef} className="ai-hidden-file-input" type="file" accept="image/jpeg,image/png,image/webp,.pdf,.docx,.txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={event => addFiles(event.target.files)}/></div>{busy ? <button className="ai-send-button stop" type="button" onClick={() => requestRef.current?.abort()} aria-label="Hentikan jawaban"><Square size={15} fill="currentColor"/></button> : <button className="ai-send-button" type="submit" disabled={readingFiles || (!draft.trim() && !attachments.length)} aria-label="Kirim pesan"><Send size={16}/></button>}</div></form></div>
      </main>
    </section>
  </div>
}
