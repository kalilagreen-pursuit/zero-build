# Deploying with Zero.xyz — A Practical Guide

Zero.xyz is a CLI binary that gives agents on-demand access to ~8,000 paid tools and services through x402 / MPP. It works beautifully on a laptop. Getting it into production takes one extra decision: **where does the binary live, and where does the wallet key live?**

This guide covers the four deployment patterns that actually work, in order of speed.

---

## TL;DR — Pick Your Pattern

| Pattern | Best for | Setup time | Cost |
|---|---|---|---|
| **Localhost + ngrok** | Hackathon demo, prototype | 5 min | Free |
| **Single VPS + Docker** | MVP, small SaaS | 30 min | ~$5/mo |
| **Frontend on Vercel + agent on Fly.io / Render** | Production web app | 45 min | $5–20/mo |
| **MCP server wrapping Zero** | Multi-agent system, Claude Desktop / Code users | 60 min | varies |

The rest of this doc walks each pattern end-to-end.

---

## Why Zero needs a special deployment story

Zero is shipped as a CLI binary (`~/.zero/bin/zero`) or an npm package (`@zeroxyz/cli`). Your agent shells out to it. This means:

- **Vercel serverless functions can't run it.** No arbitrary binaries. No persistent filesystem for `~/.zero/config.json`.
- **AWS Lambda / Cloudflare Workers have the same constraint.** The binary won't be there at runtime.
- **The wallet's private key is hot.** Whatever holds the key can spend USDC. Treat it like a payment processor secret, not an API key.

So: anywhere your agent runs Zero, it needs (1) the binary on disk and (2) the private key available either in `~/.zero/config.json` or in the `ZERO_PRIVATE_KEY` env var. Per Zero's own docs, `ZERO_PRIVATE_KEY` wins over the config file when both are present — which is exactly what you want for containers.

---

## Pattern 1 — Localhost + ngrok (Hackathon Mode)

The fastest way to put a Zero-powered agent on the internet. Your laptop is the server.

### Setup

```bash
# 1. Install Zero (you've done this if zero --version works)
curl -fsSL https://zero.xyz/install.sh | bash

# 2. Initialize wallet, fund with the $5 free credit
zero init
zero wallet fund --no-open    # open the printed URL in a browser
zero wallet balance           # confirm funds

# 3. Run your agent backend locally (example: Node on port 3000)
node server.js

# 4. Expose it
npx ngrok http 3000
```

Point your deployed frontend (e.g. on Vercel) at the ngrok URL via an env var.

### When to use it

Demos, hackathons, sharing a prototype with a teammate. **Don't** ship paying users to it — your laptop closing the lid kills the service.

### Gotchas

- ngrok free URLs change every restart. Pay $10/mo or use Cloudflare Tunnel for a stable URL.
- If the agent runs Zero via `child_process`, make sure the spawned process inherits your `PATH` (`~/.zero/bin` must be on it). Use the absolute path `/Users/you/.zero/bin/zero` to be safe.

---

## Pattern 2 — Single VPS + Docker

For an MVP that needs to stay up. Cheapest production option.

### Dockerfile

```dockerfile
FROM node:20-slim

# Install Zero
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://zero.xyz/install.sh | bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Make zero available on PATH for non-interactive shells
ENV PATH="/root/.zero/bin:${PATH}"

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Wallet identity comes from env at runtime — not baked into image
ENV ZERO_AGENT=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### Run

```bash
docker build -t my-agent .
docker run -d \
  --name my-agent \
  -p 3000:3000 \
  -e ZERO_PRIVATE_KEY=0x...your-key... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  --restart unless-stopped \
  my-agent
```

Put nginx or Caddy in front for TLS. A $5 DigitalOcean droplet or Hetzner CX11 handles this comfortably.

### Gotchas

- **Don't bake the private key into the image.** Always pass it at `docker run` time or via a `.env` file that's gitignored.
- **One wallet per environment.** Use separate wallets for staging and production so a runaway test loop doesn't drain prod.
- Verify the binary is reachable inside the container: `docker exec my-agent zero --version` should print a version.

---

## Pattern 3 — Frontend on Vercel + Agent on Fly.io or Render

The "real" production setup. Vercel gets you the great frontend DX you want; a separate service runs the agent where it can actually invoke Zero.

### Architecture

```
[Browser]
   │
   ▼
[Vercel: Next.js frontend + lightweight API routes]
   │  (HTTPS, streams SSE from agent service)
   ▼
[Fly.io / Render / Railway: Node or Python service with Zero CLI installed]
   │
   ├── Anthropic API (LLM)
   └── Zero CLI ──► x402 / MPP capabilities ──► USDC on Base
```

The Vercel side does auth, UI, and proxies streamed responses from the agent service. The agent service is where Zero lives.

### Fly.io deploy (fastest of the three)

```bash
# In your agent service repo
fly launch                          # generates fly.toml, accepts the Dockerfile from Pattern 2
fly secrets set ZERO_PRIVATE_KEY=0x... ANTHROPIC_API_KEY=sk-ant-...
fly deploy
```

Then in your Vercel project, set an env var:

```
AGENT_BASE_URL=https://my-agent.fly.dev
```

And in your Next.js API route, proxy to it:

```ts
// app/api/match/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const upstream = await fetch(`${process.env.AGENT_BASE_URL}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  // Stream the SSE response straight through to the browser
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

