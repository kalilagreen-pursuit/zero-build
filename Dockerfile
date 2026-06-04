FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Zero CLI (Pattern 2 from docs/deploying-with-zero.md)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://zero.xyz/install.sh | bash \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
ENV PATH="/root/.zero/bin:${PATH}"
ENV ZERO_AGENT=production

# Wallet key + LLM keys are injected at runtime as secrets — never baked in.
# Required at runtime:
#   ZERO_PRIVATE_KEY     hex private key for the Zero wallet
#   ANTHROPIC_API_KEY    Claude API key
#   OPENAI_API_KEY       OpenAI key (fallback path for embeddings)

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "start"]
