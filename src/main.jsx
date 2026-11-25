import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Search, Menu, X, ArrowUpRight, Sparkles, Code2, Image, Type, Hash,
  Globe2, CloudSun, Coins, QrCode, Braces, Link2, Clock3, Palette,
  Calculator, Regex, FileText, Copy, Check, Download, ChevronRight,
  Zap, ShieldCheck, Command, Github, ExternalLink, RefreshCw
} from 'lucide-react'
import './style.css'

const tools = [
  { id:'json', name:'JSON Formatter', desc:'Rapikan, validasi, dan minify data JSON.', category:'Developer', icon:Braces, tag:'Popular' },
  { id:'base64', name:'Base64 Converter', desc:'Encode dan decode teks Base64 dengan cepat.', category:'Developer', icon:Code2 },
  { id:'url', name:'URL Encoder', desc:'Encode dan decode URL atau query string.', category:'Developer', icon:Link2 },
  { id:'hash', name:'SHA-256 Generator', desc:'Buat hash SHA-256 langsung di browser.', category:'Developer', icon:ShieldCheck },
  { id:'uuid', name:'UUID Generator', desc:'Generate UUID v4 untuk kebutuhan development.', category:'Developer', icon:Hash },
  { id:'regex', name:'Regex Tester', desc:'Uji regular expression dan lihat hasil match.', category:'Developer', icon:Regex },
  { id:'html', name:'HTML Entity Encoder', desc:'Encode dan decode karakter khusus HTML.', category:'Developer', icon:Code2 },
  { id:'qr', name:'QR Code Generator', desc:'Buat QR code dari teks, tautan, atau kontak.', category:'Image & Design', icon:QrCode, tag:'Popular' },
  { id:'color', name:'Color Converter', desc:'Konversi HEX, RGB, dan HSL.', category:'Image & Design', icon:Palette },
  { id:'text', name:'Text Case Converter', desc:'Ubah teks ke uppercase, lowercase, dan format lain.', category:'Text', icon:Type },
  { id:'words', name:'Word Counter', desc:'Hitung kata, karakter, kalimat, dan paragraf.', category:'Text', icon:FileText },
  { id:'markdown', name:'Markdown Preview', desc:'Tulis Markdown dan lihat preview langsung.', category:'Text', icon:FileText },
  { id:'timestamp', name:'Unix Timestamp', desc:'Konversi tanggal ke Unix timestamp dan sebaliknya.', category:'Utilities', icon:Clock3 },
  { id:'unit', name:'Unit Converter', desc:'Konversi panjang, berat, dan suhu.', category:'Utilities', icon:RefreshCw },
  { id:'percentage', name:'Percentage Calculator', desc:'Hitung persentase, diskon, dan perubahan nilai.', category:'Utilities', icon:Calculator },
  { id:'weather', name:'Weather Lookup', desc:'Lihat cuaca terkini berdasarkan nama kota.', category:'Online Tools', icon:CloudSun, tag:'API' },
  { id:'currency', name:'Currency Converter', desc:'Konversi mata uang menggunakan kurs referensi.', category:'Online Tools', icon:Coins, tag:'API' },
]
const categories = ['All Tools','Developer','Image & Design','Text','Utilities','Online Tools']

