/**
 * Types pour le module artifacts
 */

/**
 * Métadonnées d'un run (meta.json)
 */
export interface RunMeta {
  /** Identifiant unique du run (YYYYMMDD-HHMMSS-rand) */
  id: string;
  /** Backend utilisé */
  backend: string;
  /** Timestamp ISO de démarrage */
  startedAt: string;
  /** Timestamp ISO de fin */
  finishedAt: string;
  /** Options de la commande */
  options: RunMetaOptions;
}

/**
 * Options capturées dans les métadonnées
 */
export interface RunMetaOptions {
  /** Commande exécutée (run ou loop) */
  command: "run" | "loop";
  /** Prompt initial (redacté) */
  prompt: string;
  /** Limite d'itérations (loop uniquement) */
  maxIterations?: number;
  /** Timeout en ms */
  timeoutMs?: number;
  /** Mode de complétion */
  completionMode?: string;
}

/**
 * Entrée dans le transcript NDJSON
 */
export interface TranscriptEvent {
  /** Timestamp ISO */
  ts: string;
  /** Type d'événement */
  type: "iteration" | "prompt" | "response";
  /** Numéro d'itération */
  iteration: number;
  /** Contenu (redacté) */
  content: string;
  /** Durée en ms (pour type=iteration) */
  durationMs?: number;
}

/**
 * Résultat d'écriture des artifacts
 */
export interface WriteArtifactsResult {
  /** Succès de l'écriture */
  ok: boolean;
  /** Chemin du dossier créé */
  path?: string;
  /** Code d'erreur si échec */
  errorCode?: number;
  /** Message d'erreur si échec */
  errorMessage?: string;
}
