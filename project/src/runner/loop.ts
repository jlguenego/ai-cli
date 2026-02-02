import { tryGetAdapterById } from "../adapters/registry.js";
import { resolveConfig } from "../config/loader.js";
import { parseCompletion } from "../completion/index.js";
import { createVerbosityConfig, logCost } from "../output/verbosity.js";
import type { CompletionMode, VerbosityLevel } from "../config/schema.js";
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

  // Créer la config de verbosité
  const verbosityLevel: VerbosityLevel = options.verbosity ?? 3;
  const verbosityConfig = createVerbosityConfig(verbosityLevel);

  // Le coût total (les backends ne le fournissent pas encore)
  const totalCost = 0;

  // Helper pour créer un résultat avec affichage du coût
  const createResultWithCost = (
    status: LoopStatus,
    exitCode: number,
    text: string,
    opts?: { summary?: string; details?: string },
  ): LoopResult => {
    logCost(verbosityConfig, totalCost);
    return {
      exitCode,
      text,
      backend: backendId,
      status,
      iterations: transcript.length,
      durationMs: Date.now() - startTime,
      transcript,
      cost: totalCost,
      summary: opts?.summary,
      details: opts?.details,
    };
  };

  // Vérifier si le backend existe
  const adapter = tryGetAdapterById(backendId);

  if (!adapter) {
    return createResultWithCost(
      "backend-unknown",
      EXIT_USAGE,
      `Backend inconnu: ${backendId}. Les backends supportés sont: copilot, codex, claude`,
      {
        details: `Backend inconnu: ${backendId}. Les backends supportés sont: copilot, codex, claude`,
      },
    );
  }

  // Vérifier la disponibilité du backend
  const availability = await adapter.isAvailable();

  if (availability.status !== "available") {
    const details =
      availability.details ?? `Backend ${backendId} non disponible`;
    return createResultWithCost(
      loopStatusForAvailability(availability.status),
      exitCodeForAvailability(availability.status),
      details,
      { details },
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
      return createResultWithCost("timeout", EXIT_TIMEOUT, lastResponse, {
        details: `Timeout global atteint après ${elapsed}ms`,
      });
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
        return createResultWithCost(
          "no-progress",
          EXIT_NO_PROGRESS,
          result.text,
          {
            details: `Arrêt après ${consecutiveIdenticalCount} réponses identiques consécutives`,
          },
        );
      }
    }

    // Vérifier si le backend a échoué
    if (result.exitCode !== 0) {
      return createResultWithCost("error", result.exitCode, result.text, {
        details: `Backend a retourné exit code ${result.exitCode}`,
      });
    }

    // Parser la complétion
    const completion = parseCompletion(result.text, completionMode);

    // Gérer les différents statuts de complétion
    if (completion.status === "done") {
      // Extraire le résumé si disponible (mode json)
      if ("summary" in completion) {
        summary = completion.summary;
      }

      return createResultWithCost("done", EXIT_SUCCESS, result.text, {
        summary,
      });
    }

    if (completion.status === "error") {
      // Mode json avec JSON invalide
      const errorMessage =
        "error" in completion ? completion.error : "invalid-json";
      return createResultWithCost("invalid-json", EXIT_DATAERR, result.text, {
        details: errorMessage,
      });
    }

    // status === 'continue' : préparer la prochaine itération
    // En mode json, utiliser le champ "next" s'il est présent
    if ("next" in completion && completion.next) {
      currentPrompt = completion.next;
    }
    // Sinon, on continue avec le même prompt (mode marker)
  }

  // maxIterations atteint
  return createResultWithCost(
    "max-iterations",
    EXIT_MAX_ITERATIONS,
    lastResponse,
    { details: `Limite de ${maxIterations} itérations atteinte` },
  );
}
