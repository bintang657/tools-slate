import React, { useEffect, useState } from 'react'
import { Headphones, Link2, Music2, Play, Search, ShieldCheck, X, Youtube } from 'lucide-react'
import { connectSpotify, finishSpotifyAuthorization, musicCatalogConfig, searchSpotify, searchYoutube, spotifyAuthPending, spotifyConnected } from './music-catalog.js'

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
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('YouTube')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spotifyIsConnected, setSpotifyIsConnected] = useState(spotifyConnected())

  useEffect(() => {
    if (!spotifyAuthPending() && !new URLSearchParams(window.location.search).has('code')) return
    finishSpotifyAuthorization().then(connected => {
      if (connected) {
        setSpotifyIsConnected(true)
        setError('Spotify berhasil dihubungkan. Cari lagu yang kamu inginkan.')
      }
    }).catch(authError => setError(authError.message || 'Login Spotify gagal.'))
  }, [])

  const startPlayback = (provider, mediaId, providerTitle, artist) => {
    onStartProvider({ id: `${provider.toLowerCase()}-${mediaId}`, provider, mediaId, title: providerTitle, artist })
    setError('')
  }

  const playUrl = event => {
    event.preventDefault()
    const parsed = parseMusicUrl(url)
    if (!parsed) {
      setError('Tempel link lagu Spotify atau link video YouTube yang valid.')
      return
    }
    startPlayback(parsed.provider, parsed.mediaId, title.trim() || (parsed.provider === 'Spotify' ? 'Lagu Spotify' : 'Video YouTube'), parsed.provider)
  }

  const searchCatalog = async event => {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const items = source === 'YouTube' ? await searchYoutube(query.trim()) : await searchSpotify(query.trim())
      setResults(items)
      if (!items.length) setError('Tidak ada hasil. Coba kata kunci lain.')
    } catch (searchError) {
      setError(searchError.message || 'Pencarian gagal.')
    } finally {
      setLoading(false)
    }
  }

  const handleSpotifyConnect = async () => {
    try { await connectSpotify() } catch (authError) { setError(authError.message || 'Tidak dapat menghubungkan Spotify.') }
  }

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="tool-modal music-search-modal" role="dialog" aria-modal="true" aria-labelledby="music-search-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Music2 size={20}/></span><div><h2 id="music-search-title">Music Listener</h2><p>Cari dan putar musik dari YouTube atau Spotify</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body music-search-body">
        <div className="music-catalog-section">
          <div className="music-source-tabs" role="tablist" aria-label="Sumber pencarian">
            <button type="button" role="tab" aria-selected={source === 'YouTube'} className={source === 'YouTube' ? 'active' : ''} onClick={() => { setSource('YouTube'); setResults([]); setError('') }}><Youtube size={16}/> YouTube</button>
            <button type="button" role="tab" aria-selected={source === 'Spotify'} className={source === 'Spotify' ? 'active' : ''} onClick={() => { setSource('Spotify'); setResults([]); setError('') }}><Music2 size={16}/> Spotify</button>
          </div>
          <form className="music-provider-form music-catalog-form" onSubmit={searchCatalog}>
            <label>Cari judul lagu atau artis<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Contoh: Tulus — Hati-Hati di Jalan" autoComplete="off"/></label>
            {source === 'Spotify' && musicCatalogConfig.spotifyReady && !spotifyIsConnected && <button className="music-connect-btn" type="button" onClick={handleSpotifyConnect}>Hubungkan akun Spotify untuk mencari</button>}
            <button className="run-btn" type="submit" disabled={!query.trim() || loading || (source === 'Spotify' && !spotifyIsConnected)}><Search size={16}/>{loading ? 'Mencari…' : `Cari di ${source}`}</button>
          </form>
          {source === 'YouTube' && !musicCatalogConfig.youtubeReady && <p className="music-search-note">Pencarian YouTube perlu VITE_YOUTUBE_API_KEY di environment frontend.</p>}
          {source === 'Spotify' && !musicCatalogConfig.spotifyReady && <p className="music-search-note">Pencarian Spotify perlu VITE_SPOTIFY_CLIENT_ID dan login akun Spotify (OAuth PKCE).</p>}
          {results.length > 0 && <div className="music-results" aria-live="polite">{results.map(item => <button className="music-result" type="button" key={`${item.provider}-${item.id}`} onClick={() => startPlayback(item.provider, item.id, item.title, item.artist)}>
            {item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy"/> : <span className="music-result-placeholder"><Music2 size={18}/></span>}
            <span className="music-result-text"><b>{item.title}</b><small>{item.artist}</small></span><Play size={16}/>
          </button>)}</div>}
        </div>

        <details className="music-url-fallback"><summary><Link2 size={15}/> Atau tempel URL langsung</summary>
          <form className="music-provider-form" onSubmit={playUrl}>
            <label>Judul lagu (opsional)<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Contoh: Nama lagu — Artis" autoComplete="off"/></label>
            <label><span className="music-url-label"><Link2 size={14}/> URL YouTube atau Spotify</span><input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://youtu.be/... atau open.spotify.com/track/..." autoComplete="url" required/></label>
            <button className="run-btn" type="submit" disabled={!url.trim()}><Play size={16}/> Putar URL</button>
          </form>
        </details>
        <p className="music-search-note"><ShieldCheck size={15}/> Putar/jeda memakai kontrol Music Player di pojok kiri atas. Player tetap berjalan saat modal ditutup. Spotify mungkin meminta login/Premium; volume Spotify diatur dari perangkat.</p>
        {error && <div className="notice">{error}</div>}
        {providerError && activeSession?.kind === 'provider' && <div className="notice">{providerError}</div>}
        {activeSession?.kind === 'provider' && <div className="music-session-note"><Headphones size={17}/><span><b>{activeSession.title}</b><small>Gunakan kontrol Music Player di pojok kiri atas. Tutup jendela ini dengan X—player tetap berjalan.</small></span></div>}
        <p className="music-background-note">Audio dapat berlanjut saat Chrome berada di latar belakang selama browser dan sistem tidak menghentikannya.</p>
      </div>
    </section>
  </div>
}
