import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Search, Menu, X, ArrowUpRight, Sparkles, Code2, Type, Hash, CloudSun,
  Coins, QrCode, Braces, Link2, Clock3, Palette, Calculator, Regex, FileText,
  Copy, Download, Zap, ShieldCheck, Command, ExternalLink, RefreshCw, Moon,
  Sun, Star, Globe2, Network, KeyRound, Fingerprint, ScanSearch, LockKeyhole,
  Shield, HeartPulse, Activity, CheckCircle2, AlertTriangle, AudioLines, Volume2, Play,
  SkipForward, UserRound, Info, CircleHelp, MessageCircle, ShoppingCart, Compass,
  DownloadCloud, WandSparkles, Wrench, Grid2X2, Music2, Video, Smartphone
} from 'lucide-react'
import './style.css'
import { tracks, heroVideo } from './media.js'

const tools = [
  { id:'json', name:'JSON Formatter', desc:'Format, validate, dan minify data JSON.', category:'Developer', icon:Braces, tag:'Popular' },
  { id:'base64', name:'Base64 Converter', desc:'Encode dan decode teks Base64.', category:'Developer', icon:Code2 },
  { id:'url', name:'URL Encoder', desc:'Encode dan decode URL atau query string.', category:'Developer', icon:Link2 },
  { id:'hash', name:'SHA-256 Generator', desc:'Buat hash SHA-256 secara lokal di browser.', category:'Developer', icon:ShieldCheck },
  { id:'uuid', name:'UUID Generator', desc:'Generate UUID v4 untuk development.', category:'Developer', icon:Hash },
  { id:'regex', name:'Regex Tester', desc:'Uji regular expression dan hasil match.', category:'Developer', icon:Regex },
  { id:'html', name:'HTML Entity Encoder', desc:'Encode dan decode karakter HTML.', category:'Developer', icon:Code2 },
  { id:'qr', name:'QR Code Generator', desc:'Buat QR code dari teks atau tautan.', category:'Image & Design', icon:QrCode, tag:'Popular' },
  { id:'color', name:'Color Converter', desc:'Konversi HEX, RGB, dan HSL.', category:'Image & Design', icon:Palette },
  { id:'text', name:'Text Case Converter', desc:'Ubah teks ke berbagai format.', category:'Text', icon:Type },
  { id:'words', name:'Word Counter', desc:'Hitung kata, karakter, kalimat, paragraf.', category:'Text', icon:FileText },
  { id:'markdown', name:'Markdown Preview', desc:'Tulis Markdown dan lihat preview.', category:'Text', icon:FileText },
  { id:'timestamp', name:'Unix Timestamp', desc:'Konversi tanggal dan Unix timestamp.', category:'Utilities', icon:Clock3 },
  { id:'unit', name:'Unit Converter', desc:'Konversi panjang, berat, dan suhu.', category:'Utilities', icon:RefreshCw },
  { id:'percentage', name:'Percentage Calculator', desc:'Hitung persentase dan perubahan nilai.', category:'Utilities', icon:Calculator },
  { id:'weather', name:'Weather Lookup', desc:'Cuaca terkini berdasarkan nama kota.', category:'Online Tools', icon:CloudSun, tag:'API' },
  { id:'currency', name:'Currency Converter', desc:'Konversi kurs referensi mata uang.', category:'Online Tools', icon:Coins, tag:'API' },
  { id:'ip', name:'IP Lookup', desc:'Lihat informasi jaringan dan lokasi perkiraan IP.', category:'Security Lab', icon:Globe2, tag:'API' },
  { id:'dns', name:'DNS Lookup', desc:'Periksa record DNS melalui DNS-over-HTTPS.', category:'Security Lab', icon:Network, tag:'API' },
  { id:'jwt', name:'JWT Decoder', desc:'Decode header dan payload token JWT secara lokal.', category:'Security Lab', icon:KeyRound },
  { id:'breach', name:'Password Exposure Check', desc:'Periksa hash password dengan k-anonymity.', category:'Security Lab', icon:Fingerprint, tag:'API' },
  { id:'urlscan', name:'URL Security Analyzer', desc:'Analisis skema, hostname, port, dan indikator URL.', category:'Security Lab', icon:ScanSearch },
  { id:'ssl', name:'Certificate Transparency', desc:'Cari catatan sertifikat TLS publik untuk domain.', category:'Security Lab', icon:LockKeyhole, tag:'API' },
  { id:'terabox', name:'TeraBox Downloader', desc:'Tempat fitur unduh file dari tautan TeraBox.', category:'Downloader', icon:DownloadCloud, tag:'Soon', comingSoon:true },
  { id:'instagram', name:'Instagram Media', desc:'Tempat fitur media Instagram akan ditambahkan.', category:'Downloader', icon:Video, tag:'Soon', comingSoon:true },
  { id:'tiktok', name:'TikTok Media', desc:'Tempat fitur video dan audio TikTok akan ditambahkan.', category:'Downloader', icon:Music2, tag:'Soon', comingSoon:true },
]
const categories = ['All','Downloader','Maker','Tools']
const categoryFor = (tool) => {
  if (tool.category==='Downloader') return 'Downloader'
  if (['weather','currency','ip','dns','ssl','breach'].includes(tool.id)) return 'Tools'
  if (['qr','color','markdown'].includes(tool.id)) return 'Maker'
  if (['json','base64','url','hash','uuid','regex','html','text','words','timestamp','unit','percentage','jwt','urlscan'].includes(tool.id)) return 'Tools'
  return 'Downloader'
}

