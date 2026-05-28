"use client";

import { useRef, useState } from "react";
import { DEMO_SCENE } from "@/lib/conceptualizers";

type Log = { kind: string; line: string };
type Match = {
  id: string;
  name: string;
  city: string;
  thumbnail: string;
  rateRange: string;
  score: number;
};
type Pitch = { to: string; body: string };

export default function Page() {
  const [scene, setScene] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [moodboard, setMoodboard] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const appendLog = (l: Log) => {
    setLogs((prev) => {
      const next = [...prev, l];
      queueMicrotask(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      });
      return next;
    });
  };

  async function run() {
    setRunning(true);
    setLogs([]);
    setMoodboard(null);
    setMatches([]);
    setReasons({});
    setPitch(null);

    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene }),
    });
    if (!res.body) {
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const eventMatch = chunk.match(/^event: (.+)$/m);
        const dataMatch = chunk.match(/^data: (.+)$/m);
        if (!eventMatch || !dataMatch) continue;
        const event = eventMatch[1];
        const data = JSON.parse(dataMatch[1]);
        if (event === "log") appendLog(data as Log);
        else if (event === "moodboard") setMoodboard((data as { url: string }).url);
        else if (event === "matches") setMatches((data as { matches: Match[] }).matches);
        else if (event === "reasons")
          setReasons((data as { reasons: Record<string, string> }).reasons);
        else if (event === "pitch") setPitch(data as Pitch);
        else if (event === "done") setRunning(false);
      }
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl tracking-tight">
            <span className="text-curtain-accent">Curtain</span> Call
          </h1>
          <p className="mt-1 text-curtain-ink/60">
            An AI casting agent for playwrights and visual conceptualizers — powered by{" "}
            <span className="text-curtain-accent">Zero.xyz</span>.
          </p>
        </div>
        <div className="text-right text-xs text-curtain-ink/50">
          <div>x402 wallet: connected</div>
          <div>budget cap: 0.01 USDC / call</div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-curtain-ink/10 bg-curtain-panel p-5">
            <label className="mb-2 block text-sm text-curtain-ink/70">
              Paste a scene or describe your play&apos;s world
            </label>
            <textarea
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              rows={8}
              placeholder="A Victorian séance. A working-class kitchen. A flooded city in 2042. Paste the scene that needs a designer."
              className="w-full resize-none rounded-md bg-curtain-bg p-3 text-sm leading-relaxed text-curtain-ink outline-none ring-1 ring-curtain-ink/10 focus:ring-curtain-accent"
            />
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setScene(DEMO_SCENE)}
                className="text-xs text-curtain-ink/50 hover:text-curtain-accent"
              >
                use demo scene
              </button>
              <button
                onClick={run}
                disabled={running || scene.trim().length < 20}
                className="rounded-md bg-curtain-velvet px-4 py-2 text-sm tracking-wide text-curtain-ink disabled:opacity-40"
              >
                {running ? "casting…" : "Find My Conceptualizer"}
              </button>
            </div>
          </div>

          {moodboard && (
            <div className="overflow-hidden rounded-lg border border-curtain-ink/10 bg-curtain-panel">
              <img src={moodboard} alt="moodboard" className="h-72 w-full object-cover" />
              <div className="px-4 py-2 text-xs text-curtain-ink/60">
                moodboard — generated via zero fetch (paid)
              </div>
            </div>
          )}

          {matches.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg text-curtain-accent">Matched conceptualizers</h2>
              {matches.map((m, i) => (
                <div
                  key={m.id}
                  className="flex gap-4 rounded-lg border border-curtain-ink/10 bg-curtain-panel p-4"
                >
                  <img
                    src={m.thumbnail}
                    alt=""
                    className="h-20 w-28 flex-shrink-0 rounded object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-curtain-ink">
                          <span className="text-curtain-accent">#{i + 1}</span> {m.name}
                        </div>
                        <div className="text-xs text-curtain-ink/50">
                          {m.city} · {m.rateRange}
                        </div>
                      </div>
                      <div className="text-sm text-curtain-accent">{m.score}% fit</div>
                    </div>
                    <p className="mt-2 text-sm text-curtain-ink/80">
                      {reasons[m.id] ?? <span className="text-curtain-ink/30">…</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pitch && (
            <div className="rounded-lg border border-curtain-accent/40 bg-curtain-panel p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-curtain-accent">
                drafted pitch to {pitch.to}
              </div>
              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-curtain-ink">
                {pitch.body}
              </pre>
              <button className="mt-4 rounded-md border border-curtain-accent/40 px-3 py-1.5 text-xs text-curtain-accent hover:bg-curtain-accent/10">
                Send Pitch
              </button>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-curtain-ink/10 bg-curtain-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wider text-curtain-ink/60">
              agent activity
            </h3>
            <span
              className={`h-2 w-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-curtain-ink/20"}`}
            />
          </div>
          <div
            ref={logRef}
            className="h-[640px] overflow-y-auto rounded bg-curtain-bg p-3"
          >
            {logs.length === 0 && (
              <div className="text-xs text-curtain-ink/30">
                waiting for scene… activity will stream here.
              </div>
            )}
            {logs.map((l, i) => (
              <div key={i} className={`log-line log-${l.kind}`}>
                {l.line}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer className="mt-10 text-center text-xs text-curtain-ink/40">
        Curtain Call · hackathon build · Zero.xyz × Anthropic × OpenAI embeddings
      </footer>
    </main>
  );
}
