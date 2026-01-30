#!/usr/bin/env node
// @ts-check
/// <reference types="node" />
/**
 * Backend mock pour tests d'intégration
 *
 * Usage: node mock-backend.js <mode> [options]
 *
 * Modes:
 *   marker-done       - Répond avec "DONE" à la Nème itération
 *   json-done         - Répond avec {"status":"done"} à la Nème itération
 *   json-continue     - Répond avec {"status":"continue","next":"..."} puis done
 *   infinite          - Ne termine jamais (pour tester timeout/maxIterations)
 *   no-progress       - Répond toujours la même chose (pour tester noProgressLimit)
 *   invalid-json      - Répond avec du texte non-JSON en mode json
 *   slow              - Répond après un délai configurable
 *
 * Options:
 *   --iterations=N    - Nombre d'itérations avant complétion (défaut: 2)
 *   --delay=N         - Délai en ms avant chaque réponse (défaut: 0)
 *   --summary=TEXT    - Texte du summary pour mode json-done
 */

const args = process.argv.slice(2);
const mode = args[0] || "marker-done";

// Parse options
/**
 * @param {string} name
 * @param {string} defaultValue
 * @returns {string}
 */
function getOption(name, defaultValue) {
  const arg = args.find((/** @type {string} */ a) =>
    a.startsWith(`--${name}=`),
  );
  return arg ? arg.split("=")[1] : defaultValue;
}

const targetIterations = parseInt(getOption("iterations", "2"), 10);
const delay = parseInt(getOption("delay", "0"), 10);
const summaryText = getOption("summary", "Task completed successfully");

// Lire le prompt depuis stdin
let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (/** @type {string} */ chunk) => {
  input += chunk;
});
process.stdin.on("end", async () => {
  // Simuler un délai si configuré
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Extraire le dernier numéro d'itération depuis le prompt (convention: "iteration:N" dans le prompt)
  // Utilise matchAll pour trouver toutes les occurrences et prend la dernière
  const allMatches = [...input.matchAll(/iteration:(\d+)/gi)];
  const currentIteration =
    allMatches.length > 0
      ? parseInt(allMatches[allMatches.length - 1][1], 10)
      : 1;

  let response;

  switch (mode) {
    case "marker-done":
      if (currentIteration >= targetIterations) {
        response = `Completed step ${currentIteration}\nDONE`;
      } else {
        response = `Working on step ${currentIteration}...`;
      }
      break;

    case "json-done":
      if (currentIteration >= targetIterations) {
        response = JSON.stringify({ status: "done", summary: summaryText });
      } else {
        response = JSON.stringify({
          status: "continue",
          next: `Continue iteration:${currentIteration + 1}`,
        });
      }
      break;

    case "json-continue":
      if (currentIteration >= targetIterations) {
        response = JSON.stringify({ status: "done", summary: summaryText });
      } else {
        response = JSON.stringify({
          status: "continue",
          next: `Process step ${currentIteration + 1} iteration:${currentIteration + 1}`,
        });
      }
      break;

    case "infinite":
      // Générer une réponse unique à chaque appel pour éviter no-progress
      response = `Still working on iteration ${currentIteration}... (infinite mode) - timestamp:${Date.now()}`;
      break;

    case "no-progress":
      response = "Same response every time - no progress";
      break;

    case "invalid-json":
      response = "This is not valid JSON and will cause an error";
      break;

    case "slow":
      response = `Slow response after ${delay}ms\nDONE`;
      break;

    default:
      response = `Unknown mode: ${mode}\nDONE`;
  }

  process.stdout.write(response);
});
