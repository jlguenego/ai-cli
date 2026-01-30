import { execa } from "execa";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";

const COPILOT_CMD = "copilot";
const COPILOT_VERSION_ARGS = ["--version"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnoent(error: unknown): boolean {
  return isRecord(error) && error["code"] === "ENOENT";
}

function looksUnauthenticated(output: string): boolean {
  return /\b(auth(entication)?|login|log in|not\s+logged|unauthori[sz]ed|token)\b/i.test(
    output,
  );
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function tryExec(
  command: string,
  args: string[],
  opts: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
  },
): Promise<ExecResult> {
  const result = await execa(command, args, {
    reject: false,
    cwd: opts.cwd,
    env: opts.env,
    timeout: opts.timeoutMs,
  });

  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function detectBackend(): Promise<
  | { kind: "copilot"; details?: string }
  | { kind: "missing"; details?: string }
  | { kind: "unauthenticated"; details?: string }
> {
  try {
    const r = await tryExec(COPILOT_CMD, COPILOT_VERSION_ARGS, {});
    const combined = `${r.stdout}\n${r.stderr}`.trim();

    if (r.exitCode === 0) {
      return { kind: "copilot" };
    }

    if (looksUnauthenticated(combined)) {
      return { kind: "unauthenticated", details: combined };
    }

    return {
      kind: "copilot",
      details: combined || `exitCode=${r.exitCode}`,
    };
  } catch (error) {
    if (isEnoent(error)) {
      return {
        kind: "missing",
        details: "Commande introuvable: copilot",
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { kind: "missing", details: message };
  }
}

export class CopilotAdapter implements Adapter {
  public readonly id = "copilot" as const;

  async isAvailable(): Promise<AdapterAvailability> {
    const detected = await detectBackend();

    switch (detected.kind) {
      case "missing":
        return { status: "missing", details: detected.details };
      case "unauthenticated":
        return { status: "unauthenticated", details: detected.details };
      case "copilot":
        return detected.details
          ? { status: "available", details: detected.details }
          : { status: "available" };
    }
  }

  async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    const detected = await detectBackend();

    const env = { ...process.env, ...args.env };

    if (detected.kind === "copilot") {
      // Utiliser l'option -p (--prompt) pour le mode non-interactif
      // et -s (--silent) pour n'avoir que la réponse de l'agent
      const r = await tryExec(COPILOT_CMD, ["-p", args.prompt, "-s"], {
        cwd: args.cwd,
        env,
        timeoutMs: args.timeoutMs,
      });

      return {
        exitCode: r.exitCode,
        text: r.stdout.trim() ? r.stdout : r.stderr,
        raw: r,
      };
    }

    // missing/unauthenticated: retourner un code stable (cf. clarifications/003)
    return {
      exitCode: detected.kind === "unauthenticated" ? 6 : 2,
      text: detected.details ?? "Backend copilot indisponible",
      raw: detected,
    };
  }
}
