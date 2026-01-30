---
agent: agent
description: Implémenter l'écriture des artifacts (--artifacts) avec meta.json, transcript.ndjson, result.json
---

# id061 — Implémenter l'écriture des artifacts (--artifacts)

## Objectif

Créer le module `artifacts/writer.ts` qui persiste les traces d'exécution dans un dossier `.jlgcli/runs/<id>/` contenant :

- `meta.json` : métadonnées du run (id, backend, démarrage, options)
- `transcript.ndjson` : événements streamés (NDJSON)
- `result.json` : résultat final avec redaction best-effort

## Contexte

Le système de persistance des artifacts est **opt-in** via l'option `--artifacts`. Quand activé, toute erreur d'écriture **fait échouer le run** (exit code 73 — `EX_CANTCREAT`).

- Réf : [clarifications/005-artifacts-et-redaction.md](clarifications/005-artifacts-et-redaction.md) — Format NDJSON + redaction best-effort
- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture (Artifacts Writer)
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Gestion des erreurs, exit code 73
- Dépendances : `id050` (runner loop avec transcript)

## Pré-requis

- [x] Tâche dépendante complétée : `id050`
- [x] Runner loop retourne `LoopResult` avec `transcript: TranscriptEntry[]`

## Fichiers impactés

| Fichier                                | Action | Description                                  |
| -------------------------------------- | ------ | -------------------------------------------- |
| `project/src/artifacts/writer.ts`      | Créer  | Module principal d'écriture des artifacts    |
| `project/src/artifacts/redact.ts`      | Créer  | Fonction de redaction best-effort            |
| `project/src/artifacts/types.ts`       | Créer  | Types pour meta.json et événements           |
| `project/src/artifacts/index.ts`       | Créer  | Exports publics du module                    |
| `project/tests/unit/artifacts.test.ts` | Créer  | Tests unitaires du writer et de la redaction |

## Critères d'acceptation

- [ ] Génération d'ID de run au format `YYYYMMDD-HHMMSS-<rand4>` (ex: `20260130-143025-a1b2`)
- [ ] Création du dossier `.jlgcli/runs/<id>/` dans le cwd
- [ ] Écriture de `meta.json` avec : `{ id, backend, startedAt, options }`
- [ ] Écriture de `transcript.ndjson` : une ligne JSON par entrée du transcript
- [ ] Écriture de `result.json` avec le résultat final (redacté)
- [ ] Redaction best-effort appliquée : tokens Bearer, clés API (`sk-...`), JWT, `*_TOKEN`, `*_API_KEY`
- [ ] Warning loggé (stderr) quand une redaction est appliquée
- [ ] Erreur d'écriture → exit code 73 (`EX_CANTCREAT`)
- [ ] Tests unitaires passent

## Tests requis

**Unitaires** : `project/tests/unit/artifacts.test.ts`

- `generateRunId()` génère un ID au bon format
- `writeArtifacts()` crée les 3 fichiers attendus
- `redactSecrets()` masque les patterns sensibles
- `redactSecrets()` ne modifie pas les textes sans secrets
- Erreur d'écriture retourne le bon exit code

## Instructions

### Étape 1 : Créer les types artifacts

**Fichier** : `project/src/artifacts/types.ts`

