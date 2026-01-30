---
agent: agent
description: Implémenter la commande `jlgcli loop <fichier-prompt>` avec options --max-iterations, --timeout et affichage progressif
---

# id052 — Implémenter la commande `jlgcli loop <prompt>`

## Objectif

Créer la commande CLI `jlgcli loop <fichier-prompt>` qui exécute un prompt de manière itérative via le runner loop existant (`runLoop`), avec les options `--max-iterations`, `--timeout`, et l'affichage de la progression en temps réel.

## Contexte

Le runner loop (`project/src/runner/loop.ts`) est déjà implémenté et fonctionnel. Cette tâche consiste à créer la commande CLI qui l'expose à l'utilisateur, similaire à la commande `run` existante mais pour l'exécution itérative.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture technique
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Codes de sortie
- Dépendances : `id050` (Runner loop avec garde-fous) ✅

## Pré-requis

- [x] Tâche `id050` complétée (runner loop disponible)
- [x] Node.js 22 LTS et npm 10+
- [x] Dépendances installées (`npm install`)

## Fichiers impactés

| Fichier                                   | Action   | Description                    |
| ----------------------------------------- | -------- | ------------------------------ |
| `project/src/commands/loop.ts`            | Créer    | Handler de la commande loop    |
| `project/src/cli.ts`                      | Modifier | Enregistrer la commande loop   |
| `project/tests/unit/loop-command.test.ts` | Créer    | Tests unitaires de la commande |

## Critères d'acceptation

- [ ] Commande `jlgcli loop <fichier-prompt>` fonctionnelle
- [ ] Option `-b, --backend <id>` pour choisir le backend
- [ ] Option `-m, --max-iterations <n>` pour limiter les itérations
- [ ] Option `-t, --timeout <ms>` pour définir le timeout global
- [ ] Option `--completion-mode <mode>` pour choisir marker/json
- [ ] Affichage progressif : `[iter N] <résumé>` sur stderr à chaque itération
- [ ] Résultat final sur stdout (dernière réponse)
- [ ] Code de sortie conforme (0, 4, 5, 75, etc.)
- [ ] Lecture du prompt depuis fichier (comme `run`)
- [ ] Tests unitaires passent

## Tests requis

**Unitaires** : `project/tests/unit/loop-command.test.ts`

Cas à couvrir :

- Enregistrement de la commande avec toutes les options
- Lecture du prompt depuis fichier
- Appel de `runLoop` avec les bonnes options
- Affichage progressif via `onIteration`
- Gestion des erreurs (fichier absent, vide)
- Codes de sortie corrects selon le statut

## Instructions

### Étape 1 : Créer le handler de commande loop

**Fichier** : `project/src/commands/loop.ts`

```typescript
/**
 * Commande `jlgcli loop <fichier-prompt>`
 * Exécute un prompt de manière itérative sur un backend IA.
 */

import type { Command } from "commander";
import { readFile } from "node:fs/promises";
import { runLoop } from "../runner/loop.js";
import type { TranscriptEntry } from "../runner/types.js";

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

  const result = await runLoop({
    prompt,
    backend: options.backend,
    maxIterations,
    timeoutMs,
    completionMode: options.completionMode,
    onIteration: (entry) => {
      // Affichage progressif sur stderr
      console.error(formatIterationProgress(entry));
    },
  });

  if (result.exitCode === 0) {
    // Succès : afficher le texte sur stdout
    console.log(result.text);
  } else {
    // Erreur : afficher sur stderr
    console.error(`[${result.status}] ${result.text.slice(0, 200)}`);
    if (result.details) {
      console.error(result.details);
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
    .action(loopAction);
}
```

**Validation** : Le fichier compile (`npx tsc --noEmit`)

### Étape 2 : Enregistrer la commande dans le CLI

**Fichier** : `project/src/cli.ts`

Ajouter l'import et l'enregistrement de la commande loop :

