/**
 * Commande `jlgcli loop <fichier-prompt>`
 * Exécute un prompt de manière itérative sur un backend IA.
 */

import type { Command } from "commander";
import { readFile } from "node:fs/promises";
import { runLoop } from "../runner/loop.js";
import type { TranscriptEntry } from "../runner/types.js";
import {
  formatLoopHumanSummary,
  formatLoopJsonSummary,
} from "../output/summary.js";
import type { VerbosityLevel } from "../config/schema.js";

// Exit code pour fichier introuvable (cf. clarifications/003)
const EX_NOINPUT = 66;

/**
 * Options de la commande loop
 */
export interface LoopCommandOptions {
  backend?: string;
  maxIterations?: string;
  timeout?: string;
  completionMode?: "marker" | "json";
  json?: boolean;
  verbosity?: string; // Reçu comme string depuis commander, sera parsé en number
}

/**
 * Erreur levée lorsque le fichier prompt n'existe pas
 */
export class PromptFileNotFoundError extends Error {
  constructor(public readonly filePath: string) {
    super(`Fichier prompt introuvable : ${filePath}`);
    this.name = "PromptFileNotFoundError";
  }
}

/**
 * Lit le contenu du prompt depuis un fichier ou stdin.
 * @param source Chemin du fichier ou "-" pour stdin
 * @returns Le contenu du prompt
 * @throws PromptFileNotFoundError si le fichier n'existe pas
 */
export async function readPromptSource(source: string): Promise<string> {
  if (source === "-") {
    return new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => {
        resolve(data.trim());
      });
      process.stdin.on("error", reject);
    });
  }

  try {
    const content = await readFile(source, "utf-8");
    return content.trim();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new PromptFileNotFoundError(source);
    }
    throw error;
  }
}

/**
 * Formatte un résumé d'itération pour l'affichage progressif.
 * @param entry Entrée du transcript
 * @returns Ligne formatée
 */
function formatIterationProgress(entry: TranscriptEntry): string {
  const preview = entry.response.slice(0, 60).replace(/\n/g, " ");
  const suffix = entry.response.length > 60 ? "..." : "";
  return `[iter ${entry.iteration}] ${preview}${suffix} (${entry.durationMs}ms)`;
}

/**
 * Handler de la commande loop.
 * Lit le prompt depuis un fichier et l'exécute de manière itérative.
 */
export async function loopAction(
  promptSource: string,
  options: LoopCommandOptions,
): Promise<void> {
  let prompt: string;

  try {
    prompt = await readPromptSource(promptSource);
  } catch (error) {
    if (error instanceof PromptFileNotFoundError) {
      console.error(error.message);
      console.error("Vérifiez le chemin ou créez le fichier.");
      process.exit(EX_NOINPUT);
      return;
    }
    throw error;
  }

  if (!prompt) {
    console.error("Le fichier prompt est vide.");
    process.exit(EX_NOINPUT);
    return;
  }

  // Parser les options numériques
  const maxIterations = options.maxIterations
    ? parseInt(options.maxIterations, 10)
    : undefined;
  const timeoutMs = options.timeout ? parseInt(options.timeout, 10) : undefined;

  // Parser le niveau de verbosité
  const verbosity = (
    options.verbosity ? parseInt(options.verbosity, 10) : 3
  ) as VerbosityLevel;

  const result = await runLoop({
    prompt,
    backend: options.backend,
    maxIterations,
    timeoutMs,
    completionMode: options.completionMode,
    verbosity,
    onIteration: options.json
      ? undefined
      : (entry) => {
          // Affichage progressif sur stderr (seulement en mode humain)
          console.error(formatIterationProgress(entry));
        },
  });

  if (options.json) {
    // Mode JSON : uniquement le JSON sur stdout
    console.log(JSON.stringify(formatLoopJsonSummary(result), null, 2));
  } else {
    // Mode humain : texte sur stdout, résumé sur stderr
    if (result.exitCode === 0) {
      console.log(result.text);
    } else {
      console.error(`[${result.status}] ${result.text.slice(0, 200)}`);
      if (result.details) {
        console.error(result.details);
      }
    }

    // Afficher le résumé sur stderr
    for (const line of formatLoopHumanSummary(result)) {
      console.error(line);
    }
  }

  process.exit(result.exitCode);
}

/**
 * Enregistre la commande loop sur le programme commander.
 */
export function registerLoopCommand(program: Command): void {
  program
    .command("loop <fichier-prompt>")
    .description("Exécute un prompt de manière itérative sur un backend IA")
    .option("-b, --backend <id>", "Backend à utiliser (copilot, codex, claude)")
    .option("-m, --max-iterations <n>", "Nombre maximum d'itérations")
    .option("-t, --timeout <ms>", "Timeout global en millisecondes")
    .option(
      "--completion-mode <mode>",
      "Mode de détection de complétion (marker, json)",
    )
    .option("-V, --verbosity <level>", "Niveau de verbosité (0-3)", "3")
    .option("--json", "Sortie au format JSON (machine-readable)")
    .action(loopAction);
}
