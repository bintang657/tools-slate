import React, { useState } from 'react'
import { Headphones, Link2, Music2, Play, ShieldCheck, X } from 'lucide-react'

export function MusicSearchModal({ onClose, activeSession, onStartAudio }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const startAudio = event => {
    event.preventDefault()
    let parsed
    try { parsed = new URL(url.trim()) } catch { setError('Masukkan URL audio langsung yang valid.'); return }
    if (parsed.protocol !== 'https:') {
      setError('URL audio harus menggunakan HTTPS.')
      return
    }
    const name = title.trim() || parsed.pathname.split('/').pop() || 'Audio dari URL'
    onStartAudio({
      id: `direct-${parsed.href}`,
      src: parsed.href,
      title: name,
      artist: 'Audio dari URL',
      provider: 'URL langsung',
    })
    setError('')
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="tool-modal music-search-modal" role="dialog" aria-modal="true" aria-labelledby="music-search-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Music2 size={20}/></span><div><h2 id="music-search-title">Music Listener</h2><p>Putar lagu penuh dari URL audio</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body music-search-body">
        <form className="music-provider-form" onSubmit={startAudio}>
          <label>Judul lagu (opsional)<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Nama lagu — Artis" autoComplete="off"/></label>
          <label><span className="music-url-label"><Link2 size={14}/> URL audio langsung</span><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/song.mp3" autoComplete="url" required/></label>
          <p className="music-search-note"><ShieldCheck size={15}/> Gunakan URL HTTPS yang langsung mengarah ke file atau stream audio penuh (MP3, M4A, OGG, WAV) dan yang boleh Anda putar. URL halaman YouTube/Spotify tidak dapat dipakai di sini.</p>
          <button className="run-btn" type="submit" disabled={!url.trim()}><Play size={16}/> Putar lagu penuh</button>
        </form>
        {error && <div className="notice">{error}</div>}
        {activeSession?.kind === 'audio' && <div className="music-session-note"><Headphones size={17}/><span><b>{activeSession.title}</b><small>Lagu diputar lewat player web di pojok kiri atas. Tutup jendela ini dengan X—audio tetap berjalan. Gunakan kontrol player web untuk jeda, lanjut, dan volume.</small></span></div>}
        <p className="music-background-note">Audio biasanya tetap berjalan saat Chrome berada di latar belakang selama tab tidak ditutup paksa dan sistem tidak menghentikan Chrome.</p>
      </div>
    </section>
  </div>
}
