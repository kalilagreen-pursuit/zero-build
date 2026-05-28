import OpenAI from "openai";
import { CONCEPTUALIZERS, Conceptualizer } from "./conceptualizers";
import { runZero, ZeroEvent } from "./zero";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type Ranked = { conceptualizer: Conceptualizer; score: number };
export type LogFn = (e: { kind: string; line: string }) => void;

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

let cachedPortfolioEmbeddings: { id: string; vec: number[] }[] | null = null;
let cachedEmbeddingCapId: string | null = null;

async function discoverEmbeddingCapability(log: LogFn): Promise<string | null> {
  if (cachedEmbeddingCapId) return cachedEmbeddingCapId;
  log({ kind: "tool", line: "zero search text-embedding small" });
  const onEv = (e: ZeroEvent) => {
    if (e.kind === "stdout") log({ kind: "tool", line: `  ${e.line}` });
    if (e.kind === "stderr") log({ kind: "err", line: `  ${e.line}` });
  };
  const search = await runZero(["search", "text-embedding small"], onEv);
  if (search.code === 127) return null;
  const capId = (search.stdout.match(/[a-z0-9-]{8,}/i) ?? [])[0] ?? null;
  if (capId) {
    log({ kind: "tool", line: `zero get ${capId}` });
    await runZero(["get", capId], onEv);
    cachedEmbeddingCapId = capId;
  }
  return capId;
}

async function embedViaZero(
  capId: string,
  input: string[],
  log: LogFn
): Promise<number[][] | null> {
  log({ kind: "tool", line: `zero fetch ${capId} --max-pay 0.01 (×${input.length})` });
  const res = await runZero(
    [
      "fetch",
      capId,
      "--max-pay",
      "0.01",
      "--input",
      JSON.stringify({ model: "text-embedding-3-small", input }),
    ],
    (e) => {
      if (e.kind === "stdout" && /paid/i.test(e.line))
        log({ kind: "pay", line: e.line });
    }
  );
  try {
    const parsed = JSON.parse(res.stdout);
    const vecs: number[][] | undefined =
      parsed.embeddings ?? parsed.data?.map((d: { embedding: number[] }) => d.embedding);
    if (!vecs || vecs.length !== input.length) return null;
    return vecs;
  } catch {
    return null;
  }
}

async function embedViaOpenAI(input: string[]): Promise<number[][]> {
  if (!openai) throw new Error("OPENAI_API_KEY not set and zero CLI unavailable");
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return res.data.map((d) => d.embedding as number[]);
}

async function embed(input: string[], log: LogFn): Promise<number[][]> {
  const capId = await discoverEmbeddingCapability(log);
  if (capId) {
    const viaZero = await embedViaZero(capId, input, log);
    if (viaZero) return viaZero;
    log({ kind: "err", line: "zero embedding fetch failed, falling back to OpenAI direct" });
  } else {
    log({ kind: "think", line: "zero CLI unavailable, using OpenAI direct for embeddings" });
  }
  return embedViaOpenAI(input);
}

async function getPortfolioEmbeddings(log: LogFn) {
  if (cachedPortfolioEmbeddings) return cachedPortfolioEmbeddings;
  const texts = CONCEPTUALIZERS.map((c) => `${c.voice}\n\n${c.portfolio}`);
  const vecs = await embed(texts, log);
  cachedPortfolioEmbeddings = CONCEPTUALIZERS.map((c, i) => ({
    id: c.id,
    vec: vecs[i],
  }));
  return cachedPortfolioEmbeddings;
}

export async function rankConceptualizers(
  scene: string,
  log: LogFn = () => {}
): Promise<Ranked[]> {
  try {
    const portfolio = await getPortfolioEmbeddings(log);
    const [sceneVec] = await embed([scene], log);
    return portfolio
      .map((p) => {
        const c = CONCEPTUALIZERS.find((x) => x.id === p.id)!;
        return { conceptualizer: c, score: cosine(sceneVec, p.vec) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } catch (err) {
    log({
      kind: "err",
      line: `embedding pipeline failed: ${err instanceof Error ? err.message : String(err)}; using static order`,
    });
    return CONCEPTUALIZERS.slice(0, 3).map((c, i) => ({
      conceptualizer: c,
      score: 0.9 - i * 0.05,
    }));
  }
}
