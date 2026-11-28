// language: JSX, file: src/main.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import {
  Search, Menu, X, VolumeX, ArrowUpRight, Sparkles, Code2, Type, Hash, CloudSun,
  Coins, QrCode, Braces, Link2, Clock3, Palette, Calculator, Regex, FileText,
  Copy, Download, Zap, ShieldCheck, ExternalLink, RefreshCw, Moon,
  Sun, Star, Globe2, Network, KeyRound, Fingerprint, ScanSearch, LockKeyhole,
  Shield, HeartPulse, Activity, CheckCircle2, AlertTriangle, AudioLines, Volume2, Play,
  SkipBack, SkipForward, UserRound, Info, CircleHelp, MessageCircle, ShoppingCart, Compass, Pause,
  DownloadCloud, WandSparkles, Wrench, Grid2X2, Music2, Video, Smartphone, Image, Battery, BatteryCharging
} from 'lucide-react'
import { PhotoHdModal, Mp4ToMp3Modal } from './media-tools.jsx'
const loadAdvancedModal = name => React.lazy(() => import('./advanced-tools.jsx').then(module => ({ default: module[name] })))
const ApiWorkbenchModal = loadAdvancedModal('ApiWorkbenchModal')
const JsonStudioModal = loadAdvancedModal('JsonStudioModal')
const PdfToolkitModal = loadAdvancedModal('PdfToolkitModal')
const ImagePrivacyModal = loadAdvancedModal('ImagePrivacyModal')
const OcrWorkbenchModal = loadAdvancedModal('OcrWorkbenchModal')
const DomainSecurityModal = loadAdvancedModal('DomainSecurityModal')
const RegexWorkbenchModal = loadAdvancedModal('RegexWorkbenchModal')
const JwtWorkbenchModal = loadAdvancedModal('JwtWorkbenchModal')
const AISlateModal = React.lazy(() => import('./ai-slate.jsx').then(module => ({ default: module.AISlateModal })))
import { musicAlbums } from './music-library.js'
import { filterAndSortTools, getToolStorage, pushRecentTool, readToolIds } from './tool-catalog.js'
import { CustomSelect } from './custom-select.jsx'
import './style.css'
import { heroVideo } from './media.js'