function App(){
  const [active,setActive]=useState('All Tools'), [query,setQuery]=useState(''), [selected,setSelected]=useState(null), [mobile,setMobile]=useState(false)
  const filtered=useMemo(()=>tools.filter(t=>(active==='All Tools'||t.category===active)&&`${t.name} ${t.desc} ${t.category}`.toLowerCase().includes(query.toLowerCase())),[active,query])
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Command size={19}/></span><span>all tools<span className="brand-light"> nexus</span></span></a>
      <nav className="top-links"><a href="#tools">Explore tools</a><a href="#about">About</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub <ExternalLink size={13}/></a></nav>
      <button className="mobile-toggle" onClick={()=>setMobile(!mobile)} aria-label="Toggle navigation">{mobile?<X/>:<Menu/>}</button>
    </header>
    {mobile&&<div className="mobile-menu"><a href="#tools" onClick={()=>setMobile(false)}>Explore tools</a><a href="#about" onClick={()=>setMobile(false)}>About</a></div>}
    <main id="top">
      <section className="hero"><div className="hero-badge"><Sparkles size={14}/> YOUR EVERYDAY TOOLKIT</div><h1>Everything you need.<br/><span>One simple place.</span></h1><p className="hero-copy">A collection of practical online tools to make your daily work faster, easier, and more productive.</p>
        <div className="search-wrap"><Search size={19}/><input value={query} onChange={e=>{setQuery(e.target.value);setActive('All Tools')}} placeholder="Search for a tool..."/><kbd>⌘ K</kbd></div>
        <div className="hero-meta"><span><i className="status-dot"/> 17 tools available</span><span><ShieldCheck size={15}/> Privacy-friendly</span><span><Zap size={15}/> Fast & simple</span></div>
      </section>
      <section className="tools-section" id="tools"><div className="section-heading"><div><div className="eyebrow">TOOLBOX</div><h2>Explore all tools</h2><p>Find the right tool for whatever you're working on.</p></div><span className="result-count">{filtered.length} TOOLS</span></div>
        <div className="category-row">{categories.map(c=><button key={c} className={`category-pill ${active===c?'active':''}`} onClick={()=>setActive(c)}>{c}</button>)}</div>
        {filtered.length?<div className="tool-grid">{filtered.map(t=><ToolCard key={t.id} tool={t} onClick={()=>setSelected(t)}/>)}</div>:<div className="empty"><Search size={28}/><h3>No tools found</h3><p>Try another keyword or category.</p><button onClick={()=>{setQuery('');setActive('All Tools')}}>Clear search</button></div>}
      </section>
      <section className="bottom-banner" id="about"><div className="banner-icon"><Sparkles size={23}/></div><div><h3>Simple tools. More time for what matters.</h3><p>Useful utilities, thoughtfully brought together in one place.</p></div><a href="#tools">Explore tools <ArrowUpRight size={16}/></a></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><Command size={17}/></span><span>all tools<span className="brand-light"> nexus</span></span></a><span>Built for everyday productivity.</span><span>© {new Date().getFullYear()} All Tools Nexus</span></footer>
    {selected&&<ToolModal tool={selected} onClose={()=>setSelected(null)}/>}
  </div>
}
function ToolCard({tool,onClick}){const Icon=tool.icon;return <button className="tool-card" onClick={onClick}><div className="card-top"><span className="tool-icon"><Icon size={20}/></span>{tool.tag&&<span className={`tag ${tool.tag==='API'?'api':''}`}>{tool.tag}</span>}</div><h3>{tool.name}</h3><p>{tool.desc}</p><span className="card-open">Open tool <ArrowUpRight size={15}/></span></button>}
function ToolModal({tool,onClose}){const [value,setValue]=useState(''),[output,setOutput]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[extra,setExtra]=useState(''),[extra2,setExtra2]=useState(''),[result,setResult]=useState(null);const Icon=tool.icon
 const run=async()=>{setError('');setOutput('');setResult(null);try{let out='';switch(tool.id){
 case 'json':{const parsed=JSON.parse(value);out=extra==='minify'?JSON.stringify(parsed):JSON.stringify(parsed,null,2);break}
 case 'base64':out=extra==='decode'?decodeURIComponent(escape(atob(value))):btoa(unescape(encodeURIComponent(value)));break
 case 'url':out=extra==='decode'?decodeURIComponent(value):encodeURIComponent(value);break
 case 'hash':{const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);out=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');break}
 case 'uuid':out=Array.from({length:Math.max(1,Math.min(50,Number(extra)||1))},()=>crypto.randomUUID()).join('\n');break
 case 'html':out=extra==='decode'?new DOMParser().parseFromString(value,'text/html').documentElement.textContent:value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));break
 case 'text':out=({upper:value.toUpperCase(),lower:value.toLowerCase(),title:value.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),sentence:value.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase()),reverse:[...value].reverse().join(''),slug:value.toLowerCase().trim().replace(/[^\w ]+/g,'').replace(/\s+/g,'-')})[extra||'upper'];break
 case 'words':{const words=value.trim()?value.trim().split(/\s+/).length:0;out=`Words: ${words}\nCharacters: ${value.length}\nCharacters (no spaces): ${value.replace(/\s/g,'').length}\nSentences: ${(value.match(/[.!?]+(?=\s|$)/g)||[]).length}\nParagraphs: ${value.trim()?value.trim().split(/\n\s*\n/).length:0}`;break}
 case 'timestamp':{if(extra==='from'){const d=new Date(value);if(Number.isNaN(d.getTime()))throw Error('Tanggal tidak valid.');out=`Unix seconds: ${Math.floor(d.getTime()/1000)}\nUnix milliseconds: ${d.getTime()}`}else{const d=new Date(Number(value)*(value.length<=10?1000:1));if(Number.isNaN(d.getTime()))throw Error('Timestamp tidak valid.');out=d.toLocaleString('id-ID',{dateStyle:'full',timeStyle:'long'})}break}
 case 'unit':{const n=Number(value);if(!Number.isFinite(n))throw Error('Masukkan angka yang valid.');const unit=extra||'km-mi';const map={'km-mi':`${n} km = ${(n*.621371).toFixed(5)} mi`,'mi-km':`${n} mi = ${(n/0.621371).toFixed(5)} km`,'kg-lb':`${n} kg = ${(n*2.20462).toFixed(5)} lb`,'lb-kg':`${n} lb = ${(n/2.20462).toFixed(5)} kg`,'c-f':`${n} °C = ${(n*9/5+32).toFixed(2)} °F`,'f-c':`${n} °F = ${((n-32)*5/9).toFixed(2)} °C`};out=map[unit];break}
 case 'percentage':{const a=Number(value),b=Number(extra2);if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Masukkan kedua angka.');out=`${b}% dari ${a} = ${(a*b/100).toLocaleString('id-ID')}\n${a} adalah ${(a?b/a*100:0).toFixed(2)}% dari ${b}\nPerubahan dari ${a} ke ${b} = ${a?((b-a)/a*100).toFixed(2):'—'}%`;break}
 case 'color':{let hex=value.trim().replace('#','');if(!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex))throw Error('Gunakan HEX seperti #6750A4.');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);const [h,s,l]=rgbToHsl(r,g,b);out=`HEX: #${hex.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;setResult({color:`#${hex}`});break}
 case 'regex':{const flags=extra2||'g';const re=new RegExp(value,flags);const matches=[...extra.matchAll(re)];out=matches.length?matches.map(m=>`Match: ${m[0]} (index ${m.index})`).join('\n'):`No matches found.`;break}
 case 'markdown':out=markdownLite(value);break
 case 'qr':{if(!value.trim())throw Error('Masukkan teks atau URL.');setResult({qr:`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(value)}`});return}
 case 'weather':{setBusy(true);const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=1&language=id&format=json`).then(check);if(!geo.results?.length)throw Error('Kota tidak ditemukan.');const p=geo.results[0];const w=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`).then(check);const c=w.current;out=`${p.name}, ${p.country}\nSuhu: ${c.temperature_2m} °C\nTerasa seperti: ${c.apparent_temperature} °C\nKelembapan: ${c.relative_humidity_2m}%\nAngin: ${c.wind_speed_10m} km/jam\nCurah hujan: ${c.precipitation} mm\nKondisi: ${weatherLabel(c.weather_code)}\nWaktu data: ${c.time}`;break}
 case 'currency':{const from=(extra||'USD').toUpperCase(),to=(extra2||'IDR').toUpperCase(),amount=Number(value);if(!Number.isFinite(amount))throw Error('Jumlah harus berupa angka.');const d=await fetch(`https://api.frankfurter.dev/v2/rate/${from}/${to}`).then(check);out=`${amount.toLocaleString('id-ID')} ${from} = ${(amount*d.rate).toLocaleString('id-ID',{maximumFractionDigits:4})} ${to}\nKurs: 1 ${from} = ${d.rate} ${to}\nTanggal kurs: ${d.date}`;break}
 default:throw Error('Tool belum tersedia.')}
 setOutput(out)
 }catch(e){setError(e.message||'Terjadi kesalahan.')}finally{setBusy(false)}}
 const copy=()=>navigator.clipboard?.writeText(output||'').then(()=>setError('Hasil disalin ke clipboard.')).catch(()=>setError('Clipboard tidak tersedia di browser ini.'))
 const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([output],{type:'text/plain'}));a.download=`${tool.id}-result.txt`;a.click();URL.revokeObjectURL(a.href)}
 const placeholder=({json:'Tempel JSON di sini...',base64:'Masukkan teks atau Base64...',url:'Masukkan URL atau teks...',hash:'Masukkan teks untuk di-hash...',uuid:'Jumlah UUID (default 1)',regex:'Regular expression, contoh: \\w+',html:'Masukkan HTML atau teks...',text:'Ketik atau tempel teks...',words:'Tempel teks untuk dihitung...',timestamp:'Masukkan timestamp atau tanggal ISO...',unit:'Masukkan angka...',percentage:'Angka pertama...',color:'#6750A4',markdown:'## Halo!\nTulis **Markdown** di sini...',qr:'Masukkan teks atau URL untuk QR code...',weather:'Masukkan nama kota, contoh: Surabaya',currency:'Masukkan jumlah...'})[tool.id]
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="tool-modal"><div className="modal-head"><div className="modal-title"><span className="tool-icon"><Icon size={20}/></span><div><h2>{tool.name}</h2><p>{tool.desc}</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X/></button></div>
 <div className="modal-body">{tool.id==='markdown'?<textarea className="work-area" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>:<textarea className="work-area" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>}
 {['json','base64','url','html','timestamp','unit','text'].includes(tool.id)&&<div className="option-row"><label>{tool.id==='json'?'Output':tool.id==='timestamp'?'Convert':tool.id==='unit'?'Conversion':tool.id==='text'?'Text format':'Mode'}</label><select value={extra} onChange={e=>setExtra(e.target.value)}>{(tool.id==='json'?[['pretty','Pretty print'],['minify','Minify']]:tool.id==='timestamp'?[['to','Timestamp to date'],['from','Date to timestamp']]:tool.id==='unit'?[['km-mi','Kilometer → Mile'],['mi-km','Mile → Kilometer'],['kg-lb','Kilogram → Pound'],['lb-kg','Pound → Kilogram'],['c-f','Celsius → Fahrenheit'],['f-c','Fahrenheit → Celsius']]:tool.id==='text'?[['upper','UPPERCASE'],['lower','lowercase'],['title','Title Case'],['sentence','Sentence case'],['reverse','Reverse text'],['slug','URL slug']]:[['encode','Encode'],['decode','Decode']]).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>}
 {tool.id==='uuid'&&<div className="option-row"><label>Jumlah UUID</label><input value={extra} onChange={e=>setExtra(e.target.value)} placeholder="1" type="number" min="1" max="50"/></div>}
 {tool.id==='percentage'&&<div className="option-row"><label>Angka kedua</label><input value={extra2} onChange={e=>setExtra2(e.target.value)} placeholder="Masukkan angka kedua" type="number"/></div>}
 {tool.id==='regex'&&<><div className="option-row"><label>Teks yang diuji</label><input value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Teks yang akan diperiksa"/></div><div className="option-row"><label>Flags</label><input value={extra2} onChange={e=>setExtra2(e.target.value)} placeholder="g"/></div></>}
 {tool.id==='currency'&&<div className="two-options"><div className="option-row"><label>Dari</label><input value={extra||'USD'} onChange={e=>setExtra(e.target.value.toUpperCase())}/></div><div className="option-row"><label>Ke</label><input value={extra2||'IDR'} onChange={e=>setExtra2(e.target.value.toUpperCase())}/></div></div>}
 {tool.id==='color'&&<div className="color-preview" style={{background:/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)?(value.startsWith('#')?value:`#${value}`):'#e5e7eb'}}/>}
 <button className="run-btn" onClick={run} disabled={busy}>{busy?<RefreshCw className="spin" size={17}/>:<Zap size={17}/>} {busy?'Processing...':'Run tool'}</button>
 {error&&<div className={`notice ${error.includes('disalin')?'success':''}`}>{error}</div>}
 {output&&<div className="output-wrap"><div className="output-head"><span>OUTPUT</span><div><button onClick={copy}><Copy size={14}/> Copy</button><button onClick={download}><Download size={14}/> Save</button></div></div><pre>{output}</pre></div>}
 {result?.qr&&<div className="qr-result"><img src={result.qr} alt="Generated QR code"/><a href={result.qr} download="nexus-qr.png" target="_blank" rel="noreferrer"><Download size={15}/> Open / save QR</a></div>}
 {result?.color&&<div className="output-wrap"><div className="output-head"><span>COLOR VALUES</span><button onClick={copy}><Copy size={14}/> Copy</button></div><pre>{output}</pre></div>}
 {tool.id==='markdown'&&<div className="markdown-preview"><div className="output-head"><span>LIVE PREVIEW</span></div><div dangerouslySetInnerHTML={{__html:markdownLite(value)}}/></div>}
 </div></section></div>
}
function check(r){if(!r.ok)throw Error(`API error (${r.status}). Coba lagi nanti.`);return r.json()}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min)h=s=0;else{const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}return[h,s*100,l*100]}
function weatherLabel(code){if(code===0)return 'Cerah';if(code<=3)return 'Berawan';if(code<=48)return 'Berkabut';if(code<=67)return 'Hujan';if(code<=77)return 'Salju';if(code<=82)return 'Hujan';if(code<=86)return 'Hujan salju';return 'Badai petir'}
function markdownLite(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>').replace(/\n/g,'<br/>')}

createRoot(document.getElementById('root')).render(<App/> )
