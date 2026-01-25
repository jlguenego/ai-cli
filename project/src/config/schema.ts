/**
 * Schéma de configuration pour jlgcli
 *
 * Deux niveaux de configuration :
 * - Utilisateur : ~/.jlgcli.json (global)
 * - Projet : .jlgcli.json (à la racine du projet)
 *
 * Priorité : projet > utilisateur > défauts
 */

import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================================
// Types de base
// ============================================================================

/**
 * Identifiants des backends supportés
 */
export type BackendId = "copilot" | "codex";

/**
 * Modes de détection de complétion
 * - marker: ligne exacte "DONE" en fin de sortie
 * - json: objet JSON { status: "done" | "continue", ... } en fin de sortie
 */
export type CompletionMode = "marker" | "json";

// ============================================================================
// Interfaces de configuration
// ============================================================================

/**
 * Configuration utilisateur (tous les champs optionnels car peuvent être absents du fichier)
 */
export interface UserConfig {
  /** Backend par défaut à utiliser */
  backend?: BackendId;
  /** Nombre maximum d'itérations pour la commande loop */
  maxIterations?: number;
  /** Timeout global en millisecondes */
  timeoutMs?: number;
  /** Mode de détection de complétion */
  completionMode?: CompletionMode;
  /** Nombre de répétitions sans progrès avant arrêt */
  noProgressLimit?: number;
}

/**
 * Configuration projet (même structure que UserConfig)
 * Surcharge les valeurs de la config utilisateur
 */
export interface ProjectConfig extends UserConfig {}

/**
 * Configuration résolue après fusion (tous les champs requis)
 */
export interface ResolvedConfig {
  /** Backend à utiliser */
  backend: BackendId;
  /** Nombre maximum d'itérations pour la commande loop */
  maxIterations: number;
  /** Timeout global en millisecondes */
  timeoutMs: number;
  /** Mode de détection de complétion */
  completionMode: CompletionMode;
  /** Nombre de répétitions sans progrès avant arrêt */
  noProgressLimit: number;
}

// ============================================================================
// Constantes de chemins
// ============================================================================

/**
 * Nom du fichier de configuration projet
 */
export const PROJECT_CONFIG_FILENAME = ".jlgcli.json";

/**
 * Chemin vers le fichier de configuration utilisateur
 * Windows: %USERPROFILE%\.jlgcli.json
 * Unix: ~/.jlgcli.json
 */
export const USER_CONFIG_PATH = join(homedir(), ".jlgcli.json");

// ============================================================================
// Valeurs par défaut
// ============================================================================

/**
 * Configuration par défaut
 * Utilisée quand aucune valeur n'est spécifiée dans les fichiers de config
 */
export const DEFAULT_CONFIG: ResolvedConfig = {
  backend: "copilot",
  maxIterations: 10,
  timeoutMs: 300_000, // 5 minutes
  completionMode: "marker",
  noProgressLimit: 3,
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Liste des backends valides
 */
export const VALID_BACKENDS: readonly BackendId[] = [
  "copilot",
  "codex",
] as const;

/**
 * Liste des modes de complétion valides
 */
export const VALID_COMPLETION_MODES: readonly CompletionMode[] = [
  "marker",
  "json",
] as const;

/**
 * Vérifie si un objet est une configuration valide (partielle ou complète)
 * @param config - Objet à valider
 * @returns true si la configuration est valide
 */
export function isValidConfig(
  config: unknown,
): config is Partial<ResolvedConfig> {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const cfg = config as Record<string, unknown>;

  // Valider backend si présent
  if (cfg["backend"] !== undefined) {
    if (
      typeof cfg["backend"] !== "string" ||
      !VALID_BACKENDS.includes(cfg["backend"] as BackendId)
    ) {
      return false;
    }
  }

  // Valider maxIterations si présent
  if (cfg["maxIterations"] !== undefined) {
    if (typeof cfg["maxIterations"] !== "number" || cfg["maxIterations"] <= 0) {
      return false;
    }
  }

  // Valider timeoutMs si présent
  if (cfg["timeoutMs"] !== undefined) {
    if (typeof cfg["timeoutMs"] !== "number" || cfg["timeoutMs"] <= 0) {
      return false;
    }
  }

  // Valider completionMode si présent
  if (cfg["completionMode"] !== undefined) {
    if (
      typeof cfg["completionMode"] !== "string" ||
      !VALID_COMPLETION_MODES.includes(cfg["completionMode"] as CompletionMode)
    ) {
      return false;
    }
  }

  // Valider noProgressLimit si présent
  if (cfg["noProgressLimit"] !== undefined) {
    if (
      typeof cfg["noProgressLimit"] !== "number" ||
      cfg["noProgressLimit"] < 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Clés de configuration valides (pour validation et accès dynamique)
 */
export const CONFIG_KEYS = [
  "backend",
  "maxIterations",
  "timeoutMs",
  "completionMode",
  "noProgressLimit",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];
