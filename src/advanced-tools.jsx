import React, { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, Check, CheckCircle2, Copy, Download, FileJson,
  FileSearch, FileText, Image as ImageIcon, LoaderCircle, Play, Plus, RefreshCw,
  ShieldCheck, Trash2, Upload, X
} from 'lucide-react'

const formatBytes = value => value < 1024 * 1024 ? `${(value / 1024).toFixed(0)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`
const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function ModalShell({ title, subtitle, icon: Icon, onClose, children }) {
  return <div className="modal-backdrop advanced-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="tool-modal advanced-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Icon size={20}/></span><div><h2>{title}</h2><p>{subtitle}</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
      <div className="modal-body advanced-body">{children}</div>
    </section>
  </div>
}
function Tabs({ items, value, onChange }) {
  return <div className="advanced-tabs" role="tablist">{items.map(item => <button key={item.id} type="button" role="tab" aria-selected={value === item.id} className={value === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>
}
function Field({ label, hint, children }) {
  return <label className="advanced-field"><span className="advanced-label">{label}{hint && <small>{hint}</small>}</span>{children}</label>
}
function Notice({ children, tone = 'info' }) {
  return <div className={`advanced-notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{tone === 'error' ? <AlertTriangle size={16}/> : <ShieldCheck size={16}/>}<span>{children}</span></div>
}
function CopyButton({ value, label = 'Salin' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400) }
    catch { setCopied(false) }
  }
  return <button className="advanced-quiet-btn" type="button" onClick={copy}><Copy size={14}/>{copied ? 'Tersalin' : label}</button>
}

export function ApiWorkbenchModal({ onClose }) {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1')
  const [headers, setHeaders] = useState('{\n  "Accept": "application/json"\n}')
  const [body, setBody] = useState('{\n  "title": "demo",\n  "completed": false\n}')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    setError(''); setResult(null)
    let target
    let parsedHeaders
    try {
      target = new URL(url.trim())
      if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Gunakan URL http atau https.')
      parsedHeaders = JSON.parse(headers || '{}')
      if (!parsedHeaders || Array.isArray(parsedHeaders) || typeof parsedHeaders !== 'object') throw new Error('Header harus berupa objek JSON.')
      for (const [key, value] of Object.entries(parsedHeaders)) {
        if (typeof value !== 'string') throw new Error(`Nilai header “${key}” harus berupa teks.`)
      }
    } catch (error) { setError(error.message || 'URL atau header tidak valid.'); return }
    setBusy(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    const started = performance.now()
    try {
      const response = await fetch(target.href, { method, headers: parsedHeaders, ...(method === 'GET' || method === 'HEAD' ? {} : { body }), signal: controller.signal })
      const text = await response.text()
      let pretty = text
      try { pretty = JSON.stringify(JSON.parse(text), null, 2) } catch { /* response is not JSON */ }
      setResult({ status: response.status, statusText: response.statusText, time: Math.round(performance.now() - started), type: response.headers.get('content-type') || 'unknown', text: pretty.slice(0, 250_000), truncated: pretty.length > 250_000 })
    } catch (error) {
      setError(error.name === 'AbortError' ? 'Permintaan melewati batas 25 detik.' : 'Permintaan gagal. Server tujuan mungkin menolak CORS; coba endpoint yang mengizinkan akses dari browser.')
    } finally { clearTimeout(timer); setBusy(false) }
  }

  return <ModalShell title="API Request Builder" subtitle="Kirim request HTTP langsung dari browser" icon={Activity} onClose={onClose}>
    <div className="advanced-row api-url-row"><select className="advanced-select method-select" value={method} onChange={event => setMethod(event.target.value)} aria-label="HTTP method">{['GET','POST','PUT','PATCH','DELETE','HEAD'].map(value => <option key={value}>{value}</option>)}</select><input className="advanced-input" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://api.example.com/endpoint" aria-label="Request URL"/></div>
    <div className="advanced-two-col">
      <Field label="Headers" hint="JSON object"><textarea className="advanced-code" value={headers} onChange={event => setHeaders(event.target.value)} spellCheck="false"/></Field>
      <Field label="Request body" hint="Untuk POST / PUT / PATCH"><textarea className="advanced-code" value={body} onChange={event => setBody(event.target.value)} spellCheck="false" disabled={method === 'GET' || method === 'HEAD'}/></Field>
    </div>
    <button className="run-btn advanced-run" type="button" onClick={send} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Play size={17}/>} {busy ? 'Mengirim request…' : `Kirim ${method}`}</button>
    {error && <Notice tone="error">{error}</Notice>}
    {result && <div className="advanced-result"><div className="advanced-result-head"><div><b className={result.status < 400 ? 'result-ok' : 'result-bad'}>{result.status} {result.statusText}</b><small>{result.time} ms · {result.type}{result.truncated ? ' · respons dipotong' : ''}</small></div><CopyButton value={result.text}/></div><pre className="advanced-output">{result.text || '(respons kosong)'}</pre></div>}
  </ModalShell>
}

function parsePath(root, path) {
  const parts = path.replace(/^\$\.?/, '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let value = root
  for (const key of parts) {
    if (value === null || value === undefined || !(key in Object(value))) throw new Error(`Path tidak ditemukan pada “${key}”.`)
    value = value[key]
  }
  return value
}
function schemaErrors(value, schema, path = '$') {
  const errors = []
  if (!schema || typeof schema !== 'object') return errors
  const types = { object: v => v !== null && typeof v === 'object' && !Array.isArray(v), array: Array.isArray, string: v => typeof v === 'string', number: v => typeof v === 'number' && Number.isFinite(v), integer: v => Number.isInteger(v), boolean: v => typeof v === 'boolean', null: v => v === null }
  if (schema.type && !(types[schema.type]?.(value))) { errors.push(`${path}: seharusnya ${schema.type}`); return errors }
  if (schema.enum && !schema.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${path}: nilai tidak termasuk enum`)
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: minimal ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: maksimal ${schema.maximum}`)
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: panjang minimal ${schema.minLength}`)
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: panjang maksimal ${schema.maxLength}`)
    if (schema.pattern) { try { if (!new RegExp(schema.pattern).test(value)) errors.push(`${path}: tidak cocok dengan pattern`) } catch { errors.push(`${path}: pattern schema tidak valid`) } }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: minimal ${schema.minItems} item`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: maksimal ${schema.maxItems} item`)
    if (schema.items) value.slice(0, 1000).forEach((item, index) => errors.push(...schemaErrors(item, schema.items, `${path}[${index}]`)))
  }
  if (types.object(value)) {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${path}.${key}: properti wajib tidak ditemukan`)
    for (const [key, childSchema] of Object.entries(schema.properties || {})) if (key in value) errors.push(...schemaErrors(value[key], childSchema, `${path}.${key}`))
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in (schema.properties || {}))) errors.push(`${path}.${key}: properti tambahan tidak diizinkan`)
  }
  return errors
}

