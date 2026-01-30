---
agent: agent
description: Implémenter le Runner loop avec garde-fous maxIterations et timeout
---

# id050 — Implémenter le Runner loop avec garde-fous (maxIterations, timeout)

## Objectif

Créer la fonction `runLoop` dans `project/src/runner/loop.ts` qui exécute un prompt de manière itérative en bouclant **prompt→parse→décision** jusqu'à complétion ou déclenchement d'un garde-fou (`maxIterations`, `timeoutMs`).

## Contexte

Le CLI `jlgcli` doit supporter une exécution itérative (`loop`) en plus de l'exécution one-shot (`run`). Le runner loop orchestre plusieurs appels au backend, analyse chaque réponse via le parser de complétion, et décide de continuer ou d'arrêter.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture runner, statuts RUN
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Patterns Result object, gestion erreurs
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes (4=max-iterations, 75=timeout)
- Dépendances : `id030` (runner one-shot), `id042` (dispatcher complétion)

## Pré-requis

- [x] Tâche `id030` complétée — Runner one-shot (`runOnce`)
- [x] Tâche `id042` complétée — Dispatcher de complétion (`parseCompletion`)
- [ ] Environnement configuré : `npm install` réussi

## Fichiers impactés

| Fichier                                  | Action   | Description                               |
| ---------------------------------------- | -------- | ----------------------------------------- |
| `project/src/runner/loop.ts`             | Créer    | Logique du runner loop avec garde-fous    |
| `project/src/runner/types.ts`            | Modifier | Ajouter types `LoopOptions`, `LoopResult` |
| `project/src/runner/index.ts`            | Modifier | Exporter `runLoop` et nouveaux types      |
| `project/tests/unit/runner-loop.test.ts` | Créer    | Tests unitaires du runner loop            |

## Critères d'acceptation

- [ ] `runLoop` boucle prompt→adapter→parse jusqu'à `status: 'done'`
- [ ] Arrêt avec `status: 'max-iterations'` et `exitCode: 4` si `maxIterations` atteint
- [ ] Arrêt avec `status: 'timeout'` et `exitCode: 75` si `timeoutMs` global dépassé
- [ ] Le résultat contient `iterations`, `durationMs`, `transcript` (historique)
- [ ] Mode `json` : arrêt avec `status: 'error'` et `exitCode: 65` si `invalid-json`
- [ ] Tests unitaires passent avec couverture ≥ 90%

## Tests requis

**Unitaires** : `project/tests/unit/runner-loop.test.ts`

| Cas de test                                              | Attendu                                          |
| -------------------------------------------------------- | ------------------------------------------------ |
| Arrêt sur `DONE` (mode marker) après 2 itérations        | `status: 'done'`, `exitCode: 0`, `iterations: 2` |
| Arrêt sur `{status:"done"}` (mode json)                  | `status: 'done'`, `exitCode: 0`                  |
| Dépassement `maxIterations`                              | `status: 'max-iterations'`, `exitCode: 4`        |
| Dépassement `timeoutMs` global                           | `status: 'timeout'`, `exitCode: 75`              |
| Erreur JSON invalide (mode json)                         | `status: 'invalid-json'`, `exitCode: 65`         |
| Backend indisponible                                     | `status: 'backend-missing'`, `exitCode: 2`       |
| Transmission correcte de `cwd`, `env` à chaque itération | Paramètres passés à l'adapter                    |

## Instructions

### Étape 1 : Définir les types pour le loop

**Fichier** : `project/src/runner/types.ts`

Ajouter après les types existants :

