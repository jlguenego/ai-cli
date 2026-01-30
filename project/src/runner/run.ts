import { tryGetAdapterById } from "../adapters/registry.js";
import { resolveConfig } from "../config/loader.js";
import type { RunOptions, RunResult, RunStatus } from "./types.js";

// Exit codes conformes à clarifications/003
const EXIT_BACKEND_MISSING = 2;
const EXIT_BACKEND_UNAUTHENTICATED = 6;
const EXIT_USAGE = 64; // EX_USAGE - backend inconnu ou unsupported

/**
 * Résout l'ID du backend à utiliser
 * Priorité : option explicite > config > défaut (copilot)
 */
async function resolveBackendId(explicitBackend?: string): Promise<string> {
  if (explicitBackend) {
    return explicitBackend;
  }

  const config = await resolveConfig();
  return config.backend ?? "copilot";
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
 * Mappe le statut d'availability vers un RunStatus
 */
function runStatusForAvailability(
  status: "missing" | "unauthenticated" | "unsupported",
): RunStatus {
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
 * Exécute un prompt sur un backend (one-shot)
 */
export async function runOnce(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();
  const backendId = await resolveBackendId(options.backend);
  const cwd = options.cwd ?? process.cwd();

  // Vérifier si le backend existe
  const adapter = tryGetAdapterById(backendId);

  if (!adapter) {
    return {
      exitCode: EXIT_USAGE,
      text: `Backend inconnu: ${backendId}`,
      backend: backendId,
      status: "backend-unknown",
      durationMs: Date.now() - startTime,
      details: `Les backends supportés sont: copilot, codex, claude`,
    };
  }

  // Vérifier la disponibilité du backend
  const availability = await adapter.isAvailable();

  if (availability.status !== "available") {
    return {
      exitCode: exitCodeForAvailability(availability.status),
      text: availability.details ?? `Backend ${backendId} non disponible`,
      backend: backendId,
      status: runStatusForAvailability(availability.status),
      durationMs: Date.now() - startTime,
      details: availability.details,
    };
  }

  // Exécuter le prompt
  const result = await adapter.runOnce({
    prompt: options.prompt,
    cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
  });

  return {
    exitCode: result.exitCode,
    text: result.text,
    backend: backendId,
    status: result.exitCode === 0 ? "success" : "error",
    durationMs: Date.now() - startTime,
  };
}