const tools = [
  { id:'json', name:'JSON Studio', desc:'Format, validasi JSON Schema, diff, dan jalankan JSONPath.', category:'Developer', icon:Braces, tag:'Popular' },
  { id:'apiworkbench', name:'API Request Builder', desc:'Kirim request HTTP dan inspeksi respons API.', category:'Developer', icon:Network, tag:'New' },
  { id:'base64', name:'Base64 Converter', desc:'Encode dan decode teks Base64.', category:'Developer', icon:Code2 },
  { id:'url', name:'URL Encoder', desc:'Encode dan decode URL atau query string.', category:'Developer', icon:Link2 },
  { id:'hash', name:'SHA-256 Generator', desc:'Buat hash SHA-256 secara lokal di browser.', category:'Developer', icon:ShieldCheck },
  { id:'uuid', name:'UUID Generator', desc:'Generate UUID v4 untuk development.', category:'Developer', icon:Hash },
  { id:'regex', name:'Regex Workbench', desc:'Uji pola, flag, indeks match, dan capture groups.', category:'Developer', icon:Regex, tag:'New' },
  { id:'html', name:'HTML Entity Encoder', desc:'Encode dan decode karakter HTML.', category:'Developer', icon:Code2 },
  { id:'qr', name:'QR Code Generator', desc:'Buat QR code dari teks atau tautan.', category:'Image & Design', icon:QrCode, tag:'Popular' },
  { id:'photohd', name:'Foto HD Upscaler', desc:'Perbesar resolusi foto hingga 4× secara lokal.', category:'Image & Design', icon:Image, tag:'New' },
  { id:'mp4mp3', name:'MP4 to MP3', desc:'Ekstrak audio MP3 dari video MP4 di browser.', category:'Image & Design', icon:AudioLines, tag:'New' },
  { id:'pdftoolkit', name:'PDF Toolkit', desc:'Gabungkan, pisahkan, susun, dan optimalkan PDF lokal.', category:'Image & Design', icon:FileText, tag:'New' },
  { id:'imageprivacy', name:'Image Privacy Lab', desc:'Konversi, resize, kompres, dan hapus metadata foto.', category:'Image & Design', icon:Image, tag:'New' },
  { id:'ocr', name:'OCR Gambar', desc:'Ekstrak teks dari foto dan screenshot.', category:'Image & Design', icon:ScanSearch, tag:'New' },
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
  { id:'jwt', name:'JWT Workbench', desc:'Decode claims, waktu token, dan peringatan keamanan.', category:'Security Lab', icon:KeyRound, tag:'New' },
  { id:'domainsecurity', name:'Domain Security Checker', desc:'Audit SPF, DMARC, DKIM, DNSSEC, CAA, MX, dan CT.', category:'Security Lab', icon:Shield, tag:'New' },
  { id:'breach', name:'Password Exposure Check', desc:'Periksa hash password dengan k-anonymity.', category:'Security Lab', icon:Fingerprint, tag:'API' },
  { id:'urlscan', name:'URL Security Analyzer', desc:'Analisis skema, hostname, port, dan indikator URL.', category:'Security Lab', icon:ScanSearch },
  { id:'ssl', name:'Certificate Transparency', desc:'Cari catatan sertifikat TLS publik untuk domain.', category:'Security Lab', icon:LockKeyhole, tag:'API' },
  { id:'socialdownloader', name:'Social Media Downloader', desc:'Unduh video publik TikTok dan Instagram.', category:'Downloader', icon:DownloadCloud, tag:'API' },
  { id:'lyricssearch', name:'Lyrics Finder', desc:'Cari lirik lagu berdasarkan judul dan nama artis.', category:'Online Tools', icon:Music2, tag:'API' },
]
const formatTime = value => {const seconds=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
const timezoneCountryCodes = {
  'Asia/Jakarta':'ID','Asia/Pontianak':'ID','Asia/Makassar':'ID','Asia/Jayapura':'ID',
  'Asia/Singapore':'SG','Asia/Kuala_Lumpur':'MY','Asia/Bangkok':'TH','Asia/Manila':'PH',
  'Asia/Ho_Chi_Minh':'VN','Asia/Seoul':'KR','Asia/Tokyo':'JP','Asia/Kolkata':'IN',
  'Asia/Dubai':'AE','Asia/Riyadh':'SA','Europe/London':'GB','Europe/Paris':'FR',
  'Europe/Berlin':'DE','Europe/Rome':'IT','Europe/Madrid':'ES','Europe/Amsterdam':'NL',
  'Europe/Moscow':'RU','America/New_York':'US','America/Chicago':'US','America/Denver':'US',
  'America/Los_Angeles':'US','America/Toronto':'CA','America/Vancouver':'CA',
  'America/Mexico_City':'MX','America/Sao_Paulo':'BR','Australia/Sydney':'AU',
  'Australia/Melbourne':'AU','Pacific/Auckland':'NZ','Africa/Cairo':'EG','Africa/Johannesburg':'ZA',
}

function detectVisitorDetails(){
  const nav=typeof navigator==='undefined'?{}:navigator
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||''
  const localeList=nav.languages?.length?nav.languages:[nav.language]
  const localeRegion=localeList.map(locale=>{try{return new Intl.Locale(locale).region}catch{return null}}).find(Boolean)
  const countryCode=timezoneCountryCodes[timezone]||localeRegion
  let country='Tidak diketahui'
  if(countryCode){try{country=new Intl.DisplayNames(['id'],{type:'region'}).of(countryCode)||countryCode}catch{country=countryCode}}
  const agent=nav.userAgent||''
  const brands=nav.userAgentData?.brands?.map(brand=>brand.brand)||[]
  const browser= /EdgA?\//i.test(agent)||brands.some(brand=>/Microsoft Edge/i.test(brand))?'Edge'
    :/OPR\//i.test(agent)||brands.some(brand=>/Opera/i.test(brand))?'Opera'
    :/SamsungBrowser\//i.test(agent)?'Samsung Internet'
    :/FxiOS|Firefox\//i.test(agent)?'Firefox'
    :/CriOS|Chrome\//i.test(agent)||brands.some(brand=>/Chromium|Google Chrome/i.test(brand))?'Chrome'
    :/Safari\//i.test(agent)?'Safari':'Browser'
  const isTablet=/iPad|Tablet|PlayBook|Silk/i.test(agent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1)
  const isMobile=typeof nav.userAgentData?.mobile==='boolean'?nav.userAgentData.mobile:/Android|iPhone|iPod|Mobile/i.test(agent)
  return {country,browser,device:isTablet?'Tablet':isMobile?'Mobile':'Desktop'}
}

function App(){
  const [active,setActive]=useState('All'), [query,setQuery]=useState(''), [selected,setSelected]=useState(null), [mobile,setMobile]=useState(false), [slateOpen,setSlateOpen]=useState(false)
  const [menuOpen,setMenuOpen]=useState(false), [musicPanelOpen,setMusicPanelOpen]=useState(false), [infoPage,setInfoPage]=useState(null), [playing,setPlaying]=useState(false), [trackIndex,setTrackIndex]=useState(0)
  const [selectedAlbum,setSelectedAlbum]=useState(()=>musicAlbums[0]?.name||''), [volume,setVolume]=useState(0.72), [muted,setMuted]=useState(false)
  const [audioTime,setAudioTime]=useState(0), [audioDuration,setAudioDuration]=useState(0)
  const audioRef=useRef(null)
  const portalRoot=document.getElementById('overlay-root')
  const visualizerRef=useRef(null), audioContextRef=useRef(null), mediaSourceRef=useRef(null), analyserRef=useRef(null)
  const [dark,setDark]=useState(true)
  const [favorites,setFavorites]=useState(()=>readToolIds(getToolStorage(),'tools-slate-favorites',new Set(tools.map(tool => tool.id))))
  const [recentTools,setRecentTools]=useState(()=>readToolIds(getToolStorage(),'tools-slate-recent',new Set(tools.map(tool => tool.id)),8))
  const [onlyFav,setOnlyFav]=useState(false), [onlyRecent,setOnlyRecent]=useState(false), [sortBy,setSortBy]=useState('default')
  const [visitorDetails]=useState(detectVisitorDetails)
  const [batteryInfo,setBatteryInfo]=useState({level:null,charging:false,supported:null})
  useEffect(()=>{
    let disposed=false
    let batteryManager
    let updateBattery
    const unavailable=()=>{if(!disposed)setBatteryInfo({level:null,charging:false,supported:false})}
    if(typeof navigator==='undefined'||typeof navigator.getBattery!=='function'){
      unavailable()
      return()=>{disposed=true}
    }
    navigator.getBattery().then(manager=>{
      if(disposed)return
      batteryManager=manager
      updateBattery=()=>setBatteryInfo({level:Math.round(manager.level*100),charging:manager.charging,supported:true})
      updateBattery()
      manager.addEventListener('levelchange',updateBattery)
      manager.addEventListener('chargingchange',updateBattery)
    }).catch(unavailable)
    return()=>{
      disposed=true
      if(updateBattery){
        batteryManager?.removeEventListener('levelchange',updateBattery)
        batteryManager?.removeEventListener('chargingchange',updateBattery)
      }
    }
  },[])
  const searchRef=useRef(null)
  const albumTracks=musicAlbums.find(album=>album.name===selectedAlbum)?.tracks||[]
  const currentTrack=albumTracks[trackIndex]||albumTracks[0]||null
  const currentAlbum=musicAlbums.find(album=>album.name===selectedAlbum)
  useEffect(()=>{
    if(musicAlbums.length&&!musicAlbums.some(album=>album.name===selectedAlbum)){
      setSelectedAlbum(musicAlbums[0].name)
      setTrackIndex(0)
    }
  },[selectedAlbum])
  useEffect(()=>{const audio=audioRef.current;if(audio){audio.volume=volume;audio.muted=muted}},[volume,muted])
  useEffect(()=>{
    const audio=audioRef.current;if(!audio)return
    const source=currentTrack?.src
    if(!source){audio.pause();audio.removeAttribute('src');audio.load();if(playing)setPlaying(false);return}
    const resolved=new URL(source,document.baseURI).href
    if(audio.src!==resolved){audio.pause();audio.src=source;audio.load();setAudioTime(0);setAudioDuration(0)}
    if(playing){if(audio.paused)audio.play().catch(()=>setPlaying(false))}else if(!audio.paused)audio.pause()
  },[currentTrack,playing])
  const audioAvailable=!!currentTrack
  const canControlVolume=audioAvailable
  const startPlayback=async()=>{
    const audio=audioRef.current;if(!audio||!audioAvailable)return
    try{
      if(!audioContextRef.current){
        const AudioContextClass=window.AudioContext||window.webkitAudioContext
        if(AudioContextClass){
          try{
            const context=new AudioContextClass()
            audioContextRef.current=context
            try{
              mediaSourceRef.current=context.createMediaElementSource(audio)
              const analyser=context.createAnalyser()
              analyser.fftSize=64
              analyser.smoothingTimeConstant=.84
              mediaSourceRef.current.connect(analyser)
              analyser.connect(context.destination)
              analyserRef.current=analyser
            }catch{
              try{mediaSourceRef.current?.connect(context.destination)}catch{}
            }
          }catch{}
        }
      }
      if(audioContextRef.current?.state==='suspended')await audioContextRef.current.resume()
      await audio.play()
    }catch{try{await audio.play()}catch{setPlaying(false)}}
  }
  const togglePlayback=async()=>{
    const audio=audioRef.current;if(!audio||!audioAvailable)return
    if(audio.paused)await startPlayback();else{audio.pause();setPlaying(false)}
  }
  useEffect(()=>{
    const analyser=analyserRef.current
    const container=visualizerRef.current
    if(!playing||!musicPanelOpen||!analyser||!container)return undefined
    const bars=[...container.children]
    const samples=new Uint8Array(analyser.frequencyBinCount)
    const smooth=bars.map(()=>0)
    let frame=0
    const draw=()=>{
      analyser.getByteFrequencyData(samples)
      bars.forEach((bar,index)=>{
        const start=Math.floor(index*samples.length/bars.length)
        const end=Math.max(start+1,Math.floor((index+1)*samples.length/bars.length))
        let energy=0
        for(let bin=start;bin<end;bin++)energy+=samples[bin]
        const level=energy/Math.max(1,end-start)/255
        smooth[index]=smooth[index]*.74+level*.26
        bar.style.setProperty('--level',(0.08+smooth[index]*1.32).toFixed(3))
      })
      frame=requestAnimationFrame(draw)
    }
    frame=requestAnimationFrame(draw)
    return()=>cancelAnimationFrame(frame)
  },[playing,musicPanelOpen])
  const nextTrack=()=>{if(!albumTracks.length)return;setTrackIndex(index=>(index+1)%albumTracks.length)}
  const previousTrack=()=>{if(!albumTracks.length)return;setTrackIndex(index=>(index-1+albumTracks.length)%albumTracks.length)}
  const selectAlbum=event=>{setSelectedAlbum(event.target.value);setTrackIndex(0)}
  const selectTrack=event=>{const index=albumTracks.findIndex(track=>track.id===event.target.value);if(index>=0)setTrackIndex(index)}
  useEffect(()=>{
    if(typeof navigator==='undefined'||!navigator.mediaSession)return
    const media=navigator.mediaSession,audio=audioRef.current
    try{
      media.metadata=currentTrack&&window.MediaMetadata?new window.MediaMetadata({title:currentTrack.title,artist:currentTrack.artist,album:currentTrack.album}):null
      media.playbackState=audioAvailable?(playing?'playing':'paused'):'none'
    }catch{}
    const action=(name,handler)=>{try{media.setActionHandler(name,handler)}catch{}}
    action('play',startPlayback)
    action('pause',()=>{audio?.pause();setPlaying(false)})
    action('seekto',details=>{if(audio&&Number.isFinite(details.seekTime))audio.currentTime=details.seekTime})
    action('nexttrack',nextTrack)
    action('previoustrack',previousTrack)
    return()=>['play','pause','seekto','nexttrack','previoustrack'].forEach(name=>action(name,null))
  },[currentTrack,playing,audioAvailable,albumTracks.length])
  const handleVolume=()=>{if(muted||volume===0){setMuted(false);setVolume(value=>value===0?0.72:value)}else setMuted(true)}
  useEffect(()=>{
    const onKeyDown=(event)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchRef.current?.focus()}
      if(event.key==='Escape'){if(infoPage)setInfoPage(null);else if(selected)setSelected(null);else if(slateOpen)setSlateOpen(false);else if(menuOpen)setMenuOpen(false);else if(document.activeElement===searchRef.current)searchRef.current.blur()}
    }
    window.addEventListener('keydown',onKeyDown);return ()=>window.removeEventListener('keydown',onKeyDown)
  },[selected,menuOpen,infoPage,slateOpen])
  const filtered=useMemo(()=>filterAndSortTools(tools,{category:active,query,favorites,onlyFavorites:onlyFav,onlyRecent,recent:recentTools,sort:onlyRecent?'recent':sortBy}),[active,query,favorites,onlyFav,onlyRecent,recentTools,sortBy])
  const toggleFav=(id)=>setFavorites(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];try{localStorage.setItem('tools-slate-favorites',JSON.stringify(next))}catch{}return next})
  const openTool=(tool)=>{
    const next=pushRecentTool(recentTools,tool.id)
    setRecentTools(next)
    try{localStorage.setItem('tools-slate-recent',JSON.stringify(next))}catch{}
    setSelected(tool)
  }
  const tabs=[['All',Grid2X2],['Downloader',DownloadCloud],['Maker',WandSparkles],['Tools',Wrench]]
  return <div className={`app-shell ${dark?'theme-dark':'theme-light'} nexus-theme`}>
    <header className={`nexus-header ${musicPanelOpen?'music-panel-open':''}`}>
      <button className={`music-panel-toggle ${musicPanelOpen?'active':''} ${playing?'is-playing':''}`} onClick={()=>setMusicPanelOpen(v=>!v)} aria-label={musicPanelOpen?'Tutup pemutar musik':'Buka pemutar musik'} aria-expanded={musicPanelOpen} title="Music Player">{musicPanelOpen?<X/>:<Music2/>}</button>
      {musicPanelOpen&&<div className="music-panel-content" role="region" aria-label="Music Player">
        <div className="music-player-top">
          <div className={`music-cover ${playing?'spinning':''} ${currentAlbum?.cover?'has-artwork':''}`} aria-hidden="true">{currentAlbum?.cover?<img src={currentAlbum.cover} alt=""/>:<Music2 size={23}/>}<i/></div>
          <div className="music-track-info">
            <strong>{currentTrack?.title||'Music Player'}</strong>
            <small>{currentTrack?currentTrack.artist:'Tambahkan lagu ke folder album untuk mulai'}</small>
            <div className={`music-visualizer ${playing?'active':''}`} aria-label={playing?'Musik sedang diputar':'Musik berhenti'}>{Array.from({length:16},(_,i)=><i key={i} style={{'--bar':`${5+(i*13)%17}px`}}/>)}</div>
          </div>
        </div>
        <div className="music-progress-wrap">
          <input className="music-progress" type="range" min="0" max={audioDuration||0} step="1" value={Math.min(audioTime,audioDuration||0)} disabled={!audioDuration} aria-label="Posisi lagu" onChange={event=>{const value=Number(event.target.value);setAudioTime(value);if(audioRef.current)audioRef.current.currentTime=value}} />
          <div className="music-time-labels"><span>{formatTime(audioTime)}</span><span>{formatTime(audioDuration)}</span></div>
        </div>
        <div className="music-control-row">
          <div className="music-transport">
            <button type="button" title="Lagu sebelumnya" aria-label="Lagu sebelumnya" disabled={!currentTrack||albumTracks.length<2} onClick={previousTrack}><SkipBack size={18}/></button>
            <button type="button" className="music-main-play" title={playing?'Jeda':'Putar'} aria-label={playing?'Jeda musik':'Putar musik'} disabled={!audioAvailable} onClick={togglePlayback}>{playing?<Pause size={20} fill="currentColor"/>:<Play size={20} fill="currentColor"/>}</button>
            <button type="button" title="Lagu berikutnya" aria-label="Lagu berikutnya" disabled={!currentTrack||albumTracks.length<2} onClick={nextTrack}><SkipForward size={18}/></button>
          </div>
          <div className="music-volume-control">
            <button type="button" title={muted?'Aktifkan suara':'Matikan suara'} aria-label={muted?'Aktifkan suara':'Matikan suara'} disabled={!audioAvailable} onClick={handleVolume}>{muted||volume===0?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
            <input className="volume-range" aria-label="Volume musik" type="range" min="0" max="1" step="0.01" value={muted?0:volume} disabled={!audioAvailable} onChange={event=>{setVolume(Number(event.target.value));setMuted(false)}} />
          </div>
        </div>
        <div className="music-library-selects">
          <label><span>ALBUM</span><CustomSelect ariaLabel="Pilih album" value={selectedAlbum} onChange={selectAlbum} disabled={!musicAlbums.length} options={musicAlbums.map(album=>({value:album.name,label:album.name}))}/></label>
          <label><span>LAGU</span><CustomSelect ariaLabel="Pilih lagu" value={currentTrack?.id||''} onChange={selectTrack} disabled={!albumTracks.length} options={albumTracks.map(track=>({value:track.id,label:track.title}))}/></label>
        </div>
      </div>}
      <audio ref={audioRef} preload="none" onPlay={()=>setPlaying(true)} onTimeUpdate={e=>{const a=e.currentTarget;setAudioTime(a.currentTime);try{if(navigator.mediaSession?.setPositionState&&Number.isFinite(a.duration)&&a.duration>0)navigator.mediaSession.setPositionState({duration:a.duration,playbackRate:a.playbackRate,position:a.currentTime})}catch{}}} onLoadedMetadata={event=>setAudioDuration(Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:0)} onEnded={()=>{if(albumTracks.length>1)nextTrack();else setPlaying(false)}} onError={()=>setPlaying(false)} />
      <button className="menu-toggle" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Buka menu informasi">{menuOpen?<X/>:<Menu/>}</button>
    </header>

    {menuOpen&&<div className="info-panel"><div className="panel-heading"><div><b>Slate Menu</b><span>Informasi dan masukan</span></div></div>
      <button className="info-card" onClick={()=>{setMenuOpen(false);setInfoPage('about')}}><span className="info-icon"><UserRound/></span><span><b>About Dev</b><small>Profil developer dan kontak resmi.</small></span><ArrowUpRight/></button>
      <a className="info-card" href="https://whatsapp.com/channel/0029VbBmeKA002TCQOFuo61s" target="_blank" rel="noreferrer"><span className="info-icon"><CircleHelp/></span><span><b>Report Bug, Saran & Ide</b><small>Kirim masukan melalui saluran WhatsApp.</small></span><ExternalLink/></a>
      <button className="info-card" onClick={()=>{setMenuOpen(false);setInfoPage('vip')}}><span className="info-icon"><Sparkles/></span><span><b>VIP Access</b><small>Lihat fitur, paket, dan harga akses VIP.</small></span><ArrowUpRight/></button>
      <a className="info-card whatsapp" href="https://whatsapp.com/channel/0029VbBmeKA002TCQOFuo61s" target="_blank" rel="noreferrer"><span className="info-icon"><MessageCircle/></span><span><b>Komunitas</b><small>Gabung melalui saluran WhatsApp resmi.</small></span><ExternalLink/></a>
    </div>}
    {infoPage&&<InfoPage page={infoPage} onClose={()=>setInfoPage(null)}/> }
    <main id="top" className="nexus-main">
      <section className="nexus-hero"><div className="hero-art">{heroVideo&&<video className="hero-video" autoPlay muted loop playsInline onError={e=>{e.currentTarget.style.display="none"}}><source src={heroVideo} type="video/mp4"/></video>}<div className="hero-art-glow"/><div className="hero-art-copy"><span>TOOLS SLATE</span><small>YOUR DIGITAL SPACE</small></div></div></section>
      <section className="visitor-panel"><div className="visitor-avatar"><UserRound/></div><div className="visitor-data"><div><Globe2/> <span>NEGARA</span> <b title="Perkiraan otomatis dari zona waktu dan bahasa perangkat">{visitorDetails.country}</b><Smartphone/> <span>DEVICE</span> <b>{visitorDetails.device}</b></div><div><Globe2/> <span>BROWSER</span> <b>{visitorDetails.browser}</b>{batteryInfo.charging?<BatteryCharging/>:<Battery/>} <span>BATERAI</span> <b className="battery-value" role="status" aria-live="polite" title={batteryInfo.supported===false?'Informasi baterai tidak didukung browser ini':batteryInfo.charging?'Sedang mengisi daya':'Level baterai perangkat'}>{batteryInfo.supported===false?'N/A':batteryInfo.level===null?'--':`${batteryInfo.level}%${batteryInfo.charging?' · Mengisi':''}`}</b></div><div className="visitor-tags"><span className="visitor-chip"><Activity/> Tools aktif</span><span className="visitor-chip role-chip">Member</span></div></div></section>
      <section className="tools-section nexus-tools" id="tools"><div className="nexus-toolbar"><div className="category-row">{tabs.map(([name,Icon])=><button key={name} type="button" aria-pressed={active===name} className={`category-pill ${active===name?'active':''}`} onClick={()=>{setActive(name);setOnlyFav(false);setOnlyRecent(false)}}><Icon size={17}/>{name}</button>)}</div></div>
        <div className="section-heading nexus-section-heading"><div><h2><Grid2X2/> {onlyFav?'Favorit':onlyRecent?'Terakhir dipakai':active==='All'?'Semua Tools':active}</h2><p>Temukan tools yang kamu butuhkan.</p></div><span className="result-count" aria-live="polite">{filtered.length} TOOLS</span></div>
        <div className="tool-discovery-controls">
          <div className="search-wrap nexus-search"><Search size={18}/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&filtered.length){e.preventDefault();openTool(filtered[0])}}} placeholder="Cari tools..." aria-describedby="search-hint" aria-label="Cari tools" aria-keyshortcuts="Control+K Meta+K"/><kbd aria-hidden="true">Ctrl K</kbd>{query&&<button type="button" className="search-clear" onClick={()=>setQuery('')} aria-label="Hapus pencarian"><X size={16}/></button>}</div><p className="search-hint" id="search-hint">Tekan Enter untuk membuka hasil pertama</p>
          <div className="tool-filter-actions"><button type="button" className={`tool-quick-filter ${onlyFav?'active':''}`} aria-pressed={onlyFav} onClick={()=>{setOnlyFav(value=>!value);setOnlyRecent(false);setActive('All')}}><Star size={15} fill={onlyFav?'currentColor':'none'}/> Favorit <span>{favorites.length}</span></button><button type="button" className={`tool-quick-filter ${onlyRecent?'active':''}`} aria-pressed={onlyRecent} onClick={()=>{setOnlyRecent(value=>!value);setOnlyFav(false);setActive('All')}}><Clock3 size={15}/> Terakhir <span>{recentTools.length}</span></button><div className="tool-sort-control"><span>Urutkan</span><CustomSelect className="tool-sort-select" ariaLabel="Urutkan tools" value={sortBy} onChange={event=>setSortBy(event.target.value)} options={[{value:'default',label:'Default'},{value:'popular',label:'Populer'},{value:'name',label:'Nama A–Z'},{value:'favorites',label:'Favorit dulu'}]}/></div></div>
        </div>
        {filtered.length?<div className="tool-grid">{filtered.map((t,index)=><ToolCard key={t.id} index={index} tool={t} favorite={favorites.includes(t.id)} onFavorite={()=>toggleFav(t.id)} onClick={()=>openTool(t)}/>)}</div>:<div className="empty"><Search size={28}/><h3>{onlyFav?'Belum ada tools favorit':onlyRecent?'Belum ada tools yang dibuka':'Tools tidak ditemukan'}</h3><p>{onlyFav?'Tandai tools dengan ikon bintang agar muncul di sini.':onlyRecent?'Tools yang kamu buka akan muncul di sini.':'Coba kata kunci atau filter lain.'}</p><button onClick={()=>{setQuery('');setActive('All');setOnlyFav(false);setOnlyRecent(false);setSortBy('default')}}>Reset filter</button></div>}
      </section>
    </main>
    {portalRoot&&!selected&&!infoPage&&!menuOpen&&!slateOpen&&createPortal(<button className="slate-fab" onClick={()=>setSlateOpen(true)} aria-label="Buka Slate" aria-expanded={slateOpen}><img className="slate-mascot-image" src="/media/slate-mascot.png" alt="" aria-hidden="true" draggable="false" onError={event=>event.currentTarget.closest('.slate-fab')?.classList.add('slate-fab-image-missing')}/></button>,portalRoot)}
    {portalRoot&&slateOpen&&createPortal(<React.Suspense fallback={<div className="ai-widget-loading" role="status">Membuka Slate…</div>}><AISlateModal onClose={()=>setSlateOpen(false)}/></React.Suspense>,portalRoot)}
    {selected&&<React.Suspense fallback={<div className="modal-backdrop advanced-backdrop"><div className="advanced-loading" role="status"><span className="spin">◌</span> Memuat tool…</div></div>}>
      {(selected.id==='socialdownloader'||selected.id==='social-downloader'||selected.name?.trim().toLowerCase()==='social media downloader')?<SocialDownloaderModal key={`social-${selected.id}`} onClose={()=>setSelected(null)}/>
        :selected.id==='lyricssearch'?<LyricsSearchModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='photohd'?<PhotoHdModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='mp4mp3'?<Mp4ToMp3Modal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='apiworkbench'?<ApiWorkbenchModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='json'?<JsonStudioModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='pdftoolkit'?<PdfToolkitModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='imageprivacy'?<ImagePrivacyModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='ocr'?<OcrWorkbenchModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='domainsecurity'?<DomainSecurityModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='regex'?<RegexWorkbenchModal key={selected.id} onClose={()=>setSelected(null)}/>
        :selected.id==='jwt'?<JwtWorkbenchModal key={selected.id} onClose={()=>setSelected(null)}/>
        :<ToolModal key={selected.id} tool={selected} onClose={()=>setSelected(null)}/>}
    </React.Suspense>}
  </div>
}
function InfoPage({page,onClose}){
 const email='slateeofficial@gmail.com'
 const tiktok='https://www.tiktok.com/@lazzzimo?_r=1&_t=ZS-9BheaLX9L2y'
 const wa='https://wa.me/6285798209865?s=t'
 const channel='https://whatsapp.com/channel/0029VbBmeKA002TCQOFuo61s'
 const plans=[
  {name:'VIP 7 Hari',price:'Rp10.000',detail:'Akses VIP untuk mencoba fitur premium selama 7 hari.'},
  {name:'VIP 30 Hari',price:'Rp25.000',detail:'Akses VIP selama 30 hari dengan pembaruan fitur.'},
  {name:'VIP Lifetime',price:'Rp75.000',detail:'Akses VIP satu kali pembayaran, selama layanan tersedia.'}
 ]
 const order=(plan)=>{const msg=encodeURIComponent(`Halo Slate, saya ingin memesan ${plan.name} (${plan.price}) untuk Tools Slate. Mohon informasi pembayaran dan aktivasi.`);window.open(`${wa}?text=${msg}`,'_blank','noopener,noreferrer')}
 return <div className="info-page-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="info-page-modal" role="dialog" aria-modal="true" aria-label={page==='about'?'About Developer':'VIP Access'}>
  <div className="info-page-head"><div><span className="info-page-kicker">TOOLS SLATE / {page==='about'?'DEVELOPER':'VIP ACCESS'}</span><h2>{page==='about'?'About Developer':'VIP Features & Pricing'}</h2><p>{page==='about'?'Hubungi developer melalui kanal resmi.':'Pilih paket akses VIP Tools Slate.'}</p></div><button className="info-page-close" onClick={onClose} aria-label="Tutup"><X/></button></div>
  {page==='about'?<div className="info-page-links">
   <a href={`mailto:${email}`}><span className="info-page-icon">@</span><span><b>Gmail</b><small>{email}</small></span><ArrowUpRight/></a>
   <a href={tiktok} target="_blank" rel="noreferrer"><span className="info-page-icon">♪</span><span><b>TikTok</b><small>@lazzzimo</small></span><ExternalLink/></a>
   <a href={wa} target="_blank" rel="noreferrer"><span className="info-page-icon"><MessageCircle/></span><span><b>WhatsApp Developer</b><small>Chat langsung dengan developer</small></span><ExternalLink/></a>
   <a href={channel} target="_blank" rel="noreferrer"><span className="info-page-icon"><AudioLines/></span><span><b>Saluran WhatsApp</b><small>Info dan pembaruan Tools Slate</small></span><ExternalLink/></a>
  </div>:<div className="vip-page-content"><div className="vip-page-benefits"><b>Keuntungan VIP</b><ul><li>Akses ke fitur khusus VIP yang tersedia</li><li>Pembaruan fitur VIP selama masa aktif paket</li><li>Bantuan aktivasi melalui WhatsApp</li></ul><small>Fitur VIP mengikuti ketersediaan pada versi Tools Slate.</small></div><div className="vip-page-plans">{plans.map(plan=><article className="vip-page-plan" key={plan.name}><div><b>{plan.name}</b><small>{plan.detail}</small></div><strong>{plan.price}</strong><button onClick={()=>order(plan)}>Pesan akses VIP <ArrowUpRight size={15}/></button></article>)}</div></div>}
 </section></div>
}

