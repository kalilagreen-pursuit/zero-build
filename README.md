# Curtain Call

AI casting agent for playwrights and visual conceptualizers. Paste a scene, get a Zero-discovered moodboard, three matched designers, and a drafted commission pitch in ~30 seconds.

## Stack
- Next.js 15 (App Router)
- Anthropic Messages API (Claude Sonnet 4.5) for pitch + match reasoning
- Zero CLI shelled out from `/api/match` for moodboard image generation **and** text embeddings (via `zero search` → `zero get` → `zero fetch --max-pay 0.01`)
- OpenAI `text-embedding-3-small` as a fallback when the Zero CLI isn't available
- SSE for live agent narration to the client

## Deployment

Zero is a **CLI binary**, not a hosting platform, so the deployment story is "anywhere your container can run the `zero` binary and read a `ZERO_PRIVATE_KEY`." See [`docs/deploying-with-zero.md`](docs/deploying-with-zero.md) for the full guide. The two patterns this repo is set up for:

### Pattern 1 — Localhost + ngrok (hackathon demo)

What the PRD §10 calls "the actual demo target."

```bash
# install Zero, init wallet, fund with $5 free credit
curl -fsSL https://zero.xyz/install.sh | bash
zero init
zero wallet fund --no-open
zero wallet balance

# run the app
cp .env.example .env.local   # add ANTHROPIC_API_KEY, OPENAI_API_KEY
npm install
npm run dev

# expose for the slide link
npx ngrok http 3000
```

### Pattern 2 — Single container on Fly.io (slide link)

A `Dockerfile` and `fly.toml` are checked in. The image installs the Zero CLI per the guide; the wallet key is injected at runtime as a secret, never baked in.

```bash
fly launch --no-deploy   # accept the existing Dockerfile and fly.toml
fly secrets set \
  ZERO_PRIVATE_KEY=0x... \
  ANTHROPIC_API_KEY=sk-ant-... \
  OPENAI_API_KEY=sk-...
fly deploy
```

The app uses one wallet — keep staging and production wallets separate, and pre-fund only what you're willing to lose.

> **Vercel won't work.** Vercel's serverless runtime can't execute the `zero` binary or persist `~/.zero/config.json`. If you want Vercel for the frontend, you'd split into Pattern 3 from the guide (Vercel frontend + Fly.io agent service with an SSE proxy).

## Pre-deploy checklist
- [x] Every `zero fetch` in `lib/zero.ts` / `lib/embeddings.ts` passes `--max-pay 0.01`
- [ ] `ZERO_PRIVATE_KEY` lives in `fly secrets`, not in code or the image
- [ ] Separate wallets for staging and production
- [ ] Wallet balance alert wired up (see guide §Monitoring)
- [ ] Frontend rate-limits `/api/match` before exposing to the public

## Files of interest
- `app/page.tsx` — single-page UI (textarea, streaming log, results)
- `app/api/match/route.ts` — SSE agent loop
- `lib/zero.ts` — `zero` CLI shell + SKILL.md loader
- `lib/embeddings.ts` — Zero-fetched embeddings with OpenAI fallback + cosine ranking
- `lib/conceptualizers.ts` — seed profiles + demo scene
- `Dockerfile`, `fly.toml` — Pattern 2 deployment
- `docs/deploying-with-zero.md` — canonical deployment reference
