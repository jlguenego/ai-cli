/**
 * Types pour le module de résumé de sortie
 */

/**
 * Résumé JSON pour une exécution one-shot (run)
 */
export interface RunJsonSummary {
  /** Backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: string;
  /** Code de sortie */
  exitCode: number;
  /** Durée en millisecondes */
  durationMs: number;
  /** Texte de sortie du backend */
  text: string;
  /** Détails additionnels (erreurs) */
  details?: string;
}

/**
 * Résumé JSON pour une exécution itérative (loop)
 */
export interface LoopJsonSummary {
  /** Backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: string;
  /** Code de sortie */
  exitCode: number;
  /** Durée totale en millisecondes */
  durationMs: number;
  /** Nombre d'itérations effectuées */
  iterations: number;
  /** Texte de la dernière réponse */
  text: string;
  /** Résumé extrait (mode json uniquement) */
  summary?: string;
  /** Détails additionnels (erreurs) */
  details?: string;
}