function App(){
  const [active,setActive]=useState('All'), [query,setQuery]=useState(''), [selected,setSelected]=useState(null), [mobile,setMobile]=useState(false)
  const [menuOpen,setMenuOpen]=useState(false), [playing,setPlaying]=useState(false), [trackIndex,setTrackIndex]=useState(0)
  const audioRef=useRef(null)
  const [dark,setDark]=useState(true), [favorites,setFavorites]=useState(()=>{try{return JSON.parse(localStorage.getItem('tools-slate-favorites')||'[]')}catch{return []}})
  const [onlyFav,setOnlyFav]=useState(false)
  const searchRef=useRef(null)
  const currentTrack=tracks[trackIndex]
  useEffect(()=>{if(!audioRef.current||!currentTrack)return;audioRef.current.src=currentTrack.src;if(playing)audioRef.current.play().catch(()=>setPlaying(false))},[currentTrack,playing])
  useEffect(()=>{
    const onKeyDown=(event)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchRef.current?.focus()}
      if(event.key==='Escape'){if(selected)setSelected(null);else if(menuOpen)setMenuOpen(false);else if(document.activeElement===searchRef.current)searchRef.current.blur()}
    }
    window.addEventListener('keydown',onKeyDown);return ()=>window.removeEventListener('keydown',onKeyDown)
  },[selected,menuOpen])
  const filtered=useMemo(()=>tools.filter(t=>(active==='All'||categoryFor(t)===active)&&(!onlyFav||favorites.includes(t.id))&&`${t.name} ${t.desc} ${t.category}`.toLowerCase().includes(query.toLowerCase())),[active,query,onlyFav,favorites])
  const toggleFav=(id)=>setFavorites(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];localStorage.setItem('tools-slate-favorites',JSON.stringify(next));return next})
  const tabs=[['All',Grid2X2],['Downloader',DownloadCloud],['Maker',WandSparkles],['Tools',Wrench]]
  return <div className={`app-shell ${dark?'theme-dark':'theme-light'} nexus-theme`}>
    <header className="nexus-header">
      <button className="info-trigger" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Menu informasi">{menuOpen?<X/>:<Compass/>}</button>
      <div className="header-info"><strong>Menu Informasi</strong><span>About Dev · Report Bug · Saluran WhatsApp</span></div>
      <div className="audio-dock"><AudioLines/><button title="Volume" disabled={!tracks.length}><Volume2 size={17}/></button><button title={playing?"Pause":"Putar musik"} disabled={!tracks.length} onClick={()=>setPlaying(!playing)}>{playing?<span className="pause-mark">Ⅱ</span>:<Play size={17}/>}</button><button title="Lagu berikutnya" disabled={!tracks.length} onClick={()=>setTrackIndex(i=>(i+1)%tracks.length)}><SkipForward size={17}/></button><audio ref={audioRef} onEnded={()=>setTrackIndex(i=>(i+1)%tracks.length)} /></div>
      <button className="menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Buka menu">{menuOpen?<X/>:<Menu/>}</button>
    </header>
    {menuOpen&&<div className="info-panel"><div className="panel-heading"><div><b>NEXUS MENU</b><span>Informasi dan masukan</span></div><span className="online-pill"><i/> ONLINE</span></div>
      <a className="info-card" href="#about" onClick={()=>setMenuOpen(false)}><span className="info-icon"><UserRound/></span><span><b>About Dev</b><small>Profil developer, toolkit, playlist, dan daftar project.</small></span><ArrowUpRight/></a>
      <a className="info-card" href="mailto:hello@toolsslate.dev?subject=Tools%20Slate%20Feedback"><span className="info-icon"><CircleHelp/></span><span><b>Report Bug, Saran & Ide</b><small>Laporkan bug, kirim saran, ide fitur, dan cek balasan.</small></span><ArrowUpRight/></a>
      <a className="info-card" href="https://github.com/bintang657/tools-slate" target="_blank" rel="noreferrer"><span className="info-icon"><ShoppingCart/></span><span><b>Project & Source Code</b><small>Lihat project dan pembaruan Tools Slate di GitHub.</small></span><ExternalLink/></a>
      <a className="info-card whatsapp" href="https://whatsapp.com/" target="_blank" rel="noreferrer"><span className="info-icon"><MessageCircle/></span><span><b>Komunitas</b><small>Tambahkan tautan komunitas WhatsApp milikmu di konfigurasi.</small></span><ExternalLink/></a>
    </div>}
    <main id="top" className="nexus-main">
      <section className="nexus-hero"><div className="hero-art">{heroVideo&&<video className="hero-video" autoPlay muted loop playsInline onError={e=>{e.currentTarget.style.display="none"}}><source src={heroVideo} type="video/mp4"/></video>}<div className="hero-art-glow"/><div className="hero-art-copy"><span>✦ TOOLS SLATE</span><small>YOUR DIGITAL SPACE</small></div></div></section>
      <section className="visitor-panel"><div className="visitor-avatar"><UserRound/></div><div className="visitor-data"><div><Globe2/> <span>NEGARA</span> <b>Indonesia</b><Smartphone/> <span>DEVICE</span> <b>Web</b></div><div><Globe2/> <span>BROWSER</span> <b>Browser</b><AudioLines/> <span>STATUS</span> <b className="online-text">Online</b></div><div className="visitor-tags"><span className="visitor-chip"><Activity/> Tools aktif</span><span className="visitor-chip role-chip">Member</span><span className="visitor-chip vip-chip">✦ Premium UI</span></div></div></section>
      <section className="tools-section nexus-tools" id="tools"><div className="nexus-toolbar"><div className="category-row">{tabs.map(([name,Icon])=><button key={name} className={`category-pill ${active===name?'active':''}`} onClick={()=>{setActive(name);setOnlyFav(false)}}><Icon size={17}/>{name}</button>)}</div></div>
        <div className="section-heading nexus-section-heading"><div><h2><Grid2X2/> {active==='All'?'Semua Tools':active}</h2><p>Temukan tools yang kamu butuhkan.</p></div><span className="result-count">{filtered.length} TOOLS</span></div>
        <div className="search-wrap nexus-search"><Search size={18}/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari tools..." aria-label="Cari tools"/><kbd>⌘ K</kbd></div>
        {filtered.length?<div className="tool-grid">{filtered.map(t=><ToolCard key={t.id} tool={t} favorite={favorites.includes(t.id)} onFavorite={()=>toggleFav(t.id)} onClick={()=>setSelected(t)}/>)}</div>:<div className="empty"><Search size={28}/><h3>Tools tidak ditemukan</h3><p>Coba kata kunci atau kategori lain.</p><button onClick={()=>{setQuery('');setActive('All');setOnlyFav(false)}}>Reset pencarian</button></div>}
      </section>
      <section className="nexus-footer-card" id="about"><div><b>TOOLS SLATE</b><p>Tools sederhana untuk kebutuhan digital sehari-hari.</p></div><a href="https://github.com/bintang657/tools-slate" target="_blank" rel="noreferrer">GitHub <ExternalLink size={14}/></a></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><Command size={17}/></span><span>TOOLS <b>SLATE</b></span></a><span>Built for everyday productivity.</span><span>© {new Date().getFullYear()} Tools Slate</span></footer>
    {selected&&<ToolModal key={selected.id} tool={selected} onClose={()=>setSelected(null)}/>}
  </div>
}
function ToolCard({tool,onClick,favorite,onFavorite}){const Icon=tool.icon;return <article className={`tool-card ${tool.comingSoon?'coming-soon':''}`} onClick={()=>!tool.comingSoon&&onClick()} onKeyDown={e=>e.key==='Enter'&&!tool.comingSoon&&onClick()} tabIndex={tool.comingSoon?-1:0} role="button"><div className="card-top"><span className="tool-icon"><Icon size={20}/></span><div className="card-badges">{tool.tag&&<span className={`tag ${tool.tag==='API'?'api':''}`}>{tool.tag}</span>}<button className={`fav-btn ${favorite?'saved':''}`} onClick={e=>{e.stopPropagation();onFavorite()}} aria-label="Toggle favorite"><Star size={15} fill={favorite?'currentColor':'none'}/></button></div></div><h3>{tool.name}</h3><p>{tool.desc}</p><span className="card-open">{tool.comingSoon?'Coming soon':'Open tool'} {!tool.comingSoon&&<ArrowUpRight size={15}/>}</span></article>}

