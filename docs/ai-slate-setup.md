# AI Slate setup

AI Slate uses Groq's OpenAI-compatible chat-completions API from the server-side `/api/ai-slate` function. The browser never receives the provider key.

## Configure Groq

1. Create an API key in the official Groq console. The free-LLM directory lists Groq as a provider that does not require a credit card, but that is not a guarantee of ongoing access, free quotas, or model availability.
2. In the Tools Slate Vercel project, open **Settings → Environment Variables**.
3. Add `GROQ_API_KEY` as a **Sensitive/Encrypted** variable for Production (and Preview if needed). Paste the key directly into Vercel; do not put it in Git, browser code, or chat.
4. Redeploy so the serverless function receives the new variable.

The default text model is `llama-3.3-70b-versatile`; image messages use `meta-llama/llama-4-scout-17b-16e-instruct`. Override these with `GROQ_MODEL` and `GROQ_VISION_MODEL` only if those models are available to the account. Check Groq's current model catalogue, pricing, and rate limits before changing them. Free-tier quotas and policies can change and are not unlimited or guaranteed. If Groq removes or restricts a selected model, update the model variable in Vercel.

For local development, copy the variables from `.env.example` into an untracked `.env.local` file at the repository root, then restart `npm run dev`. Do not commit `.env.local`. Without `GROQ_API_KEY`, the local endpoint returns a setup error instead of calling the provider.

## Operational notes

- Text requests use the configured text model. Requests with image attachments use the configured vision model. PDF text and DOCX extraction run locally; TXT/Markdown/CSV/JSON files are read locally. On submit, extracted document text and/or compressed image bytes are sent through the server to Groq. Avoid sensitive or confidential prompts and files; review Groq's current data-handling terms.
- Recent conversation context is limited and compacted server-side; output tokens are capped to reduce unnecessary quota usage. This can omit older chat details, so include important context in the latest prompt.
- Provider responses stream into chat. Retry, regenerate, edit, follow-up suggestions, and Markdown export remain available. Rate-limit responses are translated into a safe user-facing message and include a retry delay when the provider supplies one.
- The API validates input, applies a 60-second timeout, and uses a best-effort in-memory per-IP rate limit (12 requests per minute per serverless instance). Instances do not share counters, so this is not a reliable global abuse-control system.
- Groq can still rate-limit requests. The provider's free tier is subject to account, model, and policy limits; switching providers does not guarantee uninterrupted use.
- Do not paste API keys into the chat or expose them in `VITE_*` variables. If a key is accidentally shared, revoke it and create a replacement.