```typescript
/**
 * Types pour le module artifacts
 */

/**
 * Métadonnées d'un run (meta.json)
 */
export interface RunMeta {
  /** Identifiant unique du run (YYYYMMDD-HHMMSS-rand) */
  id: string;
  /** Backend utilisé */
  backend: string;
  /** Timestamp ISO de démarrage */
  startedAt: string;
  /** Timestamp ISO de fin */
  finishedAt: string;
  /** Options de la commande */
  options: RunMetaOptions;
}

/**
 * Options capturées dans les métadonnées
 */
export interface RunMetaOptions {
  /** Commande exécutée (run ou loop) */
  command: "run" | "loop";
  /** Prompt initial (redacté) */
  prompt: string;
  /** Limite d'itérations (loop uniquement) */
  maxIterations?: number;
  /** Timeout en ms */
  timeoutMs?: number;
  /** Mode de complétion */
  completionMode?: string;
}

/**
 * Entrée dans le transcript NDJSON
 */
export interface TranscriptEvent {
  /** Timestamp ISO */
  ts: string;
  /** Type d'événement */
  type: "iteration" | "prompt" | "response";
  /** Numéro d'itération */
  iteration: number;
  /** Contenu (redacté) */
  content: string;
  /** Durée en ms (pour type=iteration) */
  durationMs?: number;
}

/**
 * Résultat d'écriture des artifacts
 */
export interface WriteArtifactsResult {
  /** Succès de l'écriture */
  ok: boolean;
  /** Chemin du dossier créé */
  path?: string;
  /** Code d'erreur si échec */
  errorCode?: number;
  /** Message d'erreur si échec */
  errorMessage?: string;
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Implémenter la redaction

**Fichier** : `project/src/artifacts/redact.ts`

```typescript
/**
 * Module de redaction best-effort des secrets
 * Protège contre les fuites de tokens, clés API, etc.
 */

// Patterns de secrets à redacter
const SECRET_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi, name: "Bearer token" },
  // OpenAI/Anthropic style API keys
  { pattern: /sk-[A-Za-z0-9]{20,}/g, name: "API key (sk-...)" },
  // JWT tokens (xxx.yyy.zzz)
  {
    pattern: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+/g,
    name: "JWT token",
  },
  // AWS secrets
  {
    pattern: /AWS_SECRET_ACCESS_KEY[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
    name: "AWS secret",
  },
  // Generic env var patterns
  { pattern: /[A-Z_]+_TOKEN[=:]\s*["']?[^\s"']+["']?/g, name: "Token env var" },
  {
    pattern: /[A-Z_]+_API_KEY[=:]\s*["']?[^\s"']+["']?/g,
    name: "API key env var",
  },
  // GitHub tokens
  { pattern: /gh[pousr]_[A-Za-z0-9]{36,}/g, name: "GitHub token" },
];

/** Placeholder pour les valeurs redactées */
const REDACTED = "[REDACTED]";

/** Callback pour signaler une redaction */
export type RedactionCallback = (patternName: string) => void;

/**
 * Applique une redaction best-effort sur un texte
 * @param text Texte à redacter
 * @param onRedact Callback optionnel appelé pour chaque redaction
 * @returns Texte avec les secrets masqués
 */
export function redactSecrets(
  text: string,
  onRedact?: RedactionCallback,
): string {
  let result = text;

  for (const { pattern, name } of SECRET_PATTERNS) {
    // Reset lastIndex pour les patterns avec flag 'g'
    pattern.lastIndex = 0;

    if (pattern.test(result)) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, REDACTED);
      onRedact?.(name);
    }
  }

  return result;
}

/**
 * Redacte un objet en profondeur (pour JSON)
 * @param obj Objet à redacter
 * @param onRedact Callback optionnel
 * @returns Copie de l'objet avec valeurs redactées
 */
export function redactObject<T>(obj: T, onRedact?: RedactionCallback): T {
  if (typeof obj === "string") {
    return redactSecrets(obj, onRedact) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, onRedact)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = redactObject(value, onRedact);
    }
    return result as T;
  }

  return obj;
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Implémenter le writer

**Fichier** : `project/src/artifacts/writer.ts`

