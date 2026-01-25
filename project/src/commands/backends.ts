/**
 * Commande `jlgcli backends`
 * Affiche la liste des backends supportés.
 */

import { Command } from "commander";

/**
 * Représente un backend supporté par le CLI.
 */
export interface Backend {
  id: string;
  name: string;
  status: "unknown" | "planned";
}

/**
 * Liste statique des backends supportés.
 * Note: La détection réelle (available/missing/unauthenticated) sera ajoutée dans id024.
 */
export const BACKENDS: Backend[] = [
  { id: "copilot", name: "GitHub Copilot CLI", status: "unknown" },
  { id: "codex", name: "OpenAI Codex CLI", status: "unknown" },
  { id: "claude", name: "Anthropic Claude CLI", status: "planned" },
];

/**
 * Retourne la liste des backends supportés.
 */
export function getBackends(): Backend[] {
  return BACKENDS;
}

/**
 * Formate la liste des backends pour affichage humain.
 */
export function formatBackendsOutput(backends: Backend[]): string {
  const lines = backends.map((b) => {
    const statusIcon = b.status === "planned" ? "📅" : "❓";
    return `  ${statusIcon} ${b.id.padEnd(10)} ${b.name} (${b.status})`;
  });
  return ["Backends supportés:", "", ...lines, ""].join("\n");
}

/**
 * Handler de la commande backends.
 */
export function backendsAction(): void {
  const backends = getBackends();
  const output = formatBackendsOutput(backends);
  console.log(output);
}

/**
 * Enregistre la commande backends sur le programme commander.
 */
export function registerBackendsCommand(program: Command): void {
  program
    .command("backends")
    .description("Liste les backends IA supportés")
    .action(backendsAction);
}