export function JsonStudioModal({ onClose }) {
  const [tab, setTab] = useState('format')
  const [input, setInput] = useState('{\n  "name": "Tools Slate",\n  "active": true,\n  "tools": ["JSON", "PDF"]\n}')
  const [schema, setSchema] = useState('{\n  "type": "object",\n  "required": ["name", "active"],\n  "properties": {\n    "name": { "type": "string", "minLength": 1 },\n    "active": { "type": "boolean" }\n  }\n}')
  const [second, setSecond] = useState(`{\n  "name": "Tools Slate",\n  "active": false\n}`)
  const [path, setPath] = useState('$.name')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const format = minify => {
    setError(''); setStatus('')
    try { const value = JSON.parse(input); setOutput(minify ? JSON.stringify(value) : JSON.stringify(value, null, 2)); setStatus('JSON valid.') }
    catch (error) { setError(`JSON tidak valid: ${error.message}`) }
  }
  const validate = () => {
    setError(''); setOutput('')
    try {
      const value = JSON.parse(input), parsedSchema = JSON.parse(schema)
      if (!parsedSchema || typeof parsedSchema !== 'object' || Array.isArray(parsedSchema)) throw new Error('Schema harus berupa objek JSON Schema.')
      const errors = schemaErrors(value, parsedSchema)
      setOutput(errors.length ? errors.map((item, i) => `${i + 1}. ${item}`).join('\n') : 'Valid — data memenuhi aturan schema.')
      setStatus(errors.length ? `${errors.length} masalah ditemukan` : 'Schema cocok')
    } catch (error) { setError(error.message || 'Data/schema tidak valid.') }
  }
  const diff = () => {
    setError(''); setOutput('')
    try {
      const left = JSON.parse(input), right = JSON.parse(second), changes = []
      const walk = (a, b, at = '$') => {
        if (JSON.stringify(a) === JSON.stringify(b)) return
        if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
          const keys = new Set([...Object.keys(a), ...Object.keys(b)])
          for (const key of keys) {
            const child = Array.isArray(a) ? `${at}[${key}]` : `${at}.${key}`
            if (!(key in a)) changes.push(`+ ${child}: ${JSON.stringify(b[key])}`)
            else if (!(key in b)) changes.push(`- ${child}: ${JSON.stringify(a[key])}`)
            else walk(a[key], b[key], child)
          }
        } else changes.push(`~ ${at}\n  lama: ${JSON.stringify(a)}\n  baru: ${JSON.stringify(b)}`)
      }
      walk(left, right)
      setOutput(changes.length ? changes.join('\n') : 'Tidak ada perbedaan.')
      setStatus(`${changes.length} perubahan`)
    } catch (error) { setError(`JSON tidak valid: ${error.message}`) }
  }
  const query = () => {
    setError(''); setOutput('')
    try { const value = parsePath(JSON.parse(input), path); setOutput(JSON.stringify(value, null, 2)); setStatus('Hasil JSONPath sederhana') }
    catch (error) { setError(error.message || 'JSONPath tidak valid.') }
  }

  return <ModalShell title="JSON Studio" subtitle="Format, validasi schema, diff, dan JSONPath" icon={FileJson} onClose={onClose}>
    <Tabs value={tab} onChange={setTab} items={[{id:'format',label:'Format'},{id:'schema',label:'Schema'},{id:'diff',label:'Diff'},{id:'path',label:'JSONPath'}]}/>
    <div className={tab === 'diff' ? 'advanced-two-col' : ''}>
      <Field label={tab === 'diff' ? 'JSON A' : 'JSON input'} hint="Maksimal sesuai memori browser"><textarea className="advanced-code json-editor" value={input} onChange={event => {setInput(event.target.value);setOutput('');setError('')}} spellCheck="false"/></Field>
      {tab === 'schema' && <Field label="JSON Schema (subset umum)"><textarea className="advanced-code json-editor" value={schema} onChange={event => setSchema(event.target.value)} spellCheck="false"/></Field>}
      {tab === 'diff' && <Field label="JSON B"><textarea className="advanced-code json-editor" value={second} onChange={event => setSecond(event.target.value)} spellCheck="false"/></Field>}
      {tab === 'path' && <Field label="JSONPath sederhana" hint="Contoh: $.user.name atau $[0].id"><input className="advanced-input" value={path} onChange={event => setPath(event.target.value)}/></Field>}
    </div>
    <div className="advanced-actions">
      {tab === 'format' && <><button className="run-btn" onClick={() => format(false)}><Check size={16}/> Format</button><button className="advanced-secondary" onClick={() => format(true)}>Minify</button></>}
      {tab === 'schema' && <button className="run-btn" onClick={validate}><CheckCircle2 size={16}/> Validasi schema</button>}
      {tab === 'diff' && <button className="run-btn" onClick={diff}><Activity size={16}/> Bandingkan JSON</button>}
      {tab === 'path' && <button className="run-btn" onClick={query}><Play size={16}/> Jalankan query</button>}
      {output && <CopyButton value={output}/>}
    </div>
    {error && <Notice tone="error">{error}</Notice>}{status && <Notice>{status}</Notice>}
    {output && <pre className="advanced-output">{output}</pre>}
  </ModalShell>
}

