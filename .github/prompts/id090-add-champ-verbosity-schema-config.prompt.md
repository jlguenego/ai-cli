---
agent: agent
description: Ajouter le champ verbosity (0|1|2|3) dans le schéma de configuration avec défaut 3
---

# id090 — Ajouter le champ `verbosity` dans le schéma de configuration

## Objectif

Ajouter le champ `verbosity` dans le schéma de configuration (`project/src/config/schema.ts`) pour permettre de contrôler le niveau de verbosité des commandes CLI. Le niveau par défaut est **3 (Debug)**.

## Contexte

Le système de verbosité permet de contrôler la quantité d'informations affichées par les commandes `run` et `loop`.

- Réf : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décision sur les niveaux de verbosité
- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Section VerbosityConfig et dictionnaire de données
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de logging et verbosité
- Dépendances : aucune

**Niveaux de verbosité** :

| Niveau | Nom        | Comportement                                                 |
| ------ | ---------- | ------------------------------------------------------------ |
| 0      | Silencieux | Résultat final uniquement                                    |
| 1      | Minimal    | Résultat + coût                                              |
| 2      | Normal     | Résultat + coût + indicateur de progression                  |
| 3      | Debug      | Résultat + coût + prompts complets + réponses stream + infos |

## Pré-requis

- [ ] Environnement Node.js 22 LTS configuré
- [ ] Dépendances installées (`npm install` dans `project/`)

## Fichiers impactés

| Fichier                             | Action   | Description                          |
| ----------------------------------- | -------- | ------------------------------------ |
| `project/src/config/schema.ts`      | Modifier | Ajouter type, interfaces, validation |
| `project/tests/unit/config.test.ts` | Modifier | Ajouter tests pour verbosity         |

## Critères d'acceptation

- [ ] Type `VerbosityLevel = 0 | 1 | 2 | 3` exporté
- [ ] Constante `VALID_VERBOSITY_LEVELS` exportée : `[0, 1, 2, 3] as const`
- [ ] Champ `verbosity?: VerbosityLevel` ajouté dans `UserConfig` et `ProjectConfig`
- [ ] Champ `verbosity: VerbosityLevel` ajouté dans `ResolvedConfig`
- [ ] Valeur par défaut `verbosity: 3` dans `DEFAULT_CONFIG`
- [ ] Validation du champ `verbosity` dans `isValidConfig()`
- [ ] Clé `"verbosity"` ajoutée dans `CONFIG_KEYS`
- [ ] Tests unitaires couvrant les nouveaux éléments
- [ ] `npm run lint` passe sans erreur
- [ ] `npm test` passe sans erreur

## Tests requis

**Fichier** : `project/tests/unit/config.test.ts`

**Cas à couvrir** :

1. `DEFAULT_CONFIG` contient `verbosity` égal à `3`
2. `DEFAULT_CONFIG.verbosity` est dans la plage `[0, 3]`
3. `VALID_VERBOSITY_LEVELS` contient `[0, 1, 2, 3]`
4. `CONFIG_KEYS` contient `"verbosity"`
5. `isValidConfig()` accepte les configs avec `verbosity` valide (0, 1, 2, 3)
6. `isValidConfig()` rejette les configs avec `verbosity` invalide (-1, 4, "high", null)

## Instructions

### Étape 1 : Ajouter le type VerbosityLevel

**Fichier** : `project/src/config/schema.ts`

Après le type `CompletionMode`, ajouter :

```typescript
/**
 * Niveaux de verbosité pour les commandes CLI
 * - 0: Silencieux — Résultat final uniquement
 * - 1: Minimal — Résultat + coût
 * - 2: Normal — Résultat + coût + indicateur de progression
 * - 3: Debug — Tout : résultat, coût, prompts, réponses stream, infos techniques
 */
export type VerbosityLevel = 0 | 1 | 2 | 3;
```

### Étape 2 : Ajouter VALID_VERBOSITY_LEVELS

**Fichier** : `project/src/config/schema.ts`

Après `VALID_COMPLETION_MODES`, ajouter :

```typescript
/**
 * Liste des niveaux de verbosité valides
 */
export const VALID_VERBOSITY_LEVELS: readonly VerbosityLevel[] = [
  0, 1, 2, 3,
] as const;
```

### Étape 3 : Ajouter verbosity dans les interfaces

**Fichier** : `project/src/config/schema.ts`

Dans `UserConfig`, ajouter :

