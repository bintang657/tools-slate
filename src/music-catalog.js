const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const SPOTIFY_SCOPES = []
const TOKEN_KEY = 'tools-slate-spotify-access-token'
const EXPIRY_KEY = 'tools-slate-spotify-token-expiry'
const VERIFIER_KEY = 'tools-slate-spotify-code-verifier'
const STATE_KEY = 'tools-slate-spotify-auth-state'

export const musicCatalogConfig = {
  youtubeReady: Boolean(YOUTUBE_API_KEY),
  spotifyReady: Boolean(SPOTIFY_CLIENT_ID),
}

function currentRedirectUri() {
  return `${window.location.origin}${window.location.pathname}`
}

function base64Url(bytes) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))
}

function randomToken(length = 64) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

export function spotifyAuthPending() {
  return Boolean(sessionStorage.getItem(VERIFIER_KEY))
}

export async function finishSpotifyAuthorization() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (params.has('error')) {
    sessionStorage.removeItem(STATE_KEY)
    sessionStorage.removeItem(VERIFIER_KEY)
    window.history.replaceState({}, document.title, currentRedirectUri())
    throw new Error(`Spotify menolak otorisasi: ${params.get('error_description') || params.get('error')}`)
  }
  if (!code) return false
  const returnedState = params.get('state')
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  window.history.replaceState({}, document.title, currentRedirectUri())
  if (!verifier || !expectedState || returnedState !== expectedState) throw new Error('Verifikasi login Spotify gagal. Coba hubungkan ulang.')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: currentRedirectUri(),
      code_verifier: verifier,
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || 'Gagal mendapatkan token Spotify.')
  sessionStorage.setItem(TOKEN_KEY, data.access_token)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + (data.expires_in || 3600) * 1000))
  return true
}

export async function connectSpotify() {
  if (!SPOTIFY_CLIENT_ID) throw new Error('Spotify belum dikonfigurasi. Isi VITE_SPOTIFY_CLIENT_ID pada environment frontend.')
  const verifier = randomToken(64)
  const state = randomToken(24)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  const challenge = base64Url(await sha256(verifier))
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: currentRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })
  if (SPOTIFY_SCOPES.length) params.set('scope', SPOTIFY_SCOPES.join(' '))
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}

async function getSpotifyToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const expiresAt = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
  if (token && Date.now() < expiresAt - 30_000) return token
  if (token) {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(EXPIRY_KEY)
  }
  throw new Error('Hubungkan akun Spotify dulu untuk mencari lagu.')
}

export function spotifyConnected() {
  const expiresAt = Number(sessionStorage.getItem(EXPIRY_KEY) || 0)
  return Boolean(sessionStorage.getItem(TOKEN_KEY)) && Date.now() < expiresAt - 30_000
}

export async function searchYoutube(query) {
  if (!YOUTUBE_API_KEY) throw new Error('YouTube belum dikonfigurasi. Isi VITE_YOUTUBE_API_KEY pada environment frontend.')
  const params = new URLSearchParams({ part: 'snippet', type: 'video', videoEmbeddable: 'true', videoSyndicated: 'true', maxResults: '10', q: query, key: YOUTUBE_API_KEY })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Pencarian YouTube gagal.')
  return (data.items || []).map(item => ({
    id: item.id?.videoId,
    title: item.snippet?.title || 'Video YouTube',
    artist: item.snippet?.channelTitle || 'YouTube',
    provider: 'YouTube',
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
  })).filter(item => item.id)
}

export async function searchSpotify(query) {
  if (!SPOTIFY_CLIENT_ID) throw new Error('Spotify belum dikonfigurasi. Isi VITE_SPOTIFY_CLIENT_ID pada environment frontend.')
  const token = await getSpotifyToken()
  const params = new URLSearchParams({ q: query, type: 'track', limit: '10' })
  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json()
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(EXPIRY_KEY)
      throw new Error('Sesi Spotify kedaluwarsa. Hubungkan akun kembali.')
    }
    throw new Error(data.error?.message || 'Pencarian Spotify gagal.')
  }
  return (data.tracks?.items || []).map(track => ({
    id: track.id,
    title: track.name || 'Lagu Spotify',
    artist: track.artists?.map(artist => artist.name).join(', ') || 'Spotify',
    provider: 'Spotify',
    thumbnail: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
  })).filter(item => item.id)
}
