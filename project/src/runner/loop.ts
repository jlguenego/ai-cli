import { tryGetAdapterById } from "../adapters/registry.js";
import { resolveConfig } from "../config/loader.js";
import { parseCompletion } from "../completion/index.js";
import type { CompletionMode } from "../config/schema.js";
import type {
  LoopOptions,
  LoopResult,
  LoopStatus,
  TranscriptEntry,
} from "./types.js";

// Exit codes conformes à clarifications/003
const EXIT_SUCCESS = 0;
const EXIT_BACKEND_MISSING = 2;
const EXIT_MAX_ITERATIONS = 4;
const EXIT_NO_PROGRESS = 5; // Arrêt pour non-progrès détecté
const EXIT_BACKEND_UNAUTHENTICATED = 6;
const EXIT_USAGE = 64; // EX_USAGE - backend inconnu ou unsupported
const EXIT_DATAERR = 65; // EX_DATAERR - invalid-json
const EXIT_TIMEOUT = 75; // EX_TEMPFAIL

/**
 * Résout les options de loop en fusionnant avec la config
 */
async function resolveLoopOptions(options: LoopOptions): Promise<{
  backendId: string;
  maxIterations: number;
  timeoutMs: number;
  completionMode: CompletionMode;
  noProgressLimit: number;
  cwd: string;
}> {
  const config = await resolveConfig();

  return {
    backendId: options.backend ?? config.backend ?? "copilot",
    maxIterations: options.maxIterations ?? config.maxIterations,
    timeoutMs: options.timeoutMs ?? config.timeoutMs,
    completionMode: options.completionMode ?? config.completionMode,
    noProgressLimit: options.noProgressLimit ?? config.noProgressLimit,
    cwd: options.cwd ?? process.cwd(),
  };
}

/**
 * Mappe le statut d'availability vers un exit code
 */
function exitCodeForAvailability(
  status: "missing" | "unauthenticated" | "unsupported",
): number {
  switch (status) {
    case "missing":
      return EXIT_BACKEND_MISSING;
    case "unauthenticated":
      return EXIT_BACKEND_UNAUTHENTICATED;
    case "unsupported":
      return EXIT_USAGE;
  }
}

/**
 * Mappe le statut d'availability vers un LoopStatus
 */
function loopStatusForAvailability(
  status: "missing" | "unauthenticated" | "unsupported",
): LoopStatus {
  switch (status) {
    case "missing":
      return "backend-missing";
    case "unauthenticated":
      return "backend-unauthenticated";
    case "unsupported":
      return "backend-unsupported";
  }
}

/**
 * Crée un résultat d'erreur de loop
 */
function createErrorResult(
  backendId: string,
  status: LoopStatus,
  exitCode: number,
  details: string,
  startTime: number,
  transcript: TranscriptEntry[],
): LoopResult {
  return {
    exitCode,
    text: details,
    backend: backendId,
    status,
    iterations: transcript.length,
    durationMs: Date.now() - startTime,
    transcript,
    details,
  };
}

/**
 * Exécute un prompt de manière itérative avec garde-fous
 *
 * Boucle prompt→adapter→parse jusqu'à :
 * - status 'done' détecté par le parser de complétion
 * - maxIterations atteint
 * - timeoutMs global dépassé
 *
 * @param options - Options d'exécution loop
 * @returns Résultat de l'exécution avec historique
 */