function parsePageRanges(text, pageCount) {
  const groups = text.split(';').map(group => group.trim()).filter(Boolean)
  if (!groups.length) throw new Error('Masukkan rentang halaman. Gunakan koma untuk urutan halaman dan titik koma untuk beberapa file hasil; contoh 1-3;4-6.')
  return groups.map(group => {
    const pages = []
    for (const token of group.split(',').map(part => part.trim()).filter(Boolean)) {
      const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
      if (!match) throw new Error(`Rentang halaman “${token}” tidak valid.`)
      const first = Number(match[1]), last = Number(match[2] || match[1])
      if (first < 1 || last < first || last > pageCount) throw new Error(`Rentang ${token} di luar jumlah halaman (${pageCount}).`)
      for (let page = first; page <= last; page++) pages.push(page - 1)
    }
    return pages
  })
}

export function PdfToolkitModal({ onClose }) {
  const [mode, setMode] = useState('merge')
  const [files, setFiles] = useState([])
  const [range, setRange] = useState('1-2;3-4')
  const [compressQuality, setCompressQuality] = useState(68)
  const [compressScale, setCompressScale] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const pick = event => { setFiles(Array.from(event.target.files || [])); setError(''); setMessage(''); event.target.value = '' }
  const process = async () => {
    setError(''); setMessage(''); setProgress(0)
    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    if (!pdfFiles.length) { setError('Pilih setidaknya satu file PDF.'); return }
    if (pdfFiles.some(file => file.size > 60 * 1024 * 1024)) { setError('Setiap PDF dibatasi maksimal 60 MB.'); return }
    if (pdfFiles.length > 12 || pdfFiles.reduce((total, file) => total + file.size, 0) > 150 * 1024 * 1024) { setError('Maksimal 12 file dan total ukuran 150 MB.'); return }
    if (mode === 'merge' && pdfFiles.length < 2) { setError('Pilih minimal dua PDF untuk digabung.'); return }
    if (mode !== 'merge' && pdfFiles.length !== 1) { setError('Untuk ekstrak, susun ulang, atau optimasi, pilih tepat satu PDF.'); return }
    setBusy(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      if (mode === 'merge') {
        const merged = await PDFDocument.create()
        for (let i = 0; i < pdfFiles.length; i++) {
          const source = await PDFDocument.load(await pdfFiles[i].arrayBuffer(), { ignoreEncryption: false })
          const pages = await merged.copyPages(source, source.getPageIndices())
          pages.forEach(page => merged.addPage(page))
          setProgress(Math.round((i + 1) / pdfFiles.length * 100))
        }
        const bytes = await merged.save({ useObjectStreams: true })
        saveBlob(new Blob([bytes], { type: 'application/pdf' }), 'gabungan-tools-slate.pdf')
        setMessage(`${pdfFiles.length} PDF berhasil digabung.`)
      } else if (mode === 'compress') {
        const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
        ])
        GlobalWorkerOptions.workerSrc = workerModule.default
        const task = getDocument({ data: new Uint8Array(await pdfFiles[0].arrayBuffer()) })
        const document = await task.promise
        if (document.numPages > 100) throw new Error('Mode kompres dibatasi 100 halaman agar aman di browser.')
        const compressed = await PDFDocument.create()
        try {
          for (let number = 1; number <= document.numPages; number++) {
            const page = await document.getPage(number)
            const originalViewport = page.getViewport({ scale: 1 })
            const viewport = page.getViewport({ scale: Number(compressScale) })
            if (viewport.width * viewport.height > 20_000_000) throw new Error('Halaman terlalu besar untuk rasterisasi di browser. Pilih skala kompresi lebih rendah.')
            const canvas = window.document.createElement('canvas')
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
            const context = canvas.getContext('2d', { alpha: false })
            if (!context) throw new Error('Canvas tidak tersedia di browser.')
            context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
            await page.render({ canvasContext: context, viewport }).promise
            const jpeg = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gagal mengompresi halaman PDF.')), 'image/jpeg', Number(compressQuality) / 100))
            const image = await compressed.embedJpg(await jpeg.arrayBuffer())
            const outputPage = compressed.addPage([originalViewport.width, originalViewport.height])
            outputPage.drawImage(image, { x: 0, y: 0, width: originalViewport.width, height: originalViewport.height })
            canvas.width = 0; canvas.height = 0; page.cleanup()
            setProgress(Math.round(number / document.numPages * 100))
          }
          const bytes = await compressed.save({ useObjectStreams: true })
          saveBlob(new Blob([bytes], { type: 'application/pdf' }), 'pdf-terkompres-tools-slate.pdf')
          setMessage(`Kompresi raster ${document.numPages} halaman selesai. Ukuran: ${formatBytes(pdfFiles[0].size)} → ${formatBytes(bytes.length)}.`)
        } finally { await document.destroy() }
      } else {
        const source = await PDFDocument.load(await pdfFiles[0].arrayBuffer(), { ignoreEncryption: false })
        if (mode === 'optimize') {
          source.setTitle(''); source.setAuthor(''); source.setSubject(''); source.setKeywords([]); source.setCreator('Tools Slate'); source.setProducer('Tools Slate')
          const bytes = await source.save({ useObjectStreams: true })
          saveBlob(new Blob([bytes], { type: 'application/pdf' }), 'pdf-dioptimalkan.pdf')
          setMessage('PDF berhasil dioptimalkan.')
        } else {
          const groups = mode === 'split' ? parsePageRanges(range, source.getPageCount()) : [parsePageRanges(range, source.getPageCount()).flat()]
          const { default: JSZip } = await import('jszip')
          const zip = new JSZip()
          for (let index = 0; index < groups.length; index++) {
            const output = await PDFDocument.create()
            const pages = await output.copyPages(source, groups[index])
            pages.forEach(page => output.addPage(page))
            const bytes = await output.save({ useObjectStreams: true })
            const label = mode === 'split' ? `bagian-${String(index + 1).padStart(2, '0')}.pdf` : 'halaman-terpilih.pdf'
            zip.file(label, bytes)
            setProgress(Math.round((index + 1) / groups.length * 100))
          }
          if (mode === 'split') saveBlob(await zip.generateAsync({ type: 'blob' }), 'hasil-split-tools-slate.zip')
          else saveBlob(await zip.file('halaman-terpilih.pdf').async('blob'), 'halaman-terpilih.pdf')
          setMessage(mode === 'split' ? `${groups.length} bagian PDF dibuat dalam ZIP.` : 'Halaman berhasil diekstrak dan disusun sesuai urutan pilihan.')
        }
      }
    } catch (error) { setError(error.message?.includes('encrypted') ? 'PDF terenkripsi/password-protected belum didukung.' : error.message || 'Gagal memproses PDF.') }
    finally { setBusy(false) }
  }
  return <ModalShell title="PDF Toolkit" subtitle="Gabungkan, pisahkan, susun, dan optimalkan PDF" icon={FileText} onClose={onClose}>
    <Tabs value={mode} onChange={next => {setMode(next);setError('');setMessage('')}} items={[{id:'merge',label:'Gabung'},{id:'split',label:'Pisah'},{id:'extract',label:'Susun / ekstrak'},{id:'compress',label:'Kompres'},{id:'optimize',label:'Optimasi'}]}/>
    <Field label={mode === 'merge' ? 'Pilih beberapa PDF' : 'Pilih PDF'} hint="Maksimal 60 MB per file"><input className="advanced-file-input" type="file" accept="application/pdf,.pdf" multiple={mode === 'merge'} onChange={pick}/></Field>
    {files.length > 0 && <div className="advanced-file-list">{files.map((file, index) => <div key={`${file.name}-${index}`}><FileText size={15}/><span>{file.name}<small>{formatBytes(file.size)}</small></span><button className="advanced-quiet-btn" onClick={() => setFiles(files.filter((_, i) => i !== index))} aria-label={`Hapus ${file.name}`}><Trash2 size={14}/></button></div>)}</div>}
    {(mode === 'split' || mode === 'extract') && <Field label={mode === 'split' ? 'Kelompok halaman' : 'Urutan halaman'} hint={mode === 'split' ? 'Titik koma memisahkan file hasil; koma mengurutkan halaman.' : 'Contoh 3,1,2 untuk menyusun ulang'}><input className="advanced-input" value={range} onChange={event => setRange(event.target.value)} placeholder={mode === 'split' ? '1-3;4-6' : '3,1,2'}/></Field>}
    {mode === 'compress' && <div className="advanced-two-col"><Field label={`Kualitas JPEG ${compressQuality}%`}><input className="advanced-range" type="range" min="45" max="92" value={compressQuality} onChange={event => setCompressQuality(Number(event.target.value))}/></Field><Field label="Resolusi raster"><select className="advanced-select" value={compressScale} onChange={event => setCompressScale(event.target.value)}><option value="0.75">Rendah — file lebih kecil</option><option value="1">Standar</option><option value="1.25">Tinggi — detail lebih baik</option></select></Field></div>}
    {error && <Notice tone="error">{error}</Notice>}{message && <Notice>{message}</Notice>}
    {busy && <div className="media-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${progress}%`}}/></div>}
    <button className="run-btn advanced-run" onClick={process} disabled={busy || !files.length}>{busy ? <LoaderCircle className="spin" size={17}/> : <Download size={16}/>} {busy ? 'Memproses PDF…' : 'Proses PDF'}</button>
  </ModalShell>
}

