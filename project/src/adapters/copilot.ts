import { execa } from "execa";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";

const GH_CMD = "gh";
const GH_COPILOT_VERSION_ARGS = ["copilot", "--version"];

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

function looksMissingCommand(output: string): boolean {
  return /\b(unknown\s+command|no\s+such\s+command|not\s+a\s+gh\s+command)\b/i.test(
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
  | { kind: "gh"; details?: string }
  | { kind: "copilot"; details?: string }
  | { kind: "missing"; details?: string }
  | { kind: "unauthenticated"; details?: string }
> {
  let ghProbeDetails: string | undefined;

  try {
    const r = await tryExec(GH_CMD, GH_COPILOT_VERSION_ARGS, {});
    const combined = `${r.stdout}\n${r.stderr}`.trim();

    if (r.exitCode === 0) {
      return { kind: "gh" };
    }

    if (looksUnauthenticated(combined)) {
      return { kind: "unauthenticated", details: combined };
    }

    if (looksMissingCommand(combined)) {
      // gh présent mais sous-commande copilot absente → tenter fallback "copilot" binaire
      ghProbeDetails = combined || "gh copilot: commande inconnue";
    } else {
      // Best-effort : si gh répond mais exitCode != 0 sans indice clair
      return { kind: "gh", details: combined || `exitCode=${r.exitCode}` };
    }
  } catch (error) {
    if (!isEnoent(error)) {
      const message = error instanceof Error ? error.message : String(error);
      return { kind: "missing", details: message };
    }
  }

  try {
    const r = await tryExec(COPILOT_CMD, COPILOT_VERSION_ARGS, {});
    const combined = `${r.stdout}\n${r.stderr}`.trim();

    if (r.exitCode === 0) {
      return ghProbeDetails
        ? { kind: "copilot", details: ghProbeDetails }
        : { kind: "copilot" };
    }

    if (looksUnauthenticated(combined)) {
      return { kind: "unauthenticated", details: combined };
    }

    return {
      kind: "copilot",
      details: [ghProbeDetails, combined || `exitCode=${r.exitCode}`]
        .filter(Boolean)
        .join("\n"),
    };
  } catch (error) {
    if (isEnoent(error)) {
      return {
        kind: "missing",
        details: ghProbeDetails
          ? `Commandes introuvables: copilot\n${ghProbeDetails}`
          : "Commandes introuvables: gh/copilot",
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
      case "gh":
      case "copilot":
        return detected.details
          ? { status: "available", details: detected.details }
          : { status: "available" };
    }
  }

  async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    const detected = await detectBackend();

    const env = { ...process.env, ...args.env };

    // Best-effort: utiliser gh copilot si dispo, sinon un binaire copilot.
    if (detected.kind === "gh") {
      const r = await tryExec(
        GH_CMD,
        ["copilot", "suggest", "-t", "shell", args.prompt],
        { cwd: args.cwd, env, timeoutMs: args.timeoutMs },
      );

      return {
        exitCode: r.exitCode,
        text: r.stdout.trim() ? r.stdout : r.stderr,
        raw: r,
      };
    }

    if (detected.kind === "copilot") {
      const r = await tryExec(COPILOT_CMD, ["suggest", args.prompt], {
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