```typescript
/**
 * Module d'écriture des artifacts
 * Persiste les traces d'exécution dans .jlgcli/runs/<id>/
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  LoopResult,
  RunResult,
  TranscriptEntry,
} from "../runner/types.js";
import type {
  RunMeta,
  RunMetaOptions,
  TranscriptEvent,
  WriteArtifactsResult,
} from "./types.js";
import { redactObject, redactSecrets } from "./redact.js";

/** Exit code pour erreur d'écriture (EX_CANTCREAT) */
export const EXIT_ARTIFACTS_WRITE = 73;

/**
 * Génère un ID de run unique
 * Format: YYYYMMDD-HHMMSS-<rand4>
 */
export function generateRunId(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const rand = Math.random().toString(36).substring(2, 6);

  return `${year}${month}${day}-${hours}${minutes}${seconds}-${rand}`;
}

/**
 * Construit le chemin du dossier artifacts
 * @param cwd Répertoire de travail
 * @param runId ID du run
 */
export function getArtifactsPath(cwd: string, runId: string): string {
  return join(cwd, ".jlgcli", "runs", runId);
}

/**
 * Convertit le transcript en événements NDJSON
 */
function transcriptToEvents(transcript: TranscriptEntry[]): TranscriptEvent[] {
  const events: TranscriptEvent[] = [];

  for (const entry of transcript) {
    // Événement prompt
    events.push({
      ts: entry.startedAt,
      type: "prompt",
      iteration: entry.iteration,
      content: entry.prompt,
    });

    // Événement response
    const responseTs = new Date(
      new Date(entry.startedAt).getTime() + entry.durationMs,
    ).toISOString();

    events.push({
      ts: responseTs,
      type: "response",
      iteration: entry.iteration,
      content: entry.response,
      durationMs: entry.durationMs,
    });
  }

  return events;
}

/**
 * Écrit les artifacts d'un run sur disque
 * @param result Résultat du run (RunResult ou LoopResult)
 * @param options Options additionnelles
 */
export async function writeArtifacts(
  result: RunResult | LoopResult,
  options: {
    cwd: string;
    command: "run" | "loop";
    prompt: string;
    maxIterations?: number;
    timeoutMs?: number;
    completionMode?: string;
    startedAt: string;
    onRedact?: (patternName: string) => void;
  },
): Promise<WriteArtifactsResult> {
  const runId = generateRunId();
  const artifactsPath = getArtifactsPath(options.cwd, runId);

  try {
    // Créer le dossier
    await mkdir(artifactsPath, { recursive: true });

    // Préparer meta.json
    const metaOptions: RunMetaOptions = {
      command: options.command,
      prompt: redactSecrets(options.prompt, options.onRedact),
    };

    if (options.command === "loop") {
      if (options.maxIterations !== undefined) {
        metaOptions.maxIterations = options.maxIterations;
      }
      if (options.completionMode !== undefined) {
        metaOptions.completionMode = options.completionMode;
      }
    }

    if (options.timeoutMs !== undefined) {
      metaOptions.timeoutMs = options.timeoutMs;
    }

    const meta: RunMeta = {
      id: runId,
      backend: result.backend,
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      options: metaOptions,
    };

    // Écrire meta.json
    await writeFile(
      join(artifactsPath, "meta.json"),
      JSON.stringify(meta, null, 2) + "\n",
      "utf-8",
    );

    // Préparer et écrire transcript.ndjson
    const transcript = "transcript" in result ? result.transcript : [];
    const events = transcriptToEvents(transcript);
    const redactedEvents = events.map((event) =>
      redactObject(event, options.onRedact),
    );

    const ndjsonContent =
      redactedEvents.map((event) => JSON.stringify(event)).join("\n") +
      (redactedEvents.length > 0 ? "\n" : "");

    await writeFile(
      join(artifactsPath, "transcript.ndjson"),
      ndjsonContent,
      "utf-8",
    );

    // Préparer et écrire result.json
    const redactedResult = redactObject(result, options.onRedact);

    await writeFile(
      join(artifactsPath, "result.json"),
      JSON.stringify(redactedResult, null, 2) + "\n",
      "utf-8",
    );

    return {
      ok: true,
      path: artifactsPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      errorCode: EXIT_ARTIFACTS_WRITE,
      errorMessage: `Échec d'écriture des artifacts: ${message}`,
    };
  }
}
```

**Validation** : `npx tsc --noEmit`

### Étape 4 : Créer le barrel export

**Fichier** : `project/src/artifacts/index.ts`

```typescript
/**
 * Module artifacts - exports publics
 */

