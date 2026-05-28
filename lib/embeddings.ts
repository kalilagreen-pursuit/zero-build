import OpenAI from "openai";
import { CONCEPTUALIZERS, Conceptualizer } from "./conceptualizers";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type Ranked = { conceptualizer: Conceptualizer; score: number };

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

async function embed(input: string | string[]): Promise<number[][]> {
  if (!openai) throw new Error("OPENAI_API_KEY not set");
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return res.data.map((d) => d.embedding as number[]);
}

async function getPortfolioEmbeddings() {
  if (cachedPortfolioEmbeddings) return cachedPortfolioEmbeddings;
  const texts = CONCEPTUALIZERS.map((c) => `${c.voice}\n\n${c.portfolio}`);
  const vecs = await embed(texts);
  cachedPortfolioEmbeddings = CONCEPTUALIZERS.map((c, i) => ({
    id: c.id,
    vec: vecs[i],
  }));
  return cachedPortfolioEmbeddings;
}

export async function rankConceptualizers(scene: string): Promise<Ranked[]> {
  if (!openai) {
    return CONCEPTUALIZERS.slice(0, 3).map((c, i) => ({
      conceptualizer: c,
      score: 0.9 - i * 0.05,
    }));
  }
  const [sceneVec] = await embed(scene);
  const portfolio = await getPortfolioEmbeddings();
  const ranked = portfolio
    .map((p) => {
      const c = CONCEPTUALIZERS.find((x) => x.id === p.id)!;
      return { conceptualizer: c, score: cosine(sceneVec, p.vec) };
    })
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, 3);
}
