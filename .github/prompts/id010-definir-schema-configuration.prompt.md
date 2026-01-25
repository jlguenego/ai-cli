---
agent: agent
description: Définir le schéma de configuration TypeScript (types + valeurs par défaut)
---

# id010 — Définir le schéma de configuration (types TypeScript)

## Objectif

Créer le fichier de types TypeScript définissant la structure complète de la configuration du CLI `jlgcli`, incluant :

- Les interfaces pour la configuration utilisateur et projet
- Les valeurs par défaut
- Les constantes de chemins de configuration
- Les fonctions utilitaires de validation

## Contexte

Le CLI `jlgcli` utilise une configuration à deux niveaux :

- **Config utilisateur** : `%USERPROFILE%\.jlgcli.json` (Windows)
- **Config projet** : `.jlgcli.json` à la racine du projet

La configuration projet surcharge la configuration utilisateur (merge avec priorité projet > utilisateur > défauts).

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Modèle de données (USER_CONFIG, PROJECT_CONFIG)
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Structure projet, conventions de nommage
- Réf : [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md) — Chemins de configuration retenus
- Dépendances : `id001` (projet initialisé)

## Pré-requis

- [x] Tâche `id001` complétée : projet Node.js/TypeScript initialisé
- [x] `project/package.json` et `project/tsconfig.json` présents

## Fichiers impactés

| Fichier                        | Action | Description                                          |
| ------------------------------ | ------ | ---------------------------------------------------- |
| `project/src/config/schema.ts` | Créer  | Types, interfaces et constantes de configuration     |
| `tests/unit/config.test.ts`    | Créer  | Tests unitaires pour le schéma et valeurs par défaut |

## Critères d'acceptation

- [ ] Interface `UserConfig` définie avec tous les champs documentés
- [ ] Interface `ProjectConfig` définie (même structure, champs optionnels)
- [ ] Interface `ResolvedConfig` (config fusionnée, tous champs requis)
- [ ] Type `CompletionMode` = `'marker' | 'json'`
- [ ] Type `BackendId` = `'copilot' | 'codex'` (extensible)
- [ ] Objet `DEFAULT_CONFIG` avec valeurs par défaut sensibles
- [ ] Constantes `USER_CONFIG_PATH` et `PROJECT_CONFIG_FILENAME`
- [ ] Fonction `isValidConfig()` pour validation basique
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] Tests unitaires passent (`npm test`)

## Tests requis

**Unitaires** : `tests/unit/config.test.ts`

- `DEFAULT_CONFIG` contient toutes les clés requises
- `DEFAULT_CONFIG.maxIterations` > 0
- `DEFAULT_CONFIG.timeoutMs` > 0
- `DEFAULT_CONFIG.noProgressLimit` >= 0
- `DEFAULT_CONFIG.completionMode` est `'marker'` ou `'json'`
- `isValidConfig()` retourne `true` pour une config valide
- `isValidConfig()` retourne `false` pour une config avec `maxIterations <= 0`

## Instructions

### Étape 1 : Créer le dossier config

**Dossier** : `project/src/config/`

Créer le dossier s'il n'existe pas.

### Étape 2 : Créer le fichier schema.ts

**Fichier** : `project/src/config/schema.ts`