export {
  generateRunId,
  getArtifactsPath,
  writeArtifacts,
  EXIT_ARTIFACTS_WRITE,
} from "./writer.js";
export { redactSecrets, redactObject } from "./redact.js";
export type {
  RunMeta,
  RunMetaOptions,
  TranscriptEvent,
  WriteArtifactsResult,
} from "./types.js";
```

**Validation** : `npx tsc --noEmit`

### Étape 5 : Créer les tests unitaires

**Fichier** : `project/tests/unit/artifacts.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  generateRunId,
  getArtifactsPath,
  writeArtifacts,
  EXIT_ARTIFACTS_WRITE,
  redactSecrets,
  redactObject,
} from "../../src/artifacts/index.js";
import type { LoopResult, TranscriptEntry } from "../../src/runner/types.js";

describe("generateRunId", () => {
  it("génère un ID au format YYYYMMDD-HHMMSS-xxxx", () => {
    const id = generateRunId();

    // Format: 20260130-143025-a1b2
    expect(id).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
  });

  it("génère des IDs uniques", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRunId());
    }
    // Avec le random, on devrait avoir des IDs uniques
    expect(ids.size).toBeGreaterThan(90);
  });
});

describe("getArtifactsPath", () => {
  it("construit le chemin correct", () => {
    const path = getArtifactsPath("/home/user/project", "20260130-143025-a1b2");

    expect(path).toBe(
      join("/home/user/project", ".jlgcli", "runs", "20260130-143025-a1b2"),
    );
  });
});

describe("redactSecrets", () => {
  it("redacte les Bearer tokens", () => {
    const text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const result = redactSecrets(text);

    expect(result).toBe("Authorization: [REDACTED]");
    expect(result).not.toContain("eyJ");
  });

  it("redacte les clés API sk-", () => {
    const text = "API key: sk-abc123def456ghi789jkl012mno345pqr678";
    const result = redactSecrets(text);

    expect(result).toBe("API key: [REDACTED]");
  });

  it("redacte les tokens JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const text = `Token: ${jwt}`;
    const result = redactSecrets(text);

    expect(result).toBe("Token: [REDACTED]");
  });

  it("redacte les variables *_TOKEN", () => {
    const text = "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const result = redactSecrets(text);

    expect(result).toContain("[REDACTED]");
  });

  it("redacte les variables *_API_KEY", () => {
    const text = "OPENAI_API_KEY: sk-proj-abc123";
    const result = redactSecrets(text);

    expect(result).toContain("[REDACTED]");
  });

  it("ne modifie pas les textes sans secrets", () => {
    const text = "Hello world, this is a normal message.";
    const result = redactSecrets(text);

    expect(result).toBe(text);
  });

  it("appelle le callback pour chaque redaction", () => {
    const callback = vi.fn();
    const text = "Bearer token123 and sk-abcdef12345678901234";

    redactSecrets(text, callback);

    expect(callback).toHaveBeenCalled();
  });
});

describe("redactObject", () => {
  it("redacte les valeurs string dans un objet", () => {
    const obj = {
      name: "test",
      secret: "Bearer mytoken123",
    };

    const result = redactObject(obj);

    expect(result.name).toBe("test");
    expect(result.secret).toBe("[REDACTED]");
  });

  it("redacte en profondeur dans les objets imbriqués", () => {
    const obj = {
      level1: {
        level2: {
          token: "sk-verysecretkey12345678901234567890",
        },
      },
    };

    const result = redactObject(obj);

    expect(result.level1.level2.token).toBe("[REDACTED]");
  });

  it("redacte les éléments de tableaux", () => {
    const arr = ["normal", "Bearer secret123", "also normal"];

    const result = redactObject(arr);

    expect(result[0]).toBe("normal");
    expect(result[1]).toBe("[REDACTED]");
    expect(result[2]).toBe("also normal");
  });
});

