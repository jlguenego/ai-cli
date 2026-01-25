---
agent: agent
description: Implémenter la commande jlgcli backends affichant une liste statique des backends supportés
---

# id003 — Implémenter la commande `jlgcli backends` (liste statique)

## Objectif

Créer la commande `jlgcli backends` qui affiche une liste statique des backends supportés par le CLI. Cette version initiale ne détecte pas encore la disponibilité réelle des backends (ce sera fait dans `id024`).

## Contexte

Le CLI `jlgcli` doit permettre aux utilisateurs de voir quels backends IA sont supportés. Pour le MVP, trois backends sont prévus :

- **copilot** : GitHub Copilot CLI
- **codex** : OpenAI Codex CLI
- **claude** : Anthropic Claude CLI (hors MVP, marqué comme `planned`)

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Section "Endpoints (commandes CLI)" et "Intégrations externes"
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Structure du projet et conventions
- Dépendances : `id002` (CLI de base avec commander)

## Pré-requis

- [x] Tâche `id001` complétée : projet Node.js/TypeScript initialisé
- [x] Tâche `id002` complétée : point d'entrée CLI avec commander fonctionnel
- [ ] Environnement : `npm install` exécuté dans `project/`

## Fichiers impactés

| Fichier                               | Action   | Description                               |
| ------------------------------------- | -------- | ----------------------------------------- |
| `project/src/commands/backends.ts`    | Créer    | Module de la commande backends            |
| `project/src/cli.ts`                  | Modifier | Enregistrer la commande backends          |
| `project/tests/unit/backends.test.ts` | Créer    | Tests unitaires pour la commande backends |

## Critères d'acceptation

- [ ] `jlgcli backends` affiche la liste des 3 backends (copilot, codex, claude)
- [ ] Chaque backend affiche son id et un statut statique (`planned` pour claude, `unknown` pour les autres)
- [ ] Le code suit les conventions de nommage (kebab-case fichiers, camelCase fonctions)
- [ ] La sortie est lisible en mode humain
- [ ] Les tests unitaires passent
- [ ] `npx tsc --noEmit` ne retourne aucune erreur

## Tests requis

**Unitaires** : `project/tests/unit/backends.test.ts`

- `should return list of 3 backends`
- `should include copilot backend with id "copilot"`
- `should include codex backend with id "codex"`
- `should include claude backend with status "planned"`

## Instructions

### Étape 1 : Créer le module backends.ts

**Fichier** : `project/src/commands/backends.ts`

```typescript
/**
 * Commande `jlgcli backends`
 * Affiche la liste des backends supportés.
 */

import { Command } from "commander";

/**
 * Représente un backend supporté par le CLI.
 */
export interface Backend {
  id: string;
  name: string;
  status: "unknown" | "planned";
}

/**
 * Liste statique des backends supportés.
 * Note: La détection réelle (available/missing/unauthenticated) sera ajoutée dans id024.
 */
export const BACKENDS: Backend[] = [
  { id: "copilot", name: "GitHub Copilot CLI", status: "unknown" },
  { id: "codex", name: "OpenAI Codex CLI", status: "unknown" },
  { id: "claude", name: "Anthropic Claude CLI", status: "planned" },
];

/**
 * Retourne la liste des backends supportés.
 */
export function getBackends(): Backend[] {
  return BACKENDS;
}

/**
 * Formate la liste des backends pour affichage humain.
 */
export function formatBackendsOutput(backends: Backend[]): string {
  const lines = backends.map((b) => {
    const statusIcon = b.status === "planned" ? "📅" : "❓";
    return `  ${statusIcon} ${b.id.padEnd(10)} ${b.name} (${b.status})`;
  });
  return ["Backends supportés:", "", ...lines, ""].join("\n");
}

/**
 * Handler de la commande backends.
 */
export function backendsAction(): void {
  const backends = getBackends();
  const output = formatBackendsOutput(backends);
  console.log(output);
}

/**
 * Enregistre la commande backends sur le programme commander.
 */
export function registerBackendsCommand(program: Command): void {
  program
    .command("backends")
    .description("Liste les backends IA supportés")
    .action(backendsAction);
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Modifier cli.ts pour enregistrer la commande

**Fichier** : `project/src/cli.ts`

Ajouter l'import et l'enregistrement de la commande backends :

```typescript
#!/usr/bin/env node
/**
 * Point d'entrée CLI pour jlgcli.
 * Configure commander et dispatche les commandes.
 */

import { Command } from "commander";
import { VERSION, NAME, CLI_NAME } from "./index.js";
import { registerBackendsCommand } from "./commands/backends.js";

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

  // Enregistrer les commandes
  registerBackendsCommand(program);

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

**Validation** : `npx tsc --noEmit && node dist/cli.js backends`

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/backends.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  getBackends,
  formatBackendsOutput,
  BACKENDS,
  Backend,
} from "../../src/commands/backends.js";

describe("backends command", () => {
  describe("getBackends", () => {
    it("should return list of 3 backends", () => {
      const backends = getBackends();
      expect(backends).toHaveLength(3);
    });

    it("should include copilot backend with id 'copilot'", () => {
      const backends = getBackends();
      const copilot = backends.find((b) => b.id === "copilot");
      expect(copilot).toBeDefined();
      expect(copilot?.name).toBe("GitHub Copilot CLI");
    });

    it("should include codex backend with id 'codex'", () => {
      const backends = getBackends();
      const codex = backends.find((b) => b.id === "codex");
      expect(codex).toBeDefined();
      expect(codex?.name).toBe("OpenAI Codex CLI");
    });

    it("should include claude backend with status 'planned'", () => {
      const backends = getBackends();
      const claude = backends.find((b) => b.id === "claude");
      expect(claude).toBeDefined();
      expect(claude?.status).toBe("planned");
    });
  });

  describe("formatBackendsOutput", () => {
    it("should format backends for human-readable output", () => {
      const output = formatBackendsOutput(BACKENDS);
      expect(output).toContain("Backends supportés:");
      expect(output).toContain("copilot");
      expect(output).toContain("codex");
      expect(output).toContain("claude");
    });

    it("should show planned icon for planned backends", () => {
      const output = formatBackendsOutput(BACKENDS);
      expect(output).toContain("📅");
    });

    it("should show unknown icon for unknown status backends", () => {
      const output = formatBackendsOutput(BACKENDS);
      expect(output).toContain("❓");
    });
  });
});
```

**Validation** : `npm test`

## Contraintes

- Utiliser les conventions de [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) :
  - Fichiers en kebab-case
  - Fonctions en camelCase
  - Types exportés avec `export interface`
- Respecter la séparation CLI/core : la logique métier (`getBackends`, `formatBackendsOutput`) est séparée de l'action commander
- Ne pas implémenter la détection réelle des backends (réservé à `id024`)
- Écrire les logs sur stderr, réserver stdout pour la sortie résultat

## Definition of Done

- [ ] Fichier `project/src/commands/backends.ts` créé avec les fonctions exportées
- [ ] `project/src/cli.ts` modifié pour enregistrer la commande
- [ ] Tests unitaires créés dans `project/tests/unit/backends.test.ts`
- [ ] `npm test` passe sans erreur
- [ ] `npx tsc --noEmit` passe sans erreur
- [ ] `node dist/cli.js backends` affiche la liste des backends
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Stack technique et endpoints CLI
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code et structure projet
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests (INT-001 lié)
