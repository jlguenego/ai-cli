import { execa } from "execa";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";

const CODEX_CMD = "codex";
const CODEX_VERSION_ARGS = ["--version"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEnoent(error: unknown): boolean {
  return isRecord(error) && error["code"] === "ENOENT";
}

function looksUnauthenticated(output: string): boolean {
  return /\b(unauthori[sz]ed|forbidden|login|log in|not\s+logged|auth(entication)?|api\s*key|openai_api_key|token)\b/i.test(
    output,
  );
}

function looksMissingBinary(output: string): boolean {
  return /\b(command\s+not\s+found|not\s+recognized\s+as\s+an\s+internal\s+or\s+external\s+command|no\s+such\s+file\s+or\s+directory|cannot\s+find\s+the\s+file)\b/i.test(
    output,
  );
}

type ExecResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function tryExec(
  command: string,
  args: string[],
  opts: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
    input?: string;
  },
): Promise<ExecResult> {
  const result = await execa(command, args, {
    reject: false,
    cwd: opts.cwd,
    env: opts.env,
    timeout: opts.timeoutMs,
    input: opts.input,
  });

  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function detectAvailability(): Promise<
  | { kind: "available"; details?: string }
  | { kind: "missing"; details?: string }
  | { kind: "unauthenticated"; details?: string }
> {
  try {
    const r = await tryExec(CODEX_CMD, CODEX_VERSION_ARGS, {});
    const combined = `${r.stdout}\n${r.stderr}`.trim();

    if (r.exitCode === 0) {
      return { kind: "available" };
    }

    if (looksUnauthenticated(combined)) {
      return { kind: "unauthenticated", details: combined };
    }

    // Certains environnements (Windows/shell wrappers) peuvent renvoyer un exitCode != 0
    // avec un message "command not found" au lieu d'une erreur ENOENT.
    if (looksMissingBinary(combined)) {
      return { kind: "missing", details: "Commande introuvable: codex" };
    }

    // Best-effort: si la commande répond mais exitCode != 0 sans indice clair,
    // considérer le backend présent ("available") et exposer le diagnostic.
    return {
      kind: "available",
      details: combined || `exitCode=${r.exitCode}`,
    };
  } catch (error) {
    if (isEnoent(error)) {
      return { kind: "missing", details: "Commande introuvable: codex" };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { kind: "missing", details: message };
  }
}

export class CodexAdapter implements Adapter {
  public readonly id = "codex" as const;

  async isAvailable(): Promise<AdapterAvailability> {
    const detected = await detectAvailability();

    switch (detected.kind) {
      case "missing":
        return { status: "missing", details: detected.details };
      case "unauthenticated":
        return { status: "unauthenticated", details: detected.details };
      case "available":
        return detected.details
          ? { status: "available", details: detected.details }
          : { status: "available" };
    }
  }

  async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    const detected = await detectAvailability();

    const env = { ...process.env, ...args.env };

    if (detected.kind === "available") {
      // One-shot best-effort : envoyer le prompt via stdin.
      const r = await tryExec(CODEX_CMD, [], {
        cwd: args.cwd,
        env,
        timeoutMs: args.timeoutMs,
        input: args.prompt,
      });

      return {
        exitCode: r.exitCode,
        text: r.stdout.trim() ? r.stdout : r.stderr,
        raw: r,
      };
    }

    return {
      exitCode: detected.kind === "unauthenticated" ? 6 : 2,
      text: detected.details ?? "Backend codex indisponible",
      raw: detected,
    };
  }
}
