import type { MarkerResult } from "./types.js";

/** Marqueur de fin attendu (case-sensitive) */
const DONE_MARKER = "DONE";

/**
 * Extrait la dernière ligne non-vide d'un texte
 * @param text - Le texte à analyser
 * @returns La dernière ligne trimmée, ou chaîne vide si aucune
 */
function getLastNonEmptyLine(text: string): string {
  const lines = text.split(/\r?\n/);

  // Parcourir depuis la fin pour trouver la dernière ligne non-vide
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line !== undefined) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return "";
}

/**
 * Analyse la sortie d'un backend en mode marker.
 *
 * Retourne `{ status: 'done' }` si et seulement si la dernière ligne
 * non-vide est exactement le marqueur `DONE` (case-sensitive).
 *
 * @param text - La sortie texte du backend
 * @returns Le résultat de complétion (done ou continue)
 *
 * @example
 * parseMarkerCompletion("Hello\nDONE") // { status: 'done' }
 * parseMarkerCompletion("Hello\nDone") // { status: 'continue' }
 * parseMarkerCompletion("DONE\nMore") // { status: 'continue' }
 */
export function parseMarkerCompletion(text: string): MarkerResult {
  const lastLine = getLastNonEmptyLine(text);

  if (lastLine === DONE_MARKER) {
    return { status: "done" };
  }

  return { status: "continue" };
}
