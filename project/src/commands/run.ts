/**
 * Commande `jlgcli run <fichier-prompt>`
 * Exécute un prompt (lu depuis un fichier) sur un backend IA (one-shot).
 */

import type { Command } from "commander";
import { readFile } from "node:fs/promises";
import { runOnce } from "../runner/run.js";

// Exit code pour fichier introuvable (cf. clarifications/003)
const EX_NOINPUT = 66;

/**
 * Options de la commande run
 */
export interface RunCommandOptions {
  backend?: string;
}

/**
 * Lit le contenu du prompt depuis un fichier ou stdin.
 * @param source Chemin du fichier ou "-" pour stdin
 * @returns Le contenu du prompt
 * @throws Error si le fichier n'existe pas
 */
export async function readPromptSource(source: string): Promise<string> {
  if (source === "-") {
    // Lire depuis stdin
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

  // Lire depuis un fichier
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
 * Erreur levée lorsque le fichier prompt n'existe pas
 */
export class PromptFileNotFoundError extends Error {
  constructor(public readonly filePath: string) {
    super(`Fichier prompt introuvable : ${filePath}`);
    this.name = "PromptFileNotFoundError";
  }
}

/**
 * Handler de la commande run.
 * Lit le prompt depuis un fichier et l'exécute.
 */
export async function runAction(
  promptSource: string,
  options: RunCommandOptions,
): Promise<void> {
  let prompt: string;

  try {
    prompt = await readPromptSource(promptSource);
  } catch (error) {
    if (error instanceof PromptFileNotFoundError) {
      console.error(error.message);
      console.error("Vérifiez le chemin ou créez le fichier.");
      process.exit(EX_NOINPUT);
      return; // Pour les tests où process.exit est mocké
    }
    throw error;
  }

  if (!prompt) {
    console.error("Le fichier prompt est vide.");
    process.exit(EX_NOINPUT);
    return; // Pour les tests où process.exit est mocké
  }

  const result = await runOnce({
    prompt,
    backend: options.backend,
  });

  if (result.exitCode === 0) {
    // Succès : afficher le texte sur stdout
    console.log(result.text);
  } else {
    // Erreur : afficher sur stderr
    console.error(result.text);
    if (result.details) {
      console.error(result.details);
    }
  }

  process.exit(result.exitCode);
}

/**
 * Enregistre la commande run sur le programme commander.
 */
export function registerRunCommand(program: Command): void {
  program
    .command("run <fichier-prompt>")
    .description("Exécute un prompt (fichier) sur un backend IA")
    .option("-b, --backend <id>", "Backend à utiliser (copilot, codex, claude)")
    .action(runAction);
}