export async function runLoop(options: LoopOptions): Promise<LoopResult> {
  const startTime = Date.now();
  const transcript: TranscriptEntry[] = [];

  // Résoudre les options avec la config
  const {
    backendId,
    maxIterations,
    timeoutMs,
    completionMode,
    noProgressLimit,
    cwd,
  } = await resolveLoopOptions(options);

  // Vérifier si le backend existe
  const adapter = tryGetAdapterById(backendId);

  if (!adapter) {
    return createErrorResult(
      backendId,
      "backend-unknown",
      EXIT_USAGE,
      `Backend inconnu: ${backendId}. Les backends supportés sont: copilot, codex, claude`,
      startTime,
      transcript,
    );
  }

  // Vérifier la disponibilité du backend
  const availability = await adapter.isAvailable();

  if (availability.status !== "available") {
    return createErrorResult(
      backendId,
      loopStatusForAvailability(availability.status),
      exitCodeForAvailability(availability.status),
      availability.details ?? `Backend ${backendId} non disponible`,
      startTime,
      transcript,
    );
  }

  // Variable pour le prompt courant (peut évoluer en mode json avec "next")
  let currentPrompt = options.prompt;
  let lastResponse = "";
  let summary: string | undefined;

  // Variables pour la détection de non-progrès
  let consecutiveIdenticalCount = 0;
  let previousResponse = "";

  // Boucle principale
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // Vérifier le timeout global
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      return {
        exitCode: EXIT_TIMEOUT,
        text: lastResponse,
        backend: backendId,
        status: "timeout",
        iterations: transcript.length,
        durationMs: elapsed,
        transcript,
        details: `Timeout global atteint après ${elapsed}ms`,
      };
    }

    // Calculer le timeout restant pour cette itération
    const remainingTimeout = timeoutMs - elapsed;

    const iterationStart = Date.now();
    const iterationStartIso = new Date(iterationStart).toISOString();

    // Exécuter le prompt sur le backend
    const result = await adapter.runOnce({
      prompt: currentPrompt,
      cwd,
      env: options.env,
      timeoutMs: remainingTimeout,
    });

    const iterationDuration = Date.now() - iterationStart;
    lastResponse = result.text;

    // Créer l'entrée de transcript
    const entry: TranscriptEntry = {
      iteration,
      startedAt: iterationStartIso,
      prompt: currentPrompt,
      response: result.text,
      durationMs: iterationDuration,
    };

    transcript.push(entry);

    // Callback pour affichage progressif
    if (options.onIteration) {
      options.onIteration(entry);
    }

    // Détection de non-progrès (réponses identiques consécutives)
    if (noProgressLimit > 0) {
      if (result.text === previousResponse) {
        consecutiveIdenticalCount++;
      } else {
        consecutiveIdenticalCount = 1;
      }
      previousResponse = result.text;

      if (consecutiveIdenticalCount >= noProgressLimit) {
        return {
          exitCode: EXIT_NO_PROGRESS,
          text: result.text,
          backend: backendId,
          status: "no-progress",
          iterations: transcript.length,
          durationMs: Date.now() - startTime,
          transcript,
          details: `Arrêt après ${consecutiveIdenticalCount} réponses identiques consécutives`,
        };
      }
    }

    // Vérifier si le backend a échoué
    if (result.exitCode !== 0) {
      return {
        exitCode: result.exitCode,
        text: result.text,
        backend: backendId,
        status: "error",
        iterations: transcript.length,
        durationMs: Date.now() - startTime,
        transcript,
        details: `Backend a retourné exit code ${result.exitCode}`,
      };
    }

    // Parser la complétion
    const completion = parseCompletion(result.text, completionMode);

    // Gérer les différents statuts de complétion
    if (completion.status === "done") {
      // Extraire le résumé si disponible (mode json)
      if ("summary" in completion) {
        summary = completion.summary;
      }

      return {
        exitCode: EXIT_SUCCESS,
        text: result.text,
        backend: backendId,
        status: "done",
        iterations: transcript.length,
        durationMs: Date.now() - startTime,
        transcript,
        summary,
      };
    }

    if (completion.status === "error") {
      // Mode json avec JSON invalide
      const errorMessage =
        "error" in completion ? completion.error : "invalid-json";
      return {
        exitCode: EXIT_DATAERR,
        text: result.text,
        backend: backendId,
        status: "invalid-json",
        iterations: transcript.length,
        durationMs: Date.now() - startTime,
        transcript,
        details: errorMessage,
      };
    }

    // status === 'continue' : préparer la prochaine itération
    // En mode json, utiliser le champ "next" s'il est présent
    if ("next" in completion && completion.next) {
      currentPrompt = completion.next;
    }
    // Sinon, on continue avec le même prompt (mode marker)
  }

  // maxIterations atteint
  return {
    exitCode: EXIT_MAX_ITERATIONS,
    text: lastResponse,
    backend: backendId,
    status: "max-iterations",
    iterations: transcript.length,
    durationMs: Date.now() - startTime,
    transcript,
    details: `Limite de ${maxIterations} itérations atteinte`,
  };
}
