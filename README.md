# Tools Slate

A responsive utility workspace built with React and Vite.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

Import the repository into Vercel. Use framework preset **Vite**, build command `npm run build`, and output directory `dist`.

## Social Media Downloader setup (Ssave Open API)

The downloader uses the free Ssave Open API through a Vercel serverless function at `api/social-download.js`.

1. No API key or account registration is required for the documented free tier.
2. Deploy the project to Vercel.
3. Open **Downloader → Social Media Downloader** and paste a public TikTok or Instagram post URL.

### Free-tier limits

The provider documentation currently states:

- `POST /open/v1/extract`: 10 requests per IP per UTC day.
- `GET /open/v1/download`: 50 requests per IP per UTC day.
- Daily reset: 00:00 UTC (07:00 WIB).
- Extract tokens expire after approximately 5–15 minutes.

**Deployment note:** Requests are proxied by the serverless function. The provider sees the deployment's outbound IP, so the free quota may be shared by all visitors using the same deployment and may vary with the hosting network. This is not a per-user quota. The API is free-tier rate-limited, not unlimited.

The integration supports public TikTok and Instagram links. Private, deleted, age-gated, login-only, or otherwise restricted posts may not resolve. Use only media you have permission to download and follow the platform/provider terms.

### Provider adapter

`SOCIAL_DOWNLOADER_PROVIDER` defaults to `ssave`. The API handler is structured around a provider adapter so another service can be added later. Knightvision is not enabled yet because its authenticated API contract and access requirements have not been verified; do not set the variable to `knightvision` until that adapter is implemented.

Never put provider secrets in frontend source code or a `VITE_` variable.


## Music player setup

1. Place MP3 files in `public/media/`.
2. Edit `public/media/playlist.json` and add one object per track:

```json
{
  "tracks": [
    {
      "title": "Judul Lagu",
      "artist": "Nama Artis",
      "src": "/media/nama-file.mp3"
    }
  ]
}
```

The top-left play control starts or pauses the selected track. The header displays its title and an animated visualizer; the dock provides mute, volume, pause/play, and next-track controls. The repository intentionally ships with an empty playlist because no audio files were supplied.
