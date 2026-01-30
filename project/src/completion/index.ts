import type { CompletionMode } from "../config/schema.js";
import type { CompletionResult } from "./types.js";
import { parseMarkerCompletion } from "./marker.js";
import { parseJsonCompletion } from "./json.js";

/**
 * Analyse la sortie d'un backend et détermine si l'exécution doit continuer.
 *
 * Délègue au parser approprié selon le mode configuré :
 * - mode marker: DONE strict en dernière ligne
 * - mode json: parse d'un JSON final { status, summary?, next? }
 *
 * @param text - La sortie texte du backend à analyser
 * @param mode - Le mode de complétion ('marker' ou 'json')
 * @returns Le résultat de complétion unifié
 *
 * @example
 * parseCompletion("Hello\nDONE", "marker") // { status: 'done' }
 * parseCompletion('{"status":"continue"}', "json") // { status: 'continue' }
 */
export function parseCompletion(
  text: string,
  mode: CompletionMode,
): CompletionResult {
  switch (mode) {
    case "marker":
      return parseMarkerCompletion(text);
    case "json":
      return parseJsonCompletion(text);
  }
}

// Ré-exporter les types et fonctions pour faciliter l'import
export type {
  CompletionResult,
  MarkerResult,
  JsonResult,
  CompletionStatus,
} from "./types.js";
export { parseMarkerCompletion } from "./marker.js";
export { parseJsonCompletion } from "./json.js";
