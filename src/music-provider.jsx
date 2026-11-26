import React, { useEffect, useRef } from 'react'

let youtubeApiPromise
let spotifyApiPromise

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    let script = document.querySelector('script[data-tools-slate-youtube-api]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.toolsSlateYoutubeApi = 'true'
      script.onerror = () => reject(new Error('YouTube player API gagal dimuat.'))
      document.head.appendChild(script)
    }
  }).catch(error => { youtubeApiPromise = null; throw error })
  return youtubeApiPromise
}

function loadSpotifyApi() {
  if (window.__toolsSlateSpotifyApi) return Promise.resolve(window.__toolsSlateSpotifyApi)
  if (spotifyApiPromise) return spotifyApiPromise
  spotifyApiPromise = new Promise((resolve, reject) => {
    const previous = window.onSpotifyIframeApiReady
    window.onSpotifyIframeApiReady = api => {
      window.__toolsSlateSpotifyApi = api
      previous?.(api)
      resolve(api)
    }
    let script = document.querySelector('script[data-tools-slate-spotify-api]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      script.dataset.toolsSlateSpotifyApi = 'true'
      script.onerror = () => reject(new Error('Spotify player API gagal dimuat.'))
      document.head.appendChild(script)
    }
  }).catch(error => { spotifyApiPromise = null; throw error })
  return spotifyApiPromise
}

export function MusicProviderPlayer({ provider, mediaId, volume, onReady, onState, onError }) {
  const hostRef = useRef(null)
  const callbacks = useRef({ onReady, onState, onError })
  callbacks.current = { onReady, onState, onError }

  useEffect(() => {
    let cancelled = false
    let player = null
    const host = hostRef.current
    if (!host) return undefined
    host.replaceChildren()

    const initialize = async () => {
      try {
        if (provider === 'YouTube') {
          const YT = await loadYouTubeApi()
          if (cancelled || !hostRef.current) return
          player = new YT.Player(hostRef.current, {
            width: '320', height: '200', videoId: mediaId,
            playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
            events: {
              onReady: event => {
                const target = event.target
                const controller = {
                  play: () => target.playVideo(), pause: () => target.pauseVideo(),
                  seek: seconds => target.seekTo(seconds, true), setVolume: value => target.setVolume(Math.round(value * 100)),
                }
                callbacks.current.onReady?.(controller)
                controller.setVolume(volume)
                controller.play()
              },
              onStateChange: event => {
                const duration = event.target.getDuration?.() || 0
                const time = event.target.getCurrentTime?.() || 0
                callbacks.current.onState?.(event.data === YT.PlayerState.PLAYING, time, duration)
              },
              onError: () => callbacks.current.onError?.('Video YouTube tidak dapat diputar. Coba tautan lain atau periksa pembatasan embed.')
            }
          })
        } else {
          const api = await loadSpotifyApi()
          if (cancelled || !hostRef.current) return
          api.createController(hostRef.current, { width: '100%', height: 80, uri: `spotify:track:${mediaId}` }, controller => {
            if (cancelled) { controller.destroy?.(); return }
            const actions = {
              play: () => controller.play(), pause: () => controller.pause(),
              seek: seconds => controller.seek(seconds * 1000),
              setVolume: value => controller.setVolume?.(value),
            }
            callbacks.current.onReady?.(actions)
            controller.addListener('playback_update', event => {
              const data = event.data || {}
              callbacks.current.onState?.(!data.isPaused, (data.position || 0) / 1000, (data.duration || 0) / 1000)
            })
            actions.play()
          })
        }
      } catch (error) {
        if (!cancelled) callbacks.current.onError?.(error.message || 'Player musik gagal dimuat.')
      }
    }
    initialize()
    return () => {
      cancelled = true
      try { player?.destroy?.() } catch {}
      try { hostRef.current?.replaceChildren() } catch {}
    }
  }, [provider, mediaId])

  return <div className={`music-provider-host ${provider === 'YouTube' ? 'youtube' : 'spotify'}`} aria-label={`${provider} music player`}><div className="music-provider-target" ref={hostRef}/></div>
}
