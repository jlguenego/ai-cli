import type {
  AdapterId,
  AdapterAvailabilityStatus,
} from "../adapters/types.js";

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
}
