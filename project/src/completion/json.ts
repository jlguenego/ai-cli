import type { JsonResult, CompletionStatus } from "./types.js";

/** Statuts valides pour le champ status */
const VALID_STATUSES: readonly CompletionStatus[] = [
  "done",
  "continue",
  "error",
];

/**
 * Expression régulière pour trouver des objets JSON dans un texte.
 * Capture les objets qui commencent par { et finissent par }
 */
const JSON_OBJECT_REGEX = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;

/**
 * Vérifie si un objet a un schéma valide pour le résultat de complétion.
 * @param obj - L'objet à valider
 * @returns true si l'objet a un status valide
 */
function isValidCompletionSchema(obj: unknown): obj is JsonResult {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // status est obligatoire et doit être une valeur valide
  if (typeof record["status"] !== "string") {
    return false;
  }

  if (!VALID_STATUSES.includes(record["status"] as CompletionStatus)) {
    return false;
  }

  // summary est optionnel mais doit être string si présent
  if (
    record["summary"] !== undefined &&
    typeof record["summary"] !== "string"
  ) {
    return false;
  }

  // next est optionnel mais doit être string si présent
  if (record["next"] !== undefined && typeof record["next"] !== "string") {
    return false;
  }

  return true;
}

/**
 * Extrait tous les objets JSON valides d'un texte.
 * @param text - Le texte à analyser
 * @returns Un tableau d'objets parsés avec succès
 */
function extractJsonObjects(text: string): unknown[] {
  const matches = text.match(JSON_OBJECT_REGEX);
  if (!matches) {
    return [];
  }

  const parsed: unknown[] = [];
  for (const match of matches) {
    try {
      const obj = JSON.parse(match) as unknown;
      parsed.push(obj);
    } catch {
      // Ignorer les matches qui ne sont pas du JSON valide
    }
  }

  return parsed;
}

/**
 * Analyse la sortie d'un backend en mode JSON.
 *
 * Extrait le dernier objet JSON valide de la sortie et vérifie
 * qu'il respecte le schéma `{status, summary?, next?}`.
 *
 * @param text - La sortie texte du backend
 * @returns Le résultat de complétion ou une erreur si parsing échoue
 *
 * @example
 * parseJsonCompletion('{"status":"done"}') // { status: 'done' }
 * parseJsonCompletion('logs\n{"status":"continue","next":"step2"}')
 *   // { status: 'continue', next: 'step2' }
 * parseJsonCompletion('no json') // { status: 'error', error: 'invalid-json' }
 */
export function parseJsonCompletion(text: string): JsonResult {
  const jsonObjects = extractJsonObjects(text);

  // Parcourir depuis la fin pour trouver le dernier objet valide
  for (let i = jsonObjects.length - 1; i >= 0; i--) {
    const obj = jsonObjects[i];
    if (isValidCompletionSchema(obj)) {
      // Construire le résultat avec uniquement les champs valides
      const result: JsonResult = { status: obj.status };
      if (obj.summary !== undefined) {
        result.summary = obj.summary;
      }
      if (obj.next !== undefined) {
        result.next = obj.next;
      }
      return result;
    }
  }

  // Aucun JSON valide trouvé
  return { status: "error", error: "invalid-json" };
}
