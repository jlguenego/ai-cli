---
agent: agent
description: Implémenter la commande `jlgcli run <prompt>` pour exécution one-shot
---

# id031 — Implémenter la commande `jlgcli run <prompt>`

## Objectif

Créer la commande CLI `jlgcli run <prompt>` qui exécute un prompt sur un backend IA (one-shot) et affiche le résultat. Cette commande est la première fonctionnalité utilisateur démontrable du CLI.

## Contexte

Le CLI `jlgcli` doit permettre d'exécuter des prompts sur différents backends IA. La commande `run` est le point d'entrée principal pour l'exécution one-shot.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture CLI
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- Dépendance : `id030` ✅ — Runner one-shot implémenté dans `project/src/runner/run.ts`

## Pré-requis

- [x] Tâche dépendante complétée : `id030` (Runner one-shot)
- [x] Module `runOnce()` disponible dans `project/src/runner/run.ts`
- [x] Types `RunOptions`, `RunResult` définis dans `project/src/runner/types.ts`

## Fichiers impactés

| Fichier                                  | Action   | Description                    |
| ---------------------------------------- | -------- | ------------------------------ |
| `project/src/commands/run.ts`            | Créer    | Handler de la commande `run`   |
| `project/src/cli.ts`                     | Modifier | Enregistrer la commande `run`  |
| `project/tests/unit/run-command.test.ts` | Créer    | Tests unitaires de la commande |

## Critères d'acceptation

- [ ] `jlgcli run "Hello"` exécute le prompt et affiche la réponse
- [ ] Option `--backend <id>` permet de choisir le backend
- [ ] Le code de sortie reflète le succès/échec de l'exécution
- [ ] Erreurs affichées sur stderr avec message clair
- [ ] Tests unitaires couvrent les cas nominaux et d'erreur

## Tests requis

**Unitaires** : `project/tests/unit/run-command.test.ts`

- Enregistrement de la commande `run` sur le programme
- Handler appelle `runOnce()` avec les bonnes options
- Affichage du résultat sur stdout en cas de succès
- Affichage des erreurs sur stderr
- Option `--backend` transmise correctement
- Code de sortie conforme au résultat

## Instructions

### Étape 1 : Créer le fichier de commande

**Fichier** : `project/src/commands/run.ts`

```typescript
/**
 * Commande `jlgcli run <prompt>`
 * Exécute un prompt sur un backend IA (one-shot).
 */

import { Command } from "commander";
import { runOnce } from "../runner/run.js";

/**
 * Options de la commande run
 */
export interface RunCommandOptions {
  backend?: string;
}

/**
 * Handler de la commande run.
 * Exécute le prompt et affiche le résultat.
 */
export async function runAction(
  prompt: string,
  options: RunCommandOptions,
): Promise<void> {
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
    .command("run <prompt>")
    .description("Exécute un prompt sur un backend IA")
    .option("-b, --backend <id>", "Backend à utiliser (copilot, codex, claude)")
    .action(runAction);
}
```

**Validation** : Le fichier compile sans erreur (`npx tsc --noEmit`)

### Étape 2 : Enregistrer la commande dans cli.ts

**Fichier** : `project/src/cli.ts`

Ajouter l'import :

```typescript
import { registerRunCommand } from "./commands/run.js";
```

Ajouter l'enregistrement dans `createProgram()` :

```typescript
registerRunCommand(program);
```

**Résultat attendu** :

```typescript
#!/usr/bin/env node
/**
 * Point d'entrée CLI pour jlgcli.
 * Configure commander et dispatche les commandes.
 */

import { Command } from "commander";
import { VERSION, NAME, CLI_NAME } from "./index.js";
import { registerBackendsCommand } from "./commands/backends.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerRunCommand } from "./commands/run.js";

/**
 * Crée et configure le programme CLI principal.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name(CLI_NAME)
    .description("CLI pour orchestrer des agents IA via des backends externes")
    .version(VERSION, "-v, --version", "Affiche la version")
    .helpOption("-h, --help", "Affiche l'aide");

  // Enregistrer les commandes
  registerBackendsCommand(program);
  registerConfigCommand(program);
  registerRunCommand(program);

  return program;
}

/**
 * Point d'entrée principal.
 */
function main(): void {
  const program = createProgram();
  program.parse(process.argv);
}

main();
```

