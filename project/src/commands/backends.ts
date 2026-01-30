/**
 * Commande `jlgcli backends`
 * Affiche la liste des backends supportés.
 */

import { Command } from "commander";
import { getAdapters } from "../adapters/registry.js";
import type {
  AdapterAvailabilityStatus,
  AdapterId,
} from "../adapters/types.js";

const BACKEND_NAMES: Record<AdapterId, string> = {
  copilot: "GitHub Copilot CLI",
  codex: "OpenAI Codex CLI",
  claude: "Anthropic Claude CLI",
};

function iconForStatus(status: AdapterAvailabilityStatus): string {
  switch (status) {
    case "available":
      return "✅";
    case "missing":
      return "❌";
    case "unauthenticated":
      return "🔒";
    case "unsupported":
      return "⛔";
  }
}

/**
 * Représente un backend supporté par le CLI.
 */
export interface Backend {
  id: AdapterId;
  name: string;
  status: AdapterAvailabilityStatus;
}

/**
 * Retourne la liste des backends supportés.
 */
export async function getBackends(): Promise<Backend[]> {
  const adapters = getAdapters();

  const backends = await Promise.all(
    adapters.map(async (adapter) => {
      const availability = await adapter.isAvailable();
      return {
        id: adapter.id,
        name: BACKEND_NAMES[adapter.id],
        status: availability.status,
      } satisfies Backend;
    }),
  );

  return backends;
}

/**
 * Formate la liste des backends pour affichage humain.
 */
export function formatBackendsOutput(backends: Backend[]): string {
  const lines = backends.map((b) => {
    const statusIcon = iconForStatus(b.status);
    return `  ${statusIcon} ${b.id.padEnd(10)} ${b.name} (${b.status})`;
  });
  return ["Backends supportés:", "", ...lines, ""].join("\n");
}

/**
 * Handler de la commande backends.
 */
export async function backendsAction(): Promise<void> {
  const backends = await getBackends();
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
