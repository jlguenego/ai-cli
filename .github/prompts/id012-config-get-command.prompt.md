---
agent: agent
description: Implémenter la commande jlgcli config get <key> pour lire les valeurs de configuration
---

# id012 — Implémenter `jlgcli config get <key>`

## Objectif

Créer la commande `jlgcli config get <key>` qui affiche la valeur résolue d'une clé de configuration.

La commande doit :

1. Accepter une clé de configuration en argument
2. Résoudre la configuration (projet > utilisateur > défauts)
3. Afficher la valeur correspondante sur stdout

## Contexte

Le CLI `jlgcli` permet de gérer la configuration via des sous-commandes. La commande `config get` lit une valeur spécifique.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Endpoints CLI (`jlgcli config get/set/show/path`)
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Structure projet, conventions
- Dépendances : `id011` (chargement/sauvegarde config)

## Pré-requis

- [x] Tâche `id011` complétée : `loadUserConfig()`, `resolveConfig()`, `getConfigValue()` disponibles
- [x] Fichier `project/src/config/schema.ts` avec `CONFIG_KEYS`, `ConfigKey`
- [x] Fichier `project/src/config/loader.ts` avec fonctions de chargement

## Fichiers impactés

| Fichier                             | Action   | Description                                |
| ----------------------------------- | -------- | ------------------------------------------ |
| `project/src/commands/config.ts`    | Créer    | Commande `config` avec sous-commande `get` |
| `project/src/cli.ts`                | Modifier | Enregistrer la commande `config`           |
| `tests/unit/config-command.test.ts` | Créer    | Tests unitaires pour la commande config    |

## Critères d'acceptation

- [ ] `jlgcli config get backend` affiche le backend configuré (ex: `copilot`)
- [ ] `jlgcli config get maxIterations` affiche le nombre max d'itérations (ex: `10`)
- [ ] `jlgcli config get <key>` avec une clé invalide affiche une erreur et exit 1
- [ ] La sortie est la valeur brute (pas de formatage JSON), une valeur par ligne
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] Tests unitaires passent (`npm test`)

## Tests requis

**Unitaires** : `tests/unit/config-command.test.ts`

- `isValidConfigKey()` retourne `true` pour les clés valides
- `isValidConfigKey()` retourne `false` pour les clés invalides
- `formatConfigValue()` formate correctement les valeurs (string, number)
- Test de la logique de la commande get

## Instructions

### Étape 1 : Créer le fichier config.ts

**Fichier** : `project/src/commands/config.ts`

```typescript
/**
 * Commande `jlgcli config` — Gestion de la configuration
 */

import { Command } from "commander";
import { CONFIG_KEYS, type ConfigKey } from "../config/schema.js";
import { getConfigValue, ConfigError } from "../config/loader.js";

/**
 * Vérifie si une chaîne est une clé de configuration valide
 */
export function isValidConfigKey(key: string): key is ConfigKey {
  return CONFIG_KEYS.includes(key as ConfigKey);
}

/**
 * Formate une valeur de configuration pour l'affichage
 */
export function formatConfigValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Enregistre la commande `config` et ses sous-commandes
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command("config")
    .description("Gérer la configuration de jlgcli");

  // Sous-commande: config get <key>
  configCmd
    .command("get <key>")
    .description("Affiche la valeur d'une clé de configuration")
    .action(async (key: string) => {
      await handleConfigGet(key);
    });
}

/**
 * Handler pour `config get <key>`
 */
async function handleConfigGet(key: string): Promise<void> {
  // Valider la clé
  if (!isValidConfigKey(key)) {
    console.error(`Erreur: Clé de configuration invalide: "${key}"`);
    console.error(`Clés valides: ${CONFIG_KEYS.join(", ")}`);
    process.exit(1);
  }

  try {
    const value = await getConfigValue(key);
    console.log(formatConfigValue(value));
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Erreur de configuration: ${error.message}`);
      console.error(`Fichier: ${error.filePath}`);
      process.exit(1);
    }
    throw error;
  }
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Modifier cli.ts pour enregistrer la commande

**Fichier** : `project/src/cli.ts`

Ajouter l'import et l'enregistrement de la commande config :

```typescript
import { registerConfigCommand } from "./commands/config.js";

// Dans createProgram(), après registerBackendsCommand:
registerConfigCommand(program);
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/config-command.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  isValidConfigKey,
  formatConfigValue,
} from "../../src/commands/config.js";
import { CONFIG_KEYS } from "../../src/config/schema.js";

describe("commands/config", () => {
  describe("isValidConfigKey", () => {
    it("should return true for all valid config keys", () => {
      for (const key of CONFIG_KEYS) {
        expect(isValidConfigKey(key)).toBe(true);
      }
    });

    it("should return false for invalid keys", () => {
      expect(isValidConfigKey("invalidKey")).toBe(false);
      expect(isValidConfigKey("")).toBe(false);
      expect(isValidConfigKey("Backend")).toBe(false); // case sensitive
    });
  });

  describe("formatConfigValue", () => {
    it("should format string values as-is", () => {
      expect(formatConfigValue("copilot")).toBe("copilot");
      expect(formatConfigValue("marker")).toBe("marker");
    });

    it("should format number values as string", () => {
      expect(formatConfigValue(10)).toBe("10");
      expect(formatConfigValue(300000)).toBe("300000");
    });

    it("should format other values as JSON", () => {
      expect(formatConfigValue(true)).toBe("true");
      expect(formatConfigValue({ key: "value" })).toBe('{"key":"value"}');
    });
  });
});
```

**Validation** : `npm test`

## Contraintes

- **Conventions de nommage** : fichiers en kebab-case, fonctions en camelCase
- **TypeScript strict** : utiliser les types du schéma (`ConfigKey`)
- **ESM** : imports avec extensions `.js`
- **Sortie stdout** : valeur brute uniquement (pas de préfixe, pas de JSON)
- **Sortie stderr** : messages d'erreur
- **Exit codes** : 0 = succès, 1 = erreur

## Definition of Done

- [ ] Fichier `project/src/commands/config.ts` créé avec `registerConfigCommand()`
- [ ] Fichier `project/src/cli.ts` modifié pour enregistrer la commande
- [ ] Fichier `project/tests/unit/config-command.test.ts` créé avec tests
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] `npm test` réussit
- [ ] Tâche `id012` cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Endpoints CLI
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [project/src/config/schema.ts](project/src/config/schema.ts) — Types et constantes
- [project/src/config/loader.ts](project/src/config/loader.ts) — Fonctions de chargement
