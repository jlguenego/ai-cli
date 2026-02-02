/**
 * Statut final d'une exécution
 */
export type RunStatus =
  | "success"
  | "backend-missing"
  | "backend-unauthenticated"
  | "backend-unsupported"
  | "backend-unknown"
  | "error";

import type { VerbosityLevel } from "../config/schema.js";

/**
 * Options pour l'exécution one-shot
 */
export interface RunOptions {
  /** Le prompt à exécuter */
  prompt: string;
  /** ID du backend à utiliser (optionnel, résolu depuis config sinon) */
  backend?: string;
  /** Répertoire de travail (défaut: process.cwd()) */
  cwd?: string;
  /** Variables d'environnement additionnelles */
  env?: Record<string, string | undefined>;
  /** Timeout en millisecondes */
  timeoutMs?: number;
  /** Niveau de verbosité (0-3, défaut: 3) */
  verbosity?: VerbosityLevel;
}

/**
 * Résultat d'une exécution one-shot
 */
export interface RunResult {
  /** Code de sortie (0 = succès) */
  exitCode: number;
  /** Texte de sortie du backend */
  text: string;
  /** ID du backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: RunStatus;
  /** Durée d'exécution en millisecondes */
  durationMs: number;
  /** Détails additionnels en cas d'erreur */
  details?: string;
  /** Coût en dollars (0 si non applicable) */
  cost?: number;
}

// ============================================================================
// Types pour l'exécution itérative (loop)
// ============================================================================

/**
 * Statut final d'une exécution loop
 */
export type LoopStatus =
  | "done"
  | "max-iterations"
  | "timeout"
  | "no-progress"
  | "invalid-json"
  | "backend-missing"
  | "backend-unauthenticated"
  | "backend-unsupported"
  | "backend-unknown"
  | "error";

/**
 * Entrée dans le transcript d'exécution
 */
export interface TranscriptEntry {
  /** Numéro d'itération (1-based) */
  iteration: number;
  /** Timestamp ISO de début d'itération */
  startedAt: string;
  /** Prompt envoyé au backend */
  prompt: string;
  /** Réponse du backend */
  response: string;
  /** Durée de l'itération en ms */
  durationMs: number;
}

/**
 * Options pour l'exécution loop
 */
export interface LoopOptions {
  /** Le prompt initial à exécuter */
  prompt: string;
  /** ID du backend à utiliser (optionnel, résolu depuis config sinon) */
  backend?: string;
  /** Répertoire de travail (défaut: process.cwd()) */
  cwd?: string;
  /** Variables d'environnement additionnelles */
  env?: Record<string, string | undefined>;
  /** Nombre maximum d'itérations (défaut: config.maxIterations) */
  maxIterations?: number;
  /** Timeout global en millisecondes (défaut: config.timeoutMs) */
  timeoutMs?: number;
  /** Mode de complétion (défaut: config.completionMode) */
  completionMode?: "marker" | "json";
  /** Nombre de répétitions sans progrès avant arrêt (défaut: config.noProgressLimit, 0 = désactivé) */
  noProgressLimit?: number;
  /** Callback appelé à chaque itération (pour affichage progressif) */
  onIteration?: (entry: TranscriptEntry) => void;
  /** Niveau de verbosité (0-3, défaut: 3) */
  verbosity?: VerbosityLevel;
}

/**
 * Résultat d'une exécution loop
 */
export interface LoopResult {
  /** Code de sortie (0 = succès) */
  exitCode: number;
  /** Texte de la dernière réponse */
  text: string;
  /** ID du backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: LoopStatus;
  /** Nombre d'itérations effectuées */
  iterations: number;
  /** Durée totale d'exécution en millisecondes */
  durationMs: number;
  /** Historique des échanges */
  transcript: TranscriptEntry[];
  /** Résumé extrait (mode json uniquement) */
  summary?: string;
  /** Détails additionnels en cas d'erreur */
  details?: string;
  /** Coût total en dollars (0 si non applicable) */
  cost?: number;
}