```typescript
  /** Niveau de verbosité (0=silencieux, 1=minimal, 2=normal, 3=debug) */
  verbosity?: VerbosityLevel;
```

Dans `ResolvedConfig`, ajouter :

```typescript
/** Niveau de verbosité */
verbosity: VerbosityLevel;
```

### Étape 4 : Ajouter la valeur par défaut

**Fichier** : `project/src/config/schema.ts`

Dans `DEFAULT_CONFIG`, ajouter :

```typescript
  verbosity: 3,
```

### Étape 5 : Ajouter la validation

**Fichier** : `project/src/config/schema.ts`

Dans `isValidConfig()`, après la validation de `noProgressLimit`, ajouter :

```typescript
// Valider verbosity si présent
if (cfg["verbosity"] !== undefined) {
  if (
    typeof cfg["verbosity"] !== "number" ||
    !VALID_VERBOSITY_LEVELS.includes(cfg["verbosity"] as VerbosityLevel)
  ) {
    return false;
  }
}
```

### Étape 6 : Ajouter la clé dans CONFIG_KEYS

**Fichier** : `project/src/config/schema.ts`

Modifier `CONFIG_KEYS` pour inclure `"verbosity"` :

```typescript
export const CONFIG_KEYS = [
  "backend",
  "maxIterations",
  "timeoutMs",
  "completionMode",
  "noProgressLimit",
  "verbosity",
] as const;
```

### Étape 7 : Ajouter les tests unitaires

**Fichier** : `project/tests/unit/config.test.ts`

Ajouter les imports manquants et les tests suivants :

Dans le `describe("DEFAULT_CONFIG")` :

```typescript
it("should have verbosity equal to 3 (debug mode)", () => {
  expect(DEFAULT_CONFIG.verbosity).toBe(3);
});

it("should have verbosity in valid range [0-3]", () => {
  expect(DEFAULT_CONFIG.verbosity).toBeGreaterThanOrEqual(0);
  expect(DEFAULT_CONFIG.verbosity).toBeLessThanOrEqual(3);
});
```

Dans le `describe("Constants")` :

```typescript
it("should define VALID_VERBOSITY_LEVELS", () => {
  expect(VALID_VERBOSITY_LEVELS).toContain(0);
  expect(VALID_VERBOSITY_LEVELS).toContain(1);
  expect(VALID_VERBOSITY_LEVELS).toContain(2);
  expect(VALID_VERBOSITY_LEVELS).toContain(3);
  expect(VALID_VERBOSITY_LEVELS).toHaveLength(4);
});

it("should include verbosity in CONFIG_KEYS", () => {
  expect(CONFIG_KEYS).toContain("verbosity");
});
```

Dans le `describe("isValidConfig")` :

```typescript
it("should return true for valid verbosity values", () => {
  expect(isValidConfig({ verbosity: 0 })).toBe(true);
  expect(isValidConfig({ verbosity: 1 })).toBe(true);
  expect(isValidConfig({ verbosity: 2 })).toBe(true);
  expect(isValidConfig({ verbosity: 3 })).toBe(true);
});

it("should return false for invalid verbosity values", () => {
  expect(isValidConfig({ verbosity: -1 })).toBe(false);
  expect(isValidConfig({ verbosity: 4 })).toBe(false);
  expect(isValidConfig({ verbosity: "high" })).toBe(false);
  expect(isValidConfig({ verbosity: null })).toBe(false);
});
```

Mettre à jour les tests existants qui vérifient les clés requises pour inclure `verbosity`.

**Validation** : `npm test`

## Contraintes

- Respecter le style de code existant dans `schema.ts`
- Utiliser des commentaires JSDoc pour documenter les types et constantes
- La valeur par défaut **DOIT** être `3` (mode Debug) — cf. RG-017
- Les niveaux de verbosité sont strictement `0 | 1 | 2 | 3`, pas de valeurs intermédiaires

## Definition of Done

- [ ] Type `VerbosityLevel` exporté et documenté
- [ ] Constante `VALID_VERBOSITY_LEVELS` exportée
- [ ] Champ `verbosity` dans `UserConfig`, `ProjectConfig`, `ResolvedConfig`
- [ ] Valeur par défaut `3` dans `DEFAULT_CONFIG`
- [ ] Validation dans `isValidConfig()`
- [ ] Clé `"verbosity"` dans `CONFIG_KEYS`
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décision verbosité
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Spécifications techniques
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Guidelines de code
