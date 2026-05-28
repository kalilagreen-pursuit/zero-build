# Curtain Call

AI casting agent for playwrights and visual conceptualizers. Paste a scene, get a Zero-discovered moodboard, three matched designers, and a drafted commission pitch in ~30 seconds.

## Stack
- Next.js 15 (App Router) on Vercel
- Anthropic Messages API (Claude Sonnet 4.5) for pitch + match reasoning
- OpenAI `text-embedding-3-small` for cosine-similarity matching against seed portfolios
- Zero CLI shelled out from `/api/match` for runtime capability discovery + x402 payment
- SSE for live agent narration to the client

## Run
```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

The `zero` CLI is shelled out by `lib/zero.ts`; if it's not on PATH, the route falls back to a pre-recorded moodboard so the demo still runs.

## Files of interest
- `app/page.tsx` — single-page UI (textarea, streaming log, results)
- `app/api/match/route.ts` — SSE agent loop
- `lib/zero.ts` — `zero` CLI shell + SKILL.md loader
- `lib/embeddings.ts` — portfolio embedding + cosine ranking
- `lib/conceptualizers.ts` — seed profiles + demo scene