```typescript
// ============================================================================
// Types pour l'exécution itérative (loop)
// ============================================================================

/**
 * Statut final d'une exécution loop
 */
export type LoopStatus =
  | "done"
  | "max-iterations"
  | "timeout"
  | "no-progress"
  | "invalid-json"
  | "backend-missing"
  | "backend-unauthenticated"
  | "backend-unsupported"
  | "backend-unknown"
  | "error";

/**
 * Entrée dans le transcript d'exécution
 */
export interface TranscriptEntry {
  /** Numéro d'itération (1-based) */
  iteration: number;
  /** Timestamp ISO de début d'itération */
  startedAt: string;
  /** Prompt envoyé au backend */
  prompt: string;
  /** Réponse du backend */
  response: string;
  /** Durée de l'itération en ms */
  durationMs: number;
}

/**
 * Options pour l'exécution loop
 */
export interface LoopOptions {
  /** Le prompt initial à exécuter */
  prompt: string;
  /** ID du backend à utiliser (optionnel, résolu depuis config sinon) */
  backend?: string;
  /** Répertoire de travail (défaut: process.cwd()) */
  cwd?: string;
  /** Variables d'environnement additionnelles */
  env?: Record<string, string | undefined>;
  /** Nombre maximum d'itérations (défaut: config.maxIterations) */
  maxIterations?: number;
  /** Timeout global en millisecondes (défaut: config.timeoutMs) */
  timeoutMs?: number;
  /** Mode de complétion (défaut: config.completionMode) */
  completionMode?: "marker" | "json";
  /** Callback appelé à chaque itération (pour affichage progressif) */
  onIteration?: (entry: TranscriptEntry) => void;
}

/**
 * Résultat d'une exécution loop
 */
export interface LoopResult {
  /** Code de sortie (0 = succès) */
  exitCode: number;
  /** Texte de la dernière réponse */
  text: string;
  /** ID du backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: LoopStatus;
  /** Nombre d'itérations effectuées */
  iterations: number;
  /** Durée totale d'exécution en millisecondes */
  durationMs: number;
  /** Historique des échanges */
  transcript: TranscriptEntry[];
  /** Résumé extrait (mode json uniquement) */
  summary?: string;
  /** Détails additionnels en cas d'erreur */
  details?: string;
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Implémenter le runner loop

**Fichier** : `project/src/runner/loop.ts`

```typescript
import { tryGetAdapterById } from "../adapters/registry.js";
import { resolveConfig } from "../config/loader.js";
import { parseCompletion } from "../completion/index.js";
import type { CompletionMode } from "../config/schema.js";
import type {
  LoopOptions,
  LoopResult,
  LoopStatus,
  TranscriptEntry,
} from "./types.js";

// Exit codes conformes à clarifications/003
const EXIT_SUCCESS = 0;
const EXIT_BACKEND_MISSING = 2;
const EXIT_MAX_ITERATIONS = 4;
const EXIT_BACKEND_UNAUTHENTICATED = 6;
const EXIT_USAGE = 64; // EX_USAGE - backend inconnu ou unsupported
const EXIT_DATAERR = 65; // EX_DATAERR - invalid-json
const EXIT_TIMEOUT = 75; // EX_TEMPFAIL

/**
 * Résout les options de loop en fusionnant avec la config
 */
async function resolveLoopOptions(options: LoopOptions): Promise<{
  backendId: string;
  maxIterations: number;
  timeoutMs: number;
  completionMode: CompletionMode;
  cwd: string;
}> {
  const config = await resolveConfig();

  return {
    backendId: options.backend ?? config.backend ?? "copilot",
    maxIterations: options.maxIterations ?? config.maxIterations,
    timeoutMs: options.timeoutMs ?? config.timeoutMs,
    completionMode: options.completionMode ?? config.completionMode,
    cwd: options.cwd ?? process.cwd(),
  };
}

/**
 * Mappe le statut d'availability vers un exit code
 */
function exitCodeForAvailability(
  status: "missing" | "unauthenticated" | "unsupported",
): number {
  switch (status) {
    case "missing":
      return EXIT_BACKEND_MISSING;
    case "unauthenticated":
      return EXIT_BACKEND_UNAUTHENTICATED;
    case "unsupported":
      return EXIT_USAGE;
  }
}

/**
 * Mappe le statut d'availability vers un LoopStatus
 */
function loopStatusForAvailability(
  status: "missing" | "unauthenticated" | "unsupported",
): LoopStatus {
  switch (status) {
    case "missing":
      return "backend-missing";
    case "unauthenticated":
      return "backend-unauthenticated";
    case "unsupported":
      return "backend-unsupported";
  }
}

/**
 * Crée un résultat d'erreur de loop
 */
