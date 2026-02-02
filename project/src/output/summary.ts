/**
 * Module de formatage des résumés d'exécution
 * Produit des résumés humains (stderr) et JSON (stdout)
 */

import type { RunResult } from "../runner/types.js";
import type { LoopResult } from "../runner/types.js";
import type { RunJsonSummary, LoopJsonSummary } from "./types.js";

/**
 * Formate une durée en millisecondes en format humain lisible
 * @param ms Durée en millisecondes
 * @returns Durée formatée (ex: "1.2s", "2m 15s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Traduit un statut technique en message humain
 * @param status Statut technique
 * @returns Message humain
 */
export function statusToHumanMessage(status: string): string {
  const messages: Record<string, string> = {
    success: "Succès",
    done: "Terminé avec succès",
    error: "Erreur",
    "backend-missing": "Backend non trouvé",
    "backend-unauthenticated": "Authentification requise",
    "backend-unsupported": "Backend non supporté",
    "backend-unknown": "Backend inconnu",
    timeout: "Timeout dépassé",
    "max-iterations": "Limite d'itérations atteinte",
    "no-progress": "Aucun progrès détecté",
    "invalid-json": "JSON invalide",
  };

  return messages[status] ?? status;
}

/**
 * Formate un résumé humain pour une exécution one-shot
 * @param result Résultat de l'exécution
 * @returns Lignes de résumé formatées
 */
export function formatRunHumanSummary(result: RunResult): string[] {
  const lines: string[] = [];

  lines.push("─".repeat(40));
  lines.push(`Backend   : ${result.backend}`);
  lines.push(`Statut    : ${statusToHumanMessage(result.status)}`);
  lines.push(`Durée     : ${formatDuration(result.durationMs)}`);

  if (result.details) {
    lines.push(`Détails   : ${result.details}`);
  }

  lines.push("─".repeat(40));

  return lines;
}

/**
 * Formate un résumé humain pour une exécution loop
 * @param result Résultat de l'exécution
 * @returns Lignes de résumé formatées
 */
export function formatLoopHumanSummary(result: LoopResult): string[] {
  const lines: string[] = [];

  lines.push("─".repeat(40));
  lines.push(`Backend    : ${result.backend}`);
  lines.push(`Statut     : ${statusToHumanMessage(result.status)}`);
  lines.push(`Itérations : ${result.iterations}`);
  lines.push(`Durée      : ${formatDuration(result.durationMs)}`);

  if (result.summary) {
    lines.push(`Résumé     : ${result.summary}`);
  }

  if (result.details) {
    lines.push(`Détails    : ${result.details}`);
  }

  lines.push("─".repeat(40));

  return lines;
}

/**
 * Formate un résumé JSON pour une exécution one-shot
 * @param result Résultat de l'exécution
 * @returns Objet JSON sérialisable
 */
export function formatRunJsonSummary(result: RunResult): RunJsonSummary {
  const summary: RunJsonSummary = {
    backend: result.backend,
    status: result.status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    cost: result.cost ?? 0,
    text: result.text,
  };

  if (result.details) {
    summary.details = result.details;
  }

  return summary;
}

/**
 * Formate un résumé JSON pour une exécution loop
 * @param result Résultat de l'exécution
 * @returns Objet JSON sérialisable
 */
export function formatLoopJsonSummary(result: LoopResult): LoopJsonSummary {
  const summary: LoopJsonSummary = {
    backend: result.backend,
    status: result.status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    cost: result.cost ?? 0,
    iterations: result.iterations,
    text: result.text,
  };

  if (result.summary) {
    summary.summary = result.summary;
  }

  if (result.details) {
    summary.details = result.details;
  }

  return summary;
}
