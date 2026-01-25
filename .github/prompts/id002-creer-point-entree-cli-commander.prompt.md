---
agent: agent
description: Créer le point d'entrée CLI avec commander et la commande jlgcli --version
---

# id002 — Créer le point d'entrée CLI avec commander

## Objectif

Mettre en place le point d'entrée principal du CLI `jlgcli` en utilisant la bibliothèque `commander`. L'exécution de `jlgcli --version` doit afficher la version du package, et `jlgcli --help` doit lister les options disponibles.

## Contexte

Le projet `@jlguenego/ai-cli` est un CLI pour orchestrer des agents IA via des backends externes. La structure de base (package.json, tsconfig.json) est déjà en place.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Stack technique (commander ^12.x)
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Structure projet et conventions
- Dépendances : `id001` (complétée ✅)

## Pré-requis

- [x] Tâche dépendante complétée : `id001`
- [ ] Dépendances installées : `npm install` exécuté dans `project/`

## Fichiers impactés

| Fichier                | Action   | Description                                    |
| ---------------------- | -------- | ---------------------------------------------- |
| `project/src/cli.ts`   | Créer    | Point d'entrée CLI, configuration commander    |
| `project/src/index.ts` | Modifier | Exporter VERSION et éléments publics de la lib |

## Critères d'acceptation

- [ ] Le fichier `project/src/cli.ts` existe et configure `commander`
- [ ] `npx tsc` compile sans erreur
- [ ] `node dist/cli.js --version` affiche `0.1.0`
- [ ] `node dist/cli.js --help` affiche l'aide avec description du CLI
- [ ] Le shebang `#!/usr/bin/env node` est présent en première ligne de `cli.ts`
- [ ] Le code suit les conventions de nommage (camelCase pour fonctions/variables)

## Tests requis

**Unitaires** : `project/tests/unit/cli.test.ts` — cas à couvrir :

- Import du module CLI sans erreur
- VERSION exportée correspond à "0.1.0"

**E2E** (smoke test) : Exécution du binaire compilé :

- `node dist/cli.js --version` retourne exit code 0 et affiche la version
- `node dist/cli.js --help` retourne exit code 0

## Instructions

### Étape 1 : Mettre à jour index.ts

**Fichier** : `project/src/index.ts`

```typescript
/**
 * @jlguenego/ai-cli
 * CLI pour orchestrer des agents IA via des backends externes.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Lit la version depuis package.json.
 */
function getPackageVersion(): string {
  const packagePath = join(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
  return pkg.version;
}

export const VERSION = getPackageVersion();
export const NAME = "@jlguenego/ai-cli";
export const CLI_NAME = "jlgcli";
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Créer cli.ts

**Fichier** : `project/src/cli.ts`

```typescript
#!/usr/bin/env node
/**
 * Point d'entrée CLI pour jlgcli.
 * Configure commander et dispatche les commandes.
 */

import { Command } from "commander";
import { VERSION, NAME, CLI_NAME } from "./index.js";

/**
 * Crée et configure le programme CLI principal.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name(CLI_NAME)
    .description("CLI pour orchestrer des agents IA via des backends externes")
    .version(VERSION, "-v, --version", "Affiche la version")
    .helpOption("-h, --help", "Affiche l'aide");

  return program;
}

/**
 * Point d'entrée principal.
 */
function main(): void {
  const program = createProgram();
  program.parse(process.argv);
}

main();
```

**Validation** :

```bash
npx tsc
node dist/cli.js --version
node dist/cli.js --help
```

### Étape 3 : Créer le test unitaire

**Fichier** : `project/tests/unit/cli.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { VERSION, NAME, CLI_NAME } from "../../src/index.js";

describe("CLI Module", () => {
  describe("Exports", () => {
    it("should export VERSION matching package.json", () => {
      expect(VERSION).toBe("0.1.0");
    });

    it("should export NAME as @jlguenego/ai-cli", () => {
      expect(NAME).toBe("@jlguenego/ai-cli");
    });

    it("should export CLI_NAME as jlgcli", () => {
      expect(CLI_NAME).toBe("jlgcli");
    });
  });
});
```

**Validation** : `npm test`

## Contraintes

- **Shebang obligatoire** : `#!/usr/bin/env node` en première ligne de `cli.ts` pour l'exécution directe
- **Imports ESM** : Utiliser `.js` dans les imports (ex: `./index.js`) car le projet est en mode ESM
- **Pas de `console.log`** : Utiliser commander pour l'output (version, help)
- **Séparation CLI/Core** : `cli.ts` ne contient que le parsing et le dispatch, pas de logique métier

## Definition of Done

- [ ] Code conforme aux guidelines (`docs/06-codage-guidelines.md`)
- [ ] `npm run build` (ou `npx tsc`) réussit sans erreur
- [ ] `node dist/cli.js --version` affiche `0.1.0`
- [ ] `node dist/cli.js --help` affiche l'aide correctement
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur TypeScript (`npm run typecheck`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Stack technique
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests (E2E-001: smoke --help/--version)
- [Commander.js documentation](https://github.com/tj/commander.js) — API commander
