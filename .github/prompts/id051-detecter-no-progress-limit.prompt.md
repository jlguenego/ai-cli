---
agent: agent
description: Implémenter la détection de non-progrès (noProgressLimit) pour stopper la boucle si la sortie est identique N fois consécutives
---

# id051 — Implémenter la détection de non-progrès (noProgressLimit)

## Objectif

Ajouter un garde-fou au runner loop qui détecte quand le backend retourne des réponses identiques de manière consécutive et stoppe l'exécution automatiquement. Cela évite de gaspiller des itérations lorsque le backend est "bloqué" sur une même réponse.

## Contexte

Le runner loop (`runLoop`) implémente déjà les garde-fous `maxIterations` et `timeoutMs`. Le garde-fou `noProgressLimit` est le dernier à ajouter pour compléter la robustesse de la boucle itérative.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Exigences non-fonctionnelles : "`loop` stoppé par `maxIterations` / `timeoutMs` / `noProgressLimit`"
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- Dépendance : `id050` (Runner loop de base) ✅ complété

## Pré-requis

- [x] Tâche `id050` complétée (runner loop fonctionnel)
- [x] Configuration `noProgressLimit` définie dans le schéma (valeur par défaut : 3)
- [x] Type `LoopStatus` inclut `"no-progress"`

## Fichiers impactés

| Fichier                                  | Action   | Description                                    |
| ---------------------------------------- | -------- | ---------------------------------------------- |
| `project/src/runner/loop.ts`             | Modifier | Ajouter la logique de détection de non-progrès |
| `project/tests/unit/runner-loop.test.ts` | Modifier | Ajouter les tests pour noProgressLimit         |

## Critères d'acceptation

- [ ] `noProgressLimit` est résolu depuis la config si non spécifié en option
- [ ] La boucle s'arrête si `noProgressLimit` réponses consécutives sont **identiques**
- [ ] Le statut retourné est `"no-progress"`
- [ ] Le code de sortie est `5` (cohérent avec les exit codes existants)
- [ ] Le champ `details` du résultat explique la raison de l'arrêt
- [ ] Si `noProgressLimit` est `0`, la détection est désactivée
- [ ] Les tests unitaires couvrent tous les cas

## Spécifications techniques

### Exit Code

Ajouter la constante :

```typescript
const EXIT_NO_PROGRESS = 5; // Arrêt pour non-progrès
```

### Algorithme de détection

1. Maintenir un compteur de réponses identiques consécutives
2. Après chaque itération, comparer `response` avec `lastResponse`
3. Si identiques : incrémenter le compteur
4. Si différentes : réinitialiser le compteur à 1
5. Si compteur >= `noProgressLimit` (et `noProgressLimit > 0`) : arrêter

### Signature mise à jour de `resolveLoopOptions`

```typescript
async function resolveLoopOptions(options: LoopOptions): Promise<{
  backendId: string;
  maxIterations: number;
  timeoutMs: number;
  completionMode: CompletionMode;
  noProgressLimit: number; // Ajouter cette ligne
  cwd: string;
}>;
```

## Tests requis

**Unitaires** : `project/tests/unit/runner-loop.test.ts`

Ajouter une section `describe("runLoop - no-progress detection")` avec les cas suivants :

1. **Arrêt après N réponses identiques** : simuler 3 réponses identiques consécutives, vérifier `status: "no-progress"`, `exitCode: 5`
2. **Compteur reset si réponse différente** : alterner réponses différentes et identiques, vérifier que l'arrêt ne se produit pas prématurément
3. **noProgressLimit depuis config** : vérifier que la valeur de config est utilisée par défaut
4. **noProgressLimit = 0 désactive la détection** : simuler réponses identiques sans arrêt
5. **noProgressLimit en option override** : passer `noProgressLimit: 2` en option, vérifier qu'il prime sur la config

## Instructions

### Étape 1 : Ajouter la constante EXIT_NO_PROGRESS

**Fichier** : `project/src/runner/loop.ts`

Ajouter après les autres constantes d'exit code :

