# AI Slate setup

AI Slate is the Tools Slate chat assistant (general, coding, writing, study, summarize, and site-tools guide modes). The provider key is used only by the server-side `/api/ai-slate` function. Never put it in `VITE_*` variables, browser code, source control, or chat.

## Configure the Vexo provider

1. Create or obtain an API key through the Vexo service account you intend to use. Confirm its current privacy, billing, model-availability, and usage terms before sending prompts; do not send sensitive or confidential data.
2. In the Tools Slate Vercel project, open **Settings → Environment Variables**.
3. Add `VEXO_API_KEY` as a **Sensitive/Encrypted** variable for Production (and Preview if desired). Enter the key directly in Vercel; do not put it in Git or this conversation.
4. Optionally set `VEXO_MODEL`. The current default is `google/gemma-4-31b-it:free`; model availability and any quota are controlled by the provider and are not guaranteed or unlimited.
5. Redeploy the project so the serverless function receives the environment variable.

For local development, put the variables from `.env.example` in an untracked `.env.local` file at the repository root, then restart `npm run dev`. Do not commit `.env.local`. Without `VEXO_API_KEY`, the API returns an activation message instead of calling the provider.

## Operational notes

- Requests are sent from the backend to the Vexo-compatible chat-completions endpoint, not directly from the browser. Responses stream into the chat.
- Chat history is stored in browser local storage (up to 12 chats, recent 20 messages per chat). Text and extracted PDF/DOCX content remain in that browser storage. Image binary data is kept in memory only and is not persisted in local storage.
- Image attachments are resized/compressed in the browser; PDF text and DOCX extraction also run locally. TXT/Markdown/CSV/JSON are read locally. On submit, compressed image bytes and/or extracted document text are sent through the server to the provider. Avoid sensitive or confidential files. Scanned PDFs without selectable text need OCR first.
- The API applies input limits, a 60-second function timeout, and a best-effort in-memory per-IP rate limit (12 requests per minute per serverless instance). Instances do not share counters, so this is not a robust global quota or abuse-control system.
- The API returns user-facing messages for missing keys, provider quota exhaustion, and provider errors. It never returns the API key to the client.
