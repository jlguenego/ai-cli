---
agent: agent
description: Implémenter l'affichage du coût d'utilisation (toujours affiché, même nul) — RG-018
---

# id093 — Implémenter l'affichage du coût (toujours affiché, même nul)

## Objectif

Intégrer l'affichage du coût d'utilisation dans les commandes `run` et `loop` en utilisant les helpers de verbosité existants. Le coût doit **toujours être affiché**, même s'il est nul (`💰 Coût : 0.00 $`), conformément à la règle métier RG-018.

## Contexte

Le système de verbosité a été implémenté (id091) avec les helpers de logging dans `verbosity.ts`. L'option `--verbosity` est disponible dans les commandes `run` et `loop` (id092). Il reste maintenant à **brancher** l'affichage du coût dans le flux d'exécution.

- Réf : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décision Q3 : coût toujours affiché
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Section "Verbosité"
- Dépendances : `id092` ✅ (option --verbosity implémentée)

## Pré-requis

- [x] Tâche `id092` complétée (option `--verbosity` disponible)
- [x] Helpers de verbosité disponibles dans `src/output/verbosity.ts`

## Fichiers impactés

| Fichier                           | Action   | Description                                   |
| --------------------------------- | -------- | --------------------------------------------- |
| `project/src/output/verbosity.ts` | Modifier | Ajouter/vérifier la fonction `logCost`        |
| `project/src/runner/run.ts`       | Modifier | Intégrer VerbosityConfig et appeler `logCost` |
| `project/src/runner/loop.ts`      | Modifier | Intégrer VerbosityConfig et appeler `logCost` |
| `project/src/runner/types.ts`     | Modifier | Ajouter `cost` au type RunResult/LoopResult   |
| `project/src/commands/run.ts`     | Modifier | Parser `--verbosity` et passer au runner      |
| `project/src/commands/loop.ts`    | Modifier | Parser `--verbosity` et passer au runner      |

## Critères d'acceptation

- [ ] Le coût est affiché au format `💰 Coût : X.XX $` sur stderr
- [ ] Le coût est affiché même s'il vaut 0.00
- [ ] Le coût n'est affiché que si `verbosity >= 1` (niveaux 1, 2, 3)
- [ ] Le coût est masqué en mode silencieux (`verbosity=0`)
- [ ] Le coût est inclus dans le résumé JSON (`--json`) sous la clé `cost`
- [ ] Les tests existants passent toujours

## Tests requis

**Unitaires** : `project/tests/unit/verbosity.test.ts`

- Tester `logCost` avec différentes valeurs (0, 0.50, 10.99)
- Vérifier que le format est correct (`💰 Coût : X.XX $`)
- Vérifier le comportement selon les niveaux de verbosité

**Intégration** (couvert par id096) : tests manuels pour valider l'affichage

## Instructions

### Étape 1 : Vérifier le type RunResult/LoopResult

**Fichier** : `project/src/runner/types.ts`

Ajouter le champ `cost` optionnel aux interfaces de résultat :

```typescript
export interface RunResult {
  exitCode: number;
  text: string;
  backend: string;
  status: RunStatus;
  durationMs: number;
  details?: string;
  cost?: number; // Coût en dollars (optionnel, 0 par défaut)
}
```

Faire de même pour `LoopResult` si ce n'est pas déjà fait.

**Validation** : `npx tsc --noEmit`

### Étape 2 : Ajouter VerbosityLevel aux options des runners

**Fichier** : `project/src/runner/types.ts`

Ajouter le niveau de verbosité aux options :

