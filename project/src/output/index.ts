/**
 * Module output - Formatage des résumés d'exécution
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