```typescript
const EXIT_NO_PROGRESS = 5; // Arrêt pour non-progrès détecté
```

### Étape 2 : Mettre à jour resolveLoopOptions

**Fichier** : `project/src/runner/loop.ts`

Ajouter `noProgressLimit` à la résolution des options :

```typescript
async function resolveLoopOptions(options: LoopOptions): Promise<{
  backendId: string;
  maxIterations: number;
  timeoutMs: number;
  completionMode: CompletionMode;
  noProgressLimit: number;
  cwd: string;
}> {
  const config = await resolveConfig();

  return {
    backendId: options.backend ?? config.backend ?? "copilot",
    maxIterations: options.maxIterations ?? config.maxIterations,
    timeoutMs: options.timeoutMs ?? config.timeoutMs,
    completionMode: options.completionMode ?? config.completionMode,
    noProgressLimit: options.noProgressLimit ?? config.noProgressLimit,
    cwd: options.cwd ?? process.cwd(),
  };
}
```

### Étape 3 : Ajouter noProgressLimit à LoopOptions

**Fichier** : `project/src/runner/types.ts`

Ajouter le champ optionnel à l'interface `LoopOptions` :

```typescript
/** Nombre de répétitions sans progrès avant arrêt (défaut: config.noProgressLimit, 0 = désactivé) */
noProgressLimit?: number;
```

### Étape 4 : Implémenter la détection dans runLoop

**Fichier** : `project/src/runner/loop.ts`

Dans la fonction `runLoop`, après la résolution des options :

1. Destructurer `noProgressLimit` depuis les options résolues
2. Ajouter une variable `consecutiveIdenticalCount` initialisée à 0
3. Dans la boucle, après avoir obtenu `lastResponse` :
   - Comparer avec la réponse précédente
   - Mettre à jour le compteur
   - Vérifier si le seuil est atteint

```typescript
// Après la résolution des options, ajouter :
const {
  backendId,
  maxIterations,
  timeoutMs,
  completionMode,
  noProgressLimit,
  cwd,
} = await resolveLoopOptions(options);

// Ajouter cette variable avec les autres (lastResponse, summary, etc.)
let consecutiveIdenticalCount = 0;
let previousResponse = "";

// Dans la boucle, après transcript.push(entry) et avant le callback onIteration :
// Détection de non-progrès
if (noProgressLimit > 0) {
  if (result.text === previousResponse) {
    consecutiveIdenticalCount++;
  } else {
    consecutiveIdenticalCount = 1;
  }
  previousResponse = result.text;

  if (consecutiveIdenticalCount >= noProgressLimit) {
    return {
      exitCode: EXIT_NO_PROGRESS,
      text: result.text,
      backend: backendId,
      status: "no-progress",
      iterations: transcript.length,
      durationMs: Date.now() - startTime,
      transcript,
      details: `Arrêt après ${consecutiveIdenticalCount} réponses identiques consécutives`,
    };
  }
}
```

**Note importante** : La vérification de non-progrès doit se faire **avant** la vérification de complétion (DONE/json status), car même si le backend dit "done", on veut d'abord vérifier le progrès. Toutefois, si le backend dit "done", on arrête normalement. Donc placer la détection **après** le callback `onIteration` mais **avant** le parsing de complétion.

### Étape 5 : Ajouter les tests unitaires

**Fichier** : `project/tests/unit/runner-loop.test.ts`

Ajouter une nouvelle section de tests :

