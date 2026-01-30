/**
 * Statut de complétion
 */
export type CompletionStatus = "done" | "continue" | "error";

/**
 * Résultat du parser mode marker
 */
export interface MarkerResult {
  status: "done" | "continue";
}

/**
 * Résultat du parser mode JSON
 */
export interface JsonResult {
  status: CompletionStatus;
  summary?: string;
  next?: string;
  error?: string;
}

/**
 * Résultat unifié de complétion
 */
export type CompletionResult = MarkerResult | JsonResult;
