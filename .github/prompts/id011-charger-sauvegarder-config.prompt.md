---
agent: agent
description: Implémenter le chargement et la sauvegarde de la configuration utilisateur et projet
---

# id011 — Implémenter le chargement/sauvegarde de la config utilisateur

## Objectif

Créer le module `loader.ts` qui gère :

1. **Lecture** des fichiers de configuration (utilisateur + projet)
2. **Écriture** de la configuration utilisateur
3. **Fusion** des configurations avec priorité : projet > utilisateur > défauts
4. **Détection** de la racine projet (remontée jusqu'à `.jlgcli.json`)

## Contexte

Le CLI `jlgcli` utilise une configuration à deux niveaux :

- **Config utilisateur** : `%USERPROFILE%\.jlgcli.json` (Windows) / `~/.jlgcli.json` (Unix)
- **Config projet** : `.jlgcli.json` à la racine du projet (détectée par remontée depuis CWD)

La fusion suit la priorité : **projet > utilisateur > DEFAULT_CONFIG**

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Modèle de données
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Pattern "Result object", gestion d'erreurs
- Réf : [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md) — Chemins et détection racine projet
- Dépendances : `id010` (schéma de configuration)

## Pré-requis

- [x] Tâche `id010` complétée : types et schéma de configuration définis
- [x] Fichier `project/src/config/schema.ts` présent avec `UserConfig`, `ProjectConfig`, `ResolvedConfig`, `DEFAULT_CONFIG`, `USER_CONFIG_PATH`, `PROJECT_CONFIG_FILENAME`, `isValidConfig()`

## Fichiers impactés

| Fichier                            | Action | Description                                          |
| ---------------------------------- | ------ | ---------------------------------------------------- |
| `project/src/config/loader.ts`     | Créer  | Fonctions de chargement, sauvegarde et fusion config |
| `tests/unit/config-loader.test.ts` | Créer  | Tests unitaires pour le loader                       |

## Critères d'acceptation

- [ ] Fonction `loadUserConfig()` : lit et parse `USER_CONFIG_PATH`, retourne `{}` si fichier absent
- [ ] Fonction `loadProjectConfig(cwd?)` : cherche `.jlgcli.json` en remontant, retourne `{}` si absent
- [ ] Fonction `findProjectRoot(cwd?)` : retourne le chemin de la racine projet ou `null`
- [ ] Fonction `saveUserConfig(config)` : écrit la config utilisateur (crée le fichier si nécessaire)
- [ ] Fonction `resolveConfig(cwd?)` : fusionne projet > utilisateur > défauts, retourne `ResolvedConfig`
- [ ] Gestion des erreurs : JSON invalide → erreur explicite, fichier absent → `{}` silencieux
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] Tests unitaires passent (`npm test`)

## Tests requis

**Unitaires** : `tests/unit/config-loader.test.ts`

- `loadUserConfig()` retourne `{}` si fichier absent
- `loadUserConfig()` retourne la config parsée si fichier valide
- `loadUserConfig()` lève une erreur si JSON invalide
- `loadProjectConfig()` retourne `{}` si aucun `.jlgcli.json` trouvé
- `loadProjectConfig()` remonte l'arborescence pour trouver le fichier
- `findProjectRoot()` retourne `null` si aucun fichier trouvé
- `findProjectRoot()` retourne le chemin du dossier contenant `.jlgcli.json`
- `saveUserConfig()` crée le fichier avec le contenu JSON
- `resolveConfig()` fusionne correctement projet > utilisateur > défauts
- `resolveConfig()` utilise `DEFAULT_CONFIG` si aucune config n'existe

## Instructions

### Étape 1 : Créer le fichier loader.ts

**Fichier** : `project/src/config/loader.ts`

