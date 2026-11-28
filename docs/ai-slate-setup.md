# AI Slate setup

AI Slate is the Tools Slate chat assistant (general, coding, writing, study, summarize, and site-tools guide modes). Its provider API key is used **only by the server-side `/api/ai-slate` function**; never put it in `VITE_*` variables, browser code, source control, or chat.

## Use the free Gemini API tier

1. Sign in to [Google AI Studio](https://aistudio.google.com/api-keys) with a Google account and create a Gemini API key for a project.
2. In the Tools Slate Vercel project, open **Settings → Environment Variables**.
3. Add `GEMINI_API_KEY` as a **Sensitive/Encrypted** variable for Production (and Preview if desired). Paste the key directly into Vercel, not into Git or this conversation.
4. Optionally set `GEMINI_MODEL=gemini-2.5-flash`. This is the default in code and has a free tier according to Google's current pricing page.
5. Redeploy the project so the serverless function receives the environment variable.

Google lists Indonesia as an available Gemini API / AI Studio region. The API has a free tier with limited model access and quotas; access and limits can vary by account, project, model, and policy. A free-tier account may be unable to use a model or API until project eligibility is resolved, so this is not a promise of unlimited or guaranteed service. Google says content on the free tier may be used to improve its products; avoid sensitive or confidential prompts. Check Google's current [pricing](https://ai.google.dev/gemini-api/docs/pricing), [billing tiers](https://ai.google.dev/gemini-api/docs/billing), [available regions](https://ai.google.dev/gemini-api/docs/available-regions), and [API key guidance](https://ai.google.dev/gemini-api/docs/api-key) before use.

For local development, put the key in an untracked `.env.local` file at the repository root (copy the variable names from `.env.example`), then restart `npm run dev`. Do not commit `.env.local`. The local Vite middleware exposes the same endpoint for development; without the key it returns an activation message instead of calling Gemini.

## Operational notes

- Requests are sent from the backend to Gemini, not directly from the browser to Google's API. Responses stream into the chat. Retry, regenerate, edit, follow-up suggestions, and Markdown export are implemented in the app.
- Chat history is stored in browser local storage (up to 12 chats, recent 20 messages per chat). Text and extracted PDF/DOCX content remain in that browser storage. Image binary data is kept in memory only and is not persisted in local storage.
- Image attachments are resized/compressed in the browser; PDF text and DOCX extraction also run locally. TXT/Markdown/CSV/JSON are read locally. On submit, compressed image bytes and/or extracted document text are sent through the server to Gemini. Do not upload sensitive or confidential files. Scanned PDFs without selectable text need OCR first.
- The API applies input limits, a 60-second function timeout, and a best-effort in-memory per-IP rate limit (12 requests per minute per serverless instance). Instances do not share counters, so this is not a robust global quota or abuse-control system.
- The app does not add a paid provider or database. Gemini's free tier has account/model-specific quotas and availability; a free tier is not unlimited or guaranteed. Usage can be blocked when quotas or eligibility rules are reached.
- The API returns friendly messages for missing keys, quota exhaustion, and provider errors. It intentionally does not return the API key.
