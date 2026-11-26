import React, { useEffect, useRef, useState } from 'react'
import { Download, Image, AudioLines, Upload, X, Zap, RefreshCw, ShieldCheck } from 'lucide-react'
import * as lamejs from '@breezystack/lamejs'

export function PhotoHdModal({ onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [output, setOutput] = useState('')
  const [scale, setScale] = useState('2')
  const [dimensions, setDimensions] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const previewRef = useRef('')
  const outputRef = useRef('')

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    if (outputRef.current) URL.revokeObjectURL(outputRef.current)
  }, [])

  const chooseFile = (next) => {
    setError('')
    setOutput('')
    setDimensions(null)
    if (outputRef.current) URL.revokeObjectURL(outputRef.current)
    outputRef.current = ''
    if (!next) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setError('Pilih foto JPG, PNG, atau WebP.')
      return
    }
    if (next.size > 25 * 1024 * 1024) {
      setError('Ukuran foto maksimal 25 MB.')
      return
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    if (outputRef.current) URL.revokeObjectURL(outputRef.current)
    const url = URL.createObjectURL(next)
    previewRef.current = url
    outputRef.current = ''
    setFile(next)
    setPreview(url)
  }

  const upscale = async () => {
    if (!file || !preview) return
    setBusy(true)
    setError('')
    setOutput('')
    try {
      const image = new window.Image()
      image.src = preview
      await image.decode()
      const factor = Number(scale)
      const width = Math.round(image.naturalWidth * factor)
      const height = Math.round(image.naturalHeight * factor)
      if (width * height > 24_000_000 || Math.max(width, height) > 8192) {
        throw new Error('Resolusi hasil terlalu besar untuk diproses dengan aman. Pilih skala lebih kecil atau foto sumber yang lebih kecil.')
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas tidak tersedia di browser ini.')
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, width, height)
      const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Gagal membuat foto hasil.')), 'image/png'))
      const url = URL.createObjectURL(blob)
      if (outputRef.current) URL.revokeObjectURL(outputRef.current)
      outputRef.current = url
      setOutput(url)
      setDimensions({ width, height })
    } catch (e) {
      setError(e.message || 'Foto gagal diproses.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="tool-modal media-tool-modal" role="dialog" aria-modal="true" aria-labelledby="photo-hd-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Image size={20}/></span><div><h2 id="photo-hd-title">Foto HD Upscaler</h2><p>Tingkatkan ukuran foto langsung di browser</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body media-tool-body">
        <label className="media-file-pick"><Upload size={19}/><span><b>{file ? file.name : 'Pilih foto untuk ditingkatkan'}</b><small>JPG, PNG, WebP · Maksimal 25 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = '' }}/></label>
        {preview && <div className="photo-preview"><img src={preview} alt="Pratinjau foto yang dipilih"/><span>{file?.name}</span></div>}
        <div className="media-control-row"><label htmlFor="photo-scale">Ukuran hasil</label><select id="photo-scale" value={scale} onChange={e => setScale(e.target.value)}><option value="2">2× — seimbang</option><option value="3">3× — lebih besar</option><option value="4">4× — maksimal</option></select></div>
        <p className="media-privacy"><ShieldCheck size={15}/> Foto diproses lokal dan tidak diunggah. Upscaling memakai interpolasi berkualitas tinggi, bukan rekonstruksi AI.</p>
        <button className="run-btn" onClick={upscale} disabled={!file || busy}>{busy ? <RefreshCw className="spin" size={17}/> : <Zap size={17}/>} {busy ? 'Memproses foto...' : 'Tingkatkan ke HD'}</button>
        {error && <div className="notice">{error}</div>}
        {output && <div className="media-result"><div className="media-result-head"><b>Foto siap diunduh</b><span>{dimensions.width} × {dimensions.height} px</span></div><img src={output} alt="Foto hasil upscaling"/><a className="run-btn media-download" href={output} download="foto-hd.png"><Download size={16}/> Unduh foto HD</a></div>}
      </div>
    </section>
  </div>
}