function ToolModal({tool,onClose}){
 const [value,setValue]=useState(''),[output,setOutput]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[extra,setExtra]=useState(''),[extra2,setExtra2]=useState(''),[result,setResult]=useState(null)
 const Icon=tool.icon
 const run=async()=>{setError('');setOutput('');setResult(null);setBusy(true);try{let out='';switch(tool.id){
 case 'json':{const p=JSON.parse(value);out=extra==='minify'?JSON.stringify(p):JSON.stringify(p,null,2);break}
 case 'base64':out=extra==='decode'?decodeUtf8(value):encodeUtf8(value);break
 case 'url':out=extra==='decode'?decodeURIComponent(value):encodeURIComponent(value);break
 case 'hash':out=await digestHex('SHA-256',value);break
 case 'uuid':out=Array.from({length:Math.max(1,Math.min(50,Number(extra)||1))},()=>crypto.randomUUID()).join('\n');break
 case 'html':out=extra==='decode'?new DOMParser().parseFromString(value,'text/html').documentElement.textContent:value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));break
 case 'text':out=({upper:value.toUpperCase(),lower:value.toLowerCase(),title:value.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),sentence:value.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase()),reverse:[...value].reverse().join(''),slug:value.toLowerCase().trim().replace(/[^\w ]+/g,'').replace(/\s+/g,'-')})[extra||'upper'];break
 case 'words':{const w=value.trim()?value.trim().split(/\s+/).length:0;out=`Words: ${w}\nCharacters: ${value.length}\nCharacters (no spaces): ${value.replace(/\s/g,'').length}\nSentences: ${(value.match(/[.!?]+(?=\s|$)/g)||[]).length}\nParagraphs: ${value.trim()?value.trim().split(/\n\s*\n/).length:0}`;break}
 case 'timestamp':{if(extra==='from'){const d=new Date(value);if(Number.isNaN(d.getTime()))throw Error('Tanggal tidak valid.');out=`Unix seconds: ${Math.floor(d.getTime()/1000)}\nUnix milliseconds: ${d.getTime()}`}else{const d=new Date(Number(value)*(value.length<=10?1000:1));if(Number.isNaN(d.getTime()))throw Error('Timestamp tidak valid.');out=d.toLocaleString('id-ID',{dateStyle:'full',timeStyle:'long'})}break}
 case 'unit':{const n=Number(value),u=extra||'km-mi';if(!Number.isFinite(n))throw Error('Masukkan angka yang valid.');const m={'km-mi':`${n} km = ${(n*.621371).toFixed(5)} mi`,'mi-km':`${n} mi = ${(n/.621371).toFixed(5)} km`,'kg-lb':`${n} kg = ${(n*2.20462).toFixed(5)} lb`,'lb-kg':`${n} lb = ${(n/2.20462).toFixed(5)} kg`,'c-f':`${n} °C = ${(n*9/5+32).toFixed(2)} °F`,'f-c':`${n} °F = ${((n-32)*5/9).toFixed(2)} °C`};out=m[u];break}
 case 'percentage':{const a=Number(value),b=Number(extra2);if(!value.trim()||!extra2.trim()||!Number.isFinite(a)||!Number.isFinite(b))throw Error('Masukkan kedua angka.');out=`${b}% dari ${a} = ${(a*b/100).toLocaleString('id-ID')}\n${a} adalah ${a?(b/a*100).toFixed(2):'0.00'}% dari ${b}\nPerubahan dari ${a} ke ${b} = ${a?((b-a)/a*100).toFixed(2):'—'}%`;break}
 case 'color':{let h=value.trim().replace('#','');if(!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h))throw Error('Gunakan HEX seperti #6750A4.');if(h.length===3)h=h.split('').map(c=>c+c).join('');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),[hh,s,l]=rgbToHsl(r,g,b);out=`HEX: #${h.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(hh)}, ${Math.round(s)}%, ${Math.round(l)}%)`;setResult({color:`#${h}`});break}
 case 'regex':{const flags=[...new Set((extra2||'g').includes('g')?(extra2||'g'):(extra2||'')+'g')].join('');const re=new RegExp(value,flags);const ms=[...extra.matchAll(re)];out=ms.length?ms.map(m=>`Match: ${m[0]} (index ${m.index})`).join('\n'):'No matches found.';break}
 case 'markdown':out=markdownLite(value);break
 case 'qr':if(!value.trim())throw Error('Masukkan teks atau URL.');setResult({qr:`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(value)}`});break
 case 'weather':{const geo=await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=1&language=id&format=json`);if(!geo.results?.length)throw Error('Kota tidak ditemukan.');const p=geo.results[0],w=await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`),c=w.current;out=`${p.name}, ${p.country}\nSuhu: ${c.temperature_2m} °C\nTerasa seperti: ${c.apparent_temperature} °C\nKelembapan: ${c.relative_humidity_2m}%\nAngin: ${c.wind_speed_10m} km/jam\nCurah hujan: ${c.precipitation} mm\nKondisi: ${weatherLabel(c.weather_code)}\nWaktu data: ${c.time}`;break}
 case 'currency':{const from=(extra||'USD').toUpperCase(),to=(extra2||'IDR').toUpperCase(),amount=Number(value);if(!Number.isFinite(amount))throw Error('Jumlah harus berupa angka.');const d=await fetchJson(`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`);out=`${amount.toLocaleString('id-ID')} ${from} = ${(amount*d.rate).toLocaleString('id-ID',{maximumFractionDigits:4})} ${to}\nKurs: 1 ${from} = ${d.rate} ${to}\nTanggal kurs: ${d.date}`;break}
 case 'ip':{const ip=value.trim();if(ip&&!/^[a-f\d:.]+$/i.test(ip))throw Error('Masukkan alamat IPv4 atau IPv6 yang valid.');const d=await fetchJson(`https://ipwho.is/${ip?encodeURIComponent(ip):''}`);if(!d.success)throw Error(d.message||'IP lookup gagal.');out=`IP: ${d.ip}\nTipe: ${d.type||'—'}\nLokasi: ${[d.city,d.region,d.country].filter(Boolean).join(', ')}\nKoordinat perkiraan: ${d.latitude}, ${d.longitude}\nISP: ${d.connection?.isp||'—'}\nOrganisasi: ${d.connection?.org||'—'}\nASN: ${d.connection?.asn||'—'}\nZona waktu: ${d.timezone?.id||'—'}\n\nLokasi IP bersifat perkiraan dan dapat menunjukkan VPN atau gateway ISP.`;break}
 case 'dns':{const host=normalizeHost(value);if(!host)throw Error('Masukkan domain, misalnya example.org.');const type=extra||'A',d=await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`);const answers=d.Answer||[];out=`Domain: ${host}\nRecord: ${type}\nStatus DNS: ${dnsStatus(d.Status)}\n\n${answers.length?answers.map(a=>`${a.name}  ${a.TTL}s  ${a.data}`).join('\n'):'Tidak ada record yang dikembalikan.'}`;break}
 case 'jwt':{const parts=value.trim().split('.');if(parts.length!==3)throw Error('JWT harus memiliki tiga bagian yang dipisahkan titik.');const header=JSON.parse(decodeBase64Url(parts[0])),payload=JSON.parse(decodeBase64Url(parts[1]));out=`HEADER\n${JSON.stringify(header,null,2)}\n\nPAYLOAD\n${JSON.stringify(payload,null,2)}\n\nSIGNATURE\n${parts[2]||'(kosong)'}\n\nCatatan: decode tidak memverifikasi tanda tangan token.`;break}
 case 'breach':{if(!value)throw Error('Masukkan password untuk diperiksa.');const hash=await digestHex('SHA-1',value),prefix=hash.slice(0,5),suffix=hash.slice(5);const response=await fetch(`https://api.pwnedpasswords.com/range/${prefix}`,{headers:{'Add-Padding':'true'}});if(!response.ok)throw Error(`HIBP API error (${response.status}).`);const rows=(await response.text()).split(/\r?\n/),match=rows.find(row=>row.split(':')[0]?.toUpperCase()===suffix.toUpperCase());const count=match?Number(match.split(':')[1]):0;out=match?`STATUS: FOUND\nPassword ditemukan dalam dataset Pwned Passwords.\nJumlah kemunculan: ${count.toLocaleString('id-ID')}\n\nGanti password tersebut dan jangan gunakan ulang di layanan lain.`:'STATUS: NOT FOUND\nTidak ditemukan dalam dataset Pwned Passwords yang diperiksa.';out+='\n\nPrivasi: password di-hash di perangkat. Hanya 5 karakter awal hash yang dikirim; pencocokan akhir dilakukan di browser.';break}
 case 'urlscan':{let u;try{u=new URL(value.includes('://')?value:`https://${value}`)}catch{throw Error('Format URL tidak valid.')}const rows=[['URL',u.href],['Protocol',u.protocol],['Hostname',u.hostname],['Port',u.port||'(default)'],['Path',u.pathname||'/'],['Query parameters',String([...u.searchParams.keys()].length)],['HTTPS',u.protocol==='https:'?'Ya':'Tidak'],['Credentials in URL',u.username||u.password?'Ada':'Tidak'],['Punycode hostname',u.hostname.startsWith('xn--')||u.hostname.includes('.xn--')?'Perlu diperiksa':'Tidak terdeteksi']];out=rows.map(([k,v])=>`${k}: ${v}`).join('\n')+'\n\nAnalisis ini bersifat lokal dan bukan verdict reputasi atau pemindaian malware.';break}
 case 'ssl':{const host=normalizeHost(value);if(!host)throw Error('Masukkan nama domain.');const d=await fetchJson(`/api/cert-transparency?domain=${encodeURIComponent(host)}`);const rows=Array.isArray(d)?d.slice(0,25):[];out=`Domain query: ${host}\nCatatan sertifikat ditemukan: ${Array.isArray(d)?d.length:0}\nMenampilkan maksimal 25 catatan terbaru:\n\n${rows.map(x=>`${x.not_before||'—'} | ${x.common_name||x.name_value||'—'} | ${x.issuer_name||'Issuer tidak tersedia'}`).join('\n')||'Tidak ada catatan yang dikembalikan.'}\n\nCertificate Transparency mencatat sertifikat yang diterbitkan secara publik; hasil bukan pemeriksaan validitas sertifikat saat ini.`;break}
 default:throw Error('Tool belum tersedia.')}
 if(out)setOutput(out)
 }catch(e){setError(e.message||'Terjadi kesalahan.')}finally{setBusy(false)}}
 const copy=()=>navigator.clipboard?.writeText(output).then(()=>setError('Hasil disalin ke clipboard.')).catch(()=>setError('Clipboard tidak tersedia.'))
 const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([output],{type:'text/plain'}));a.download=`tools-slate-${tool.id}-result.txt`;a.click();URL.revokeObjectURL(a.href)}
 const placeholders={json:'Tempel JSON di sini...',base64:'Masukkan teks atau Base64...',url:'Masukkan URL atau teks...',hash:'Masukkan teks untuk di-hash...',uuid:'Jumlah UUID (default 1)',regex:'Regular expression, contoh: \\w+',html:'Masukkan HTML atau teks...',text:'Ketik atau tempel teks...',words:'Tempel teks untuk dihitung...',timestamp:'Masukkan timestamp atau tanggal ISO...',unit:'Masukkan angka...',percentage:'Angka pertama...',color:'#6750A4',markdown:'## Halo!\nTulis **Markdown** di sini...',qr:'Masukkan teks atau URL...',weather:'Masukkan nama kota, contoh: Surabaya',currency:'Masukkan jumlah...',ip:'Kosongkan untuk IP publik kamu, atau masukkan IP...',dns:'Masukkan domain, contoh: example.org',jwt:'Tempel JWT di sini...',breach:'Masukkan password yang ingin diperiksa...',urlscan:'Masukkan URL, contoh: https://example.org',ssl:'Masukkan domain, contoh: example.org'}
 const isTextArea=!['uuid','timestamp','unit','percentage','color','weather','currency','ip','dns','ssl','breach'].includes(tool.id)
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="tool-modal" role="dialog" aria-modal="true" aria-labelledby="tool-dialog-title"><div className="modal-head"><div className="modal-title"><span className="tool-icon"><Icon size={20}/></span><div><h2 id="tool-dialog-title">{tool.name}</h2><p>{tool.desc}</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X/></button></div>
 <div className="modal-body">{isTextArea?<textarea className="work-area" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholders[tool.id]}/>:<input className="single-input" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholders[tool.id]} type={tool.id==='breach'?'password':'text'} autoComplete="off"/>}
 {['json','base64','url','html','timestamp','unit','text','dns'].includes(tool.id)&&<div className="option-row"><label>{tool.id==='json'?'Output':tool.id==='timestamp'?'Convert':tool.id==='unit'?'Conversion':tool.id==='text'?'Text format':tool.id==='dns'?'DNS record':'Mode'}</label><select value={extra} onChange={e=>setExtra(e.target.value)}>{(tool.id==='json'?[['pretty','Pretty print'],['minify','Minify']]:tool.id==='timestamp'?[['to','Timestamp to date'],['from','Date to timestamp']]:tool.id==='unit'?[['km-mi','Kilometer → Mile'],['mi-km','Mile → Kilometer'],['kg-lb','Kilogram → Pound'],['lb-kg','Pound → Kilogram'],['c-f','Celsius → Fahrenheit'],['f-c','Fahrenheit → Celsius']]:tool.id==='text'?[['upper','UPPERCASE'],['lower','lowercase'],['title','Title Case'],['sentence','Sentence case'],['reverse','Reverse text'],['slug','URL slug']]:tool.id==='dns'?[['A','A'],['AAAA','AAAA'],['MX','MX'],['TXT','TXT'],['NS','NS'],['CNAME','CNAME'],['CAA','CAA'],['SOA','SOA']]:[['encode','Encode'],['decode','Decode']]).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>}
 {tool.id==='uuid'&&<OptionInput label="Jumlah UUID" value={extra} setValue={setExtra} placeholder="1"/>}
 {tool.id==='percentage'&&<OptionInput label="Angka kedua" value={extra2} setValue={setExtra2} placeholder="Masukkan angka kedua"/>}
 {tool.id==='regex'&&<><OptionInput label="Teks yang diuji" value={extra} setValue={setExtra} placeholder="Teks yang akan diperiksa"/><OptionInput label="Flags" value={extra2} setValue={setExtra2} placeholder="g"/></>}
 {tool.id==='currency'&&<div className="two-options"><OptionInput label="Dari" value={extra||'USD'} setValue={setExtra} placeholder="USD"/><OptionInput label="Ke" value={extra2||'IDR'} setValue={setExtra2} placeholder="IDR"/></div>}
 {tool.id==='color'&&<div className="color-preview" style={{background:/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)?(value.startsWith('#')?value:`#${value}`):'#64748b'}}/>}
 {tool.id==='breach'&&<p className="privacy-note"><ShieldCheck size={14}/> Password di-hash secara lokal. Hanya 5 karakter awal hash yang dikirim ke layanan pemeriksaan.</p>}
 {['ip','dns','weather','currency','ssl','breach'].includes(tool.id)&&<p className="api-note"><Globe2 size={13}/> Memerlukan koneksi internet dan layanan API pihak ketiga.</p>}
 <button className="run-btn" onClick={run} disabled={busy}>{busy?<RefreshCw className="spin" size={17}/>:<Zap size={17}/>} {busy?'Processing...':'Run tool'}</button>
 {error&&<div className={`notice ${error.includes('disalin')?'success':''}`}>{error}</div>}
 {output&&<div className="output-wrap"><div className="output-head"><span>OUTPUT</span><div><button onClick={copy}><Copy size={14}/> Copy</button><button onClick={download}><Download size={14}/> Save</button></div></div><pre>{output}</pre></div>}
 {result?.qr&&<div className="qr-result"><img src={result.qr} alt="Generated QR code"/><a href={result.qr} download="tools-slate-qr.png" target="_blank" rel="noreferrer"><Download size={15}/> Open / save QR</a></div>}
 {result?.color&&<div className="output-wrap"><div className="output-head"><span>COLOR VALUES</span><button onClick={copy}><Copy size={14}/> Copy</button></div><pre>{output}</pre></div>}
 {tool.id==='markdown'&&<div className="markdown-preview"><div className="output-head"><span>LIVE PREVIEW</span></div><div dangerouslySetInnerHTML={{__html:markdownLite(value)}}/></div>}
 </div></section></div>
}
function OptionInput({label,value,setValue,placeholder}){return <div className="option-row"><label>{label}</label><input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/></div>}
async function fetchJson(url){const r=await fetch(url);if(!r.ok)throw Error(`API error (${r.status}). Periksa input atau coba lagi.`);return r.json()}
async function digestHex(algo,value){const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest(algo,bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}
function encodeUtf8(s){const bytes=new TextEncoder().encode(s);let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)}
function decodeUtf8(s){const bin=atob(s.trim()),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function decodeBase64Url(s){const normalized=s.replace(/-/g,'+').replace(/_/g,'/');return decodeUtf8(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='))}
function normalizeHost(s){let h=s.trim().replace(/^https?:\/\//i,'').split(/[/?#:]/)[0].toLowerCase();if(!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h))return '';return h}
function dnsStatus(n){return ({0:'NOERROR',1:'FORMERR',2:'SERVFAIL',3:'NXDOMAIN',4:'NOTIMP',5:'REFUSED'})[n]||`Code ${n}`}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min)h=s=0;else{const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}return[h,s*100,l*100]}
function weatherLabel(c){if(c===0)return 'Cerah';if(c<=3)return 'Berawan';if(c<=48)return 'Berkabut';if(c<=67)return 'Hujan';if(c<=77)return 'Salju';if(c<=82)return 'Hujan';if(c<=86)return 'Hujan salju';return 'Badai petir'}
function markdownLite(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>').replace(/\n/g,'<br/>')}

createRoot(document.getElementById('root')).render(<App/>)