export function ImagePrivacyModal({ onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [format, setFormat] = useState('image/webp')
  const [quality, setQuality] = useState(82)
  const [maxWidth, setMaxWidth] = useState(2400)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const resultUrl = useRef('')
  const previewUrl = useRef('')
  useEffect(() => () => { if (resultUrl.current) URL.revokeObjectURL(resultUrl.current); if (previewUrl.current) URL.revokeObjectURL(previewUrl.current) }, [])
  const choose = next => {
    setError(''); setResult(null); setFile(null); setPreview('')
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current)
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    resultUrl.current = ''; previewUrl.current = ''
    if (!next) return
    if (!next.type.startsWith('image/')) { setError('Pilih file gambar yang valid.'); return }
    if (next.size > 30 * 1024 * 1024) { setError('Ukuran gambar maksimal 30 MB.'); return }
    const url = URL.createObjectURL(next); previewUrl.current = url; setPreview(url); setFile(next)
  }
  const process = async () => {
    if (!file || !preview) return
    setError(''); setBusy(true)
    try {
      const image = new window.Image(); image.src = preview; await image.decode()
      if (image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error('Resolusi sumber terlalu besar untuk diproses di browser.')
      const scale = Math.min(1, Number(maxWidth) / image.naturalWidth)
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas tidak tersedia.')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Gagal mengekspor gambar.')), format, quality / 100))
      if (blob.type !== format) throw new Error('Format ini tidak didukung browser. Pilih JPEG, PNG, atau WebP.')
      const url = URL.createObjectURL(blob); if (resultUrl.current) URL.revokeObjectURL(resultUrl.current); resultUrl.current = url
      setResult({ url, blob, width: canvas.width, height: canvas.height })
    } catch (error) { setError(error.message || 'Gagal memproses gambar.') }
    finally { setBusy(false) }
  }
  const ext = format === 'image/jpeg' ? 'jpg' : format.split('/')[1]
  return <ModalShell title="Image Privacy Lab" subtitle="Konversi, kompres, resize, dan hapus metadata gambar" icon={ImageIcon} onClose={onClose}>
    <Field label="Pilih gambar" hint="JPG, PNG, WebP, AVIF bila didukung browser · maks. 30 MB"><input className="advanced-file-input" type="file" accept="image/*" onChange={event => {choose(event.target.files?.[0]); event.target.value = ''}}/></Field>
    {file && <div className="advanced-image-preview"><img src={preview} alt="Pratinjau gambar asli"/><div><b>{file.name}</b><small>{file.type || 'image'} · {formatBytes(file.size)}</small></div></div>}
    <div className="advanced-two-col"><Field label="Format output"><select className="advanced-select" value={format} onChange={event => setFormat(event.target.value)}><option value="image/webp">WebP — ukuran efisien</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></Field><Field label="Lebar maksimal (px)"><input className="advanced-input" type="number" min="128" max="12000" value={maxWidth} onChange={event => setMaxWidth(Math.max(128, Math.min(12000, Number(event.target.value) || 128)))}/></Field></div>
    {format !== 'image/png' && <Field label={`Kualitas ${quality}%`}><input className="advanced-range" type="range" min="25" max="100" value={quality} onChange={event => setQuality(Number(event.target.value))}/></Field>}
    {error && <Notice tone="error">{error}</Notice>}
    {file && <button className="run-btn advanced-run" onClick={process} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <RefreshCw size={16}/>} {busy ? 'Memproses…' : 'Proses gambar'}</button>}
    {result && <div className="advanced-result"><div className="advanced-result-head"><div><b>Hasil siap</b><small>{result.width} × {result.height} px · {formatBytes(result.blob.size)} (asli {formatBytes(file.size)})</small></div><a className="advanced-download" href={result.url} download={`tools-slate-image.${ext}`}><Download size={15}/> Unduh</a></div><img className="advanced-image-output" src={result.url} alt="Hasil gambar yang sudah dibersihkan"/></div>}
  </ModalShell>
}

