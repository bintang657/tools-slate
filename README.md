# Tools Slate

Responsive 3D-inspired multi-tool workspace built with React + Vite. The interface includes a dark/light theme, animated 3D hero, searchable categories, favorites, and mobile navigation.

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

1. Push the contents of this folder to your GitHub repository.
2. Import the repository in Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

The included `vercel.json` provides SPA fallback routing.

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

- Open-Meteo geocoding + forecast: no API key for the public endpoint; review provider terms and attribution requirements.
- Frankfurter API v2: public reference exchange rates, not trading quotes.
- QRServer: QR image endpoint.
- ipwho.is: public IP geolocation endpoint; free tier has request limits. The API provider receives the queried IP.
- Google Public DNS JSON API: DNS-over-HTTPS lookup endpoint.
- Have I Been Pwned Pwned Passwords: only the first 5 characters of the locally computed SHA-1 hash are sent. The full password and full hash are not sent. This is a k-anonymity range lookup.
- crt.sh: public Certificate Transparency search. Results are certificate log entries, not a live TLS validation.

No API keys are embedded in this frontend. Public APIs may impose CORS, rate limits, availability, or usage restrictions that can change independently of this project. Browser-based tools require an internet connection. Security Lab tools are limited to passive lookups and local analysis.
