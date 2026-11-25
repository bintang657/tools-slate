# Tools Slate

A responsive utility workspace built with React and Vite. The interface uses a calm dark-violet theme, responsive two-column mobile cards, an information panel, category navigation, and optional local media assets.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Add your own banner video and music

See `public/media/README.md` and `src/media.js`.

- Optional banner video: `public/media/hero.mp4`
- Optional banner image fallback: `public/media/hero.jpg`
- Music: upload audio files into `public/media/` and add their entries to `public/media/playlist.json`. The player fetches this playlist automatically; no React source edits are needed when adding tracks.

The repository intentionally contains no bundled video or music. Add media you own or have permission to use.

## Deploy to Vercel

Import the GitHub repository into Vercel. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

## Notes

Some downloader tiles are visual placeholders marked `Soon`; their integrations have not been implemented. Existing local utilities and passive lookup tools remain available. API-backed tools may require third-party services and network access.