```typescript
import { registerLoopCommand } from "./commands/loop.js";

// Dans createProgram(), après registerRunCommand(program) :
registerLoopCommand(program);
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/loop-command.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Mock du runner loop
vi.mock("../../src/runner/loop.js", () => ({
  runLoop: vi.fn(),
}));

// Mock de fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import {
  registerLoopCommand,
  loopAction,
  readPromptSource,
  PromptFileNotFoundError,
} from "../../src/commands/loop.js";
import { runLoop } from "../../src/runner/loop.js";
import { readFile } from "node:fs/promises";

describe("Loop Command", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("registerLoopCommand", () => {
    it("should register loop command on program", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      expect(loopCmd).toBeDefined();
      expect(loopCmd?.description()).toBe(
        "Exécute un prompt de manière itérative sur un backend IA",
      );
    });

    it("should accept --backend option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const backendOption = loopCmd?.options.find(
        (o) => o.long === "--backend",
      );
      expect(backendOption).toBeDefined();
      expect(backendOption?.short).toBe("-b");
    });

    it("should accept --max-iterations option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const option = loopCmd?.options.find(
        (o) => o.long === "--max-iterations",
      );
      expect(option).toBeDefined();
      expect(option?.short).toBe("-m");
    });

    it("should accept --timeout option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const option = loopCmd?.options.find((o) => o.long === "--timeout");
      expect(option).toBeDefined();
      expect(option?.short).toBe("-t");
    });

    it("should accept --completion-mode option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const option = loopCmd?.options.find(
        (o) => o.long === "--completion-mode",
      );
      expect(option).toBeDefined();
    });
  });

  describe("readPromptSource", () => {
    it("should read content from file", async () => {
      vi.mocked(readFile).mockResolvedValue("  Prompt content from file  ");

      const result = await readPromptSource("./prompt.txt");

      expect(readFile).toHaveBeenCalledWith("./prompt.txt", "utf-8");
      expect(result).toBe("Prompt content from file");
    });

    it("should throw PromptFileNotFoundError when file not found", async () => {
      const enoentError = new Error("ENOENT") as Error & { code: string };
      enoentError.code = "ENOENT";
      vi.mocked(readFile).mockRejectedValue(enoentError);

      await expect(readPromptSource("./missing.txt")).rejects.toThrow(
        PromptFileNotFoundError,
      );
    });

    it("should rethrow other errors", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("Permission denied"));

      await expect(readPromptSource("./protected.txt")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  describe("loopAction", () => {
    it("should read prompt from file and call runLoop", async () => {
      vi.mocked(readFile).mockResolvedValue("Hello AI");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: "Task completed\nDONE",
        backend: "copilot",
        status: "done",
        iterations: 2,
        durationMs: 500,
        transcript: [],
      });

      await loopAction("./prompt.txt", { backend: "copilot" });

      expect(readFile).toHaveBeenCalledWith("./prompt.txt", "utf-8");
      expect(runLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Hello AI",
          backend: "copilot",
        }),
      );
    });

    it("should pass maxIterations and timeout options", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: "Done",
        backend: "copilot",
        status: "done",
        iterations: 1,
        durationMs: 100,
        transcript: [],
      });

      await loopAction("./prompt.txt", {
        maxIterations: "5",
        timeout: "60000",
      });

      expect(runLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          maxIterations: 5,
          timeoutMs: 60000,
        }),
      );
    });

    it("should pass completionMode option", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: '{"status":"done"}',
        backend: "copilot",
        status: "done",
        iterations: 1,
        durationMs: 100,
        transcript: [],
      });

      await loopAction("./prompt.txt", {
        completionMode: "json",
      });

      expect(runLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          completionMode: "json",
        }),
      );
    });

    it("should output result text on success", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: "Final response",
        backend: "copilot",
        status: "done",
        iterations: 3,
        durationMs: 1000,
        transcript: [],
      });

      await loopAction("./prompt.txt", {});

      expect(consoleSpy).toHaveBeenCalledWith("Final response");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it("should exit with 66 when file not found", async () => {
      const enoentError = Object.assign(new Error("ENOENT"), {
        code: "ENOENT",
      });
      vi.mocked(readFile).mockRejectedValue(enoentError);

      await loopAction("./missing.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Fichier prompt introuvable : ./missing.txt",
      );
      expect(processExitSpy).toHaveBeenCalledWith(66);
    });

    it("should exit with 66 when file is empty", async () => {
      vi.mocked(readFile).mockResolvedValue("   ");

      await loopAction("./empty.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Le fichier prompt est vide.",
      );
      expect(processExitSpy).toHaveBeenCalledWith(66);
    });

    it("should exit with 4 on max-iterations status", async () => {
      vi.mocked(readFile).mockResolvedValue("Long task");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 4,
        text: "Still running",
        backend: "copilot",
        status: "max-iterations",
        iterations: 10,
        durationMs: 5000,
        transcript: [],
        details: "Limite de 10 itérations atteinte",
      });

      await loopAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(4);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("max-iterations"),
      );
    });

    it("should exit with 5 on no-progress status", async () => {
      vi.mocked(readFile).mockResolvedValue("Stuck task");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 5,
        text: "Same response",
        backend: "copilot",
        status: "no-progress",
        iterations: 3,
        durationMs: 1500,
        transcript: [],
        details: "Arrêt après 3 réponses identiques",
      });

      await loopAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(5);
    });

    it("should exit with 75 on timeout status", async () => {
      vi.mocked(readFile).mockResolvedValue("Slow task");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 75,
        text: "Timeout",
        backend: "copilot",
        status: "timeout",
        iterations: 5,
        durationMs: 300000,
        transcript: [],
        details: "Timeout global atteint",
      });

      await loopAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(75);
    });

    it("should provide onIteration callback for progress display", async () => {
      vi.mocked(readFile).mockResolvedValue("Task");
      vi.mocked(runLoop).mockImplementation(async (options) => {
        // Simuler l'appel du callback
        if (options.onIteration) {
          options.onIteration({
            iteration: 1,
            startedAt: new Date().toISOString(),
            prompt: "Task",
            response: "Working on it...",
            durationMs: 250,
          });
        }
        return {
          exitCode: 0,
          text: "Done",
          backend: "copilot",
          status: "done",
          iterations: 1,
          durationMs: 250,
          transcript: [],
        };
      });

      await loopAction("./prompt.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[iter 1]"),
      );
    });
  });
});
```

**Validation** : `npm test -- --run loop-command`

## Contraintes

- Respecter la structure existante de la commande `run` (pattern similaire)
- Logs de progression sur **stderr** (stdout réservé au résultat)
- Parser les options `--max-iterations` et `--timeout` comme entiers
- Utiliser le callback `onIteration` du runner pour l'affichage progressif
- Codes de sortie conformes à [clarifications/003](clarifications/003-exit-codes-et-erreurs.md)

## Definition of Done

- [ ] Code conforme aux guidelines
- [ ] Fichier `project/src/commands/loop.ts` créé
- [ ] CLI mis à jour avec import et enregistrement
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
- [project/src/commands/run.ts](project/src/commands/run.ts) — Pattern de référence
- [project/src/runner/loop.ts](project/src/runner/loop.ts) — Runner loop à utiliser
