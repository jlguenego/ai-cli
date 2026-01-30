---
agent: agent
description: Implémenter le Runner pour exécution one-shot d'un prompt sur un backend
---

# id030 — Implémenter le Runner pour exécution one-shot

## Objectif

Créer le module `Runner` permettant d'exécuter un prompt sur un backend IA sélectionné, récupérer la sortie streamée et retourner un résultat normalisé. Ce module sera utilisé par la commande `jlgcli run <prompt>` (id031).

## Contexte

Le CLI `jlgcli` orchestre des agents IA externes via des adaptateurs. Le Runner est le composant central qui :

1. Résout le backend à utiliser (config ou argument explicite)
2. Vérifie la disponibilité du backend
3. Exécute le prompt via l'adaptateur
4. Retourne un résultat normalisé avec code de sortie approprié

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture Runner
- Réf : [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — F-003 Exécution one-shot
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Patterns et conventions
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
- Dépendances : `id023` (registre d'adaptateurs)

## Pré-requis

- [x] Tâche `id023` complétée (registre d'adaptateurs avec `getAdapterById`, `tryGetAdapterById`)
- [x] Interface `Adapter` définie dans `project/src/adapters/types.ts`
- [x] Configuration chargeable via `project/src/config/loader.ts`

## Fichiers impactés

| Fichier                             | Action | Description                             |
| ----------------------------------- | ------ | --------------------------------------- |
| `project/src/runner/run.ts`         | Créer  | Module Runner pour exécution one-shot   |
| `project/src/runner/types.ts`       | Créer  | Types du Runner (RunOptions, RunResult) |
| `project/src/runner/index.ts`       | Créer  | Export public du module runner          |
| `project/tests/unit/runner.test.ts` | Créer  | Tests unitaires du Runner               |

## Critères d'acceptation

- [ ] La fonction `runOnce` accepte un prompt et des options (backend, cwd, timeoutMs)
- [ ] Le backend est résolu via config si non spécifié explicitement
- [ ] Un backend inexistant retourne `exitCode: 64` (EX_USAGE)
- [ ] Un backend `missing` retourne `exitCode: 2`
- [ ] Un backend `unauthenticated` retourne `exitCode: 6`
- [ ] Un backend `unsupported` retourne `exitCode: 64`
- [ ] Le résultat inclut : `exitCode`, `text`, `backend`, `durationMs`, `status`
- [ ] Les tests unitaires passent avec un adaptateur mocké
- [ ] Aucune erreur TypeScript (`npx tsc --noEmit`)
- [ ] Aucune erreur lint (`npm run lint`)

## Tests requis

**Unitaires** : `project/tests/unit/runner.test.ts`

| Cas de test                                        | Description                           |
| -------------------------------------------------- | ------------------------------------- |
| `should execute prompt on available backend`       | Backend disponible, exécution réussie |
| `should use configured backend when not specified` | Résolution depuis config              |
| `should return exit 64 for unknown backend id`     | ID invalide passé                     |
| `should return exit 2 for missing backend`         | Backend non installé                  |
| `should return exit 6 for unauthenticated backend` | Backend non authentifié               |
| `should return exit 64 for unsupported backend`    | Backend hors MVP (claude)             |
| `should include duration in result`                | Mesure du temps d'exécution           |
| `should pass timeout to adapter`                   | Propagation du timeoutMs              |

## Instructions

### Étape 1 : Créer les types du Runner

**Fichier** : `project/src/runner/types.ts`

```typescript
import type {
  AdapterId,
  AdapterAvailabilityStatus,
} from "../adapters/types.js";

/**
 * Statut final d'une exécution
 */
export type RunStatus =
  | "success"
  | "backend-missing"
  | "backend-unauthenticated"
  | "backend-unsupported"
  | "backend-unknown"
  | "error";

/**
 * Options pour l'exécution one-shot
 */
export interface RunOptions {
  /** Le prompt à exécuter */
  prompt: string;
  /** ID du backend à utiliser (optionnel, résolu depuis config sinon) */
  backend?: string;
  /** Répertoire de travail (défaut: process.cwd()) */
  cwd?: string;
  /** Variables d'environnement additionnelles */
  env?: Record<string, string | undefined>;
  /** Timeout en millisecondes */
  timeoutMs?: number;
}

/**
 * Résultat d'une exécution one-shot
 */
export interface RunResult {
  /** Code de sortie (0 = succès) */
  exitCode: number;
  /** Texte de sortie du backend */
  text: string;
  /** ID du backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: RunStatus;
  /** Durée d'exécution en millisecondes */
  durationMs: number;
  /** Détails additionnels en cas d'erreur */
  details?: string;
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Implémenter le Runner

**Fichier** : `project/src/runner/run.ts`

```typescript
import { tryGetAdapterById, getAdapterById } from "../adapters/registry.js";
import { loadConfig } from "../config/loader.js";
import type { AdapterId } from "../adapters/types.js";
import type { RunOptions, RunResult, RunStatus } from "./types.js";

// Exit codes conformes à clarifications/003
const EXIT_SUCCESS = 0;
const EXIT_BACKEND_MISSING = 2;
const EXIT_BACKEND_UNAUTHENTICATED = 6;
const EXIT_USAGE = 64; // EX_USAGE - backend inconnu ou unsupported

/**
 * Résout l'ID du backend à utiliser
 * Priorité : option explicite > config > défaut (copilot)
 */
async function resolveBackendId(explicitBackend?: string): Promise<string> {
  if (explicitBackend) {
    return explicitBackend;
  }

  const config = await loadConfig();
  return config.backend ?? "copilot";
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
 * Mappe le statut d'availability vers un RunStatus
 */
function runStatusForAvailability(
  status: "missing" | "unauthenticated" | "unsupported",
): RunStatus {
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
 * Exécute un prompt sur un backend (one-shot)
 */
export async function runOnce(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();
  const backendId = await resolveBackendId(options.backend);
  const cwd = options.cwd ?? process.cwd();

  // Vérifier si le backend existe
  const adapter = tryGetAdapterById(backendId);

  if (!adapter) {
    return {
      exitCode: EXIT_USAGE,
      text: `Backend inconnu: ${backendId}`,
      backend: backendId,
      status: "backend-unknown",
      durationMs: Date.now() - startTime,
      details: `Les backends supportés sont: copilot, codex, claude`,
    };
  }

  // Vérifier la disponibilité du backend
  const availability = await adapter.isAvailable();

  if (availability.status !== "available") {
    return {
      exitCode: exitCodeForAvailability(availability.status),
      text: availability.details ?? `Backend ${backendId} non disponible`,
      backend: backendId,
      status: runStatusForAvailability(availability.status),
      durationMs: Date.now() - startTime,
      details: availability.details,
    };
  }

  // Exécuter le prompt
  const result = await adapter.runOnce({
    prompt: options.prompt,
    cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
  });

  return {
    exitCode: result.exitCode,
    text: result.text,
    backend: backendId,
    status: result.exitCode === 0 ? "success" : "error",
    durationMs: Date.now() - startTime,
  };
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer l'export public

**Fichier** : `project/src/runner/index.ts`

```typescript
export { runOnce } from "./run.js";
export type { RunOptions, RunResult, RunStatus } from "./types.js";
```

**Validation** : `npx tsc --noEmit`

### Étape 4 : Écrire les tests unitaires

**Fichier** : `project/tests/unit/runner.test.ts`

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
  getAdapterById: vi.fn(),
}));

vi.mock("../../src/config/loader.js", () => ({
  loadConfig: vi.fn(),
}));

import { runOnce } from "../../src/runner/run.js";
import { tryGetAdapterById } from "../../src/adapters/registry.js";
import { loadConfig } from "../../src/config/loader.js";

function createMockAdapter(
  id: string,
  availability: AdapterAvailability,
  runResult?: AdapterRunOnceResult,
): Adapter {
  return {
    id: id as "copilot" | "codex" | "claude",
    isAvailable: vi.fn().mockResolvedValue(availability),
    runOnce: vi
      .fn()
      .mockResolvedValue(runResult ?? { exitCode: 0, text: "ok" }),
  };
}

describe("Runner", () => {
  beforeEach(() => {
    vi.mocked(loadConfig).mockResolvedValue({ backend: "copilot" });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("runOnce", () => {
    it("should execute prompt on available backend", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "Response from AI" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(0);
      expect(result.text).toBe("Response from AI");
      expect(result.backend).toBe("copilot");
      expect(result.status).toBe("success");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should use configured backend when not specified", async () => {
      vi.mocked(loadConfig).mockResolvedValue({ backend: "codex" });
      const mockAdapter = createMockAdapter(
        "codex",
        { status: "available" },
        { exitCode: 0, text: "Codex response" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello" });

      expect(vi.mocked(tryGetAdapterById)).toHaveBeenCalledWith("codex");
      expect(result.backend).toBe("codex");
    });

    it("should default to copilot when no backend configured", async () => {
      vi.mocked(loadConfig).mockResolvedValue({});
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello" });

      expect(vi.mocked(tryGetAdapterById)).toHaveBeenCalledWith("copilot");
    });

    it("should return exit 64 for unknown backend id", async () => {
      vi.mocked(tryGetAdapterById).mockReturnValue(null);

      const result = await runOnce({ prompt: "Hello", backend: "unknown" });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unknown");
      expect(result.backend).toBe("unknown");
    });

    it("should return exit 2 for missing backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "missing",
        details: "Commande introuvable: copilot",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(2);
      expect(result.status).toBe("backend-missing");
    });

    it("should return exit 6 for unauthenticated backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "unauthenticated",
        details: "Login required",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(6);
      expect(result.status).toBe("backend-unauthenticated");
    });

    it("should return exit 64 for unsupported backend", async () => {
      const mockAdapter = createMockAdapter("claude", {
        status: "unsupported",
        details: "Backend claude hors MVP",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "claude" });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unsupported");
    });

    it("should include duration in result", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should pass timeout to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runOnce({ prompt: "Hello", backend: "copilot", timeoutMs: 5000 });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 5000 }),
      );
    });

    it("should pass cwd to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runOnce({
        prompt: "Hello",
        backend: "copilot",
        cwd: "/custom/path",
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: "/custom/path" }),
      );
    });

    it("should return error status when adapter returns non-zero exit code", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 1, text: "Something went wrong" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(1);
      expect(result.status).toBe("error");
    });
  });
});
```

**Validation** : `npm test -- runner.test.ts`

## Contraintes

- **Pas de shell: true** : les appels process passent par les adaptateurs qui utilisent `execa` sans shell
- **Logs sur stderr** : ne pas polluer stdout (réservé aux résultats)
- **Types stricts** : pas de `any`, utiliser les types définis
- **Pure functions** : les fonctions helpers (`exitCodeForAvailability`, etc.) doivent être pures
- **Séparation CLI/Core** : le Runner ne fait pas de console.log, il retourne un résultat structuré

## Definition of Done

- [ ] Fichier `project/src/runner/types.ts` créé avec les types
- [ ] Fichier `project/src/runner/run.ts` créé avec `runOnce`
- [ ] Fichier `project/src/runner/index.ts` créé avec exports
- [ ] Fichier `project/tests/unit/runner.test.ts` créé
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur TypeScript (`npx tsc --noEmit`)
- [ ] Aucune erreur lint (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture et contrats
- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — F-003 Exécution one-shot
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
- [project/src/adapters/types.ts](project/src/adapters/types.ts) — Interface Adapter
- [project/src/adapters/registry.ts](project/src/adapters/registry.ts) — Registre d'adaptateurs
