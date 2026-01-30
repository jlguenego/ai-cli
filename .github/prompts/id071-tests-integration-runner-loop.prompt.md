---
agent: agent
description: Ajouter les tests d'intégration pour le runner loop avec un backend mock
---

# id071 — Ajouter les tests d'intégration pour le runner loop

## Objectif

Créer des tests d'intégration qui exécutent le runner loop de bout en bout avec un backend mock simulant différents scénarios (complétion marker, complétion json, timeout, max-iterations, no-progress).

## Contexte

Le runner loop (`runLoop`) est le cœur du CLI pour l'exécution itérative. Les tests unitaires (`project/tests/unit/runner-loop.test.ts`) couvrent déjà la logique avec des mocks, mais les tests d'intégration doivent valider le comportement réel avec un processus externe.

- Réf : [docs/08-tests-verification.md](docs/08-tests-verification.md) — Scénarios INT-003 à INT-006c
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
- Dépendances : `id052` (commande loop) ✅

## Pré-requis

- [ ] Tâche `id052` complétée
- [ ] Node.js 22 LTS installé
- [ ] `npm install` exécuté dans `project/`

## Fichiers impactés

| Fichier                                  | Action | Description                        |
| ---------------------------------------- | ------ | ---------------------------------- |
| `project/tests/integration/loop.test.ts` | Créer  | Tests d'intégration du runner loop |
| `project/tests/fixtures/mock-backend.js` | Créer  | Backend mock Node.js configurable  |

## Critères d'acceptation

- [ ] Backend mock capable de simuler : marker `DONE`, JSON `{"status":"done"}`, boucle infinie, délai configurable
- [ ] Test INT-003 : `loop` s'arrête sur `DONE` (marker strict)
- [ ] Test INT-004 : `loop` s'arrête sur `{"status":"done"}` (json)
- [ ] Test INT-005 : `loop` timeout → code 75
- [ ] Test INT-006 : `loop` maxIterations → code 4
- [ ] Test INT-006b : `loop` no-progress → code 5
- [ ] Test INT-006c : `loop` invalid-json (mode json) → code 65
- [ ] Tous les tests passent avec `npm test`

## Tests requis

**Intégration** : `project/tests/integration/loop.test.ts`

| ID       | Scénario                           | Comportement attendu                               |
| -------- | ---------------------------------- | -------------------------------------------------- |
| INT-003  | Arrêt sur marker `DONE`            | `status: "done"`, `exitCode: 0`                    |
| INT-004  | Arrêt sur JSON `{"status":"done"}` | `status: "done"`, `exitCode: 0`, `summary` extrait |
| INT-005  | Timeout global dépassé             | `status: "timeout"`, `exitCode: 75`                |
| INT-006  | maxIterations atteint              | `status: "max-iterations"`, `exitCode: 4`          |
| INT-006b | Réponses identiques consécutives   | `status: "no-progress"`, `exitCode: 5`             |
| INT-006c | JSON invalide en mode json         | `status: "invalid-json"`, `exitCode: 65`           |

## Instructions

### Étape 1 : Créer le backend mock

**Fichier** : `project/tests/fixtures/mock-backend.js`

Ce script Node.js simule un backend IA configurable via arguments :

```javascript
#!/usr/bin/env node
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
function getOption(name, defaultValue) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : defaultValue;
}

const targetIterations = parseInt(getOption("iterations", "2"), 10);
const delay = parseInt(getOption("delay", "0"), 10);
const summaryText = getOption("summary", "Task completed successfully");

// Lire le prompt depuis stdin
let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", async () => {
  // Simuler un délai si configuré
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Extraire le numéro d'itération depuis le prompt (convention: "iteration:N" dans le prompt)
  const iterMatch = input.match(/iteration:(\d+)/i);
  const currentIteration = iterMatch ? parseInt(iterMatch[1], 10) : 1;

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
      response = `Still working on iteration ${currentIteration}... (infinite mode)`;
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
```

**Validation** : `echo "test" | node project/tests/fixtures/mock-backend.js marker-done`

### Étape 2 : Créer l'adaptateur mock pour les tests

Le mock-backend est un script externe. Pour l'intégration, on crée un adaptateur qui l'exécute comme un vrai backend.