```typescript
describe("runLoop - no-progress detection", () => {
  it("should stop after noProgressLimit identical responses with exit code 5", async () => {
    const mockAdapter = createMockAdapter("copilot", { status: "available" }, [
      { exitCode: 0, text: "Same response" },
      { exitCode: 0, text: "Same response" },
      { exitCode: 0, text: "Same response" },
    ]);
    vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

    const result = await runLoop({
      prompt: "Task",
      backend: "copilot",
      completionMode: "marker",
      noProgressLimit: 3,
      maxIterations: 10,
    });

    expect(result.exitCode).toBe(5);
    expect(result.status).toBe("no-progress");
    expect(result.iterations).toBe(3);
    expect(result.details).toContain("3 réponses identiques");
  });

  it("should reset counter when response differs", async () => {
    const mockAdapter = createMockAdapter("copilot", { status: "available" }, [
      { exitCode: 0, text: "Response A" },
      { exitCode: 0, text: "Response A" },
      { exitCode: 0, text: "Response B" }, // Reset ici
      { exitCode: 0, text: "Response B" },
      { exitCode: 0, text: "DONE" },
    ]);
    vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

    const result = await runLoop({
      prompt: "Task",
      backend: "copilot",
      completionMode: "marker",
      noProgressLimit: 3,
      maxIterations: 10,
    });

    expect(result.status).toBe("done");
    expect(result.iterations).toBe(5);
  });

  it("should use noProgressLimit from config when not specified", async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      backend: "copilot",
      maxIterations: 10,
      timeoutMs: 300000,
      completionMode: "marker",
      noProgressLimit: 2, // Config avec limit = 2
    });
    const mockAdapter = createMockAdapter("copilot", { status: "available" }, [
      { exitCode: 0, text: "Repeat" },
      { exitCode: 0, text: "Repeat" },
    ]);
    vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

    const result = await runLoop({
      prompt: "Task",
      backend: "copilot",
      completionMode: "marker",
    });

    expect(result.exitCode).toBe(5);
    expect(result.status).toBe("no-progress");
  });

  it("should disable detection when noProgressLimit is 0", async () => {
    const mockAdapter = createMockAdapter("copilot", { status: "available" }, [
      { exitCode: 0, text: "Same" },
      { exitCode: 0, text: "Same" },
      { exitCode: 0, text: "Same" },
      { exitCode: 0, text: "Same" },
      { exitCode: 0, text: "Same" },
    ]);
    vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

    const result = await runLoop({
      prompt: "Task",
      backend: "copilot",
      completionMode: "marker",
      noProgressLimit: 0,
      maxIterations: 5,
    });

    expect(result.exitCode).toBe(4); // max-iterations, pas no-progress
    expect(result.status).toBe("max-iterations");
  });

  it("should override config noProgressLimit with option", async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      backend: "copilot",
      maxIterations: 10,
      timeoutMs: 300000,
      completionMode: "marker",
      noProgressLimit: 5,
    });
    const mockAdapter = createMockAdapter("copilot", { status: "available" }, [
      { exitCode: 0, text: "Repeat" },
      { exitCode: 0, text: "Repeat" },
    ]);
    vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

    const result = await runLoop({
      prompt: "Task",
      backend: "copilot",
      noProgressLimit: 2, // Override
    });

    expect(result.exitCode).toBe(5);
    expect(result.status).toBe("no-progress");
    expect(result.iterations).toBe(2);
  });
});
```

### Étape 6 : Valider

**Commandes de validation** :

```bash
cd project
npm run lint
npm run typecheck
npm test
```

## Contraintes

- Ne pas modifier le comportement existant pour `maxIterations` et `timeoutMs`
- La comparaison de réponses doit être exacte (égalité stricte `===`)
- Le compteur doit être à 1 (pas 0) après la première réponse, car une seule occurrence ne constitue pas une répétition
- La détection de non-progrès doit se faire **après** l'ajout au transcript mais **avant** le parsing de complétion
- Respecter les conventions de nommage du projet (camelCase)
- Pas de console.log, utiliser les patterns existants

## Definition of Done

- [ ] Constante `EXIT_NO_PROGRESS = 5` ajoutée
- [ ] `noProgressLimit` résolu depuis les options ou la config
- [ ] Détection de réponses identiques consécutives implémentée
- [ ] `LoopOptions` mis à jour avec le champ optionnel `noProgressLimit`
- [ ] Tests unitaires ajoutés et passent
- [ ] `npm run lint` sans erreur
- [ ] `npm run typecheck` sans erreur
- [ ] `npm test` sans erreur
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture et exigences
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — Exit codes
- [project/src/config/schema.ts](project/src/config/schema.ts) — Schéma de config avec `noProgressLimit`