export function OcrWorkbenchModal({ onClose }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [language, setLanguage] = useState('eng+ind')
  const [text, setText] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const workerRef = useRef(null)
  const previewRef = useRef('')
  useEffect(() => () => { workerRef.current?.terminate().catch(() => {}); if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])
  const choose = next => {
    setError(''); setText(''); setStatus(''); setProgress(0); setFile(null); setPreview('')
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = ''
    if (!next) return
    if (!next.type.startsWith('image/')) { setError('Pilih file gambar.'); return }
    if (next.size > 15 * 1024 * 1024) { setError('Ukuran maksimal gambar 15 MB.'); return }
    previewRef.current = URL.createObjectURL(next); setPreview(previewRef.current); setFile(next)
  }
  const recognize = async () => {
    if (!file) return
    setError(''); setText(''); setBusy(true); setProgress(0)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(language, 1, { logger: event => { if (event.status) setStatus(event.status === 'recognizing text' ? 'Membaca teks' : event.status); if (event.progress !== undefined) setProgress(Math.round(event.progress * 100)) } })
      workerRef.current = worker
      const result = await worker.recognize(file)
      setText(result.data.text || '')
      setStatus('Selesai')
      await worker.terminate()
      workerRef.current = null
    } catch (error) { setError(error.message || 'OCR gagal. Periksa koneksi untuk mengunduh model bahasa.') }
    finally { setBusy(false) }
  }
  return <ModalShell title="OCR Gambar" subtitle="Ekstrak teks dari foto atau screenshot" icon={FileSearch} onClose={onClose}>
    <Field label="Pilih gambar" hint="JPG, PNG, WebP · maksimal 15 MB"><input className="advanced-file-input" type="file" accept="image/*" onChange={event => {choose(event.target.files?.[0]); event.target.value = ''}}/></Field>
    {file && <div className="advanced-image-preview"><img src={preview} alt="Gambar untuk OCR"/><div><b>{file.name}</b><small>{formatBytes(file.size)}</small></div></div>}
    <Field label="Bahasa teks"><select className="advanced-select" value={language} onChange={event => setLanguage(event.target.value)} disabled={busy}><option value="eng+ind">Inggris + Indonesia</option><option value="ind">Indonesia</option><option value="eng">Inggris</option></select></Field>
    {error && <Notice tone="error">{error}</Notice>}
    {file && <button className="run-btn advanced-run" onClick={recognize} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <FileSearch size={16}/>} {busy ? `${status || 'Memuat OCR'}… ${progress}%` : 'Ekstrak teks'}</button>}
    {busy && <div className="media-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{width:`${progress}%`}}/></div>}
    {text && <div className="advanced-result"><div className="advanced-result-head"><div><b>Teks terdeteksi</b><small>{text.trim().split(/\s+/).filter(Boolean).length} kata</small></div><CopyButton value={text}/></div><textarea className="advanced-code ocr-output" value={text} onChange={event => setText(event.target.value)}/></div>}
  </ModalShell>
}

