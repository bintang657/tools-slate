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

- Requests are sent from the backend to Gemini, not from the browser to Google's API. Chat history is stored in browser local storage (up to 12 chats, recent 20 messages per chat); it is not sent anywhere except as context to Gemini when a message is submitted.
- The API applies basic input limits, a short timeout, and an in-memory per-IP rate limit. Serverless instances do not share in-memory counters, so this is a best-effort guard rather than a robust global quota or abuse-control system. Consider adding a shared rate-limit store or platform-level protection before exposing it to heavy public traffic.
- The API returns friendly messages for missing keys, quota exhaustion, and provider errors. It intentionally does not return the provider's raw error payload or API key.