describe("writeArtifacts", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `jlgcli-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("crée les 3 fichiers attendus", async () => {
    const result: LoopResult = {
      exitCode: 0,
      text: "Done",
      backend: "copilot",
      status: "done",
      iterations: 1,
      durationMs: 1000,
      transcript: [
        {
          iteration: 1,
          startedAt: "2026-01-30T14:30:00.000Z",
          prompt: "Hello",
          response: "World",
          durationMs: 500,
        },
      ],
    };

    const writeResult = await writeArtifacts(result, {
      cwd: tempDir,
      command: "loop",
      prompt: "Hello",
      startedAt: "2026-01-30T14:30:00.000Z",
    });

    expect(writeResult.ok).toBe(true);
    expect(writeResult.path).toBeDefined();

    const artifactsPath = writeResult.path!;
    expect(existsSync(join(artifactsPath, "meta.json"))).toBe(true);
    expect(existsSync(join(artifactsPath, "transcript.ndjson"))).toBe(true);
    expect(existsSync(join(artifactsPath, "result.json"))).toBe(true);
  });

  it("retourne erreur avec code 73 si écriture impossible", async () => {
    const result: LoopResult = {
      exitCode: 0,
      text: "Done",
      backend: "copilot",
      status: "done",
      iterations: 0,
      durationMs: 100,
      transcript: [],
    };

    // Chemin invalide (caractères interdits sur Windows)
    const writeResult = await writeArtifacts(result, {
      cwd: "/nonexistent/path/that/cannot/exist",
      command: "loop",
      prompt: "test",
      startedAt: new Date().toISOString(),
    });

    expect(writeResult.ok).toBe(false);
    expect(writeResult.errorCode).toBe(EXIT_ARTIFACTS_WRITE);
    expect(writeResult.errorMessage).toContain("Échec d'écriture");
  });

  it("applique la redaction dans les fichiers", async () => {
    const result: LoopResult = {
      exitCode: 0,
      text: "Token: Bearer secret123",
      backend: "copilot",
      status: "done",
      iterations: 1,
      durationMs: 1000,
      transcript: [
        {
          iteration: 1,
          startedAt: "2026-01-30T14:30:00.000Z",
          prompt: "Use sk-myapikey12345678901234567890123456",
          response: "Done",
          durationMs: 500,
        },
      ],
    };

    const redactCallback = vi.fn();

    const writeResult = await writeArtifacts(result, {
      cwd: tempDir,
      command: "loop",
      prompt: "sk-myapikey12345678901234567890123456",
      startedAt: "2026-01-30T14:30:00.000Z",
      onRedact: redactCallback,
    });

    expect(writeResult.ok).toBe(true);
    expect(redactCallback).toHaveBeenCalled();
  });
});
```

**Validation** : `npm test -- artifacts`

## Contraintes

- **Exit code 73** (`EX_CANTCREAT`) : obligatoire si `--artifacts` activé et écriture échoue
- **Redaction best-effort** : patterns minimaux (Bearer, sk-, JWT, _\_TOKEN, _\_API_KEY)
- **NDJSON** : une ligne JSON par événement, pas de tableau englobant
- **Logs stderr** : warning quand redaction appliquée (via callback)
- **Pas de shell: true** : utiliser les API fs natives Node.js
- **Encoding UTF-8** : explicite sur tous les writeFile

## Definition of Done

- [ ] Code conforme aux guidelines (TypeScript strict, ESM)
- [ ] Les 3 fichiers sont créés dans `.jlgcli/runs/<id>/`
- [ ] Format NDJSON respecté pour transcript
- [ ] Redaction fonctionne sur les patterns documentés
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/005-artifacts-et-redaction.md](clarifications/005-artifacts-et-redaction.md) — Format et redaction
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions et erreurs
- [project/src/runner/types.ts](project/src/runner/types.ts) — Types LoopResult, TranscriptEntry
