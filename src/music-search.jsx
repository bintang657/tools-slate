import React, { useEffect, useRef, useState } from 'react'
import { ExternalLink, Music2, Pause, Play, RefreshCw, Search, SkipBack, SkipForward, Volume2, X } from 'lucide-react'

const formatTime = value => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const artworkFor = track => (track.artworkUrl100 || '').replace('100x100bb', '300x300bb')

export function MusicSearchModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [activeTrack, setActiveTrack] = useState(null)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(30)
  const [volume, setVolume] = useState(0.8)
  const audioRef = useRef(null)
  const requestRef = useRef(null)

  useEffect(() => () => {
    const request = requestRef.current
    requestRef.current = null
    request?.abort()
    audioRef.current?.pause()
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

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
    audioRef.current?.pause()
    setActiveTrack(null)
    setPlaying(false)
    setTime(0)
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
      if (requestRef.current === controller) {
        setError(controller.signal.aborted ? 'Pencarian melewati batas waktu. Coba lagi.' : e.message || 'Pencarian gagal. Periksa koneksi internet.')
      }
    } finally {
      window.clearTimeout(timeout)
      if (requestRef.current === controller) setBusy(false)
    }
  }

  const playTrack = track => {
    const audio = audioRef.current
    setError('')
    setTime(0)
    setDuration(30)
    setActiveTrack(track)
    setPlaying(true)
    if (!audio) return
    audio.src = track.previewUrl
    audio.load()
    audio.play().catch(() => {
      setPlaying(false)
      setError('Preview tidak dapat diputar. Coba lagu lain atau buka layanan musik resmi.')
    })
  }

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio || !activeTrack) return
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0
      audio.play().catch(() => setError('Browser tidak dapat memutar preview ini.'))
    } else audio.pause()
  }

  const stepTrack = direction => {
    if (!activeTrack || !tracks.length) return
    const index = tracks.findIndex(track => track.trackId === activeTrack.trackId)
    const next = (index + direction + tracks.length) % tracks.length
    playTrack(tracks[next])
  }

  const seek = event => {
    const nextTime = Number(event.target.value)
    setTime(nextTime)
    if (audioRef.current) audioRef.current.currentTime = nextTime
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="tool-modal music-search-modal" role="dialog" aria-modal="true" aria-labelledby="music-search-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Music2 size={20}/></span><div><h2 id="music-search-title">Music Listener</h2><p>Cari lagu dan dengarkan preview resmi</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body music-search-body">
        <form className="music-search-form" onSubmit={search}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Judul lagu atau nama artis..." aria-label="Cari judul lagu atau artis"/><button type="submit" disabled={busy || !query.trim()}>{busy ? <RefreshCw className="spin" size={16}/> : <Search size={16}/>} Cari</button></form>
        <p className="music-search-note">Preview resmi sekitar 30 detik dari Apple Music. Putar lagu lengkap melalui tautan layanan resmi.</p>
        {error && <div className="notice">{error}</div>}
        {!!tracks.length && <div className="music-search-results"><div className="music-results-heading"><b>HASIL PENCARIAN</b><span>{tracks.length} lagu</span></div>{tracks.map(track => <button type="button" className={`music-track-row ${activeTrack?.trackId === track.trackId ? 'active' : ''}`} key={track.trackId} onClick={() => activeTrack?.trackId === track.trackId ? togglePlayback() : playTrack(track)}>
          <img src={artworkFor(track)} alt="" loading="lazy"/><span className="music-track-meta"><b>{track.trackName}</b><small>{track.artistName}{track.collectionName ? ` · ${track.collectionName}` : ''}</small></span><span className="music-track-action">{activeTrack?.trackId === track.trackId && playing ? <Pause size={16}/> : <Play size={16}/>}<small>{activeTrack?.trackId === track.trackId && playing ? 'Putar' : 'Preview'}</small></span>
        </button>)}</div>}
        {activeTrack && <div className="music-preview-player">
          <div className="music-now-playing"><img src={artworkFor(activeTrack)} alt=""/><span><b>{activeTrack.trackName}</b><small>{activeTrack.artistName}</small></span><a href={activeTrack.trackViewUrl} target="_blank" rel="noreferrer" aria-label="Buka lagu lengkap di Apple Music" title="Buka lagu lengkap di Apple Music"><ExternalLink size={16}/></a></div>
          <div className="music-timeline"><span>{formatTime(time)}</span><input type="range" min="0" max={Math.max(1, duration)} step="0.1" value={Math.min(time, duration)} onChange={seek} aria-label="Posisi preview"/><span>{formatTime(duration)}</span></div>
          <div className="music-player-controls"><button onClick={() => stepTrack(-1)} title="Lagu sebelumnya" aria-label="Lagu sebelumnya" disabled={tracks.length < 2}><SkipBack size={18}/></button><button className="music-play-button" onClick={togglePlayback} aria-label={playing ? 'Jeda preview' : 'Putar preview'}>{playing ? <Pause size={19}/> : <Play size={19}/>}</button><button onClick={() => stepTrack(1)} title="Lagu berikutnya" aria-label="Lagu berikutnya" disabled={tracks.length < 2}><SkipForward size={18}/></button><span className="music-volume"><Volume2 size={16}/><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Volume preview"/></span><a className="music-full-track" href={activeTrack.trackViewUrl} target="_blank" rel="noreferrer">Lagu lengkap <ExternalLink size={13}/></a></div>
        </div>}
        <audio ref={audioRef} preload="none" hidden onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration) }} onEnded={() => setPlaying(false)} onError={() => { if (activeTrack) setError('Preview gagal dimuat. Coba lagu lain atau buka tautan Apple Music.') }}/>
      </div>
    </section>
  </div>
}
