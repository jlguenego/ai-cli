/**
 * Module output - Formatage des résumés d'exécution et verbosité
 */

export {
  formatDuration,
  statusToHumanMessage,
  formatRunHumanSummary,
  formatLoopHumanSummary,
  formatRunJsonSummary,
  formatLoopJsonSummary,
} from "./summary.js";

export type { RunJsonSummary, LoopJsonSummary } from "./types.js";

// Verbosité
export {
  createVerbosityConfig,
  log,
  logCost,
  streamResponseChunk,
  logPrompt,
  logProgress,
  logTechnical,
} from "./verbosity.js";

export type { VerbosityConfig } from "./verbosity.js";