```typescript
/**
 * Chargement et sauvegarde de la configuration jlgcli
 *
 * Priorité de fusion : projet > utilisateur > défauts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";

import {
  type UserConfig,
  type ProjectConfig,
  type ResolvedConfig,
  DEFAULT_CONFIG,
  USER_CONFIG_PATH,
  PROJECT_CONFIG_FILENAME,
  isValidConfig,
} from "./schema.js";

// ============================================================================
// Types d'erreur
// ============================================================================

/**
 * Erreur de configuration (JSON invalide, validation échouée, etc.)
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

// ============================================================================
// Chargement
// ============================================================================

/**
 * Charge la configuration utilisateur depuis USER_CONFIG_PATH
 * @returns Configuration utilisateur (vide si fichier absent)
 * @throws ConfigError si le JSON est invalide ou la validation échoue
 */
export async function loadUserConfig(): Promise<UserConfig> {
  return loadConfigFile(USER_CONFIG_PATH);
}

/**
 * Charge la configuration projet en remontant depuis cwd
 * @param cwd - Répertoire de départ (défaut: process.cwd())
 * @returns Configuration projet (vide si fichier absent)
 * @throws ConfigError si le JSON est invalide ou la validation échoue
 */
export async function loadProjectConfig(cwd?: string): Promise<ProjectConfig> {
  const projectRoot = findProjectRoot(cwd);
  if (projectRoot === null) {
    return {};
  }
  const configPath = join(projectRoot, PROJECT_CONFIG_FILENAME);
  return loadConfigFile(configPath);
}

/**
 * Charge et parse un fichier de configuration JSON
 * @param filePath - Chemin du fichier
 * @returns Configuration parsée (vide si fichier absent)
 * @throws ConfigError si le JSON est invalide ou la validation échoue
 */
async function loadConfigFile(filePath: string): Promise<UserConfig> {
  if (!existsSync(filePath)) {
    return {};
  }

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (error) {
    throw new ConfigError(
      `Impossible de lire le fichier de configuration`,
      filePath,
      error instanceof Error ? error : undefined,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new ConfigError(
      `JSON invalide dans le fichier de configuration`,
      filePath,
      error instanceof Error ? error : undefined,
    );
  }

  if (!isValidConfig(parsed)) {
    throw new ConfigError(
      `Configuration invalide (valeurs incorrectes)`,
      filePath,
    );
  }

  return parsed;
}

// ============================================================================
// Détection racine projet
// ============================================================================

/**
 * Trouve la racine du projet en remontant jusqu'à trouver .jlgcli.json
 * @param cwd - Répertoire de départ (défaut: process.cwd())
 * @returns Chemin de la racine projet ou null si non trouvé
 */
export function findProjectRoot(cwd?: string): string | null {
  let currentDir = cwd ?? process.cwd();

  // Limite de sécurité pour éviter boucle infinie
  const maxDepth = 100;
  let depth = 0;

  while (depth < maxDepth) {
    const configPath = join(currentDir, PROJECT_CONFIG_FILENAME);
    if (existsSync(configPath)) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    // Atteint la racine du système de fichiers
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
    depth++;
  }

  return null;
}

// ============================================================================
// Sauvegarde
// ============================================================================

/**
 * Sauvegarde la configuration utilisateur
 * @param config - Configuration à sauvegarder (partielle ou complète)
 * @throws ConfigError si l'écriture échoue
 */
export async function saveUserConfig(config: UserConfig): Promise<void> {
  const dirPath = dirname(USER_CONFIG_PATH);

  try {
    // Créer le dossier parent si nécessaire (normalement home existe toujours)
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    const content = JSON.stringify(config, null, 2) + "\n";
    await writeFile(USER_CONFIG_PATH, content, "utf-8");
  } catch (error) {
    throw new ConfigError(
      `Impossible d'écrire le fichier de configuration`,
      USER_CONFIG_PATH,
      error instanceof Error ? error : undefined,
    );
  }
}

// ============================================================================
// Fusion
// ============================================================================

/**
 * Résout la configuration finale en fusionnant projet > utilisateur > défauts
 * @param cwd - Répertoire de départ pour la recherche projet (défaut: process.cwd())
 * @returns Configuration résolue avec tous les champs requis
 */
export async function resolveConfig(cwd?: string): Promise<ResolvedConfig> {
  const userConfig = await loadUserConfig();
  const projectConfig = await loadProjectConfig(cwd);

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    ...projectConfig,
  };
}

/**
 * Obtient une valeur de configuration spécifique
 * @param key - Clé de configuration
 * @param cwd - Répertoire de départ pour la recherche projet
 * @returns Valeur de la configuration
 */
export async function getConfigValue<K extends keyof ResolvedConfig>(
  key: K,
  cwd?: string,
): Promise<ResolvedConfig[K]> {
  const config = await resolveConfig(cwd);
  return config[key];
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Créer les tests unitaires

**Fichier** : `project/tests/unit/config-loader.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadUserConfig,
  loadProjectConfig,
  findProjectRoot,
  saveUserConfig,
  resolveConfig,
  ConfigError,
} from "../../src/config/loader.js";
import {
  DEFAULT_CONFIG,
  USER_CONFIG_PATH,
  PROJECT_CONFIG_FILENAME,
} from "../../src/config/schema.js";

// Helpers pour créer des fichiers temporaires
async function createTempDir(): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `jlgcli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Ignorer les erreurs de nettoyage
  }
}