### Why split it this way

- Vercel handles auth, edge caching, preview deployments, and the static frontend — the things it's actually good at.
- The agent service handles Zero, long-running streams, and spending money — the things Vercel can't do.
- You can scale the two independently. A viral landing page doesn't blow up your wallet.

### Gotchas

- **Set spend caps in code.** Every `zero fetch` call should pass `--max-pay` so a buggy loop can't drain the wallet.
- **Persist runs.** Zero gives you a `runId` per call — log it. You'll want it for reviewing and for debugging "where did that 12 cents go."
- **Enable Fly auto-stop** for low-traffic apps. The machine sleeps when idle and wakes on request. Your $5 stretches a lot further.

---

## Pattern 4 — MCP Server Wrapping Zero

If you want Zero usable from any MCP-compatible client (Claude Desktop, Claude Code, Cursor) without each user installing the CLI themselves, wrap it in an MCP server.

### Sketch

```ts
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const server = new Server({ name: 'zero-mcp', version: '0.1.0' }, {
  capabilities: { tools: {} }
});

server.setRequestHandler('tools/call', async (req) => {
  if (req.params.name === 'zero_search') {
    const { stdout } = await exec('zero', ['search', req.params.arguments.query]);
    return { content: [{ type: 'text', text: stdout }] };
  }
  // ... zero_get, zero_fetch, zero_review
});
```

Host this server with Pattern 2 or 3. Now any MCP client can use Zero by pointing at your URL — no per-user CLI install.

### When this is worth it

- You're building a product *on top* of Zero, not just consuming it.
- Your users are agent operators who want Zero through their existing tools.
- You want centralized billing — your wallet pays, you charge users via your own pricing.

### Gotchas

- **Auth becomes load-bearing.** If anyone can hit your MCP server, anyone can spend your USDC. Add per-user keys and rate limits before exposing it.
- **Cap per-user spend.** Track `runId` cost per user. Cut them off at their plan limit.

---

## The Wallet Question

This trips everyone up the first time. Three options, in order of safety:

1. **`zero init` on a developer laptop, copy the key to your deploy's secret manager.** Fine for prototyping. The key now exists in two places — back up the laptop copy and rotate when you go to real production.

2. **`zero init` directly on the production host** (via SSH), then read the key out of `~/.zero/config.json` into your secret manager and delete the file. The key existed on the host briefly and only there.

3. **Generate the keypair externally** (e.g., via `cast wallet new` from foundry, or `viem`), fund the address, then set `ZERO_PRIVATE_KEY` in your secret manager. Zero never writes it to disk. Cleanest, but you're responsible for keeping the key backed up.

For all three: **fund only what you're willing to lose to a leak.** Top up periodically rather than parking $500 in the agent wallet.

---

## Monitoring

At minimum, log:

- Every `zero fetch` call with its `runId`, capability slug, and cost
- Wallet balance daily (`zero wallet balance` in a cron / scheduled job — alert if below threshold)
- 402 → 200 latency, since the bridging step (Base → Tempo) is the slowest piece

Useful one-liner for a balance alert (run from your VPS or scheduled task):

```bash
balance=$(zero wallet balance --json | jq -r '.usdc')
if (( $(echo "$balance < 1.0" | bc -l) )); then
  curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"Zero wallet low: \$$balance USDC\"}"
fi
```

(Confirm the actual `--json` shape with `zero wallet balance --help` — schemas may differ from what's documented here.)

---

## Pre-Deploy Checklist

Before you point real traffic at the agent:

- [ ] `ZERO_PRIVATE_KEY` is in a secret manager, not in code or in the Docker image
- [ ] Every `zero fetch` in your code passes `--max-pay`
- [ ] Separate wallets for staging and production
- [ ] Balance alert wired up (Slack, email, or just a daily check)
- [ ] Every paid call logs its `runId` somewhere queryable
- [ ] Frontend rate-limits the trigger endpoint so a malicious user can't burn the wallet
- [ ] You've run the full agent loop end-to-end against the deployed service at least 3 times
- [ ] Backup of the wallet's private key exists somewhere not on the production host

---

## Quick Reference: What Goes Where

| Thing | Local dev | Production |
|---|---|---|
| Zero CLI binary | `~/.zero/bin/zero` | In the Docker image (Pattern 2/3) |
| Wallet key | `~/.zero/config.json` | Secret manager → `ZERO_PRIVATE_KEY` env var |
| Funding | `zero wallet fund` (browser) | Pre-funded; topped up manually |
| Agent identity hint | none needed | `ZERO_AGENT=production` env var |
| Spend cap | optional | **required** — `--max-pay` on every call |

---

## Further Reading

- Zero's official skill: <https://www.zero.xyz/SKILL.md> — the canonical reference for the CLI surface
- Zero FAQ: <https://www.zero.xyz/faq>
- x402 spec (the payment protocol Zero uses): search "x402 HTTP payment protocol"
- Base USDC bridging (since Zero settles there): <https://base.org>
