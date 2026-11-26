import React, { useState } from 'react'
import { Headphones, Link2, Music2, Play, ShieldCheck, X } from 'lucide-react'

function parseMusicUrl(value) {
  const text = value.trim()
  const spotifyUri = text.match(/^spotify:track:([A-Za-z0-9]{22})$/)
  if (spotifyUri) return { provider: 'Spotify', mediaId: spotifyUri[1] }
  let url
  try { url = new URL(text) } catch { return null }
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '')
  if (host === 'open.spotify.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const index = parts.indexOf('track')
    const mediaId = index >= 0 ? parts[index + 1] : ''
    return /^[A-Za-z0-9]{22}$/.test(mediaId || '') ? { provider: 'Spotify', mediaId } : null
  }
  if (host === 'youtu.be') {
    const mediaId = url.pathname.split('/').filter(Boolean)[0] || ''
    return /^[\w-]{11}$/.test(mediaId) ? { provider: 'YouTube', mediaId } : null
  }
  if (['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
    const parts = url.pathname.split('/').filter(Boolean)
    const mediaId = url.searchParams.get('v') || parts.find((part, index) => ['embed', 'shorts', 'live'].includes(parts[index - 1])) || ''
    return /^[\w-]{11}$/.test(mediaId) ? { provider: 'YouTube', mediaId } : null
  }
  return null
}

export function MusicSearchModal({ onClose, activeSession, providerError, onStartProvider }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const startPlayback = event => {
    event.preventDefault()
    const parsed = parseMusicUrl(url)
    if (!parsed) {
      setError('Tempel link lagu Spotify atau link video YouTube yang valid.')
      return
    }
    const providerTitle = title.trim() || (parsed.provider === 'Spotify' ? 'Lagu Spotify' : 'Video YouTube')
    onStartProvider({
      id: `${parsed.provider.toLowerCase()}-${parsed.mediaId}`,
      provider: parsed.provider,
      mediaId: parsed.mediaId,
      title: providerTitle,
      artist: parsed.provider,
    })
    setError('')
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="tool-modal music-search-modal" role="dialog" aria-modal="true" aria-labelledby="music-search-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Music2 size={20}/></span><div><h2 id="music-search-title">Music Listener</h2><p>Putar musik dari YouTube atau Spotify</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body music-search-body">
        <form className="music-provider-form" onSubmit={startPlayback}>
          <label>Judul lagu (opsional)<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Nama lagu — Artis" autoComplete="off"/></label>
          <label><span className="music-url-label"><Link2 size={14}/> URL YouTube atau Spotify</span><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtu.be/... atau open.spotify.com/track/..." autoComplete="url" required/></label>
          <p className="music-search-note"><ShieldCheck size={15}/> Tempel URL video YouTube atau lagu Spotify. Putar/jeda memakai kontrol Music Player di pojok kiri atas. Spotify mungkin meminta login/Premium; volume Spotify diatur dari perangkat karena embed-nya tidak menyediakan kontrol volume web.</p>
          <button className="run-btn" type="submit" disabled={!url.trim()}><Play size={16}/> Putar lagu</button>
        </form>
        {error && <div className="notice">{error}</div>}
        {providerError && activeSession?.kind === 'provider' && <div className="notice">{providerError}</div>}
        {activeSession?.kind === 'provider' && <div className="music-session-note"><Headphones size={17}/><span><b>{activeSession.title}</b><small>Gunakan kontrol Music Player di pojok kiri atas. Tutup jendela ini dengan X—player tetap berjalan.</small></span></div>}
        <p className="music-background-note">Audio dapat berlanjut saat Chrome berada di latar belakang selama browser dan sistem tidak menghentikannya.</p>
      </div>
    </section>
  </div>
}
