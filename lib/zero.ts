import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export const ZERO_FALLBACK_MOODBOARD =
  "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1024&h=640&fit=crop";

export async function loadZeroSkill(): Promise<string> {
  const candidates = [
    path.join(os.homedir(), ".claude/skills/zero/SKILL.md"),
    path.resolve(process.cwd(), "skills/zero/SKILL.md"),
  ];
  for (const p of candidates) {
    try {
      return await fs.readFile(p, "utf8");
    } catch {}
  }
  return `# Zero CLI (fallback skill stub)

The \`zero\` CLI lets agents discover and pay for capabilities on the agentic web via x402.

Common commands:
- \`zero search <query>\` — find capabilities matching a description
- \`zero get <id>\` — inspect a capability's manifest and price
- \`zero fetch <id> --max-pay 0.01 --input '<json>'\` — invoke a paid capability

Always cap --max-pay at 0.01 USDC per call. Narrate every step in one short line.`;
}

export type ZeroEvent =
  | { kind: "stdout"; line: string }
  | { kind: "stderr"; line: string }
  | { kind: "exit"; code: number };

export function runZero(
  args: string[],
  onEvent: (e: ZeroEvent) => void
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    const proc = spawn("zero", args, { env: process.env });
    proc.stdout.on("data", (b) => {
      const s = b.toString();
      stdout += s;
      s.split(/\r?\n/)
        .filter(Boolean)
        .forEach((line: string) => onEvent({ kind: "stdout", line }));
    });
    proc.stderr.on("data", (b) => {
      b.toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line: string) => onEvent({ kind: "stderr", line }));
    });
    proc.on("error", (err) => {
      onEvent({ kind: "stderr", line: `zero CLI not available: ${err.message}` });
      resolve({ code: 127, stdout });
    });
    proc.on("exit", (code) => {
      onEvent({ kind: "exit", code: code ?? 0 });
      resolve({ code: code ?? 0, stdout });
    });
  });
}