```typescript
import type { VerbosityLevel } from "../config/schema.js";

export interface RunOptions {
  prompt: string;
  backend?: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  verbosity?: VerbosityLevel; // Niveau de verbosité
}

export interface LoopOptions {
  // ... champs existants ...
  verbosity?: VerbosityLevel; // Niveau de verbosité
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Intégrer l'affichage du coût dans le runner run

**Fichier** : `project/src/runner/run.ts`

1. Importer les helpers de verbosité :

```typescript
import { createVerbosityConfig, logCost } from "../output/verbosity.js";
import type { VerbosityLevel } from "../config/schema.js";
```

2. Créer la config de verbosité et appeler `logCost` après l'exécution :

```typescript
export async function runOnce(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();
  const backendId = await resolveBackendId(options.backend);
  const cwd = options.cwd ?? process.cwd();

  // Créer la config de verbosité
  const verbosityLevel: VerbosityLevel = options.verbosity ?? 3;
  const verbosityConfig = createVerbosityConfig(verbosityLevel);

  // ... code existant pour vérifier le backend ...

  // Exécuter le prompt
  const result = await adapter.runOnce({
    prompt: options.prompt,
    cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
  });

  // Le coût est actuellement 0 (les backends ne le fournissent pas encore)
  const cost = 0;

  // Afficher le coût (RG-018)
  logCost(verbosityConfig, cost);

  return {
    exitCode: result.exitCode,
    text: result.text,
    backend: backendId,
    status: result.exitCode === 0 ? "success" : "error",
    durationMs: Date.now() - startTime,
    cost,
  };
}
```

**Validation** : `npx tsc --noEmit`

### Étape 4 : Intégrer l'affichage du coût dans le runner loop

**Fichier** : `project/src/runner/loop.ts`

1. Importer les helpers de verbosité :

```typescript
import { createVerbosityConfig, logCost } from "../output/verbosity.js";
```

2. Créer la config de verbosité au début de `runLoop` :

```typescript
export async function runLoop(options: LoopOptions): Promise<LoopResult> {
  const startTime = Date.now();
  const transcript: TranscriptEntry[] = [];

  // Résoudre les options avec la config
  const {
    backendId,
    maxIterations,
    timeoutMs,
    completionMode,
    noProgressLimit,
    cwd,
  } = await resolveLoopOptions(options);

  // Créer la config de verbosité
  const verbosityLevel: VerbosityLevel = options.verbosity ?? 3;
  const verbosityConfig = createVerbosityConfig(verbosityLevel);

  // Variable pour accumuler le coût
  let totalCost = 0;

  // ... reste du code ...
}
```

3. Afficher le coût à la fin de l'exécution, avant chaque `return` :

```typescript
// Avant chaque return, ajouter :
logCost(verbosityConfig, totalCost);

return {
  // ... résultat existant ...
  cost: totalCost,
};
```

**Note** : Pour éviter la duplication, créer une fonction helper locale :

```typescript
function createResult(
  status: LoopStatus,
  exitCode: number,
  text: string,
  details?: string,
): LoopResult {
  logCost(verbosityConfig, totalCost);
  return {
    exitCode,
    text,
    backend: backendId,
    status,
    iterations: transcript.length,
    durationMs: Date.now() - startTime,
    transcript,
    cost: totalCost,
    details,
  };
}
```

**Validation** : `npx tsc --noEmit`

### Étape 5 : Parser et transmettre --verbosity dans les commandes

**Fichier** : `project/src/commands/run.ts`

Modifier le handler pour parser l'option verbosity et la passer au runner :

```typescript
import type { VerbosityLevel } from "../config/schema.js";

export async function runAction(
  promptSource: string,
  options: RunCommandOptions,
): Promise<void> {
  // ... lecture du prompt existante ...

  // Parser le niveau de verbosité
  const verbosity = (
    options.verbosity ? parseInt(options.verbosity, 10) : 3
  ) as VerbosityLevel;

  const result = await runOnce({
    prompt,
    backend: options.backend,
    verbosity, // Passer le niveau de verbosité
  });

  // ... reste du code existant ...
}
```

**Fichier** : `project/src/commands/loop.ts`

Appliquer la même modification dans `loopAction`.

**Validation** : `npm run lint && npx tsc --noEmit`

### Étape 6 : Ajouter le coût au résumé JSON

**Fichier** : `project/src/output/summary.ts`

Vérifier que les fonctions `formatRunJsonSummary` et `formatLoopJsonSummary` incluent le champ `cost` :

```typescript
export function formatRunJsonSummary(result: RunResult): object {
  return {
    backend: result.backend,
    status: result.status,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    cost: result.cost ?? 0, // Toujours inclure le coût
    text: result.text,
    details: result.details,
  };
}
```

**Validation** : `npm test`

## Contraintes

- Respecter la convention : logs sur **stderr**, résultat sur **stdout**
- Le coût est affiché **avant** le résumé final
- Format exact : `💰 Coût : X.XX $` (2 décimales, emoji, espace avant $)
- Ne pas modifier la signature publique des fonctions existantes si possible
- Garder le code rétro-compatible (cost optionnel)

## Definition of Done

- [ ] Code conforme aux guidelines (`docs/06-codage-guidelines.md`)
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint && npx tsc --noEmit`)
- [ ] Tâche cochée dans `/TODO.md`
- [ ] Coût affiché avec `jlgcli run --verbosity=1|2|3`
- [ ] Coût masqué avec `jlgcli run --verbosity=0`
- [ ] Coût présent dans la sortie JSON (`--json`)

## Références

- [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décision finale Q3
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Section Verbosité
- [project/src/output/verbosity.ts](project/src/output/verbosity.ts) — Helpers de logging