function createErrorResult(
  backendId: string,
  status: LoopStatus,
  exitCode: number,
  details: string,
  startTime: number,
  transcript: TranscriptEntry[],
): LoopResult {
  return {
    exitCode,
    text: details,
    backend: backendId,
    status,
    iterations: transcript.length,
    durationMs: Date.now() - startTime,
    transcript,
    details,
  };
}

/**
 * Exécute un prompt de manière itérative avec garde-fous
 *
 * Boucle prompt→adapter→parse jusqu'à :
 * - status 'done' détecté par le parser de complétion
 * - maxIterations atteint
 * - timeoutMs global dépassé
 *
 * @param options - Options d'exécution loop
 * @returns Résultat de l'exécution avec historique
 */
export async function runLoop(options: LoopOptions): Promise<LoopResult> {
  const startTime = Date.now();
  const transcript: TranscriptEntry[] = [];

  // Résoudre les options avec la config
  const { backendId, maxIterations, timeoutMs, completionMode, cwd } =
    await resolveLoopOptions(options);

  // Vérifier si le backend existe
  const adapter = tryGetAdapterById(backendId);

  if (!adapter) {
    return createErrorResult(
      backendId,
      "backend-unknown",
      EXIT_USAGE,
      `Backend inconnu: ${backendId}. Les backends supportés sont: copilot, codex, claude`,
      startTime,
      transcript,
    );
  }

  // Vérifier la disponibilité du backend
  const availability = await adapter.isAvailable();

  if (availability.status !== "available") {
    return createErrorResult(
      backendId,
      loopStatusForAvailability(availability.status),
      exitCodeForAvailability(availability.status),
      availability.details ?? `Backend ${backendId} non disponible`,
      startTime,
      transcript,
    );
  }

  // Variable pour le prompt courant (peut évoluer en mode json avec "next")
  let currentPrompt = options.prompt;
  let lastResponse = "";
  let summary: string | undefined;

  // Boucle principale
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // Vérifier le timeout global
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      return {
        exitCode: EXIT_TIMEOUT,
        text: lastResponse,
        backend: backendId,
        status: "timeout",
        iterations: transcript.length,
        durationMs: elapsed,
        transcript,
        details: `Timeout global atteint après ${elapsed}ms`,
      };
    }

    // Calculer le timeout restant pour cette itération
    const remainingTimeout = timeoutMs - elapsed;

    const iterationStart = Date.now();
    const iterationStartIso = new Date(iterationStart).toISOString();

    // Exécuter le prompt sur le backend
    const result = await adapter.runOnce({
      prompt: currentPrompt,
      cwd,
      env: options.env,
      timeoutMs: remainingTimeout,
    });

    const iterationDuration = Date.now() - iterationStart;
    lastResponse = result.text;

    // Créer l'entrée de transcript
    const entry: TranscriptEntry = {
      iteration,
      startedAt: iterationStartIso,
      prompt: currentPrompt,
      response: result.text,
      durationMs: iterationDuration,
    };

    transcript.push(entry);

    // Callback pour affichage progressif
    if (options.onIteration) {
      options.onIteration(entry);
    }

    // Vérifier si le backend a échoué
    if (result.exitCode !== 0) {
      return {
        exitCode: result.exitCode,
        text: result.text,
        backend: backendId,
        status: "error",
        iterations: transcript.length,
        durationMs: Date.now() - startTime,
        transcript,
        details: `Backend a retourné exit code ${result.exitCode}`,
      };
    }

    // Parser la complétion
    const completion = parseCompletion(result.text, completionMode);

    // Gérer les différents statuts de complétion
    if (completion.status === "done") {
      // Extraire le résumé si disponible (mode json)
      if ("summary" in completion) {
        summary = completion.summary;
      }

      return {
        exitCode: EXIT_SUCCESS,
        text: result.text,
        backend: backendId,
        status: "done",
        iterations: transcript.length,
        durationMs: Date.now() - startTime,
        transcript,
        summary,
      };
    }

    if (completion.status === "error") {
      // Mode json avec JSON invalide
      const errorMessage =
        "error" in completion ? completion.error : "invalid-json";
      return {
        exitCode: EXIT_DATAERR,
        text: result.text,
        backend: backendId,
        status: "invalid-json",
        iterations: transcript.length,
        durationMs: Date.now() - startTime,
        transcript,
        details: errorMessage,
      };
    }

    // status === 'continue' : préparer la prochaine itération
    // En mode json, utiliser le champ "next" s'il est présent
    if ("next" in completion && completion.next) {
      currentPrompt = completion.next;
    }
    // Sinon, on continue avec le même prompt (mode marker)
  }

  // maxIterations atteint
  return {
    exitCode: EXIT_MAX_ITERATIONS,
    text: lastResponse,
    backend: backendId,
    status: "max-iterations",
    iterations: transcript.length,
    durationMs: Date.now() - startTime,
    transcript,
    details: `Limite de ${maxIterations} itérations atteinte`,
  };
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Mettre à jour les exports

