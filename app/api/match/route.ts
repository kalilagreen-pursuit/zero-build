import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { rankConceptualizers } from "@/lib/embeddings";
import { loadZeroSkill, runZero, ZERO_FALLBACK_MOODBOARD } from "@/lib/zero";
import { Conceptualizer } from "@/lib/conceptualizers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

type SSE = (event: string, data: unknown) => void;

function makeSSE(controller: ReadableStreamDefaultController): SSE {
  const enc = new TextEncoder();
  return (event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(enc.encode(payload));
  };
}

async function runZeroMoodboardLoop(scene: string, send: SSE): Promise<string> {
  send("log", { kind: "tool", line: "zero search image-generation" });
  const search = await runZero(
    ["search", "image-generation moodboard theater"],
    (e) => {
      if (e.kind === "stdout") send("log", { kind: "tool", line: `  ${e.line}` });
      if (e.kind === "stderr") send("log", { kind: "err", line: `  ${e.line}` });
    }
  );
  if (search.code === 127) {
    send("log", {
      kind: "err",
      line: "zero CLI unavailable — using pre-recorded moodboard for demo resilience",
    });
    return ZERO_FALLBACK_MOODBOARD;
  }

  const capId = (search.stdout.match(/[a-z0-9-]{8,}/i) ?? ["img-gen-default"])[0];
  send("log", { kind: "tool", line: `zero get ${capId}` });
  await runZero(["get", capId], (e) => {
    if (e.kind === "stdout") send("log", { kind: "tool", line: `  ${e.line}` });
  });

  send("log", { kind: "tool", line: `zero fetch ${capId} --max-pay 0.01` });
  const prompt = `Theatrical moodboard for: ${scene.slice(0, 240)}`;
  const fetched = await runZero(
    ["fetch", capId, "--max-pay", "0.01", "--input", JSON.stringify({ prompt })],
    (e) => {
      if (e.kind === "stdout") {
        send("log", { kind: "tool", line: `  ${e.line}` });
        if (/paid/i.test(e.line)) send("log", { kind: "pay", line: e.line });
      }
    }
  );

  const url =
    (fetched.stdout.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp)/i) ?? [])[0] ??
    ZERO_FALLBACK_MOODBOARD;
  return url;
}

async function draftPitchAndReasons(
  scene: string,
  ranked: { conceptualizer: Conceptualizer; score: number }[],
  send: SSE
): Promise<{ reasons: Record<string, string>; pitch: string }> {
  if (!anthropic) {
    const reasons = Object.fromEntries(
      ranked.map((r) => [r.conceptualizer.id, "Embedding match on aesthetic vocabulary."])
    );
    const top = ranked[0].conceptualizer;
    return {
      reasons,
      pitch: `Dear ${top.name},\n\nI'm developing a chamber piece and your portfolio caught me at the first image. I'd love to share a scene and explore a commission in the ${top.rateRange} range. Are you open this season?\n\n— a playwright`,
    };
  }

  const system = `You are a casting agent for theater pre-production. Reply in strict JSON, no prose around it.`;
  const user = `Scene:\n"""${scene}"""\n\nTop 3 matches:\n${ranked
    .map(
      (r, i) =>
        `${i + 1}. ${r.conceptualizer.name} (${r.conceptualizer.city}) — voice: ${r.conceptualizer.voice}`
    )
    .join("\n")}\n\nReturn JSON: { "reasons": { "<id>": "<one sentence why this match, naming a concrete visual motif from their portfolio that the scene calls for>" }, "pitch": "<3-4 sentence opening pitch from the playwright to the top match (${ranked[0].conceptualizer.name}), naming a specific element of the scene, ending with a proposed commission scope (rate range ${ranked[0].conceptualizer.rateRange}, deliverables, 6-week timeline)>" }\n\nIDs: ${ranked.map((r) => r.conceptualizer.id).join(", ")}`;

  send("log", { kind: "think", line: "claude: drafting reasons and pitch…" });
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    return parsed;
  } catch {
    send("log", { kind: "err", line: "claude response not parseable, using fallback" });
    return draftPitchAndReasons(scene, ranked, () => {});
  }
}

export async function POST(req: NextRequest) {
  const { scene } = (await req.json()) as { scene: string };
  if (!scene || scene.trim().length < 20) {
    return new Response("scene too short", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = makeSSE(controller);
      try {
        send("log", { kind: "think", line: "loading Zero SKILL.md into agent context…" });
        await loadZeroSkill();
        send("log", { kind: "think", line: "embedding scene against conceptualizer portfolios…" });

        const [moodboard, ranked] = await Promise.all([
          runZeroMoodboardLoop(scene, send),
          rankConceptualizers(scene, (e) => send("log", e)),
        ]);

        send("moodboard", { url: moodboard });
        send("matches", {
          matches: ranked.map((r) => ({
            id: r.conceptualizer.id,
            name: r.conceptualizer.name,
            city: r.conceptualizer.city,
            thumbnail: r.conceptualizer.thumbnail,
            rateRange: r.conceptualizer.rateRange,
            score: Math.round(r.score * 100),
          })),
        });

        const { reasons, pitch } = await draftPitchAndReasons(scene, ranked, send);
        send("reasons", { reasons });
        send("pitch", { to: ranked[0].conceptualizer.name, body: pitch });
        send("done", { ok: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        send("log", { kind: "err", line: `fatal: ${msg}` });
        send("done", { ok: false });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