function ToolCard({tool,onClick,favorite,onFavorite,index=0}){const Icon=tool.icon;const trackPointer=e=>{if(e.pointerType==='touch')return;const bounds=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',`${e.clientX-bounds.left}px`);e.currentTarget.style.setProperty('--my',`${e.clientY-bounds.top}px`)};return <article className={`tool-card ${tool.comingSoon?'coming-soon':''}`} style={{'--card-index':index}} onPointerMove={trackPointer} onClick={()=>!tool.comingSoon&&onClick()}><div className="card-top"><span className="tool-icon"><Icon size={20}/></span><div className="card-badges">{tool.tag&&<span className={`tag ${tool.tag==='API'?'api':''}`}>{tool.tag}</span>}<button type="button" className={`fav-btn ${favorite?'saved':''}`} onClick={e=>{e.stopPropagation();onFavorite()}} aria-label={`${favorite?'Hapus dari':'Tambahkan ke'} favorit: ${tool.name}`} aria-pressed={favorite}><Star size={15} fill={favorite?'currentColor':'none'}/></button></div></div><h3>{tool.name}</h3><p>{tool.desc}</p>{tool.comingSoon?<span className="card-open">Coming soon</span>:<button type="button" className="card-open" aria-label={`Buka ${tool.name}`}>{'Open tool'} <ArrowUpRight size={15}/></button>}</article>}

function ToolModal({tool,onClose}){
 const [value,setValue]=useState(''),[output,setOutput]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[extra,setExtra]=useState(''),[extra2,setExtra2]=useState(''),[result,setResult]=useState(null)
 const Icon=tool.icon
 const run=async()=>{setError('');setOutput('');setResult(null);setBusy(true);try{let out='';switch(tool.id){
 case 'json':{const p=JSON.parse(value);out=extra==='minify'?JSON.stringify(p):JSON.stringify(p,null,2);break}
 case 'base64':out=extra==='decode'?decodeUtf8(value):encodeUtf8(value);break
 case 'url':out=extra==='decode'?decodeURIComponent(value):encodeURIComponent(value);break
 case 'hash':out=await digestHex('SHA-256',value);break
 case 'uuid':{const count=Number(extra||1);if(!Number.isInteger(count)||count<1||count>50)throw Error('Jumlah UUID harus 1 sampai 50.');const make=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]%16;return(c==='x'?r:(r&3|8)).toString(16)});out=Array.from({length:count},make).join('\n');break}
 case 'html':out=extra==='decode'?new DOMParser().parseFromString(value,'text/html').documentElement.textContent:value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));break
 case 'text':out=({upper:value.toUpperCase(),lower:value.toLowerCase(),title:value.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),sentence:value.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase()),reverse:[...value].reverse().join(''),slug:value.toLowerCase().trim().replace(/[^\w ]+/g,'').replace(/\s+/g,'-')})[extra||'upper'];break
 case 'words':{const w=value.trim()?value.trim().split(/\s+/).length:0;out=`Words: ${w}\nCharacters: ${value.length}\nCharacters (no spaces): ${value.replace(/\s/g,'').length}\nSentences: ${(value.match(/[.!?]+(?=\s|$)/g)||[]).length}\nParagraphs: ${value.trim()?value.trim().split(/\n\s*\n/).length:0}`;break}
 case 'timestamp':{if(!value.trim())throw Error('Masukkan tanggal atau timestamp.');if(extra==='from'){const d=new Date(value);if(Number.isNaN(d.getTime()))throw Error('Tanggal tidak valid.');out=`Unix seconds: ${Math.floor(d.getTime()/1000)}\nUnix milliseconds: ${d.getTime()}`}else{if(!/^-?\d+(\.\d+)?$/.test(value.trim()))throw Error('Timestamp harus berupa angka.');const d=new Date(Number(value)*(value.trim().length<=10?1000:1));if(Number.isNaN(d.getTime()))throw Error('Timestamp tidak valid.');out=d.toLocaleString('id-ID',{dateStyle:'full',timeStyle:'long'})}break}
 case 'unit':{if(!value.trim())throw Error('Masukkan angka yang valid.');const n=Number(value),u=extra||'km-mi';if(!Number.isFinite(n))throw Error('Masukkan angka yang valid.');const m={'km-mi':`${n} km = ${(n*.621371).toFixed(5)} mi`,'mi-km':`${n} mi = ${(n/.621371).toFixed(5)} km`,'kg-lb':`${n} kg = ${(n*2.20462).toFixed(5)} lb`,'lb-kg':`${n} lb = ${(n/2.20462).toFixed(5)} kg`,'c-f':`${n} °C = ${(n*9/5+32).toFixed(2)} °F`,'f-c':`${n} °F = ${((n-32)*5/9).toFixed(2)} °C`};out=m[u];break}
 case 'percentage':{const a=Number(value),b=Number(extra2);if(!value.trim()||!extra2.trim()||!Number.isFinite(a)||!Number.isFinite(b))throw Error('Masukkan kedua angka yang valid.');out=`${b}% dari ${a} = ${(a*b/100).toLocaleString('id-ID')}\n${a} adalah ${b!==0?(a/b*100).toFixed(2):'—'}% dari ${b}\nPerubahan dari ${a} ke ${b} = ${a!==0?((b-a)/a*100).toFixed(2):'—'}%`;break}
 case 'color':{let h=value.trim().replace('#','');if(!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h))throw Error('Gunakan HEX seperti #6750A4.');if(h.length===3)h=h.split('').map(c=>c+c).join('');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16),[hh,s,l]=rgbToHsl(r,g,b);out=`HEX: #${h.toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(hh)}, ${Math.round(s)}%, ${Math.round(l)}%)`;setResult({color:`#${h}`});break}
 case 'regex':{const flags=[...new Set((extra2||'g').includes('g')?(extra2||'g'):(extra2||'')+'g')].join('');const re=new RegExp(value,flags);const ms=[...extra.matchAll(re)];out=ms.length?ms.map(m=>`Match: ${m[0]} (index ${m.index})`).join('\n'):'No matches found.';break}
 case 'markdown':out=markdownLite(value);break
 case 'qr':if(!value.trim())throw Error('Masukkan teks atau URL.');setResult({qr:`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(value)}`});break
 case 'weather':{const geo=await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=1&language=id&format=json`);if(!geo.results?.length)throw Error('Kota tidak ditemukan.');const p=geo.results[0],w=await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`),c=w.current;out=`${p.name}, ${p.country}\nSuhu: ${c.temperature_2m} °C\nTerasa seperti: ${c.apparent_temperature} °C\nKelembapan: ${c.relative_humidity_2m}%\nAngin: ${c.wind_speed_10m} km/jam\nCurah hujan: ${c.precipitation} mm\nKondisi: ${weatherLabel(c.weather_code)}\nWaktu data: ${c.time}`;break}
 case 'currency':{const from=(extra||'USD').trim().toUpperCase(),to=(extra2||'IDR').trim().toUpperCase(),amount=Number(value);if(!value.trim()||!Number.isFinite(amount))throw Error('Masukkan jumlah yang valid.');if(!/^[A-Z]{3}$/.test(from)||!/^[A-Z]{3}$/.test(to))throw Error('Kode mata uang harus terdiri dari 3 huruf, misalnya USD atau IDR.');const d=await fetchJson(`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`);out=`${amount.toLocaleString('id-ID')} ${from} = ${(amount*d.rate).toLocaleString('id-ID',{maximumFractionDigits:4})} ${to}\nKurs: 1 ${from} = ${d.rate} ${to}\nTanggal kurs: ${d.date}`;break}
 case 'ip':{const ip=value.trim();if(ip&&!/^[a-f\d:.]+$/i.test(ip))throw Error('Masukkan alamat IPv4 atau IPv6 yang valid.');const d=await fetchJson(`https://ipwho.is/${ip?encodeURIComponent(ip):''}`);if(!d.success)throw Error(d.message||'IP lookup gagal.');out=`IP: ${d.ip}\nTipe: ${d.type||'—'}\nLokasi: ${[d.city,d.region,d.country].filter(Boolean).join(', ')}\nKoordinat perkiraan: ${d.latitude}, ${d.longitude}\nISP: ${d.connection?.isp||'—'}\nOrganisasi: ${d.connection?.org||'—'}\nASN: ${d.connection?.asn||'—'}\nZona waktu: ${d.timezone?.id||'—'}`;break}
 case 'dns':{const host=normalizeHost(value);if(!host)throw Error('Masukkan domain, misalnya example.org.');const type=extra||'A',d=await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`);const answers=d.Answer||[];out=`Domain: ${host}\nRecord: ${type}\nStatus DNS: ${dnsStatus(d.Status)}\n\n${answers.length?answers.map(a=>`${a.name}  ${a.TTL}s  ${a.data}`).join('\n'):'Tidak ada record yang dikembalikan.'}`;break}
 case 'jwt':{const parts=value.trim().split('.');if(parts.length!==3)throw Error('JWT harus memiliki tiga bagian yang dipisahkan titik.');const header=JSON.parse(decodeBase64Url(parts[0])),payload=JSON.parse(decodeBase64Url(parts[1]));out=`HEADER\n${JSON.stringify(header,null,2)}\n\nPAYLOAD\n${JSON.stringify(payload,null,2)}\n\nSIGNATURE\n${parts[2]||'(kosong)'}`;break}
 case 'breach':{if(!value)throw Error('Masukkan password untuk diperiksa.');const hash=await digestHex('SHA-1',value),prefix=hash.slice(0,5),suffix=hash.slice(5);const response=await fetch(`https://api.pwnedpasswords.com/range/${prefix}`,{headers:{'Add-Padding':'true'},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`HIBP API error (${response.status}).`);const rows=(await response.text()).split(/\r?\n/),match=rows.find(row=>row.split(':')[0]?.toUpperCase()===suffix.toUpperCase());const count=match?Number(match.split(':')[1]):0;out=match?`STATUS: FOUND\nPassword ditemukan dalam dataset Pwned Passwords.\nJumlah kemunculan: ${count.toLocaleString('id-ID')}\n\nGanti password tersebut dan jangan gunakan ulang di layanan lain.`:'STATUS: NOT FOUND\nTidak ditemukan dalam dataset Pwned Passwords yang diperiksa.';break}
 case 'urlscan':{let u;try{u=new URL(value.includes('://')?value:`https://${value}`)}catch{throw Error('Format URL tidak valid.')}const rows=[['URL',u.href],['Protocol',u.protocol],['Hostname',u.hostname],['Port',u.port||'(default)'],['Path',u.pathname||'/'],['Query parameters',String([...u.searchParams.keys()].length)],['HTTPS',u.protocol==='https:'?'Ya':'Tidak'],['Credentials in URL',u.username||u.password?'Ada':'Tidak'],['Punycode hostname',u.hostname.startsWith('xn--')||u.hostname.includes('.xn--')?'Perlu diperiksa':'Tidak terdeteksi']];out=rows.map(([k,v])=>`${k}: ${v}`).join('\n');break}
 case 'ssl':{const host=normalizeHost(value);if(!host)throw Error('Masukkan nama domain.');const d=await fetchJson(`/api/cert-transparency?domain=${encodeURIComponent(host)}`);const rows=Array.isArray(d)?d.slice(0,25):[];out=`Domain query: ${host}\nCatatan sertifikat ditemukan: ${Array.isArray(d)?d.length:0}\nMenampilkan maksimal 25 catatan terbaru:\n\n${rows.map(x=>`${x.not_before||'—'} | ${x.common_name||x.name_value||'—'} | ${x.issuer_name||'Issuer tidak tersedia'}`).join('\n')||'Tidak ada catatan yang dikembalikan.'}\n\n`;break}
 default:throw Error('Tool belum tersedia.')}
 if(out)setOutput(out)
 }catch(e){setError(e.message||'Terjadi kesalahan.')}finally{setBusy(false)}}
 const copy=async()=>{if(!output)return;try{await navigator.clipboard.writeText(output);setError('Hasil disalin ke clipboard.')}catch{setError('Clipboard tidak tersedia di browser ini.')}}
 const download=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=`tools-slate-${tool.id}-result.txt`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 const loadSample=()=>{
  const samples={json:['{"name":"Slate","tools":["JSON","Base64"]}','pretty'],base64:['Halo, Slate!','encode'],url:['https://tools-slate.vercel.app/?q=halo dunia','encode'],hash:['Slate tools'],uuid:['','3'],html:['<h1>Halo & selamat datang</h1>','encode'],text:['Tools Slate bikin kerja lebih mudah.','title'],words:['Tools Slate bikin kerja lebih mudah.'],timestamp:['1735689600','to'],unit:['42','km-mi'],percentage:['100','', '15'],color:['#79D9FF'],regex:['\\d+','Versi 2.1 dan 3 tools','g'],markdown:['# Halo\nTools **Slate**.'],qr:['https://tools-slate.vercel.app'],weather:['Surabaya'],currency:['100','USD','IDR'],ip:['8.8.8.8'],dns:['example.com','A'],urlscan:['https://example.org'],ssl:['example.com']}
  const sample=samples[tool.id]
  if(!sample)return
  setValue(sample[0]??'');setExtra(sample[1]??'');setExtra2(sample[2]??'');setOutput('');setResult(null);setError('')
 }
 const placeholders={json:'Tempel JSON di sini...',base64:'Masukkan teks atau Base64...',url:'Masukkan URL atau teks...',hash:'Masukkan teks untuk di-hash...',uuid:'Jumlah UUID (default 1)',regex:'Regular expression, contoh: \\w+',html:'Masukkan HTML atau teks...',text:'Ketik atau tempel teks...',words:'Tempel teks untuk dihitung...',timestamp:'Masukkan timestamp atau tanggal ISO...',unit:'Masukkan angka...',percentage:'Angka pertama...',color:'#6750A4',markdown:'## Halo!\nTulis **Markdown** di sini...',qr:'Masukkan teks atau URL...',weather:'Masukkan nama kota, contoh: Surabaya',currency:'Masukkan jumlah...',ip:'Kosongkan untuk IP publik kamu, atau masukkan IP...',dns:'Masukkan domain, contoh: example.org',jwt:'Tempel JWT di sini...',breach:'Masukkan password yang ingin diperiksa...',urlscan:'Masukkan URL, contoh: https://example.org',ssl:'Masukkan domain, contoh: example.org'}
 const isTextArea=!['uuid','timestamp','unit','percentage','color','weather','currency','ip','dns','ssl','breach'].includes(tool.id)
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="tool-modal" role="dialog" aria-modal="true" aria-labelledby="tool-dialog-title"><div className="modal-head"><div className="modal-title"><span className="tool-icon"><Icon size={20}/></span><div><h2 id="tool-dialog-title">{tool.name}</h2><p>{tool.desc}</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
 <div className="modal-body">{isTextArea?<textarea className="work-area" aria-label={`Input ${tool.name}`} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}}} placeholder={placeholders[tool.id]}/>:<input className="single-input" aria-label={`Input ${tool.name}`} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!busy&&run()} placeholder={placeholders[tool.id]} type={tool.id==='breach'?'password':'text'} autoComplete="off"/>}
 {['json','base64','url','html','timestamp','unit','text','dns'].includes(tool.id)&&<div className="option-row"><label>{tool.id==='json'?'Output':tool.id==='timestamp'?'Convert':tool.id==='unit'?'Conversion':tool.id==='text'?'Text format':tool.id==='dns'?'DNS record':'Mode'}</label><CustomSelect ariaLabel={tool.id==='json'?'Output':tool.id==='timestamp'?'Convert':tool.id==='unit'?'Conversion':tool.id==='text'?'Text format':tool.id==='dns'?'DNS record':'Mode'} value={extra} onChange={e=>setExtra(e.target.value)} options={(tool.id==='json'?[['pretty','Pretty print'],['minify','Minify']]:tool.id==='timestamp'?[['to','Timestamp to date'],['from','Date to timestamp']]:tool.id==='unit'?[['km-mi','Kilometer → Mile'],['mi-km','Mile → Kilometer'],['kg-lb','Kilogram → Pound'],['lb-kg','Pound → Kilogram'],['c-f','Celsius → Fahrenheit'],['f-c','Fahrenheit → Celsius']]:tool.id==='text'?[['upper','UPPERCASE'],['lower','lowercase'],['title','Title Case'],['sentence','Sentence case'],['reverse','Reverse text'],['slug','URL slug']]:tool.id==='dns'?[['A','A'],['AAAA','AAAA'],['MX','MX'],['TXT','TXT'],['NS','NS'],['CNAME','CNAME'],['CAA','CAA'],['SOA','SOA']]:[['encode','Encode'],['decode','Decode']]).map(([value,label])=>({value,label}))}/></div>}
 {tool.id==='uuid'&&<OptionInput label="Jumlah UUID" value={extra} setValue={setExtra} placeholder="1"/>}
 {tool.id==='percentage'&&<OptionInput label="Angka kedua" value={extra2} setValue={setExtra2} placeholder="Masukkan angka kedua"/>}
 {tool.id==='regex'&&<><OptionInput label="Teks yang diuji" value={extra} setValue={setExtra} placeholder="Teks yang akan diperiksa"/><OptionInput label="Flags" value={extra2} setValue={setExtra2} placeholder="g"/></>}
 {tool.id==='currency'&&<div className="two-options"><OptionInput label="Dari" value={extra||'USD'} setValue={setExtra} placeholder="USD"/><OptionInput label="Ke" value={extra2||'IDR'} setValue={setExtra2} placeholder="IDR"/></div>}
 {tool.id==='color'&&<div className="color-preview" style={{background:/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)?(value.startsWith('#')?value:`#${value}`):'#64748b'}}/>}


 <div className="tool-run-actions">{samples[tool.id]&&<button type="button" className="tool-sample-btn" onClick={loadSample} disabled={busy}>Muat contoh</button>}<button className="run-btn" onClick={run} disabled={busy} aria-busy={busy}>{busy?<RefreshCw className="spin" size={17}/>:<Zap size={17}/>} {busy?'Memproses…':'Jalankan tool'}</button></div>
 {error&&<div className={`notice ${error.includes('disalin')?'success':''}`} role="status" aria-live="polite">{error}</div>}
 {output&&<div className="output-wrap"><div className="output-head"><span>HASIL</span><div><button type="button" onClick={copy}><Copy size={14}/> Salin</button><button type="button" onClick={download}><Download size={14}/> Simpan</button></div></div><pre aria-live="polite">{output}</pre></div>}
 {result?.qr&&<div className="qr-result"><img src={result.qr} alt="Generated QR code"/><a href={result.qr} download="tools-slate-qr.png" target="_blank" rel="noreferrer"><Download size={15}/> Open / save QR</a></div>}
 {result?.color&&<div className="output-wrap"><div className="output-head"><span>COLOR VALUES</span><button onClick={copy}><Copy size={14}/> Copy</button></div><pre>{output}</pre></div>}
 {tool.id==='markdown'&&<div className="markdown-preview"><div className="output-head"><span>LIVE PREVIEW</span></div><div dangerouslySetInnerHTML={{__html:markdownLite(value)}}/></div>}
 </div></section></div>
}
function SocialDownloaderModal({onClose}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[downloading,setDownloading]=useState(''),[error,setError]=useState(''),[data,setData]=useState(null)
 const downloadMedia=async(item)=>{
  setError('');setDownloading(item.url)
  try{
   const response=await fetch(item.url)
   const contentType=(response.headers.get('content-type')||'').toLowerCase()
   if(!response.ok||contentType.includes('json')||contentType.startsWith('text/')){
    const raw=await response.text().catch(()=> '')
    let body={};try{body=raw?JSON.parse(raw):{}}catch{body={error:raw}}
    throw new Error(body.error?.message||body.error||body.message||`Unduhan gagal (${response.status}). Cari media lagi.`)
   }
   const blob=await response.blob()
   if(!blob.size)throw new Error('File kosong dari penyedia. Cari media lagi.')
   const ext=item.type==='audio'?'mp3':'mp4'
   const objectUrl=URL.createObjectURL(blob)
   const a=document.createElement('a');a.href=objectUrl;a.download=`ssave-${item.quality==='HD'?'hd':ext}.${ext}`;document.body.appendChild(a);a.click();a.remove()
   setTimeout(()=>URL.revokeObjectURL(objectUrl),30000)
  }catch(e){setError(e.message||'Gagal mengunduh media. Coba cari media lagi.')}
  finally{setDownloading('')}
 }
 const submit=async()=>{
  setError('');setData(null)
  let parsed;try{parsed=new URL(url.trim())}catch{setError('Masukkan URL postingan yang valid.');return}
  const host=parsed.hostname.toLowerCase().replace(/^www\./,'')
  const platforms=[['tiktok.com','tiktok'],['instagram.com','instagram']]
  const match=platforms.find(([domain])=>host===domain||host.endsWith(`.${domain}`))
  if(!match){setError('Untuk saat ini hanya tautan TikTok dan Instagram yang didukung.');return}
  setBusy(true)
  try{
   const response=await fetch('/api/social-download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:parsed.href,platform:match[1]})})
   const body=await response.json().catch(()=>({}))
   if(!response.ok){
     const code=body.code||`HTTP_${response.status}`
     const message=body.error||`API error (${response.status}).`
     const err=new Error(message);err.code=code
     throw err
   }
   if(!Array.isArray(body.media)||!body.media.length)throw new Error('API tidak mengembalikan file yang bisa diunduh.')
   setData(body)
  }catch(e){setError(e.message||'Gagal mengambil media. Coba lagi.')}
  finally{setBusy(false)}
 }
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="tool-modal social-downloader-modal" role="dialog" aria-modal="true" aria-labelledby="social-downloader-title">
  <div className="modal-head"><div className="modal-title"><span className="tool-icon"><DownloadCloud size={20}/></span><div><h2 id="social-downloader-title">Social Media Downloader</h2><p>TikTok · Instagram</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X/></button></div>
  <div className="modal-body"><label className="downloader-label" htmlFor="social-url">Link postingan publik</label><input id="social-url" className="single-input" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!busy&&submit()} placeholder="Tempel link video / reel di sini..." autoComplete="url"/>

   <button className="run-btn" onClick={submit} disabled={busy||!url.trim()}>{busy?<RefreshCw className="spin" size={17}/>:<DownloadCloud size={17}/>} {busy?'Mengambil media...':'Cari media'}</button>
   {error&&<div className="notice">{error}</div>}
   {data&&<div className="social-result"><div className="social-result-heading"><b>{data.title||'Media ditemukan'}</b><span>{data.source||'Social media'}</span></div>{data.thumbnail&&<img className="social-thumbnail" src={data.thumbnail} alt="Thumbnail media" onError={e=>e.currentTarget.style.display='none'}/>}<div className="social-download-list">{data.media.map((item,i)=><button type="button" key={`${item.url}-${i}`} onClick={()=>downloadMedia(item)} disabled={!!downloading} className="social-download-link"><span><b>{item.label||item.quality||`File ${i+1}`}</b><small>{item.type||'Media'}{item.quality?` · ${item.quality}`:''}</small></span><span>{downloading===item.url?'Mengunduh...':<>Unduh <Download size={15}/></>}</span></button>)}</div></div>}
  </div></section></div>
}