async function dnsQuery(name, type) {
  const params = new URLSearchParams({ name, type, do: 'true' })
  const response = await fetch(`https://dns.google/resolve?${params}`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`DNS-over-HTTPS menjawab ${response.status}`)
  return response.json()
}
function normalizeDomain(value) {
  let raw = value.trim().toLowerCase()
  try { if (raw.includes('://')) raw = new URL(raw).hostname; else raw = raw.split('/')[0].split(':')[0] } catch { /* validate below */ }
  raw = raw.replace(/\.$/, '')
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(raw)) throw new Error('Masukkan nama domain valid, misalnya example.com.')
  return raw
}
export function DomainSecurityModal({ onClose }) {
  const [domain, setDomain] = useState('example.com')
  const [selector, setSelector] = useState('default')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const check = async () => {
    setError(''); setReport(null)
    let host
    try { host = normalizeDomain(domain) } catch (error) { setError(error.message); return }
    const selectorValue = selector.trim().replace(/[^a-z0-9-]/gi, '')
    if (!selectorValue) { setError('Masukkan selector DKIM yang valid atau gunakan default.'); return }
    setBusy(true)
    try {
      const [txt, dmarc, dkim, caa, mx, aaaa] = await Promise.all([
        dnsQuery(host, 'TXT'), dnsQuery(`_dmarc.${host}`, 'TXT'), dnsQuery(`${selectorValue}._domainkey.${host}`, 'TXT'), dnsQuery(host, 'CAA'), dnsQuery(host, 'MX'), dnsQuery(host, 'AAAA'),
      ])
      const answers = txt.Answer || []
      const spf = answers.filter(answer => answer.data?.replaceAll('"', '').toLowerCase().startsWith('v=spf1'))
      const dmarcAnswers = (dmarc.Answer || []).filter(answer => answer.data?.toLowerCase().includes('v=dmarc1'))
      const dkimAnswers = (dkim.Answer || []).filter(answer => answer.data?.toLowerCase().includes('v=dkim1') || answer.data?.toLowerCase().includes('p='))
      const result = { host, spf, dmarc: dmarcAnswers, dkim: dkimAnswers, caa: caa.Answer || [], mx: mx.Answer || [], aaaa: aaaa.Answer || [], dnssec: !!(txt.AD || dmarc.AD), checkedAt: new Date().toLocaleString('id-ID') }
      try {
        const response = await fetch(`/api/cert-transparency?domain=${encodeURIComponent(host)}`, { signal: AbortSignal.timeout(12000) })
        if (response.ok) { const certs = await response.json(); result.certs = Array.isArray(certs) ? certs : [] }
      } catch { /* CT is an optional part of the report */ }
      setReport(result)
    } catch (error) { setError(error.message || 'Pemeriksaan DNS gagal. Coba lagi.') }
    finally { setBusy(false) }
  }
  const rows = report ? [
    ['SPF', report.spf.length ? 'Ditemukan' : 'Belum terdeteksi', report.spf.map(item => item.data).join('\n')],
    ['DMARC', report.dmarc.length ? 'Ditemukan' : 'Belum terdeteksi', report.dmarc.map(item => item.data).join('\n')],
    [`DKIM (${selector.trim() || 'default'})`, report.dkim.length ? 'Ditemukan' : 'Belum terdeteksi', report.dkim.map(item => item.data).join('\n')],
    ['CAA', report.caa.length ? 'Ditemukan' : 'Tidak ada record CAA', report.caa.map(item => item.data).join('\n')],
    ['MX', report.mx.length ? 'Ditemukan' : 'Tidak ada record MX', report.mx.map(item => item.data).join('\n')],
    ['DNSSEC', report.dnssec ? 'DNS-over-HTTPS menandai AD' : 'AD tidak terdeteksi', 'Indikator validasi dari resolver publik'],
    ['Sertifikat publik', report.certs ? `${report.certs.length} entri CT` : 'CT tidak tersedia di deployment ini', ''],
  ] : []
  return <ModalShell title="Domain Security Checker" subtitle="Periksa DNS, email authentication, dan sertifikat publik" icon={ShieldCheck} onClose={onClose}>
    <Field label="Domain"><input className="advanced-input" value={domain} onChange={event => setDomain(event.target.value)} placeholder="example.com" onKeyDown={event => event.key === 'Enter' && !busy && check()}/></Field>
    <Field label="Selector DKIM" hint="Selector tidak dapat ditemukan otomatis; isi sesuai konfigurasi domain"><input className="advanced-input" value={selector} onChange={event => setSelector(event.target.value)} placeholder="default"/></Field>
    {error && <Notice tone="error">{error}</Notice>}
    <button className="run-btn advanced-run" onClick={check} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <ShieldCheck size={16}/>} {busy ? 'Memeriksa DNS…' : 'Jalankan pemeriksaan'}</button>
    {report && <div className="domain-report"><div className="domain-report-title"><b>{report.host}</b><small>Diperiksa {report.checkedAt}</small></div>{rows.map(([name, status, detail]) => <div className="domain-check-row" key={name}><span className={status.includes('Ditemukan') || status.includes('entri') || status.includes('menandai') ? 'check-positive' : 'check-neutral'}>{status.includes('Ditemukan') || status.includes('entri') || status.includes('menandai') ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}</span><div><b>{name}</b><small>{status}</small>{detail && <code>{detail}</code>}</div></div>)}</div>}
  </ModalShell>
}

