---
agent: agent
description: Initialiser le projet Node.js >= 20 avec TypeScript 5.x, ESM, et Vitest
---

# id001 — Initialiser le projet Node.js/TypeScript avec package.json

## Objectif

Créer la structure de base du projet `@jlguenego/ai-cli` avec Node.js >= 20, TypeScript 5.x, mode ESM, et Vitest pour les tests.

## Contexte

CLI `jlgcli` pour orchestrer des agents IA via des backends externes (Copilot, Codex, Claude).

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Stack technique
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Structure projet et conventions
- Réf : [clarifications/006-stack-outillage-node-tests-ci.md](clarifications/006-stack-outillage-node-tests-ci.md) — Décisions Node >= 20, Vitest, pino
- Dépendances : aucune

## Pré-requis

- [ ] Node.js >= 20 installé (`node --version`)
- [ ] npm >= 10 installé (`npm --version`)

## Fichiers impactés

| Fichier                 | Action | Description                          |
| ----------------------- | ------ | ------------------------------------ |
| `project/package.json`  | Créer  | Manifest npm avec ESM et scripts     |
| `project/tsconfig.json` | Créer  | Configuration TypeScript stricte     |
| `project/src/index.ts`  | Créer  | Point d'entrée (placeholder minimal) |

## Critères d'acceptation

- [ ] `npm install` réussit sans erreurs
- [ ] `npx tsc --noEmit` réussit (compilation TypeScript valide)
- [ ] ESM activé (`"type": "module"` dans package.json)
- [ ] Target ES2022+ dans tsconfig.json
- [ ] `strict: true` activé dans tsconfig.json
- [ ] Vitest configuré comme test runner
- [ ] Node >= 20 spécifié dans engines

## Tests requis

**Unitaires** : Aucun test spécifique pour cette tâche d'initialisation.

**Validation manuelle** :

- `npm install` sans erreurs
- `npx tsc --noEmit` sans erreurs
- `npm test` (doit fonctionner même sans tests)

## Instructions

### Étape 1 : Créer la structure de dossiers

```
project/
├── src/
│   └── index.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── tsconfig.json
```

### Étape 2 : Créer package.json

**Fichier** : `project/package.json`

```json
{
  "name": "@jlguenego/ai-cli",
  "version": "0.1.0",
  "description": "CLI pour orchestrer des agents IA via des backends externes",
  "type": "module",
  "bin": {
    "jlgcli": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "keywords": ["cli", "ai", "copilot", "codex", "agent"],
  "author": "Jean-Louis GUENEGO",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "execa": "^9.0.0",
    "pino": "^9.0.0"
  }
}
```

**Validation** : Le fichier doit être syntaxiquement valide (JSON parseable).

### Étape 3 : Créer tsconfig.json

**Fichier** : `project/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Validation** : `npx tsc --noEmit` doit réussir.

### Étape 4 : Créer le point d'entrée placeholder

**Fichier** : `project/src/index.ts`

```typescript
/**
 * @jlguenego/ai-cli
 * CLI pour orchestrer des agents IA via des backends externes.
 */

export const VERSION = "0.1.0";
```

**Validation** : `npx tsc --noEmit` doit réussir.

### Étape 5 : Créer les dossiers de tests

**Dossiers** :

- `project/tests/unit/.gitkeep`
- `project/tests/integration/.gitkeep`

### Étape 6 : Installer les dépendances

**Commande** :

```bash
cd project && npm install
```

**Validation** : L'installation doit réussir sans erreurs.

### Étape 7 : Vérifier la compilation TypeScript

**Commande** :

```bash
cd project && npx tsc --noEmit
```

**Validation** : Aucune erreur de compilation.

## Contraintes

### Issues de `/docs/06-codage-guidelines.md`

- Fichiers en **kebab-case**
- `strict: true` obligatoire en TypeScript
- Séparer CLI et core pour testabilité
- Logs sur **stderr**, résultats sur **stdout**

### Issues de `/docs/05-specifications-techniques.md`

- Node.js >= 20
- TypeScript ^5.x
- commander ^12.x pour le parsing CLI
- execa ^9.x pour l'exécution de process
- pino pour les logs structurés
- vitest pour les tests

### Erreurs à éviter

- Ne pas oublier `"type": "module"` (ESM obligatoire)
- Ne pas utiliser CommonJS (`require`/`module.exports`)
- Ne pas mettre `any` sans justification

## Definition of Done

- [ ] `project/package.json` créé avec ESM et engines >= 20
- [ ] `project/tsconfig.json` créé avec strict: true et target ES2022
- [ ] `project/src/index.ts` créé (placeholder)
- [ ] `npm install` réussit dans `project/`
- [ ] `npx tsc --noEmit` réussit dans `project/`
- [ ] Structure de dossiers `tests/unit/` et `tests/integration/` créée
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Stack technique complète
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code et structure
- [clarifications/006-stack-outillage-node-tests-ci.md](clarifications/006-stack-outillage-node-tests-ci.md) — Décisions outillage