function LyricsSearchModal({onClose}){
 const [track,setTrack]=useState(''),[artist,setArtist]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[matches,setMatches]=useState([]),[selected,setSelected]=useState(null),[mode,setMode]=useState('plain'),[copied,setCopied]=useState(false)
 const search=async()=>{
  setError('');setMatches([]);setSelected(null);setCopied(false)
  if(!track.trim()||!artist.trim()){setError('Masukkan judul lagu dan nama artis.');return}
  setBusy(true)
  try{
   const params=new URLSearchParams({track_name:track.trim(),artist_name:artist.trim()})
   const response=await fetch(`https://lrclib.net/api/search?${params.toString()}`,{headers:{'X-User-Agent':'Tools Slate/2.1 (https://tools-slate.vercel.app)'},signal:AbortSignal.timeout(15000)})
   if(response.status===429)throw new Error('Terlalu banyak pencarian. Tunggu sebentar lalu coba lagi.')
   if(!response.ok)throw new Error(`Layanan lirik merespons (${response.status}). Coba lagi nanti.`)
   const rows=await response.json()
   if(!Array.isArray(rows)||!rows.length)throw new Error('Lirik tidak ditemukan. Periksa judul atau nama artis.')
   setMatches(rows.slice(0,20))
  }catch(e){setError(e.message||'Gagal mencari lirik. Periksa koneksi internet.')}
  finally{setBusy(false)}
 }
 const choose=async(row)=>{
  setError('');setBusy(true);setCopied(false)
  try{
   const response=await fetch(`https://lrclib.net/api/get/${encodeURIComponent(row.id)}`,{headers:{'X-User-Agent':'Tools Slate/2.1 (https://tools-slate.vercel.app)'},signal:AbortSignal.timeout(15000)})
   if(!response.ok)throw new Error(`Lirik tidak dapat dimuat (${response.status}).`)
   const full=await response.json();setSelected(full);setMode(full.plainLyrics?'plain':'synced')
  }catch(e){setError(e.message||'Gagal memuat lirik.')}
  finally{setBusy(false)}
 }
 const lyrics=selected?(mode==='synced'?(selected.syncedLyrics||selected.plainLyrics):(selected.plainLyrics||selected.syncedLyrics))||'Lirik tidak tersedia untuk lagu ini.':''
 const copy=async()=>{try{await navigator.clipboard.writeText(lyrics);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setError('Clipboard tidak tersedia di browser ini.')}}
 const duration=(seconds)=>{if(!Number.isFinite(seconds))return '';const m=Math.floor(seconds/60),s=Math.round(seconds%60);return `${m}:${String(s).padStart(2,'0')}`}
 return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="tool-modal lyrics-modal" role="dialog" aria-modal="true" aria-labelledby="lyrics-title">
  <div className="modal-head"><div className="modal-title"><span className="tool-icon"><Music2 size={20}/></span><div><h2 id="lyrics-title">Lyrics Finder</h2><p>Cari lirik berdasarkan judul dan artis</p></div></div><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X/></button></div>
  <div className="modal-body"><div className="lyrics-fields"><label>Judul lagu<input className="single-input" value={track} onChange={e=>setTrack(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!busy&&search()} placeholder="Contoh: Hati-Hati di Jalan"/></label><label>Nama artis<input className="single-input" value={artist} onChange={e=>setArtist(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!busy&&search()} placeholder="Contoh: Tulus"/></label></div>

   <button className="run-btn" onClick={search} disabled={busy||!track.trim()||!artist.trim()}>{busy?<RefreshCw className="spin" size={17}/>:<Search size={17}/>} {busy?'Mencari...':'Cari lirik'}</button>
   {error&&<div className="notice">{error}</div>}
   {!!matches.length&&<div className="lyrics-matches"><div className="output-head"><span>HASIL PENCARIAN ({matches.length})</span></div>{matches.map(row=><button className={`lyrics-match ${selected?.id===row.id?'active':''}`} key={row.id} onClick={()=>choose(row)} disabled={busy}><span><b>{row.trackName||row.name||'Judul tidak tersedia'}</b><small>{row.artistName||'Artis tidak tersedia'}{row.albumName?` · ${row.albumName}`:''}</small></span><small>{duration(row.duration)}</small></button>)}</div>}
   {selected&&<div className="lyrics-output"><div className="lyrics-selected"><div><b>{selected.trackName||selected.name}</b><small>{selected.artistName}{selected.albumName?` · ${selected.albumName}`:''}</small></div></div><div className="lyrics-actions">{selected.plainLyrics&&<button className={mode==='plain'?'active':''} onClick={()=>setMode('plain')}>Lirik biasa</button>}{selected.syncedLyrics&&<button className={mode==='synced'?'active':''} onClick={()=>setMode('synced')}>Dengan timestamp</button>}<button onClick={copy}><Copy size={13}/>{copied?'Tersalin':'Salin lirik'}</button></div><pre className="lyrics-text">{lyrics}</pre></div>}
  </div></section></div>
}

function OptionInput({label,value,setValue,placeholder}){const id=`option-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;return <div className="option-row"><label htmlFor={id}>{label}</label><input id={id} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/></div>}
async function fetchJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});if(!r.ok)throw Error(`Layanan merespons (${r.status}). Periksa input atau coba lagi.`);const type=(r.headers.get('content-type')||'').toLowerCase();if(type&&!type.includes('json'))throw Error('Layanan mengirim respons yang tidak dikenali. Coba lagi nanti.');return r.json()}
async function digestHex(algo,value){const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest(algo,bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}
function encodeUtf8(s){const bytes=new TextEncoder().encode(s);let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)}
function decodeUtf8(s){const bin=atob(s.trim()),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function decodeBase64Url(s){const normalized=s.replace(/-/g,'+').replace(/_/g,'/');return decodeUtf8(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='))}
function normalizeHost(s){let h=s.trim().replace(/^https?:\/\//i,'').split(/[/?#:]/)[0].toLowerCase();if(!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h))return '';return h}
function dnsStatus(n){return ({0:'NOERROR',1:'FORMERR',2:'SERVFAIL',3:'NXDOMAIN',4:'NOTIMP',5:'REFUSED'})[n]||`Code ${n}`}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min)h=s=0;else{const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h*=60}return[h,s*100,l*100]}
function weatherLabel(c){if(c===0)return 'Cerah';if(c<=3)return 'Berawan';if(c<=48)return 'Berkabut';if(c<=67)return 'Hujan';if(c<=77)return 'Salju';if(c<=82)return 'Hujan';if(c<=86)return 'Hujan salju';return 'Badai petir'}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeHref(raw) {
  if (!raw) return null
  let u
  try {
    u = new URL(raw, 'https://tools-slate.invalid/')
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:' && u.protocol !== 'mailto:') return null
  return raw
}

function markdownLite(s) {
  let src = escapeHtml(s)

  const codes = []
  src = src.replace(/`([^`\n]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`)
    return `\u0000CODE${codes.length - 1}\u0000`
  })

  src = src.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
    const href = safeHref(url.replace(/&amp;/g, '&'))
    if (!href) return text
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer nofollow" target="_blank">${text}</a>`
  })

  src = src
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br/>')

  return src.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codes[Number(i)])
}

createRoot(document.getElementById('root')).render(<App/>)