export function RegexWorkbenchModal({ onClose }) {
  const [pattern, setPattern] = useState('(?<email>[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,})')
  const [flags, setFlags] = useState('i')
  const [text, setText] = useState('Hubungi support@example.com atau sales@tools-slate.dev untuk bantuan.')
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const test = async () => {
    setError(''); setMatches([])
    if (pattern.length > 256 || text.length > 12000) { setError('Batas aman: pola 256 karakter dan teks 12.000 karakter.'); return }
    if (/[^dgimsuvy]/.test(flags) || new Set(flags).size !== flags.length) { setError('Flag regex tidak valid atau terduplikasi.'); return }
    setBusy(true)
    const workerSource = `self.onmessage=({data})=>{try{const flags=data.flags.includes('g')?data.flags:data.flags+'g';const re=new RegExp(data.pattern,flags);const out=[];let match;while((match=re.exec(data.text))&&out.length<100){out.push({match:match[0],index:match.index,groups:match.groups||{},captures:match.slice(1)});if(match[0]==='' )re.lastIndex++}postMessage({out})}catch(e){postMessage({error:e.message})}}`
    const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))
    const worker = new Worker(workerUrl)
    const timer = setTimeout(() => { worker.terminate(); URL.revokeObjectURL(workerUrl); setBusy(false); setError('Pola memerlukan waktu terlalu lama; eksekusi dihentikan.') }, 1500)
    worker.onmessage = event => { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(workerUrl); setBusy(false); if (event.data.error) setError(event.data.error); else setMatches(event.data.out) }
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(workerUrl); setBusy(false); setError('Worker regex gagal dijalankan.') }
    worker.postMessage({ pattern, flags, text })
  }
  return <ModalShell title="Regex Workbench" subtitle="Uji pola, flag, grup tangkapan, dan indeks hasil" icon={FileSearch} onClose={onClose}>
    <Field label="Regular expression" hint="Tulis pola tanpa garis miring pembungkus"><input className="advanced-input mono-input" value={pattern} onChange={event => setPattern(event.target.value)}/></Field>
    <Field label="Flags" hint="g i m s u d y"><input className="advanced-input mono-input" value={flags} onChange={event => setFlags(event.target.value)} maxLength={7}/></Field>
    <Field label="Teks uji" hint="Maksimal 12.000 karakter"><textarea className="advanced-code json-editor" value={text} onChange={event => setText(event.target.value)} maxLength={12000}/></Field>
    {error && <Notice tone="error">{error}</Notice>}
    <button className="run-btn advanced-run" onClick={test} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Play size={16}/>} {busy ? 'Menguji…' : 'Jalankan regex'}</button>
    {matches.length > 0 && <div className="advanced-result"><div className="advanced-result-head"><div><b>{matches.length} hasil</b></div></div><div className="regex-match-list">{matches.map((item, index) => <div key={`${item.index}-${index}`}><span>{index + 1}</span><code>{item.match || '(empty match)'}</code><small>@ {item.index} · grup: {JSON.stringify(item.groups)} · captures: {JSON.stringify(item.captures)}</small></div>)}</div></div>}
  </ModalShell>
}