**Validation** : `npx tsc --noEmit` réussit

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/run-command.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Mock du runner
vi.mock("../../src/runner/run.js", () => ({
  runOnce: vi.fn(),
}));

import { registerRunCommand, runAction } from "../../src/commands/run.js";
import { runOnce } from "../../src/runner/run.js";

describe("Run Command", () => {
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

  describe("registerRunCommand", () => {
    it("should register run command on program", () => {
      const program = new Command();
      registerRunCommand(program);

      const runCmd = program.commands.find((c) => c.name() === "run");
      expect(runCmd).toBeDefined();
      expect(runCmd?.description()).toBe("Exécute un prompt sur un backend IA");
    });

    it("should accept --backend option", () => {
      const program = new Command();
      registerRunCommand(program);

      const runCmd = program.commands.find((c) => c.name() === "run");
      const backendOption = runCmd?.options.find((o) => o.long === "--backend");
      expect(backendOption).toBeDefined();
      expect(backendOption?.short).toBe("-b");
    });
  });

  describe("runAction", () => {
    it("should call runOnce with prompt and options", async () => {
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 0,
        text: "AI response",
        backend: "copilot",
        status: "success",
        durationMs: 100,
      });

      await runAction("Hello AI", { backend: "copilot" });

      expect(runOnce).toHaveBeenCalledWith({
        prompt: "Hello AI",
        backend: "copilot",
      });
    });

    it("should output result text on success", async () => {
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 0,
        text: "Response text",
        backend: "copilot",
        status: "success",
        durationMs: 100,
      });

      await runAction("Test prompt", {});

      expect(consoleSpy).toHaveBeenCalledWith("Response text");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it("should output error on stderr on failure", async () => {
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 2,
        text: "Backend not found",
        backend: "unknown",
        status: "backend-missing",
        durationMs: 50,
        details: "Install the backend first",
      });

      await runAction("Test", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith("Backend not found");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Install the backend first");
      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it("should exit with backend exit code", async () => {
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 6,
        text: "Unauthenticated",
        backend: "copilot",
        status: "backend-unauthenticated",
        durationMs: 10,
      });

      await runAction("Test", {});

      expect(processExitSpy).toHaveBeenCalledWith(6);
    });

    it("should work without backend option", async () => {
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 0,
        text: "OK",
        backend: "copilot",
        status: "success",
        durationMs: 100,
      });

      await runAction("Prompt", {});

      expect(runOnce).toHaveBeenCalledWith({
        prompt: "Prompt",
        backend: undefined,
      });
    });
  });
});
```

**Validation** : `npm test -- --run run-command` — tous les tests passent

## Contraintes

- Respecter les conventions de [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- Utiliser `console.log` pour stdout (résultat) et `console.error` pour stderr (erreurs)
- Le code de sortie doit correspondre aux exit codes définis dans `clarifications/003-exit-codes-et-erreurs.md`
- Pas de dépendance externe supplémentaire

## Definition of Done

- [ ] Code conforme aux guidelines (`project/src/commands/run.ts` créé)
- [ ] Commande enregistrée dans `project/src/cli.ts`
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [project/src/runner/run.ts](project/src/runner/run.ts) — Runner one-shot
- [project/src/runner/types.ts](project/src/runner/types.ts) — Types RunOptions, RunResult
- [project/src/commands/backends.ts](project/src/commands/backends.ts) — Pattern de commande existant
- [project/src/cli.ts](project/src/cli.ts) — Point d'entrée CLI
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
