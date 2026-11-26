import React, { useEffect, useRef, useState } from 'react'
import { ExternalLink, Headphones, Music2, Pause, Play, RefreshCw, Search, SkipBack, SkipForward, Volume2, X } from 'lucide-react'

const formatTime = value => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
const artworkFor = track => (track.artworkUrl100 || '').replace('100x100bb', '300x300bb')

function spotifyEmbed(value) {
  const text = value.trim()
  const uriMatch = text.match(/^spotify:track:([A-Za-z0-9]{22})$/)
  if (uriMatch) return `https://open.spotify.com/embed/track/${uriMatch[1]}?utm_source=generator&theme=0`
  try {
    const url = new URL(text)
    if (!/(^|\.)open\.spotify\.com$/i.test(url.hostname)) return ''
    const parts = url.pathname.split('/').filter(Boolean)
    const index = parts.indexOf('track')
    const id = index >= 0 ? parts[index + 1] : ''
    return /^[A-Za-z0-9]{22}$/.test(id || '') ? `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0` : ''
  } catch { return '' }
}

function youtubeEmbed(value) {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '')
    let id = ''
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || ''
    else if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).find((part, i, parts) => ['embed', 'shorts', 'live'].includes(parts[i - 1])) || ''
    }
    return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=1&playsinline=1&rel=0` : ''
  } catch { return '' }
}

export function MusicSearchModal({ onClose, activeSession, playing, time, duration, volume, onSetVolume, onStartAudio, onStartEmbed, onTogglePlayback, onSeek }) {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('preview')
  const [tracks, setTracks] = useState([])
  const [activeTrack, setActiveTrack] = useState(null)
  const [providerLink, setProviderLink] = useState('')
  const [audioLink, setAudioLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)

  useEffect(() => () => {
    const request = requestRef.current
    requestRef.current = null
    request?.abort()
  }, [])

  const search = async event => {
    event?.preventDefault()
    const term = query.trim()
    if (!term) { setError('Masukkan judul lagu atau nama artis.'); return }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true)
    setError('')
    setTracks([])
    const timeout = window.setTimeout(() => { if (requestRef.current === controller) controller.abort() }, 15000)
    try {
      const params = new URLSearchParams({ term, entity: 'song', media: 'music', limit: '25', country: 'ID' })
      const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`Layanan musik merespons (${response.status}). Coba lagi.`)
      const data = await response.json()
      const songs = (Array.isArray(data.results) ? data.results : []).filter(item => item.kind === 'song' && item.previewUrl && item.trackName && item.artistName)
      setTracks(songs)
      if (!songs.length) setError('Lagu tidak ditemukan atau preview belum tersedia. Coba judul atau artis lain.')
    } catch (e) {
      if (requestRef.current === controller) setError(controller.signal.aborted ? 'Pencarian melewati batas waktu. Coba lagi.' : e.message || 'Pencarian gagal. Periksa koneksi internet.')
    } finally {
      window.clearTimeout(timeout)
      if (requestRef.current === controller) setBusy(false)
    }
  }

  const playTrack = track => {
    const id = `apple-${track.trackId}`
    if (activeSession?.id === id) { onTogglePlayback(); return }
    setError('')
    setActiveTrack(track)
    onStartAudio({ id, src: track.previewUrl, title: track.trackName, artist: track.artistName, provider: 'Apple Music · Preview' })
  }

  const startProvider = event => {
    event.preventDefault()
    const embedUrl = source === 'spotify' ? spotifyEmbed(providerLink) : youtubeEmbed(providerLink)
    if (!embedUrl) {
      setError(source === 'spotify' ? 'Tempel tautan lagu Spotify yang valid (open.spotify.com/track/…).' : 'Tempel tautan video YouTube yang valid.')
      return
    }
    const title = query.trim() || (source === 'spotify' ? 'Lagu dari Spotify' : 'Video musik YouTube')
    onStartEmbed({ id: `${source}-${embedUrl}`, embedUrl, title, artist: source === 'spotify' ? 'Spotify' : 'YouTube', provider: source === 'spotify' ? 'Spotify' : 'YouTube' })
    setError('')
  }

  const startDirectAudio = event => {
    event.preventDefault()
    let url
    try { url = new URL(audioLink.trim()) } catch { setError('Masukkan URL audio yang valid.'); return }
    if (url.protocol !== 'https:') { setError('Demi keamanan, URL audio harus menggunakan HTTPS.'); return }
    const title = query.trim() || url.pathname.split('/').pop() || 'Audio langsung'
    onStartAudio({ id: `direct-${url.href}`, src: url.href, title, artist: 'URL audio', provider: 'Audio langsung' })
    setError('')
  }

  const openProviderSearch = provider => {
    const term = query.trim()
    if (!term) { setError('Masukkan judul atau artis terlebih dahulu.'); return }
    const url = provider === 'spotify'
      ? `https://open.spotify.com/search/${encodeURIComponent(term)}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const currentPreview = activeTrack && activeSession?.id === `apple-${activeTrack.trackId}`
  const sourceOptions = [['preview', 'Preview'], ['spotify', 'Spotify'], ['youtube', 'YouTube'], ['audio', 'URL audio']]

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="tool-modal music-search-modal" role="dialog" aria-modal="true" aria-labelledby="music-search-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Music2 size={20}/></span><div><h2 id="music-search-title">Music Listener</h2><p>Cari lagu, pilih sumber, lalu putar</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body music-search-body">
        <div className="music-source-tabs" role="tablist" aria-label="Sumber pemutaran">{sourceOptions.map(([id, label]) => <button key={id} role="tab" aria-selected={source === id} className={source === id ? 'active' : ''} onClick={() => { setSource(id); setError('') }}>{label}</button>)}</div>
        {source !== 'audio' && <form className="music-search-form" onSubmit={e => { e.preventDefault(); if (source === 'preview') search(); else openProviderSearch(source) }}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Judul lagu atau nama artis..." aria-label="Judul lagu atau artis"/><button type="submit" disabled={busy || !query.trim()}>{busy ? <RefreshCw className="spin" size={16}/> : <Search size={16}/>} {source === 'preview' ? 'Cari' : `Cari ${source === 'spotify' ? 'Spotify' : 'YouTube'}`}</button></form>}
        {source === 'preview' && <>
          <p className="music-search-note">Preview resmi sekitar 30 detik. Untuk lagu penuh, gunakan Spotify, YouTube, atau URL audio milik Anda.</p>
          {!!tracks.length && <div className="music-search-results"><div className="music-results-heading"><b>HASIL PENCARIAN</b><span>{tracks.length} lagu</span></div>{tracks.map(track => <button type="button" className={`music-track-row ${activeSession?.id === `apple-${track.trackId}` ? 'active' : ''}`} key={track.trackId} onClick={() => playTrack(track)}>
            <img src={artworkFor(track)} alt="" loading="lazy"/><span className="music-track-meta"><b>{track.trackName}</b><small>{track.artistName}{track.collectionName ? ` · ${track.collectionName}` : ''}</small></span><span className="music-track-action">{activeSession?.id === `apple-${track.trackId}` && playing ? <Pause size={16}/> : <Play size={16}/>}<small>{activeSession?.id === `apple-${track.trackId}` && playing ? 'Jeda' : 'Preview'}</small></span>
          </button>)}</div>}
        </>}
        {source === 'spotify' && <form className="music-provider-form" onSubmit={startProvider}><p className="music-search-note">Cari judul di Spotify, buka lagu yang dipilih, lalu salin dan tempel tautan Spotify di bawah. Pemutaran penuh mengikuti login dan ketersediaan akun Spotify.</p><label>Tautan lagu Spotify<input value={providerLink} onChange={e => setProviderLink(e.target.value)} placeholder="https://open.spotify.com/track/..." autoComplete="url"/></label><button className="run-btn" type="submit" disabled={!providerLink.trim()}><Play size={16}/> Putar lewat Spotify</button></form>}
        {source === 'youtube' && <form className="music-provider-form" onSubmit={startProvider}><p className="music-search-note">Cari lagu di YouTube, pilih video musik resmi, lalu salin tautannya ke sini. Player YouTube akan terus berjalan saat jendela tool ditutup.</p><label>Tautan video YouTube<input value={providerLink} onChange={e => setProviderLink(e.target.value)} placeholder="https://youtube.com/watch?v=..." autoComplete="url"/></label><button className="run-btn" type="submit" disabled={!providerLink.trim()}><Play size={16}/> Putar lewat YouTube</button></form>}
        {source === 'audio' && <form className="music-provider-form" onSubmit={startDirectAudio}><p className="music-search-note">Tempel URL HTTPS ke file audio yang dapat diakses publik dan pastikan Anda memiliki hak untuk memutarnya.</p><label>Judul lagu<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Judul lagu atau nama artis"/></label><label>URL MP3 / audio<input value={audioLink} onChange={e => setAudioLink(e.target.value)} placeholder="https://example.com/audio.mp3" autoComplete="url"/></label><button className="run-btn" type="submit" disabled={!audioLink.trim()}><Play size={16}/> Putar audio penuh</button></form>}
        {error && <div className="notice">{error}</div>}
        {source === 'preview' && activeTrack && <div className="music-preview-player">
          <div className="music-now-playing"><img src={artworkFor(activeTrack)} alt=""/><span><b>{activeTrack.trackName}</b><small>{activeTrack.artistName}</small></span><a href={activeTrack.trackViewUrl} target="_blank" rel="noreferrer" aria-label="Buka lagu lengkap di Apple Music" title="Buka lagu di Apple Music"><ExternalLink size={16}/></a></div>
          {currentPreview ? <><div className="music-timeline"><span>{formatTime(time)}</span><input type="range" min="0" max={Math.max(1, duration || 30)} step="0.1" value={Math.min(time, duration || 30)} onChange={e => onSeek(Number(e.target.value))} aria-label="Posisi preview"/><span>{formatTime(duration || 30)}</span></div><div className="music-player-controls"><button onClick={() => { const index = tracks.findIndex(track => track.trackId === activeTrack.trackId); if (tracks.length) playTrack(tracks[(index - 1 + tracks.length) % tracks.length]) }} title="Lagu sebelumnya" aria-label="Lagu sebelumnya" disabled={tracks.length < 2}><SkipBack size={18}/></button><button className="music-play-button" onClick={onTogglePlayback} aria-label={playing ? 'Jeda preview' : 'Putar preview'}>{playing ? <Pause size={19}/> : <Play size={19}/>}</button><button onClick={() => { const index = tracks.findIndex(track => track.trackId === activeTrack.trackId); if (tracks.length) playTrack(tracks[(index + 1) % tracks.length]) }} title="Lagu berikutnya" aria-label="Lagu berikutnya" disabled={tracks.length < 2}><SkipForward size={18}/></button><span className="music-volume"><Volume2 size={16}/><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => onSetVolume(Number(e.target.value))} aria-label="Volume preview"/></span><a className="music-full-track" href={activeTrack.trackViewUrl} target="_blank" rel="noreferrer">Lagu penuh <ExternalLink size={13}/></a></div></> : <p className="music-search-note">Preview ini sedang diputar di player web utama dan tetap berlanjut saat jendela ini ditutup.</p>}
        </div>}
        {activeSession && activeSession.kind === 'embed' && source !== 'preview' && <div className="music-session-note"><Headphones size={17}/><span><b>{activeSession.title}</b><small>Player {activeSession.provider} ada di bagian atas halaman dan tetap berjalan setelah tool ditutup.</small></span></div>}
      </div>
    </section>
  </div>
}