**Fichier** : `project/tests/integration/loop.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type {
  Adapter,
  AdapterRunOnceOptions,
} from "../../src/adapters/types.js";
import { runLoop } from "../../src/runner/loop.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MOCK_BACKEND_PATH = join(__dirname, "../fixtures/mock-backend.js");

/**
 * Crée un adaptateur qui exécute le mock-backend avec les options spécifiées
 */
function createMockBackendAdapter(
  mode: string,
  options: { iterations?: number; delay?: number; summary?: string } = {},
): Adapter {
  return {
    id: "copilot", // On utilise un ID valide pour bypasser la validation

    async isAvailable() {
      return { status: "available" };
    },

    async runOnce(runOptions: AdapterRunOnceOptions) {
      return new Promise((resolve) => {
        const args = [MOCK_BACKEND_PATH, mode];
        if (options.iterations) args.push(`--iterations=${options.iterations}`);
        if (options.delay) args.push(`--delay=${options.delay}`);
        if (options.summary) args.push(`--summary=${options.summary}`);

        const child = spawn("node", args, {
          cwd: runOptions.cwd,
          env: { ...process.env, ...runOptions.env },
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        // Envoyer le prompt sur stdin
        child.stdin.write(runOptions.prompt);
        child.stdin.end();

        // Gérer le timeout
        let timeoutId: NodeJS.Timeout | undefined;
        if (runOptions.timeoutMs) {
          timeoutId = setTimeout(() => {
            child.kill("SIGTERM");
          }, runOptions.timeoutMs);
        }

        child.on("close", (code) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({
            exitCode: code ?? 0,
            text: stdout || stderr,
          });
        });

        child.on("error", (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({
            exitCode: 1,
            text: err.message,
          });
        });
      });
    },
  };
}

// Variable pour stocker l'adaptateur mock actif
let mockAdapter: Adapter | null = null;

// Mock du registry pour utiliser notre adaptateur mock
import { vi } from "vitest";

vi.mock("../../src/adapters/registry.js", () => ({
  tryGetAdapterById: vi.fn((id: string) => {
    if (id === "mock" || id === "copilot") {
      return mockAdapter;
    }
    return null;
  }),
}));

vi.mock("../../src/config/loader.js", () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    backend: "copilot",
    maxIterations: 10,
    timeoutMs: 30000,
    completionMode: "marker",
    noProgressLimit: 3,
  }),
}));

describe("Runner Loop Integration Tests", () => {
  describe("INT-003: Arrêt sur marker DONE", () => {
    it("should stop when backend outputs DONE marker", async () => {
      mockAdapter = createMockBackendAdapter("marker-done", { iterations: 2 });

      const result = await runLoop({
        prompt: "Start task iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(2);
      expect(result.text).toContain("DONE");
    });

    it("should detect DONE on first iteration if present", async () => {
      mockAdapter = createMockBackendAdapter("marker-done", { iterations: 1 });

      const result = await runLoop({
        prompt: "Quick task iteration:1",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(1);
    });
  });

  describe("INT-004: Arrêt sur JSON status done", () => {
    it("should stop when backend outputs {status: done}", async () => {
      mockAdapter = createMockBackendAdapter("json-done", {
        iterations: 2,
        summary: "Integration test completed",
      });

      const result = await runLoop({
        prompt: "Start JSON task iteration:1",
        backend: "copilot",
        completionMode: "json",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.summary).toBe("Integration test completed");
    });

    it("should follow next prompts in JSON continue mode", async () => {
      mockAdapter = createMockBackendAdapter("json-continue", {
        iterations: 3,
      });

      const result = await runLoop({
        prompt: "Multi-step task iteration:1",
        backend: "copilot",
        completionMode: "json",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(3);
    });
  });

  describe("INT-005: Timeout global", () => {
    it("should return exit code 75 when timeout is reached", async () => {
      mockAdapter = createMockBackendAdapter("slow", { delay: 200 });

      const result = await runLoop({
        prompt: "Slow task iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
        timeoutMs: 50, // Timeout très court
      });

      expect(result.exitCode).toBe(75);
      expect(result.status).toBe("timeout");
    });
  });

  describe("INT-006: maxIterations atteint", () => {
    it("should return exit code 4 when maxIterations is reached", async () => {
      mockAdapter = createMockBackendAdapter("infinite");

      const result = await runLoop({
        prompt: "Infinite task iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 3,
        timeoutMs: 10000,
      });

      expect(result.exitCode).toBe(4);
      expect(result.status).toBe("max-iterations");
      expect(result.iterations).toBe(3);
    });
  });

  describe("INT-006b: No progress detected", () => {
    it("should return exit code 5 when no progress is detected", async () => {
      mockAdapter = createMockBackendAdapter("no-progress");

      const result = await runLoop({
        prompt: "No progress task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
        noProgressLimit: 3,
      });

      expect(result.exitCode).toBe(5);
      expect(result.status).toBe("no-progress");
      expect(result.iterations).toBeLessThanOrEqual(3);
    });
  });

  describe("INT-006c: Invalid JSON in json mode", () => {
    it("should return exit code 65 when JSON is invalid", async () => {
      mockAdapter = createMockBackendAdapter("invalid-json");

      const result = await runLoop({
        prompt: "Invalid JSON task",
        backend: "copilot",
        completionMode: "json",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(65);
      expect(result.status).toBe("invalid-json");
    });
  });

  describe("Transcript validation", () => {
    it("should record all iterations in transcript with correct structure", async () => {
      mockAdapter = createMockBackendAdapter("marker-done", { iterations: 3 });

      const result = await runLoop({
        prompt: "Transcript test iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
      });

      expect(result.transcript).toHaveLength(3);

      for (let i = 0; i < result.transcript.length; i++) {
        const entry = result.transcript[i];
        expect(entry).toBeDefined();
        expect(entry!.iteration).toBe(i + 1);
        expect(entry!.prompt).toBeTruthy();
        expect(entry!.response).toBeTruthy();
        expect(entry!.durationMs).toBeGreaterThanOrEqual(0);
        expect(entry!.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });
});
```

**Validation** : `cd project && npm test -- tests/integration/loop.test.ts`

### Étape 3 : Vérifier que les tests passent

**Commande** : `cd project && npm test`

## Contraintes

- Les tests d'intégration doivent être **déterministes** (pas de dépendance à un vrai backend IA)
- Utiliser le mock-backend pour simuler les différents comportements
- Respecter les exit codes définis dans [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md)
- Ne pas utiliser `shell: true` dans `spawn()` pour des raisons de sécurité
- Structure des tests : `describe("[Scénario ID]", () => { it("should [comportement]", ...) })`

## Definition of Done

- [ ] Fichier `project/tests/fixtures/mock-backend.js` créé et fonctionnel
- [ ] Fichier `project/tests/integration/loop.test.ts` créé avec tous les scénarios
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests & scénarios d'intégration
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Mapping des exit codes
- [project/src/runner/loop.ts](project/src/runner/loop.ts) — Implémentation du runner loop
- [project/tests/unit/runner-loop.test.ts](project/tests/unit/runner-loop.test.ts) — Tests unitaires existants (référence de patterns)
