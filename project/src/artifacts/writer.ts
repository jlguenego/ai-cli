/**
 * Module d'écriture des artifacts
 * Persiste les traces d'exécution dans .jlgcli/runs/<id>/
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  LoopResult,
  RunResult,
  TranscriptEntry,
} from "../runner/types.js";
import type {
  RunMeta,
  RunMetaOptions,
  TranscriptEvent,
  WriteArtifactsResult,
} from "./types.js";
import { redactObject, redactSecrets } from "./redact.js";

/** Exit code pour erreur d'écriture (EX_CANTCREAT) */
export const EXIT_ARTIFACTS_WRITE = 73;

/**
 * Génère un ID de run unique
 * Format: YYYYMMDD-HHMMSS-<rand4>
 */
export function generateRunId(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const rand = Math.random().toString(36).substring(2, 6);

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${rand}`;
}

/**
 * Construit le chemin du dossier artifacts
 * @param cwd Répertoire de travail
 * @param runId ID du run
 */
export function getArtifactsPath(cwd: string, runId: string): string {
  return join(cwd, ".jlgcli", "runs", runId);
}

/**
 * Convertit le transcript en événements NDJSON
 */
function transcriptToEvents(transcript: TranscriptEntry[]): TranscriptEvent[] {
  const events: TranscriptEvent[] = [];

  for (const entry of transcript) {
    // Événement prompt
    events.push({
      ts: entry.startedAt,
      type: "prompt",
      iteration: entry.iteration,
      content: entry.prompt,
    });

    // Événement response
    const responseTs = new Date(
      new Date(entry.startedAt).getTime() + entry.durationMs,
    ).toISOString();

    events.push({
      ts: responseTs,
      type: "response",
      iteration: entry.iteration,
      content: entry.response,
      durationMs: entry.durationMs,
    });
  }

  return events;
}

/**
 * Écrit les artifacts d'un run sur disque
 * @param result Résultat du run (RunResult ou LoopResult)
 * @param options Options additionnelles
 */
export async function writeArtifacts(
  result: RunResult | LoopResult,
  options: {
    cwd: string;
    command: "run" | "loop";
    prompt: string;
    maxIterations?: number;
    timeoutMs?: number;
    completionMode?: string;
    startedAt: string;
    onRedact?: (patternName: string) => void;
  },
): Promise<WriteArtifactsResult> {
  const runId = generateRunId();
  const artifactsPath = getArtifactsPath(options.cwd, runId);

  try {
    // Créer le dossier
    await mkdir(artifactsPath, { recursive: true });

    // Préparer meta.json
    const metaOptions: RunMetaOptions = {
      command: options.command,
      prompt: redactSecrets(options.prompt, options.onRedact),
    };

    if (options.command === "loop") {
      if (options.maxIterations !== undefined) {
        metaOptions.maxIterations = options.maxIterations;
      }
      if (options.completionMode !== undefined) {
        metaOptions.completionMode = options.completionMode;
      }
    }

    if (options.timeoutMs !== undefined) {
      metaOptions.timeoutMs = options.timeoutMs;
    }

    const meta: RunMeta = {
      id: runId,
      backend: result.backend,
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      options: metaOptions,
    };

    // Écrire meta.json
    await writeFile(
      join(artifactsPath, "meta.json"),
      JSON.stringify(meta, null, 2) + "\n",
      "utf-8",
    );

    // Préparer et écrire transcript.ndjson
    const transcript = "transcript" in result ? result.transcript : [];
    const events = transcriptToEvents(transcript);
    const redactedEvents = events.map((event) =>
      redactObject(event, options.onRedact),
    );

    const ndjsonContent =
      redactedEvents.map((event) => JSON.stringify(event)).join("\n") +
      (redactedEvents.length > 0 ? "\n" : "");

    await writeFile(
      join(artifactsPath, "transcript.ndjson"),
      ndjsonContent,
      "utf-8",
    );

    // Préparer et écrire result.json
    const redactedResult = redactObject(result, options.onRedact);

    await writeFile(
      join(artifactsPath, "result.json"),
      JSON.stringify(redactedResult, null, 2) + "\n",
      "utf-8",
    );

    return {
      ok: true,
      path: artifactsPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      errorCode: EXIT_ARTIFACTS_WRITE,
      errorMessage: `Échec d'écriture des artifacts: ${message}`,
    };
  }
}
