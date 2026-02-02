---
agent: agent
description: Ajouter l'option --verbosity aux commandes run et loop
---

# id092 — Ajouter l'option `--verbosity` aux commandes `run` et `loop`

## Objectif

Ajouter l'option `-V, --verbosity <level>` aux commandes `jlgcli run` et `jlgcli loop` permettant de contrôler le niveau de verbosité (0, 1, 2 ou 3).

## Contexte

Le système de verbosité est défini dans la clarification 010-verbosite-normalized. Il permet de contrôler la quantité d'informations affichées par le CLI.

- Réf : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Spécifications verbosité
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de logging
- Dépendances : `id090` (schéma), `id091` (helpers verbosité)

## Pré-requis

- [x] Tâche `id090` complétée : Type `VerbosityLevel` défini dans `schema.ts`
- [x] Tâche `id091` complétée : Interface `VerbosityConfig` et helpers créés dans `verbosity.ts`

## Fichiers impactés

| Fichier                                   | Action   | Description                                     |
| ----------------------------------------- | -------- | ----------------------------------------------- |
| `project/src/commands/run.ts`             | Modifier | Ajouter option `--verbosity` à la commande run  |
| `project/src/commands/loop.ts`            | Modifier | Ajouter option `--verbosity` à la commande loop |
| `project/tests/unit/run-command.test.ts`  | Modifier | Ajouter tests pour l'option verbosity           |
| `project/tests/unit/loop-command.test.ts` | Modifier | Ajouter tests pour l'option verbosity           |

## Critères d'acceptation

- [ ] Option `-V, --verbosity <level>` disponible sur `jlgcli run`
- [ ] Option `-V, --verbosity <level>` disponible sur `jlgcli loop`
- [ ] Valeurs acceptées : 0, 1, 2, 3
- [ ] Valeur par défaut : 3 (mode Debug, via config ou DEFAULT_VERBOSITY)
- [ ] Valeur stockée dans les options de commande (`RunCommandOptions`, `LoopCommandOptions`)
- [ ] Tests unitaires couvrant les différentes valeurs
- [ ] `npm test` passe sans erreur

## Tests requis

**Unitaires** : `tests/unit/run-command.test.ts`, `tests/unit/loop-command.test.ts`

- Tester que l'option `--verbosity=0` est parsée correctement
- Tester que l'option `--verbosity=3` est parsée correctement
- Tester que l'option `-V 2` (forme courte) fonctionne
- Tester la valeur par défaut (3 si non spécifié)

## Instructions

### Étape 1 : Modifier l'interface `RunCommandOptions`

**Fichier** : `project/src/commands/run.ts`

Ajouter le champ `verbosity` à l'interface :

```typescript
/**
 * Options de la commande run
 */
export interface RunCommandOptions {
  backend?: string;
  json?: boolean;
  verbosity?: string; // Reçu comme string depuis commander, sera parsé en number
}
```

### Étape 2 : Ajouter l'option dans `registerRunCommand`

**Fichier** : `project/src/commands/run.ts`

Dans la fonction `registerRunCommand`, ajouter l'option :

```typescript
export function registerRunCommand(program: Command): void {
  program
    .command("run <fichier-prompt>")
    .description("Exécute un prompt (fichier) sur un backend IA")
    .option("-b, --backend <id>", "Backend à utiliser (copilot, codex, claude)")
    .option("-V, --verbosity <level>", "Niveau de verbosité (0-3)", "3")
    .option("--json", "Sortie au format JSON (machine-readable)")
    .action(runAction);
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Modifier l'interface `LoopCommandOptions`

**Fichier** : `project/src/commands/loop.ts`

Ajouter le champ `verbosity` à l'interface :

```typescript
/**
 * Options de la commande loop
 */
export interface LoopCommandOptions {
  backend?: string;
  maxIterations?: string;
  timeout?: string;
  completionMode?: "marker" | "json";
  json?: boolean;
  verbosity?: string; // Reçu comme string depuis commander, sera parsé en number
}
```

### Étape 4 : Ajouter l'option dans `registerLoopCommand`

**Fichier** : `project/src/commands/loop.ts`

Dans la fonction `registerLoopCommand`, ajouter l'option :

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
    .option("-V, --verbosity <level>", "Niveau de verbosité (0-3)", "3")
    .option("--json", "Sortie au format JSON (machine-readable)")
    .action(loopAction);
}
```

**Validation** : `npx tsc --noEmit`

### Étape 5 : Ajouter les tests pour la commande run

**Fichier** : `project/tests/unit/run-command.test.ts`

Ajouter des tests pour l'option verbosity :

```typescript
describe("option --verbosity", () => {
  it("devrait accepter --verbosity=0", async () => {
    // Simuler l'appel avec --verbosity=0
    // Vérifier que l'option est bien parsée
  });

  it("devrait accepter -V 3", async () => {
    // Simuler l'appel avec -V 3
    // Vérifier que l'option est bien parsée
  });

  it("devrait avoir 3 comme valeur par défaut", async () => {
    // Simuler l'appel sans --verbosity
    // Vérifier que la valeur par défaut est 3
  });
});
```

### Étape 6 : Ajouter les tests pour la commande loop

**Fichier** : `project/tests/unit/loop-command.test.ts`

Ajouter des tests similaires pour l'option verbosity de la commande loop.

**Validation** : `npm test`

## Contraintes

- Règles issues de [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- L'option doit utiliser `-V` (majuscule) pour la forme courte (éviter conflit avec `-v` pour version)
- La valeur par défaut est 3 (mode Debug) — cf. RG-018, RG-019, RG-020
- Le parsing du niveau se fait en string depuis commander, conversion en number dans le handler
- Ne pas encore intégrer avec les helpers de verbosity.ts (tâche id093+)

## Definition of Done

- [ ] Code conforme aux guidelines (`project/docs/06-codage-guidelines.md`)
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
