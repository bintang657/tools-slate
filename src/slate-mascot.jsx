import React from 'react'

export default function SlateMascot() {
  return <svg className="slate-mascot" viewBox="0 0 120 124" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="slate-bot-shell" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff"/><stop offset=".58" stopColor="#e9f5ff"/><stop offset="1" stopColor="#a9d2ee"/>
      </linearGradient>
      <linearGradient id="slate-bot-blue" x1="0" y1="0" x2=".95" y2="1">
        <stop offset="0" stopColor="#b9f3ff"/><stop offset=".45" stopColor="#70cafa"/><stop offset="1" stopColor="#4384d5"/>
      </linearGradient>
      <linearGradient id="slate-bot-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#263c57"/><stop offset="1" stopColor="#101d30"/>
      </linearGradient>
      <radialGradient id="slate-bot-glow" cx="50%" cy="42%" r="60%">
        <stop offset="0" stopColor="#8bf1ff" stopOpacity=".42"/><stop offset="1" stopColor="#65cfff" stopOpacity="0"/>
      </radialGradient>
      <filter id="slate-bot-shadow" x="-30%" y="-25%" width="160%" height="170%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#102c52" floodOpacity=".3"/>
      </filter>
      <filter id="slate-bot-eye-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <ellipse cx="60" cy="115" rx="25" ry="5" fill="#63c9ff" opacity=".2" className="slate-mascot-shadow"/>
    <circle cx="60" cy="58" r="54" fill="url(#slate-bot-glow)"/>

    <g className="slate-mascot-body" filter="url(#slate-bot-shadow)">
      <path d="M42 75 29 88" fill="none" stroke="#5daee9" strokeWidth="11" strokeLinecap="round"/>
      <g className="slate-mascot-wave">
        <path d="m81 77 10 11" fill="none" stroke="#70bce9" strokeWidth="12" strokeLinecap="round"/>
        <circle cx="94" cy="91" r="7" fill="url(#slate-bot-shell)"/>
      </g>
      <path d="M43 73h34c8 0 14 7 14 15v12c0 7-6 12-13 12H46c-7 0-13-5-13-12V87c0-8 4-14 10-14Z" fill="url(#slate-bot-shell)" stroke="#c2e6fa" strokeWidth="1.5"/>
      <path d="M42 75h36c6 0 11 5 11 11v10H34V87c0-7 3-12 8-12Z" fill="url(#slate-bot-blue)"/>
      <path d="M46 99h29c6 0 9 4 9 8 0 4-4 7-9 7H46c-5 0-9-3-9-7 0-5 4-8 9-8Z" fill="#eef8ff" opacity=".92"/>
      <circle cx="60" cy="88" r="8" fill="#dffaff" stroke="#67d8fb" strokeWidth="3"/>
      <circle cx="60" cy="88" r="3" fill="#69cbf4" className="slate-mascot-core"/>
      <path d="M39 79c3-3 6-4 9-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
    </g>

    <g className="slate-mascot-head" filter="url(#slate-bot-shadow)">
      <path d="M26 40c-7-1-11 4-11 10s5 9 12 8M94 40c7-1 11 4 11 10s-5 9-12 8" fill="url(#slate-bot-blue)" stroke="#a3e6ff" strokeWidth="2"/>
      <path d="M60 14V8" stroke="#a8e8ff" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="60" cy="6" r="4" fill="#83e5ff" className="slate-mascot-antenna"/>
      <rect x="24" y="12" width="72" height="57" rx="20" fill="url(#slate-bot-shell)" stroke="#f5fbff" strokeWidth="2"/>
      <path d="M37 15c10-4 35-3 47 2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9"/>
      <rect x="31" y="22" width="58" height="38" rx="13" fill="url(#slate-bot-screen)" stroke="#9fc5df" strokeWidth="1.5"/>
      <path d="m38 29 4 0 0 4M82 29h-4v4M38 53v-4h4M82 53h-4v-4" fill="none" stroke="#83eaff" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
      <g filter="url(#slate-bot-eye-glow)">
        <ellipse cx="49" cy="41" rx="5.8" ry="7.2" fill="#8cf4ff" className="slate-mascot-eye"/>
        <ellipse cx="71" cy="41" rx="5.8" ry="7.2" fill="#8cf4ff" className="slate-mascot-eye"/>
      </g>
      <path className="slate-mascot-blink" d="M43 41h12m10 0h12" stroke="#8cf4ff" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="27" cy="42" r="3" fill="#c5efff"/><circle cx="93" cy="42" r="3" fill="#c5efff"/>
    </g>
    <path d="M14 27l2.2 4.8L21 34l-4.8 2.2L14 41l-2.2-4.8L7 34l4.8-2.2L14 27Z" fill="#a6edff" className="slate-mascot-sparkle"/>
    <circle cx="103" cy="72" r="2.3" fill="#9edfff" className="slate-mascot-sparkle-alt"/>
  </svg>
}