function decodeBase64Url(part) {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
export function JwtWorkbenchModal({ onClose }) {
  const [token, setToken] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const decode = () => {
    setError(''); setParsed(null)
    const parts = token.trim().split('.')
    if (parts.length !== 3) { setError('JWT harus terdiri dari tiga segmen yang dipisahkan titik.'); return }
    try {
      const header = JSON.parse(decodeBase64Url(parts[0]))
      const payload = JSON.parse(decodeBase64Url(parts[1]))
      if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') throw new Error('Header/payload harus objek JSON.')
      setParsed({ header, payload, signature: parts[2], now: Math.floor(Date.now() / 1000) })
    } catch (error) { setError(`JWT tidak dapat dibaca: ${error.message}`) }
  }
  const exp = Number(parsed?.payload?.exp)
  const expired = Number.isFinite(exp) ? exp <= parsed?.now : null
  return <ModalShell title="JWT Workbench" subtitle="Decode header dan claims token JWT" icon={ShieldCheck} onClose={onClose}>
    <Field label="Token JWT"><textarea className="advanced-code token-editor" value={token} onChange={event => {setToken(event.target.value);setParsed(null);setError('')}} placeholder="Tempel token JWT di sini…" spellCheck="false"/></Field>
    {error && <Notice tone="error">{error}</Notice>}
    <button className="run-btn advanced-run" onClick={decode}><Play size={16}/> Decode token</button>
    {parsed && <><div className="jwt-claims">{Number.isFinite(exp) && <div><b>Expiration</b><span className={expired ? 'claim-warn' : 'claim-good'}>{expired ? 'Kedaluwarsa' : 'Masih berlaku'} · {new Date(exp * 1000).toLocaleString('id-ID')}</span></div>}{Number.isFinite(Number(parsed.payload.iat)) && <div><b>Issued at</b><span>{new Date(Number(parsed.payload.iat) * 1000).toLocaleString('id-ID')}</span></div>}{parsed.payload.iss && <div><b>Issuer</b><span>{String(parsed.payload.iss)}</span></div>}{parsed.payload.aud && <div><b>Audience</b><span>{Array.isArray(parsed.payload.aud) ? parsed.payload.aud.join(', ') : String(parsed.payload.aud)}</span></div>}</div><div className="advanced-two-col"><div><div className="advanced-code-head"><b>Header</b><CopyButton value={JSON.stringify(parsed.header, null, 2)}/></div><pre className="advanced-output">{JSON.stringify(parsed.header, null, 2)}</pre></div><div><div className="advanced-code-head"><b>Payload</b><CopyButton value={JSON.stringify(parsed.payload, null, 2)}/></div><pre className="advanced-output">{JSON.stringify(parsed.payload, null, 2)}</pre></div></div></>}
  </ModalShell>
}
