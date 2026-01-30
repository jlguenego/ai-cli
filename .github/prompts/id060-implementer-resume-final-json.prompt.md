---
agent: agent
description: Implémenter le résumé final (humain + --json) pour les commandes run et loop
---

# id060 — Implémenter le résumé final (humain + --json)

## Objectif

Créer un module de formatage de résumé (`output/summary.ts`) qui produit un résumé clair en fin d'exécution des commandes `run` et `loop`, avec deux modes :

1. **Mode humain** (par défaut) : affichage lisible sur stderr avec backend, durée, itérations, statut
2. **Mode JSON** (`--json`) : objet JSON stable sur stdout, exploitable en CI/scripts

## Contexte

Selon F-005 des spécifications fonctionnelles, à la fin d'un `run` ou `loop`, le CLI doit produire un résumé indiquant clairement la cause d'arrêt et les métriques d'exécution. Le flag `--json` doit produire un format stable et parseable.

- Réf : [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — F-005 Résumé final
- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Exigences non-fonctionnelles (observabilité)
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code, logging stderr
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes standards
- Dépendance : `id031` ✅ — Commande `run` implémentée

## Pré-requis

- [x] Tâche dépendante complétée : `id031` (Commande `jlgcli run`)
- [x] Types `RunResult` et `LoopResult` définis dans `project/src/runner/types.ts`
- [x] Commandes `run` et `loop` fonctionnelles

## Fichiers impactés

| Fichier                                   | Action   | Description                       |
| ----------------------------------------- | -------- | --------------------------------- |
| `project/src/output/summary.ts`           | Créer    | Module de formatage des résumés   |
| `project/src/output/types.ts`             | Créer    | Types pour le résumé JSON         |
| `project/src/output/index.ts`             | Créer    | Export du module output           |
| `project/src/commands/run.ts`             | Modifier | Ajouter option `--json` + résumé  |
| `project/src/commands/loop.ts`            | Modifier | Ajouter option `--json` + résumé  |
| `project/tests/unit/summary.test.ts`      | Créer    | Tests unitaires du module summary |
| `project/tests/unit/run-command.test.ts`  | Modifier | Tests pour l'option `--json`      |
| `project/tests/unit/loop-command.test.ts` | Modifier | Tests pour l'option `--json`      |

## Critères d'acceptation

- [ ] `jlgcli run prompt.txt` affiche un résumé humain sur stderr après exécution
- [ ] `jlgcli run prompt.txt --json` affiche uniquement le JSON sur stdout (pas de résumé humain)
- [ ] `jlgcli loop prompt.txt` affiche un résumé humain incluant le nombre d'itérations
- [ ] `jlgcli loop prompt.txt --json` affiche le JSON avec les métriques d'itérations
- [ ] Le résumé humain indique : backend, durée, statut (et itérations pour loop)
- [ ] Le JSON contient les champs : `backend`, `status`, `durationMs`, `exitCode`, `text`, et pour loop : `iterations`, `summary`
- [ ] Le format JSON est stable (même structure quels que soient les résultats)
- [ ] Tests unitaires couvrent les deux modes pour `run` et `loop`

## Tests requis

**Unitaires** : `project/tests/unit/summary.test.ts`

- `formatHumanSummary()` pour `RunResult` — affiche backend, durée, statut
- `formatHumanSummary()` pour `LoopResult` — affiche backend, durée, statut, itérations
- `formatJsonSummary()` pour `RunResult` — JSON valide avec tous les champs requis
- `formatJsonSummary()` pour `LoopResult` — JSON valide avec itérations et summary
- Durée formatée en format humain (ex: "1.2s", "2m 15s")
- Statut traduit en message humain clair

**Unitaires** : `project/tests/unit/run-command.test.ts` (ajouts)

- Option `--json` reconnue et transmise au handler
- Mode JSON : uniquement JSON sur stdout, pas de résumé humain

**Unitaires** : `project/tests/unit/loop-command.test.ts` (ajouts)

- Option `--json` reconnue et transmise au handler
- Mode JSON : uniquement JSON sur stdout, pas de résumé humain

## Instructions

### Étape 1 : Créer les types pour le résumé JSON

**Fichier** : `project/src/output/types.ts`

```typescript
/**
 * Types pour le module de résumé de sortie
 */

/**
 * Résumé JSON pour une exécution one-shot (run)
 */
export interface RunJsonSummary {
  /** Backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: string;
  /** Code de sortie */
  exitCode: number;
  /** Durée en millisecondes */
  durationMs: number;
  /** Texte de sortie du backend */
  text: string;
  /** Détails additionnels (erreurs) */
  details?: string;
}

/**
 * Résumé JSON pour une exécution itérative (loop)
 */
export interface LoopJsonSummary {
  /** Backend utilisé */
  backend: string;
  /** Statut de l'exécution */
  status: string;
  /** Code de sortie */
  exitCode: number;
  /** Durée totale en millisecondes */
  durationMs: number;
  /** Nombre d'itérations effectuées */
  iterations: number;
  /** Texte de la dernière réponse */
  text: string;
  /** Résumé extrait (mode json uniquement) */
  summary?: string;
  /** Détails additionnels (erreurs) */
  details?: string;
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Créer le module de formatage des résumés

**Fichier** : `project/src/output/summary.ts`

```typescript
/**
 * Module de formatage des résumés d'exécution
 * Produit des résumés humains (stderr) et JSON (stdout)
 */

import type { RunResult } from "../runner/types.js";
import type { LoopResult } from "../runner/types.js";
import type { RunJsonSummary, LoopJsonSummary } from "./types.js";

/**
 * Formate une durée en millisecondes en format humain lisible
 * @param ms Durée en millisecondes
 * @returns Durée formatée (ex: "1.2s", "2m 15s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Traduit un statut technique en message humain
 * @param status Statut technique
 * @returns Message humain
 */
export function statusToHumanMessage(status: string): string {
  const messages: Record<string, string> = {
    success: "Succès",
    done: "Terminé avec succès",
    error: "Erreur",
    "backend-missing": "Backend non trouvé",
    "backend-unauthenticated": "Authentification requise",
    "backend-unsupported": "Backend non supporté",
    "backend-unknown": "Backend inconnu",
    timeout: "Timeout dépassé",
    "max-iterations": "Limite d'itérations atteinte",
    "no-progress": "Aucun progrès détecté",
    "invalid-json": "JSON invalide",
  };

  return messages[status] ?? status;
}

/**
 * Formate un résumé humain pour une exécution one-shot
 * @param result Résultat de l'exécution
 * @returns Lignes de résumé formatées
 */
export function formatRunHumanSummary(result: RunResult): string[] {
  const lines: string[] = [];

  lines.push("─".repeat(40));
  lines.push(`Backend   : ${result.backend}`);
  lines.push(`Statut    : ${statusToHumanMessage(result.status)}`);
  lines.push(`Durée     : ${formatDuration(result.durationMs)}`);

  if (result.details) {
    lines.push(`Détails   : ${result.details}`);
  }

  lines.push("─".repeat(40));

  return lines;
}

/**
 * Formate un résumé humain pour une exécution loop
 * @param result Résultat de l'exécution
 * @returns Lignes de résumé formatées
 */
export function formatLoopHumanSummary(result: LoopResult): string[] {
  const lines: string[] = [];

  lines.push("─".repeat(40));
  lines.push(`Backend    : ${result.backend}`);
  lines.push(`Statut     : ${statusToHumanMessage(result.status)}`);
  lines.push(`Itérations : ${result.iterations}`);
  lines.push(`Durée      : ${formatDuration(result.durationMs)}`);

  if (result.summary) {
    lines.push(`Résumé     : ${result.summary}`);
  }

  if (result.details) {
    lines.push(`Détails    : ${result.details}`);
  }

  lines.push("─".repeat(40));

  return lines;
}

/**
 * Formate un résumé JSON pour une exécution one-shot
 * @param result Résultat de l'exécution
 * @returns Objet JSON sérialisable
 */
export function formatRunJsonSummary(result: RunResult): RunJsonSummary {
  const summary: RunJsonSummary = {
    backend: result.backend,
    status: result.status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    text: result.text,
  };

  if (result.details) {
    summary.details = result.details;
  }

  return summary;
}

/**
 * Formate un résumé JSON pour une exécution loop
 * @param result Résultat de l'exécution
 * @returns Objet JSON sérialisable
 */
export function formatLoopJsonSummary(result: LoopResult): LoopJsonSummary {
  const summary: LoopJsonSummary = {
    backend: result.backend,
    status: result.status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    iterations: result.iterations,
    text: result.text,
  };

  if (result.summary) {
    summary.summary = result.summary;
  }

  if (result.details) {
    summary.details = result.details;
  }

  return summary;
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer l'index d'export du module output

**Fichier** : `project/src/output/index.ts`

```typescript
/**
 * Module output - Formatage des résumés d'exécution
 */

export {
  formatDuration,
  statusToHumanMessage,
  formatRunHumanSummary,
  formatLoopHumanSummary,
  formatRunJsonSummary,
  formatLoopJsonSummary,
} from "./summary.js";

export type { RunJsonSummary, LoopJsonSummary } from "./types.js";
```

**Validation** : `npx tsc --noEmit`

### Étape 4 : Modifier la commande run pour supporter --json

**Fichier** : `project/src/commands/run.ts`

Ajouter l'import :

```typescript
import {
  formatRunHumanSummary,
  formatRunJsonSummary,
} from "../output/summary.js";
```

Modifier l'interface des options :

```typescript
export interface RunCommandOptions {
  backend?: string;
  json?: boolean;
}
```

Modifier le handler `runAction()` pour afficher le résumé :

```typescript
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
      return;
    }
    throw error;
  }

  if (!prompt) {
    console.error("Le fichier prompt est vide.");
    process.exit(EX_NOINPUT);
    return;
  }

  const result = await runOnce({
    prompt,
    backend: options.backend,
  });

  if (options.json) {
    // Mode JSON : uniquement le JSON sur stdout
    console.log(JSON.stringify(formatRunJsonSummary(result), null, 2));
  } else {
    // Mode humain : texte sur stdout, résumé sur stderr
    if (result.exitCode === 0) {
      console.log(result.text);
    } else {
      console.error(result.text);
      if (result.details) {
        console.error(result.details);
      }
    }

    // Afficher le résumé sur stderr
    for (const line of formatRunHumanSummary(result)) {
      console.error(line);
    }
  }

  process.exit(result.exitCode);
}
```

Modifier l'enregistrement de la commande pour ajouter l'option `--json` :

```typescript
export function registerRunCommand(program: Command): void {
  program
    .command("run <fichier-prompt>")
    .description("Exécute un prompt (fichier) sur un backend IA")
    .option("-b, --backend <id>", "Backend à utiliser (copilot, codex, claude)")
    .option("--json", "Sortie au format JSON (machine-readable)")
    .action(runAction);
}
```

**Validation** : `npx tsc --noEmit`

### Étape 5 : Modifier la commande loop pour supporter --json

**Fichier** : `project/src/commands/loop.ts`

Ajouter l'import :

```typescript
import {
  formatLoopHumanSummary,
  formatLoopJsonSummary,
} from "../output/summary.js";
```

Modifier l'interface des options :

```typescript
export interface LoopCommandOptions {
  backend?: string;
  maxIterations?: string;
  timeout?: string;
  completionMode?: "marker" | "json";
  json?: boolean;
}
```

Modifier le handler `loopAction()` pour afficher le résumé :

```typescript
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
```

Modifier l'enregistrement de la commande pour ajouter l'option `--json` :

```typescript
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
    .option("--json", "Sortie au format JSON (machine-readable)")
    .action(loopAction);
}
```

**Validation** : `npx tsc --noEmit`

### Étape 6 : Créer les tests unitaires du module summary

**Fichier** : `project/tests/unit/summary.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  formatDuration,
  statusToHumanMessage,
  formatRunHumanSummary,
  formatLoopHumanSummary,
  formatRunJsonSummary,
  formatLoopJsonSummary,
} from "../../src/output/summary.js";
import type { RunResult } from "../../src/runner/types.js";
import type { LoopResult } from "../../src/runner/types.js";

describe("output/summary", () => {
  describe("formatDuration", () => {
    it("should format milliseconds for durations < 1s", () => {
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("should format seconds for durations < 60s", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(30000)).toBe("30.0s");
      expect(formatDuration(59999)).toBe("60.0s");
    });

    it("should format minutes and seconds for durations >= 60s", () => {
      expect(formatDuration(60000)).toBe("1m");
      expect(formatDuration(90000)).toBe("1m 30s");
      expect(formatDuration(135000)).toBe("2m 15s");
      expect(formatDuration(3600000)).toBe("60m");
    });
  });

  describe("statusToHumanMessage", () => {
    it("should translate known statuses", () => {
      expect(statusToHumanMessage("success")).toBe("Succès");
      expect(statusToHumanMessage("done")).toBe("Terminé avec succès");
      expect(statusToHumanMessage("error")).toBe("Erreur");
      expect(statusToHumanMessage("backend-missing")).toBe(
        "Backend non trouvé",
      );
      expect(statusToHumanMessage("timeout")).toBe("Timeout dépassé");
      expect(statusToHumanMessage("max-iterations")).toBe(
        "Limite d'itérations atteinte",
      );
      expect(statusToHumanMessage("no-progress")).toBe("Aucun progrès détecté");
      expect(statusToHumanMessage("invalid-json")).toBe("JSON invalide");
    });

    it("should return original status for unknown statuses", () => {
      expect(statusToHumanMessage("unknown-status")).toBe("unknown-status");
    });
  });

  describe("formatRunHumanSummary", () => {
    it("should format a successful run result", () => {
      const result: RunResult = {
        exitCode: 0,
        text: "Hello World",
        backend: "copilot",
        status: "success",
        durationMs: 1500,
      };

      const lines = formatRunHumanSummary(result);

      expect(lines).toContain("Backend   : copilot");
      expect(lines).toContain("Statut    : Succès");
      expect(lines).toContain("Durée     : 1.5s");
      expect(lines.some((l) => l.includes("─"))).toBe(true);
    });

    it("should include details when present", () => {
      const result: RunResult = {
        exitCode: 2,
        text: "Error",
        backend: "copilot",
        status: "backend-missing",
        durationMs: 100,
        details: "copilot not found in PATH",
      };

      const lines = formatRunHumanSummary(result);

      expect(lines).toContain("Détails   : copilot not found in PATH");
    });
  });

  describe("formatLoopHumanSummary", () => {
    it("should format a successful loop result", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Final response",
        backend: "codex",
        status: "done",
        iterations: 3,
        durationMs: 45000,
        transcript: [],
      };

      const lines = formatLoopHumanSummary(result);

      expect(lines).toContain("Backend    : codex");
      expect(lines).toContain("Statut     : Terminé avec succès");
      expect(lines).toContain("Itérations : 3");
      expect(lines).toContain("Durée      : 45.0s");
    });

    it("should include summary when present", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Final response",
        backend: "copilot",
        status: "done",
        iterations: 2,
        durationMs: 5000,
        transcript: [],
        summary: "Task completed successfully",
      };

      const lines = formatLoopHumanSummary(result);

      expect(lines).toContain("Résumé     : Task completed successfully");
    });

    it("should include details when present", () => {
      const result: LoopResult = {
        exitCode: 4,
        text: "Last response",
        backend: "copilot",
        status: "max-iterations",
        iterations: 10,
        durationMs: 60000,
        transcript: [],
        details: "Limite de 10 itérations atteinte",
      };

      const lines = formatLoopHumanSummary(result);

      expect(lines).toContain("Détails    : Limite de 10 itérations atteinte");
    });
  });

  describe("formatRunJsonSummary", () => {
    it("should format a run result as JSON object", () => {
      const result: RunResult = {
        exitCode: 0,
        text: "Hello World",
        backend: "copilot",
        status: "success",
        durationMs: 1500,
      };

      const json = formatRunJsonSummary(result);

      expect(json).toEqual({
        backend: "copilot",
        status: "success",
        exitCode: 0,
        durationMs: 1500,
        text: "Hello World",
      });
    });

    it("should include details when present", () => {
      const result: RunResult = {
        exitCode: 2,
        text: "Error",
        backend: "copilot",
        status: "backend-missing",
        durationMs: 100,
        details: "copilot not found",
      };

      const json = formatRunJsonSummary(result);

      expect(json.details).toBe("copilot not found");
    });

    it("should produce valid JSON when stringified", () => {
      const result: RunResult = {
        exitCode: 0,
        text: 'Text with "quotes" and\nnewlines',
        backend: "copilot",
        status: "success",
        durationMs: 1000,
      };

      const json = formatRunJsonSummary(result);
      const stringified = JSON.stringify(json);
      const parsed = JSON.parse(stringified);

      expect(parsed).toEqual(json);
    });
  });

  describe("formatLoopJsonSummary", () => {
    it("should format a loop result as JSON object", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Final response",
        backend: "codex",
        status: "done",
        iterations: 5,
        durationMs: 30000,
        transcript: [],
      };

      const json = formatLoopJsonSummary(result);

      expect(json).toEqual({
        backend: "codex",
        status: "done",
        exitCode: 0,
        durationMs: 30000,
        iterations: 5,
        text: "Final response",
      });
    });

    it("should include summary when present", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Done",
        backend: "copilot",
        status: "done",
        iterations: 2,
        durationMs: 5000,
        transcript: [],
        summary: "All tasks completed",
      };

      const json = formatLoopJsonSummary(result);

      expect(json.summary).toBe("All tasks completed");
    });

    it("should include details when present", () => {
      const result: LoopResult = {
        exitCode: 75,
        text: "Timeout",
        backend: "copilot",
        status: "timeout",
        iterations: 3,
        durationMs: 120000,
        transcript: [],
        details: "Timeout après 2 minutes",
      };

      const json = formatLoopJsonSummary(result);

      expect(json.details).toBe("Timeout après 2 minutes");
    });
  });
});
```

**Validation** : `npm test -- --run summary`

## Contraintes

- **Séparation stdout/stderr** : Les résumés humains vont sur `stderr`, le contenu (texte ou JSON) va sur `stdout`
- **Format JSON stable** : La structure JSON ne doit pas changer selon les versions (rétrocompatibilité)
- **Pas d'informations sensibles** : Ne pas inclure `process.env` ou autres secrets dans les résumés
- **Conventions de code** : Respecter les guidelines de [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- **Pure functions** : Les fonctions de formatage doivent être pures (pas d'effets de bord)

## Definition of Done

- [ ] Module `project/src/output/summary.ts` créé avec les fonctions de formatage
- [ ] Types `RunJsonSummary` et `LoopJsonSummary` définis dans `project/src/output/types.ts`
- [ ] Option `--json` ajoutée aux commandes `run` et `loop`
- [ ] Résumé humain affiché sur stderr après chaque exécution (mode par défaut)
- [ ] JSON affiché sur stdout en mode `--json`
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — F-005 Résumé final
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Exigences observabilité
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