**Fichier** : `project/src/runner/index.ts`

```typescript
export { runOnce } from "./run.js";
export { runLoop } from "./loop.js";
export type {
  RunOptions,
  RunResult,
  RunStatus,
  LoopOptions,
  LoopResult,
  LoopStatus,
  TranscriptEntry,
} from "./types.js";
```

**Validation** : `npx tsc --noEmit`

### Étape 4 : Créer les tests unitaires

**Fichier** : `project/tests/unit/runner-loop.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceResult,
} from "../../src/adapters/types.js";

// Mock des modules
vi.mock("../../src/adapters/registry.js", () => ({
  tryGetAdapterById: vi.fn(),
}));

vi.mock("../../src/config/loader.js", () => ({
  resolveConfig: vi.fn(),
}));

import { runLoop } from "../../src/runner/loop.js";
import { tryGetAdapterById } from "../../src/adapters/registry.js";
import { resolveConfig } from "../../src/config/loader.js";

function createMockAdapter(
  id: string,
  availability: AdapterAvailability,
  runResults?: AdapterRunOnceResult[],
): Adapter {
  let callIndex = 0;
  return {
    id: id as "copilot" | "codex" | "claude",
    isAvailable: vi.fn().mockResolvedValue(availability),
    runOnce: vi.fn().mockImplementation(() => {
      const result = runResults?.[callIndex] ?? { exitCode: 0, text: "ok" };
      callIndex++;
      return Promise.resolve(result);
    }),
  };
}

describe("Runner Loop", () => {
  beforeEach(() => {
    vi.mocked(resolveConfig).mockResolvedValue({
      backend: "copilot",
      maxIterations: 10,
      timeoutMs: 300000,
      completionMode: "marker",
      noProgressLimit: 3,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("runLoop - mode marker", () => {
    it("should stop on DONE marker after 2 iterations", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Step 1 in progress" },
          { exitCode: 0, text: "Step 2 completed\nDONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Do the task",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(2);
      expect(result.transcript).toHaveLength(2);
    });

    it("should continue when DONE not present", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Still working..." },
          { exitCode: 0, text: "More work..." },
          { exitCode: 0, text: "DONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 5,
      });

      expect(result.status).toBe("done");
      expect(result.iterations).toBe(3);
    });
  });

  describe("runLoop - mode json", () => {
    it("should stop on status done in JSON", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: '{"status":"continue","next":"step2"}' },
          { exitCode: 0, text: '{"status":"done","summary":"Task completed"}' },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Start task",
        backend: "copilot",
        completionMode: "json",
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(2);
      expect(result.summary).toBe("Task completed");
    });

    it("should use next prompt from JSON response", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: '{"status":"continue","next":"Do step 2"}' },
          { exitCode: 0, text: '{"status":"done"}' },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({
        prompt: "Start",
        backend: "copilot",
        completionMode: "json",
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledTimes(2);
      expect(mockAdapter.runOnce).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ prompt: "Do step 2" }),
      );
    });

    it("should return invalid-json error when no valid JSON found", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "This is not JSON at all" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "json",
      });

      expect(result.exitCode).toBe(65);
      expect(result.status).toBe("invalid-json");
    });
  });

  describe("runLoop - garde-fous", () => {
    it("should stop at maxIterations with exit code 4", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Working 1" },
          { exitCode: 0, text: "Working 2" },
          { exitCode: 0, text: "Working 3" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 3,
      });

      expect(result.exitCode).toBe(4);
      expect(result.status).toBe("max-iterations");
      expect(result.iterations).toBe(3);
    });

    it("should stop on timeout with exit code 75", async () => {
      // Simuler un backend lent
      const mockAdapter: Adapter = {
        id: "copilot",
        isAvailable: vi.fn().mockResolvedValue({ status: "available" }),
        runOnce: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { exitCode: 0, text: "Still working" };
        }),
      };
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 100,
        timeoutMs: 50, // Timeout très court
      });

      expect(result.exitCode).toBe(75);
      expect(result.status).toBe("timeout");
    });
  });

  describe("runLoop - erreurs backend", () => {
    it("should return exit 64 for unknown backend", async () => {
      vi.mocked(tryGetAdapterById).mockReturnValue(null);

      const result = await runLoop({
        prompt: "Task",
        backend: "unknown",
      });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unknown");
    });

    it("should return exit 2 for missing backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "missing",
        details: "Commande introuvable: copilot",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({ prompt: "Task", backend: "copilot" });

      expect(result.exitCode).toBe(2);
      expect(result.status).toBe("backend-missing");
    });

    it("should return exit 6 for unauthenticated backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "unauthenticated",
        details: "Login required",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({ prompt: "Task", backend: "copilot" });

      expect(result.exitCode).toBe(6);
      expect(result.status).toBe("backend-unauthenticated");
    });

    it("should propagate backend error exit code", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 1, text: "Backend error occurred" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(1);
      expect(result.status).toBe("error");
    });
  });

  describe("runLoop - transcript", () => {
    it("should record all iterations in transcript", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Response 1" },
          { exitCode: 0, text: "Response 2\nDONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Initial prompt",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.transcript).toHaveLength(2);
      expect(result.transcript[0].iteration).toBe(1);
      expect(result.transcript[0].prompt).toBe("Initial prompt");
      expect(result.transcript[0].response).toBe("Response 1");
      expect(result.transcript[1].iteration).toBe(2);
    });

    it("should call onIteration callback for each iteration", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Step 1" },
          { exitCode: 0, text: "DONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const onIteration = vi.fn();

      await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        onIteration,
      });

      expect(onIteration).toHaveBeenCalledTimes(2);
      expect(onIteration).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ iteration: 1 }),
      );
    });
  });

  describe("runLoop - options passthrough", () => {
    it("should pass cwd to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "DONE" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({
        prompt: "Task",
        backend: "copilot",
        cwd: "/custom/path",
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: "/custom/path" }),
      );
    });

    it("should pass env to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "DONE" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({
        prompt: "Task",
        backend: "copilot",
        env: { MY_VAR: "value" },
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ env: { MY_VAR: "value" } }),
      );
    });
  });
});
```

**Validation** : `npm test -- runner-loop`

## Contraintes

- **Exit codes** : Respecter strictement le mapping de [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md)
  - `0` = succès (done)
  - `4` = max-iterations
  - `75` = timeout
  - `65` = invalid-json (mode json uniquement)
- **Timeout** : Le timeout est **global** (cumul de toutes les itérations), pas par itération
- **Transcript** : Enregistrer chaque échange prompt/réponse pour traçabilité
- **Pas de shell** : Utiliser `execa` sans `shell: true` via les adapters
- **Pure function** : `runLoop` ne doit pas avoir d'effets de bord (pas d'écriture fichier)

## Definition of Done

- [ ] Code conforme aux guidelines (`strict: true`, pas de `any`)
- [ ] Tests passent (`npm test -- runner-loop`)
- [ ] Tous les tests de `npm test` passent
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] `runLoop` exporté depuis `project/src/runner/index.ts`
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture runner, RUN model
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Patterns, Result object
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie tests, couverture
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
- [project/src/runner/run.ts](project/src/runner/run.ts) — Référence runOnce existant
- [project/src/completion/index.ts](project/src/completion/index.ts) — Parser de complétion
