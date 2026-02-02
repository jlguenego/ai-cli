/**
 * Module de gestion de la verbosité pour les commandes CLI
 *
 * Niveaux de verbosité :
 * - 0: Silencieux — Résultat final uniquement
 * - 1: Minimal — Résultat + coût
 * - 2: Normal — Résultat + coût + indicateur de progression
 * - 3: Debug — Tout : résultat, coût, prompts, réponses stream, infos techniques
 */

import type { VerbosityLevel } from "../config/schema.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration de verbosité résolue
 * Détermine ce qui doit être affiché selon le niveau
 */
export interface VerbosityConfig {
  /** Niveau de verbosité (0-3) */
  level: VerbosityLevel;
  /** Toujours true - le coût est toujours affiché (RG-018) */
  showCost: boolean;
  /** true si level >= 3 - afficher les prompts envoyés (RG-020) */
  showPrompt: boolean;
  /** true si level >= 3 - streamer les réponses en temps réel (RG-019) */
  streamResponse: boolean;
  /** true si level >= 3 - afficher les infos techniques */
  showTechnical: boolean;
  /** true si level >= 2 - afficher l'indicateur de progression */
  showProgress: boolean;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Crée une configuration de verbosité à partir d'un niveau
 * @param level Niveau de verbosité (0-3)
 * @returns Configuration de verbosité résolue
 */
export function createVerbosityConfig(level: VerbosityLevel): VerbosityConfig {
  return {
    level,
    showCost: true, // Toujours affiché (RG-018)
    showPrompt: level >= 3,
    streamResponse: level >= 3,
    showTechnical: level >= 3,
    showProgress: level >= 2,
  };
}

// ============================================================================
// Helpers de logging
// ============================================================================

/**
 * Affiche un message si le niveau de verbosité est suffisant
 * Les logs sont écrits sur stderr pour ne pas polluer stdout (réservé aux résultats)
 *
 * @param config Configuration de verbosité
 * @param minLevel Niveau minimum requis pour afficher le message
 * @param message Message à afficher
 */
export function log(
  config: VerbosityConfig,
  minLevel: VerbosityLevel,
  message: string,
): void {
  if (config.level >= minLevel) {
    console.error(message);
  }
}

/**
 * Affiche le coût d'utilisation
 * Le coût est toujours affiché, même s'il est nul (RG-018)
 *
 * @param config Configuration de verbosité
 * @param cost Coût en dollars
 */
export function logCost(config: VerbosityConfig, cost: number): void {
  // Le coût est affiché si level >= 1 (minimal et au-dessus)
  if (config.level >= 1) {
    console.error(`💰 Coût : ${cost.toFixed(2)} $`);
  }
}

/**
 * Affiche un chunk de réponse en temps réel (streaming)
 * Écrit directement sur stdout sans buffering (RG-019)
 *
 * @param config Configuration de verbosité
 * @param chunk Portion de texte à afficher
 */
export function streamResponseChunk(
  config: VerbosityConfig,
  chunk: string,
): void {
  if (config.streamResponse) {
    process.stdout.write(chunk);
  }
}

/**
 * Affiche le prompt envoyé au backend
 * Affiché uniquement au niveau 3 (debug) en texte brut complet (RG-020)
 *
 * @param config Configuration de verbosité
 * @param prompt Prompt complet
 */
export function logPrompt(config: VerbosityConfig, prompt: string): void {
  if (config.showPrompt) {
    console.error("─".repeat(40));
    console.error("📝 Prompt envoyé :");
    console.error("─".repeat(40));
    console.error(prompt);
    console.error("─".repeat(40));
  }
}

/**
 * Affiche un indicateur de progression
 * Affiché uniquement au niveau 2+ (normal et debug)
 *
 * @param config Configuration de verbosité
 * @param current Itération courante
 * @param max Maximum d'itérations (optionnel)
 */
export function logProgress(
  config: VerbosityConfig,
  current: number,
  max?: number,
): void {
  if (config.showProgress) {
    const maxStr = max !== undefined ? `/${max}` : "";
    console.error(`⏳ Itération ${current}${maxStr}...`);
  }
}

/**
 * Affiche une information technique
 * Affiché uniquement au niveau 3 (debug)
 *
 * @param config Configuration de verbosité
 * @param message Message technique
 */
export function logTechnical(config: VerbosityConfig, message: string): void {
  if (config.showTechnical) {
    console.error(`🔧 ${message}`);
  }
}
