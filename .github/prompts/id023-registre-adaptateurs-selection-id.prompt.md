---
agent: agent
description: Ajouter un registre d’adaptateurs (copilot/codex/claude) et une API de sélection par id.
---

# id023 — Créer le registre d'adaptateurs et la sélection par id

## Objectif

Créer un module centralisé qui :

- expose la liste des adaptateurs (au MVP : Copilot + Codex, et Claude en **unsupported**)
- permet de sélectionner un adaptateur par identifiant de manière type-safe
- prépare l’intégration avec les tâches suivantes (`id024`, `id030`) sans imports circulaires

## Contexte

Le CLI doit être extensible via le pattern Ports/Adapters, avec un contrat `Adapter` commun.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — section **Contrats d'API (internes) / Adapter**
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — sections **Patterns recommandés** + **Gestion des erreurs**
- Réf : [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md) — Copilot + Codex au MVP, Claude visible en `unsupported`
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — mapping exit codes (notamment `EX_USAGE=64`)

Dépendances : `id021`, `id022`

## Pré-requis

- [x] Tâches dépendantes complétées : `id021`, `id022`
- [ ] Node.js `>= 20` et npm installés (`node --version`, `npm --version`)
- [ ] Dépendances installées : exécuter `npm install` dans `project/`

## Fichiers impactés

| Fichier                                       | Action | Description                                      |
| --------------------------------------------- | ------ | ------------------------------------------------ |
| `project/src/adapters/registry.ts`            | Créer  | Registre + sélection par id + stub `unsupported` |
| `project/tests/unit/adapter-registry.test.ts` | Créer  | Tests unitaires du registre                      |

## Critères d'acceptation

- [ ] `getAdapters()` retourne une liste stable d’adaptateurs incluant `copilot`, `codex`, `claude`.
- [ ] `getAdapterById(id)` retourne l’instance correspondant exactement à `id`.
- [ ] `tryGetAdapterById(id: string)` retourne `null` si l’id est inconnu (pas d’exception).
- [ ] L’adaptateur `claude` est présent mais renvoie `status: "unsupported"` via `isAvailable()`.
- [ ] `claude.runOnce(...)` retourne `exitCode=64` (backend unsupported) et un message clair.
- [ ] `npm test` passe.

## Tests requis

**Unitaires** : `project/tests/unit/adapter-registry.test.ts`

Cas à couvrir :

- `getAdapters()` contient bien `copilot`, `codex`, `claude`.
- `getAdapterById("copilot")` et `getAdapterById("codex")` retournent un `Adapter` avec le bon `id`.
- `getAdapterById("claude")` retourne un `Adapter` dont `isAvailable()` renvoie `unsupported`.
- `tryGetAdapterById("unknown") === null`.

## Instructions

### Étape 1 : Créer le registre d’adaptateurs

**Fichier** : `project/src/adapters/registry.ts`

Implémenter :

- une constante interne (ou exportée) de type `ReadonlyMap<AdapterId, Adapter>`
- une fonction `getAdapters(): readonly Adapter[]`
- une fonction `getAdapterById(id: AdapterId): Adapter`
- une fonction `tryGetAdapterById(id: string): Adapter | null`

Contraintes :

- Importer les implémentations existantes : `CopilotAdapter`, `CodexAdapter`
- Respecter l’ESM (`.js` dans les imports)
- Ne pas ajouter d’I/O : ce module doit rester un “wiring” simple

Comportement attendu pour `claude` (MVP) :

- Fournir un adaptateur stub (ex : `UnsupportedClaudeAdapter`) qui implémente `Adapter`
- `id` doit être exactement `"claude"`
- `isAvailable()` retourne `{ status: "unsupported", details?: string }`
- `runOnce()` retourne `{ exitCode: 64, text: "...", raw?: ... }`

Exemple de structure (indicatif, libre d’ajuster tant que les exports sont respectés) :

```ts
import type {
  Adapter,
  AdapterId,
  AdapterAvailability,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";
import { CopilotAdapter } from "./copilot.js";
import { CodexAdapter } from "./codex.js";

class UnsupportedClaudeAdapter implements Adapter {
  public readonly id = "claude" as const;

  async isAvailable(): Promise<AdapterAvailability> {
    return { status: "unsupported", details: "Backend claude hors MVP" };
  }

  async runOnce(_args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    return {
      exitCode: 64,
      text: "Backend claude non supporté (MVP)",
      raw: { kind: "unsupported" },
    };
  }
}

// Note TS: préciser les generics évite une mauvaise inférence (CopilotAdapter uniquement).
const REGISTRY: ReadonlyMap<AdapterId, Adapter> = new Map<AdapterId, Adapter>([
  ["copilot", new CopilotAdapter()],
  ["codex", new CodexAdapter()],
  ["claude", new UnsupportedClaudeAdapter()],
]);

export function getAdapters(): readonly Adapter[] {
  return Array.from(REGISTRY.values());
}

export function getAdapterById(id: AdapterId): Adapter {
  // (impl)
}

export function tryGetAdapterById(id: string): Adapter | null {
  // (impl)
}
```

**Validation** : `npm run typecheck`

### Étape 2 : Ajouter les tests unitaires du registre

**Fichier** : `project/tests/unit/adapter-registry.test.ts`

- Utiliser `vitest` (`describe/it/expect`)
- Tests purement synchrones/async selon les APIs appelées
- Ne pas exécuter de vrais binaires : on teste la mécanique du registre, pas `execa`

**Validation** : `npm test`

### Étape 3 : Mettre à jour le suivi

- Cocher `id023` dans [TODO.md](TODO.md)

## Contraintes

- Respecter les guidelines : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- Pas d’abstraction prématurée : un `Map` + quelques fonctions suffit
- Éviter les imports circulaires (le runner/CLI utilisera ce registre, pas l’inverse)
- Conserver une API stable (prépare `id024` : détection statuts, et `id030` : runner)

## Definition of Done

- [ ] Code conforme aux conventions TypeScript/ESM du repo
- [ ] Tests passent : `npm test`
- [ ] Typecheck OK : `npm run typecheck`
- [ ] Tâche cochée : `id023` dans [TODO.md](TODO.md)

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md)
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md)