export function Mp4ToMp3Modal({ onClose }) {
  const [file, setFile] = useState(null)
  const [bitrate, setBitrate] = useState('192')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const resultRef = useRef('')
  const cancelled = useRef(false)

  useEffect(() => () => {
    cancelled.current = true
    if (resultRef.current) URL.revokeObjectURL(resultRef.current)
  }, [])

  const convert = async () => {
    if (!file) return
    setError('')
    setResult(null)
    setProgress(0)
    cancelled.current = false
    setBusy(true)
    let audioContext
    try {
      if (file.size > 100 * 1024 * 1024) throw new Error('Ukuran video maksimal 100 MB agar aman diproses di browser.')
      if (file.type !== 'video/mp4' && !/\.mp4$/i.test(file.name)) throw new Error('Pilih file video MP4 yang valid.')
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Browser ini belum mendukung pemrosesan audio.')
      audioContext = new AudioContextClass()
      let buffer = await audioContext.decodeAudioData(await file.arrayBuffer())
      const channels = Math.min(buffer.numberOfChannels, 2)
      if (!buffer.length || !channels) throw new Error('Audio tidak ditemukan di dalam video ini.')
      const supportedRates = [44100, 48000, 32000, 24000, 22050, 16000, 12000, 11025, 8000]
      if (!supportedRates.includes(buffer.sampleRate)) {
        const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext
        if (!OfflineContext) throw new Error('Sample rate audio tidak didukung browser ini.')
        const targetRate = 44100
        const offline = new OfflineContext(channels, Math.ceil(buffer.duration * targetRate), targetRate)
        const source = offline.createBufferSource()
        source.buffer = buffer
        source.connect(offline.destination)
        source.start()
        buffer = await offline.startRendering()
      }
      const sampleRate = buffer.sampleRate
      const encoder = new lamejs.Mp3Encoder(channels, sampleRate, Number(bitrate))
      const left = buffer.getChannelData(0)
      const right = channels > 1 ? buffer.getChannelData(1) : null
      const chunkSize = 1152
      const chunks = []
      const toInt16 = (source, start, end) => {
        const pcm = new Int16Array(end - start)
        for (let i = start; i < end; i++) {
          const sample = Math.max(-1, Math.min(1, source[i]))
          pcm[i - start] = sample < 0 ? sample * 32768 : sample * 32767
        }
        return pcm
      }
      for (let start = 0; start < buffer.length; start += chunkSize) {
        if (cancelled.current) return
        const end = Math.min(start + chunkSize, buffer.length)
        const encoded = channels > 1
          ? encoder.encodeBuffer(toInt16(left, start, end), toInt16(right, start, end))
          : encoder.encodeBuffer(toInt16(left, start, end))
        if (encoded.length) chunks.push(new Uint8Array(encoded))
        if (start % (chunkSize * 128) === 0) {
          setProgress(Math.min(99, Math.round(end / buffer.length * 100)))
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
      const finalChunk = encoder.flush()
      if (finalChunk.length) chunks.push(new Uint8Array(finalChunk))
      if (cancelled.current) return
      const blob = new Blob(chunks, { type: 'audio/mpeg' })
      if (!blob.size) throw new Error('Konversi tidak menghasilkan file audio.')
      const url = URL.createObjectURL(blob)
      if (resultRef.current) URL.revokeObjectURL(resultRef.current)
      resultRef.current = url
      setResult({ url, size: blob.size, duration: buffer.duration })
      setProgress(100)
    } catch (e) {
      setError(e.name === 'EncodingError' || e.name === 'NotSupportedError'
        ? 'Format atau codec audio video ini tidak didukung browser. Coba MP4 dengan audio AAC.'
        : e.message || 'Konversi gagal. Coba file MP4 lain.')
    } finally {
      if (audioContext && audioContext.state !== 'closed') await audioContext.close().catch(() => {})
      if (!cancelled.current) setBusy(false)
    }
  }

  const formatTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  const formatSize = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="tool-modal media-tool-modal" role="dialog" aria-modal="true" aria-labelledby="mp4-mp3-title">
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><AudioLines size={20}/></span><div><h2 id="mp4-mp3-title">MP4 to MP3</h2><p>Ekstrak dan konversi audio dari video</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body media-tool-body">
        <label className="media-file-pick"><Upload size={19}/><span><b>{file ? file.name : 'Pilih video MP4'}</b><small>MP4 · Maksimal 100 MB</small></span><input type="file" accept="video/mp4,.mp4" disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setError(''); setResult(null); setProgress(0); if (resultRef.current) URL.revokeObjectURL(resultRef.current); resultRef.current = ''; e.target.value = '' }}/></label>
        {file && <div className="media-file-info"><span><b>{file.name}</b><small>{formatSize(file.size)}</small></span><button disabled={busy} onClick={() => { setFile(null); setResult(null); setError(''); if (resultRef.current) URL.revokeObjectURL(resultRef.current); resultRef.current = '' }} aria-label="Hapus video"><X size={16}/></button></div>}
        <div className="media-control-row"><label htmlFor="mp3-bitrate">Kualitas MP3</label><select id="mp3-bitrate" value={bitrate} onChange={e => setBitrate(e.target.value)}><option value="128">128 kbps — ukuran kecil</option><option value="192">192 kbps — seimbang</option><option value="256">256 kbps — kualitas tinggi</option></select></div>
        <p className="media-privacy"><ShieldCheck size={15}/> Video diproses lokal di perangkat. Tidak ada file yang diunggah.</p>
        <button className="run-btn" onClick={convert} disabled={!file || busy}>{busy ? <RefreshCw className="spin" size={17}/> : <AudioLines size={17}/>} {busy ? `Mengonversi... ${progress}%` : 'Konversi ke MP3'}</button>
        {busy && <div className="media-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }}/></div>}
        {error && <div className="notice">{error}</div>}
        {result && <div className="media-result audio-result"><div className="media-result-head"><b>Audio siap diunduh</b><span>{formatTime(result.duration)} · {formatSize(result.size)}</span></div><audio controls src={result.url}/><a className="run-btn media-download" href={result.url} download={`${file?.name.replace(/\.mp4$/i, '') || 'audio'}.mp3`}><Download size={16}/> Unduh MP3</a></div>}
      </div>
    </section>
  </div>
}
