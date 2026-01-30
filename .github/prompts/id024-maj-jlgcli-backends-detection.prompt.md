````markdown
---
agent: agent
description: Mettre à jour `jlgcli backends` pour afficher les statuts réels via `Adapter.isAvailable()`.
---

# id024 — Mettre à jour `jlgcli backends` avec détection réelle (available/missing)

## Objectif

Remplacer la liste statique “unknown/planned” par une détection réelle basée sur les adaptateurs :

- afficher chaque backend (`copilot`, `codex`, `claude`) avec un **statut** parmi `available|missing|unauthenticated|unsupported`
- rester **rapide** (pas de tâches longues)
- garder un output humain lisible (pas besoin d’ajouter `--json` dans cette tâche)

## Contexte

Le projet suit un pattern Ports/Adapters : chaque backend est encapsulé dans un `Adapter` qui expose `isAvailable()`.

- Réf : [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — **F-002 : Liste des backends et diagnostic de disponibilité**
- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — **Contrats d'API (internes) / Adapter**
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — **Gestion des erreurs** + patterns
- Réf : [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md) — Claude visible mais **`unsupported`** au MVP

Dépendances : `id023`

## Pré-requis

- [x] Tâches dépendantes complétées : `id023`
- [ ] Node.js `>= 20` et npm installés (`node --version`, `npm --version`)
- [ ] Dépendances installées : exécuter `npm install` dans `project/`

## Fichiers impactés

| Fichier                               | Action   | Description                                                            |
| ------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `project/src/commands/backends.ts`    | Modifier | Basculer sur le registre d’adaptateurs + détection via `isAvailable()` |
| `project/tests/unit/backends.test.ts` | Modifier | Rendre les tests déterministes en mockant le registre/adapters         |

## Critères d'acceptation

- [ ] `getBackends()` (ou la nouvelle API équivalente) retourne **3** entrées : `copilot`, `codex`, `claude`.
- [ ] Pour chaque backend, le statut affiché provient de `await adapter.isAvailable()`.
- [ ] `claude` apparaît avec le statut **`unsupported`** (MVP).
- [ ] La commande `jlgcli backends` reste rapide (pas de requêtes longues ; seulement des probes légères).
- [ ] Les tests unitaires ne dépendent pas de binaires installés localement.
- [ ] `npm test` passe.

## Tests requis

**Unitaires** : `project/tests/unit/backends.test.ts`

Cas à couvrir :

- retourne bien 3 backends
- mapping des statuts (`available`, `missing`, `unauthenticated`, `unsupported`) dans l’output formaté
- présence de `claude` avec `unsupported`

> Important : ne pas exécuter de vrais binaires dans ces tests. Mockez `getAdapters()`.

## Instructions

### Étape 1 : Basculer `backends` sur le registre d’adaptateurs

**Fichier** : `project/src/commands/backends.ts`

1. Importer le registre :

- `import { getAdapters } from "../adapters/registry.js";`
- importer les types depuis `../adapters/types.js` si utile (`AdapterAvailabilityStatus`, `AdapterId`, etc.)

2. Remplacer le modèle `Backend.status` actuel (`unknown|planned`) par un statut cohérent avec les adapters :

- utiliser `AdapterAvailabilityStatus` (`available|missing|unauthenticated|unsupported`)

3. Conserver un mapping `id -> name` dans `backends.ts` (les `Adapter` n’exposent que `id`). Exemple indicatif :

```ts
const BACKEND_NAMES: Record<AdapterId, string> = {
  copilot: "GitHub Copilot CLI",
  codex: "OpenAI Codex CLI",
  claude: "Anthropic Claude CLI",
};
```

4. Rendre la récupération asynchrone (car `isAvailable()` est async). Deux options acceptées :

- Option A (simple) : `export async function getBackends(): Promise<Backend[]>`
- Option B : garder `getBackends()` sync mais ajouter `getBackendsStatus()` async

Préférer A (plus direct), puis rendre `backendsAction` async.

Exemple indicatif :

```ts
export interface Backend {
  id: AdapterId;
  name: string;
  status: AdapterAvailabilityStatus;
}

export async function getBackends(): Promise<Backend[]> {
  const adapters = getAdapters();

  const backends = await Promise.all(
    adapters.map(async (adapter) => {
      const availability = await adapter.isAvailable();
      return {
        id: adapter.id,
        name: BACKEND_NAMES[adapter.id],
        status: availability.status,
      } satisfies Backend;
    }),
  );

  return backends;
}
```

5. Mettre à jour `formatBackendsOutput()` pour refléter les statuts réels.

- recommandé : icônes distinctes par statut (libre), par ex. :
  - `available` → ✅
  - `missing` → ❌
  - `unauthenticated` → 🔒
  - `unsupported` → ⛔

Conserver une sortie stable et lisible.

6. Mettre à jour `backendsAction()` pour gérer l’async :

```ts
export async function backendsAction(): Promise<void> {
  const backends = await getBackends();
  console.log(formatBackendsOutput(backends));
}
```

Commander supporte une `.action(async () => { ... })`.

**Validation** : `npm run typecheck`

### Étape 2 : Mettre à jour les tests unitaires

**Fichier** : `project/tests/unit/backends.test.ts`

Objectif : tests déterministes sans dépendre des binaires (`gh`, `copilot`, `codex`, etc.).

Stratégie recommandée : mocker le module `src/adapters/registry.js` avant d’importer la commande.

Exemple indicatif :

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/adapters/registry.js", () => {
  return {
    getAdapters: () => [
      { id: "copilot", isAvailable: async () => ({ status: "available" }) },
      { id: "codex", isAvailable: async () => ({ status: "missing" }) },
      { id: "claude", isAvailable: async () => ({ status: "unsupported" }) },
    ],
  };
});

// Importer APRÈS le mock
import {
  getBackends,
  formatBackendsOutput,
} from "../../src/commands/backends.js";
```

Mettez ensuite à jour les assertions pour :

- attendre `await getBackends()`
- vérifier que l’output contient les statuts et les ids
- vérifier que `claude` est `unsupported`

**Validation** : `npm test`

### Étape 3 : Mettre à jour le suivi

- Cocher `id024` dans [TODO.md](TODO.md)

## Contraintes

- Respecter les conventions ESM du repo : imports internes avec extension `.js`
- Ne pas introduire de dépendance à l’environnement du dev/CI dans les tests (tout doit être mocké)
- Ne pas ajouter d’abstraction prématurée : cette commande doit rester simple
- Garder une exécution rapide (< 1s typique)

## Definition of Done

- [ ] Code conforme aux guidelines : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [ ] Tests OK : `npm test`
- [ ] Typecheck OK : `npm run typecheck`
- [ ] Tâche cochée : `id024` dans [TODO.md](TODO.md)

## Références

- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md)
````