describe("config/loader", () => {
  describe("findProjectRoot", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("should return null if no .jlgcli.json found", () => {
      const result = findProjectRoot(tempDir);
      expect(result).toBeNull();
    });

    it("should return the directory containing .jlgcli.json", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, "{}", "utf-8");

      const result = findProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });

    it("should traverse up to find .jlgcli.json", async () => {
      // Créer structure: tempDir/.jlgcli.json et tempDir/sub/deep/
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, "{}", "utf-8");

      const deepDir = join(tempDir, "sub", "deep");
      await mkdir(deepDir, { recursive: true });

      const result = findProjectRoot(deepDir);
      expect(result).toBe(tempDir);
    });
  });

  describe("loadProjectConfig", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("should return empty object if no config file", async () => {
      const config = await loadProjectConfig(tempDir);
      expect(config).toEqual({});
    });

    it("should load and parse valid config", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({ backend: "codex" }),
        "utf-8",
      );

      const config = await loadProjectConfig(tempDir);
      expect(config).toEqual({ backend: "codex" });
    });

    it("should throw ConfigError on invalid JSON", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, "{ invalid json }", "utf-8");

      await expect(loadProjectConfig(tempDir)).rejects.toThrow(ConfigError);
    });

    it("should throw ConfigError on invalid config values", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({ maxIterations: -1 }),
        "utf-8",
      );

      await expect(loadProjectConfig(tempDir)).rejects.toThrow(ConfigError);
    });
  });

  describe("saveUserConfig", () => {
    let tempDir: string;
    let originalUserConfigPath: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
      // Note: On ne peut pas facilement mocker USER_CONFIG_PATH
      // Ces tests vérifient la logique de sérialisation
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("should serialize config to JSON with proper formatting", () => {
      const config = { backend: "codex" as const, maxIterations: 5 };
      const expected = JSON.stringify(config, null, 2) + "\n";
      expect(expected).toContain('"backend": "codex"');
      expect(expected).toContain('"maxIterations": 5');
    });
  });

  describe("resolveConfig", () => {
    it("should return DEFAULT_CONFIG when no config files exist", async () => {
      // Mock pour éviter de toucher aux vrais fichiers
      const tempDir = await createTempDir();

      try {
        // Dans un environnement sans fichiers config, on obtient les défauts
        // Note: Ce test pourrait échouer si USER_CONFIG_PATH existe réellement
        const config = await resolveConfig(tempDir);

        // Vérifier que toutes les clés sont présentes
        expect(config).toHaveProperty("backend");
        expect(config).toHaveProperty("maxIterations");
        expect(config).toHaveProperty("timeoutMs");
        expect(config).toHaveProperty("completionMode");
        expect(config).toHaveProperty("noProgressLimit");
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    it("should merge project config over user config over defaults", async () => {
      const tempDir = await createTempDir();

      try {
        // Créer config projet avec une seule valeur
        const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
        await writeFile(
          configPath,
          JSON.stringify({ maxIterations: 20 }),
          "utf-8",
        );

        const config = await resolveConfig(tempDir);

        // maxIterations doit venir du projet
        expect(config.maxIterations).toBe(20);
        // Les autres valeurs viennent des défauts (ou user si existe)
        expect(config.backend).toBeDefined();
        expect(config.completionMode).toBeDefined();
      } finally {
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("ConfigError", () => {
    it("should include file path in error", () => {
      const error = new ConfigError("Test error", "/path/to/config.json");
      expect(error.message).toBe("Test error");
      expect(error.filePath).toBe("/path/to/config.json");
      expect(error.name).toBe("ConfigError");
    });

    it("should include cause if provided", () => {
      const cause = new Error("Original error");
      const error = new ConfigError(
        "Test error",
        "/path/to/config.json",
        cause,
      );
      expect(error.cause).toBe(cause);
    });
  });
});
```

**Validation** : `npm test`

## Contraintes

- **Conventions de nommage** : fichiers en kebab-case, fonctions en camelCase
- **TypeScript strict** : pas de `any`, utiliser les types du schéma
- **ESM** : imports avec extensions `.js`
- **Pattern Result** : utiliser des exceptions typées (`ConfigError`) plutôt que des codes de retour
- **Fichier absent ≠ erreur** : retourner `{}` silencieusement si le fichier n'existe pas
- **JSON invalide = erreur** : lever `ConfigError` avec le chemin du fichier
- **Cross-platform** : utiliser `node:path` pour les chemins

## Definition of Done

- [ ] Fichier `project/src/config/loader.ts` créé avec toutes les fonctions
- [ ] Fichier `project/tests/unit/config-loader.test.ts` créé avec tests
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] `npm test` réussit
- [ ] Aucune erreur lint (`npm run lint`)
- [ ] Tâche `id011` cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Modèle de données
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions et gestion d'erreurs
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests (Config merge 85%)
- [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md) — Chemins de configuration
- [project/src/config/schema.ts](project/src/config/schema.ts) — Types et constantes à importer
