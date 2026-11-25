# All Tools Nexus

A responsive multi-tool dashboard built with React + Vite. Ready for GitHub and Vercel.

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

1. Extract this ZIP and push the `all-tools-nexus` folder contents to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy. The included `vercel.json` supports SPA route fallback.

## Included tools

- JSON formatter / minifier
- Base64 encode / decode
- URL encode / decode
- SHA-256 hash
- UUID v4 generator
- Regex tester
- HTML entity encoder / decoder
- QR code generator
- HEX / RGB / HSL converter
- Text case converter
- Word and character counter
- Markdown preview
- Unix timestamp converter
- Length, weight, and temperature converter
- Percentage calculator
- Weather lookup
- Currency converter

## APIs

- Weather: Open-Meteo Geocoding + Forecast APIs. No API key required for non-commercial use; provide attribution to Open-Meteo when publishing or extending the weather feature.
- Currency: Frankfurter API v2. No API key required. Rates are reference rates, not live trading quotes.
- QR: goQR / QRServer image endpoint.

Most developer and text tools run locally in the browser. API-powered tools require an internet connection. No API keys or secrets are embedded in the project.