```typescript
/**
 * Schéma de configuration pour jlgcli
 *
 * Deux niveaux de configuration :
 * - Utilisateur : ~/.jlgcli.json (global)
 * - Projet : .jlgcli.json (à la racine du projet)
 *
 * Priorité : projet > utilisateur > défauts
 */

import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================================
// Types de base
// ============================================================================

/**
 * Identifiants des backends supportés
 */
export type BackendId = "copilot" | "codex";

/**
 * Modes de détection de complétion
 * - marker: ligne exacte "DONE" en fin de sortie
 * - json: objet JSON { status: "done" | "continue", ... } en fin de sortie
 */
export type CompletionMode = "marker" | "json";

// ============================================================================
// Interfaces de configuration
// ============================================================================

/**
 * Configuration utilisateur (tous les champs optionnels car peuvent être absents du fichier)
 */
export interface UserConfig {
  /** Backend par défaut à utiliser */
  backend?: BackendId;
  /** Nombre maximum d'itérations pour la commande loop */
  maxIterations?: number;
  /** Timeout global en millisecondes */
  timeoutMs?: number;
  /** Mode de détection de complétion */
  completionMode?: CompletionMode;
  /** Nombre de répétitions sans progrès avant arrêt */
  noProgressLimit?: number;
}

/**
 * Configuration projet (même structure que UserConfig)
 * Surcharge les valeurs de la config utilisateur
 */
export interface ProjectConfig extends UserConfig {}

/**
 * Configuration résolue après fusion (tous les champs requis)
 */
export interface ResolvedConfig {
  /** Backend à utiliser */
  backend: BackendId;
  /** Nombre maximum d'itérations pour la commande loop */
  maxIterations: number;
  /** Timeout global en millisecondes */
  timeoutMs: number;
  /** Mode de détection de complétion */
  completionMode: CompletionMode;
  /** Nombre de répétitions sans progrès avant arrêt */
  noProgressLimit: number;
}

// ============================================================================
// Constantes de chemins
// ============================================================================

/**
 * Nom du fichier de configuration projet
 */
export const PROJECT_CONFIG_FILENAME = ".jlgcli.json";

/**
 * Chemin vers le fichier de configuration utilisateur
 * Windows: %USERPROFILE%\.jlgcli.json
 * Unix: ~/.jlgcli.json
 */
export const USER_CONFIG_PATH = join(homedir(), ".jlgcli.json");

// ============================================================================
// Valeurs par défaut
// ============================================================================

/**
 * Configuration par défaut
 * Utilisée quand aucune valeur n'est spécifiée dans les fichiers de config
 */
export const DEFAULT_CONFIG: ResolvedConfig = {
  backend: "copilot",
  maxIterations: 10,
  timeoutMs: 300_000, // 5 minutes
  completionMode: "marker",
  noProgressLimit: 3,
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Liste des backends valides
 */
export const VALID_BACKENDS: readonly BackendId[] = [
  "copilot",
  "codex",
] as const;

/**
 * Liste des modes de complétion valides
 */
export const VALID_COMPLETION_MODES: readonly CompletionMode[] = [
  "marker",
  "json",
] as const;

/**
 * Vérifie si un objet est une configuration valide (partielle ou complète)
 * @param config - Objet à valider
 * @returns true si la configuration est valide
 */
export function isValidConfig(
  config: unknown,
): config is Partial<ResolvedConfig> {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const cfg = config as Record<string, unknown>;

  // Valider backend si présent
  if (cfg.backend !== undefined) {
    if (
      typeof cfg.backend !== "string" ||
      !VALID_BACKENDS.includes(cfg.backend as BackendId)
    ) {
      return false;
    }
  }

  // Valider maxIterations si présent
  if (cfg.maxIterations !== undefined) {
    if (typeof cfg.maxIterations !== "number" || cfg.maxIterations <= 0) {
      return false;
    }
  }

  // Valider timeoutMs si présent
  if (cfg.timeoutMs !== undefined) {
    if (typeof cfg.timeoutMs !== "number" || cfg.timeoutMs <= 0) {
      return false;
    }
  }

  // Valider completionMode si présent
  if (cfg.completionMode !== undefined) {
    if (
      typeof cfg.completionMode !== "string" ||
      !VALID_COMPLETION_MODES.includes(cfg.completionMode as CompletionMode)
    ) {
      return false;
    }
  }

  // Valider noProgressLimit si présent
  if (cfg.noProgressLimit !== undefined) {
    if (typeof cfg.noProgressLimit !== "number" || cfg.noProgressLimit < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Clés de configuration valides (pour validation et accès dynamique)
 */
export const CONFIG_KEYS = [
  "backend",
  "maxIterations",
  "timeoutMs",
  "completionMode",
  "noProgressLimit",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/config.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONFIG,
  USER_CONFIG_PATH,
  PROJECT_CONFIG_FILENAME,
  isValidConfig,
  VALID_BACKENDS,
  VALID_COMPLETION_MODES,
  CONFIG_KEYS,
  type ResolvedConfig,
  type BackendId,
  type CompletionMode,
} from "../../src/config/schema.js";

describe("config/schema", () => {
  describe("DEFAULT_CONFIG", () => {
    it("should contain all required keys", () => {
      const requiredKeys: (keyof ResolvedConfig)[] = [
        "backend",
        "maxIterations",
        "timeoutMs",
        "completionMode",
        "noProgressLimit",
      ];

      for (const key of requiredKeys) {
        expect(DEFAULT_CONFIG).toHaveProperty(key);
      }
    });

    it("should have maxIterations > 0", () => {
      expect(DEFAULT_CONFIG.maxIterations).toBeGreaterThan(0);
    });

    it("should have timeoutMs > 0", () => {
      expect(DEFAULT_CONFIG.timeoutMs).toBeGreaterThan(0);
    });

    it("should have noProgressLimit >= 0", () => {
      expect(DEFAULT_CONFIG.noProgressLimit).toBeGreaterThanOrEqual(0);
    });

    it("should have a valid completionMode", () => {
      expect(["marker", "json"]).toContain(DEFAULT_CONFIG.completionMode);
    });

    it("should have a valid backend", () => {
      expect(VALID_BACKENDS).toContain(DEFAULT_CONFIG.backend);
    });
  });

  describe("Constants", () => {
    it("should define USER_CONFIG_PATH as a non-empty string", () => {
      expect(typeof USER_CONFIG_PATH).toBe("string");
      expect(USER_CONFIG_PATH.length).toBeGreaterThan(0);
      expect(USER_CONFIG_PATH).toContain(".jlgcli.json");
    });

    it("should define PROJECT_CONFIG_FILENAME", () => {
      expect(PROJECT_CONFIG_FILENAME).toBe(".jlgcli.json");
    });

    it("should define VALID_BACKENDS", () => {
      expect(VALID_BACKENDS).toContain("copilot");
      expect(VALID_BACKENDS).toContain("codex");
    });

    it("should define VALID_COMPLETION_MODES", () => {
      expect(VALID_COMPLETION_MODES).toContain("marker");
      expect(VALID_COMPLETION_MODES).toContain("json");
    });

    it("should define CONFIG_KEYS", () => {
      expect(CONFIG_KEYS).toContain("backend");
      expect(CONFIG_KEYS).toContain("maxIterations");
      expect(CONFIG_KEYS).toContain("timeoutMs");
      expect(CONFIG_KEYS).toContain("completionMode");
      expect(CONFIG_KEYS).toContain("noProgressLimit");
    });
  });

  describe("isValidConfig", () => {
    it("should return true for a valid complete config", () => {
      const config: ResolvedConfig = {
        backend: "copilot",
        maxIterations: 10,
        timeoutMs: 60000,
        completionMode: "marker",
        noProgressLimit: 3,
      };
      expect(isValidConfig(config)).toBe(true);
    });

    it("should return true for a valid partial config", () => {
      expect(isValidConfig({ backend: "codex" })).toBe(true);
      expect(isValidConfig({ maxIterations: 5 })).toBe(true);
      expect(isValidConfig({ completionMode: "json" })).toBe(true);
    });

    it("should return true for an empty object", () => {
      expect(isValidConfig({})).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValidConfig(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidConfig(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(isValidConfig("string")).toBe(false);
      expect(isValidConfig(123)).toBe(false);
      expect(isValidConfig(true)).toBe(false);
    });

    it("should return false for invalid backend", () => {
      expect(isValidConfig({ backend: "invalid" })).toBe(false);
      expect(isValidConfig({ backend: 123 })).toBe(false);
    });

    it("should return false for maxIterations <= 0", () => {
      expect(isValidConfig({ maxIterations: 0 })).toBe(false);
      expect(isValidConfig({ maxIterations: -1 })).toBe(false);
    });

    it("should return false for timeoutMs <= 0", () => {
      expect(isValidConfig({ timeoutMs: 0 })).toBe(false);
      expect(isValidConfig({ timeoutMs: -100 })).toBe(false);
    });

    it("should return false for invalid completionMode", () => {
      expect(isValidConfig({ completionMode: "invalid" })).toBe(false);
      expect(isValidConfig({ completionMode: 123 })).toBe(false);
    });

    it("should return false for noProgressLimit < 0", () => {
      expect(isValidConfig({ noProgressLimit: -1 })).toBe(false);
    });

    it("should return true for noProgressLimit = 0", () => {
      expect(isValidConfig({ noProgressLimit: 0 })).toBe(true);
    });
  });
});
```

**Validation** : `npm test`

## Contraintes

- **Conventions de nommage** : fichiers en kebab-case, types en PascalCase, constantes en SCREAMING_SNAKE_CASE
- **TypeScript strict** : `strict: true` activé, pas de `any`
- **ESM** : imports avec extensions `.js` pour compatibilité NodeNext
- **Documentation** : JSDoc pour les exports publics
- **Immutabilité** : utiliser `readonly` pour les tableaux de constantes

## Definition of Done

- [ ] Fichier `project/src/config/schema.ts` créé avec tous les types
- [ ] Fichier `project/tests/unit/config.test.ts` créé avec tests
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] `npm test` réussit
- [ ] Aucune erreur lint (`npm run lint`)
- [ ] Tâche `id010` cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Modèle de données
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests
- [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md) — Chemins de configuration
