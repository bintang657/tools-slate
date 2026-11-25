# Tools Slate

A refined, responsive multi-tool workspace built with React + Vite. The interface uses a graphite/mineral visual system, restrained dimensional 3D details, layered dialogs, keyboard search, responsive navigation, favorites, and dark/light themes.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push the contents of this folder to the GitHub repository.
2. Import the repository in Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

The included `vercel.json` provides SPA fallback routing and the certificate transparency API proxy.

## Interface details

- Refined graphite interface with an optional light theme.
- Layered 3D hero object, ambient depth, subtle motion, and responsive tool cards.
- Search shortcut: `Ctrl + K` / `⌘ + K`; `Esc` closes an open tool dialog.
- Accessible focus states and dialog semantics.
- Mobile-first category scrolling and responsive tool layouts.

## Included tools

### Developer
- JSON Formatter / Minifier
- Base64 Converter
- URL Encoder / Decoder
- SHA-256 Generator
- UUID Generator
- Regex Tester
- HTML Entity Encoder / Decoder

### Image & Design
- QR Code Generator
- HEX / RGB / HSL Color Converter

### Text
- Text Case Converter
- Word Counter
- Markdown Preview

### Utilities
- Unix Timestamp Converter
- Length, Weight, Temperature Converter
- Percentage Calculator

### Online Tools
- Weather Lookup (Open-Meteo)
- Currency Converter (Frankfurter)

### Security Lab (passive diagnostics)
- IP Lookup (ipwho.is)
- DNS Lookup (Google Public DNS JSON API)
- JWT Decoder (local decode; does not verify signatures)
- Password Exposure Check (Have I Been Pwned Pwned Passwords range API, k-anonymity)
- URL Security Analyzer (local URL structure analysis)
- Certificate Transparency Lookup (crt.sh)

## API notes

- Open-Meteo geocoding + forecast: public endpoint; no API key configured.
- Frankfurter API v2: public reference exchange rates, not trading quotes.
- QRServer: QR image endpoint.
- ipwho.is: public IP geolocation endpoint; provider receives the queried IP.
- Google Public DNS JSON API: DNS-over-HTTPS lookup endpoint.
- Have I Been Pwned Pwned Passwords: only the first 5 characters of the locally computed SHA-1 hash are sent.
- crt.sh: public Certificate Transparency search. Results are certificate log entries, not a live TLS validation.

No API keys are embedded in this frontend. Public APIs may impose CORS, rate limits, availability, or usage restrictions. Browser-based tools require an internet connection. Security Lab tools are limited to passive lookups and local analysis.


## Cinematic interface update
The interface uses an editorial creative-tech direction: sculptural CSS 3D hero, tactile mineral surfaces, restrained motion, cinematic modal transitions, responsive layouts, and reduced-motion support. The visual direction is original to Tools Slate and inspired by the broad design language of immersive creative libraries.
