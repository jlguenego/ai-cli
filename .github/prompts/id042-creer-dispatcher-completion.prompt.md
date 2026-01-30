---
agent: agent
description: Créer le dispatcher parseCompletion(text, mode) qui délègue au parser approprié
---

# id042 — Créer le dispatcher de complétion selon config

## Objectif

Implémenter une fonction `parseCompletion(text, mode)` qui agit comme dispatcher et délègue au parser approprié (`marker` ou `json`) selon le mode configuré. Cette fonction unifie l'interface de parsing de complétion pour le runner.

## Contexte

Le CLI `jlgcli` supporte deux modes de détection de complétion :

- **marker** : détecte le marqueur `DONE` en dernière ligne (implémenté dans `id040`)
- **json** : extrait le dernier objet JSON valide avec `{status, summary?, next?}` (implémenté dans `id041`)

Le dispatcher doit fournir une interface unifiée `parseCompletion(text, mode)` retournant un `CompletionResult` uniforme.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Protocole de complétion
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Patterns recommandés (pure functions)
- Réf : [clarifications/002-contrat-completion-json.md](clarifications/002-contrat-completion-json.md) — Contrat JSON
- Dépendances : `id040` (parser marker), `id041` (parser json)

## Pré-requis

- [x] Tâche `id040` complétée : parser `parseMarkerCompletion` disponible
- [x] Tâche `id041` complétée : parser `parseJsonCompletion` disponible

## Fichiers impactés

| Fichier                                 | Action   | Description                                       |
| --------------------------------------- | -------- | ------------------------------------------------- |
| `project/src/completion/index.ts`       | Créer    | Dispatcher `parseCompletion(text, mode)`          |
| `project/src/completion/types.ts`       | Modifier | Ajouter type `CompletionMode` si pas déjà présent |
| `project/tests/unit/completion.test.ts` | Créer    | Tests unitaires du dispatcher                     |

## Critères d'acceptation

- [ ] `parseCompletion(text, 'marker')` délègue à `parseMarkerCompletion`
- [ ] `parseCompletion(text, 'json')` délègue à `parseJsonCompletion`
- [ ] Le type de retour est `CompletionResult` (unifié)
- [ ] L'import depuis `./completion/index.js` expose `parseCompletion`
- [ ] Tests unitaires couvrent les deux modes
- [ ] Aucune erreur TypeScript ni lint

## Tests requis

**Unitaires** : `project/tests/unit/completion.test.ts`

Cas à couvrir :

1. Mode `marker` - délégation correcte (retourne `{ status: 'done' }` ou `{ status: 'continue' }`)
2. Mode `json` - délégation correcte (retourne `JsonResult` avec status/summary/next)
3. Mode `json` - gestion erreur parsing (retourne `{ status: 'error', error: 'invalid-json' }`)
4. Vérifier que le dispatcher est une pure function (pas d'effets de bord)

## Instructions

### Étape 1 : Vérifier les types existants

**Fichier** : `project/src/completion/types.ts`

Vérifier que le fichier contient :

- `CompletionStatus` = `'done' | 'continue' | 'error'`
- `MarkerResult` = `{ status: 'done' | 'continue' }`
- `JsonResult` = `{ status: CompletionStatus, summary?: string, next?: string, error?: string }`
- `CompletionResult` = `MarkerResult | JsonResult`

Si le type `CompletionMode` n'est pas présent, il est déjà défini dans `config/schema.ts` et peut être réutilisé.

### Étape 2 : Créer le dispatcher

**Fichier** : `project/src/completion/index.ts`

```typescript
import type { CompletionMode } from "../config/schema.js";
import type { CompletionResult } from "./types.js";
import { parseMarkerCompletion } from "./marker.js";
import { parseJsonCompletion } from "./json.js";

/**
 * Analyse la sortie d'un backend et détermine si l'exécution doit continuer.
 *
 * Délègue au parser approprié selon le mode configuré :
 * - mode marker: DONE strict en dernière ligne
 * - mode json: parse d'un JSON final { status, summary?, next? }
 *
 * @param text - La sortie texte du backend à analyser
 * @param mode - Le mode de complétion ('marker' ou 'json')
 * @returns Le résultat de complétion unifié
 *
 * @example
 * parseCompletion("Hello\nDONE", "marker") // { status: 'done' }
 * parseCompletion('{"status":"continue"}', "json") // { status: 'continue' }
 */
export function parseCompletion(
  text: string,
  mode: CompletionMode,
): CompletionResult {
  switch (mode) {
    case "marker":
      return parseMarkerCompletion(text);
    case "json":
      return parseJsonCompletion(text);
  }
}

// Ré-exporter les types et fonctions pour faciliter l'import
export type {
  CompletionResult,
  MarkerResult,
  JsonResult,
  CompletionStatus,
} from "./types.js";
export { parseMarkerCompletion } from "./marker.js";
export { parseJsonCompletion } from "./json.js";
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/completion.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { parseCompletion } from "../../src/completion/index.js";

describe("parseCompletion dispatcher", () => {
  describe("mode marker", () => {
    it("should return done when DONE marker is present", () => {
      const result = parseCompletion("Hello\nDONE", "marker");
      expect(result).toEqual({ status: "done" });
    });

    it("should return continue when no DONE marker", () => {
      const result = parseCompletion("Hello world", "marker");
      expect(result).toEqual({ status: "continue" });
    });

    it("should return continue when DONE is not last line", () => {
      const result = parseCompletion("DONE\nMore text", "marker");
      expect(result).toEqual({ status: "continue" });
    });
  });

  describe("mode json", () => {
    it("should return parsed result when valid JSON", () => {
      const result = parseCompletion('{"status":"done"}', "json");
      expect(result).toEqual({ status: "done" });
    });

    it("should return continue with optional fields", () => {
      const result = parseCompletion(
        '{"status":"continue","next":"step2"}',
        "json",
      );
      expect(result).toEqual({ status: "continue", next: "step2" });
    });

    it("should return error when no valid JSON found", () => {
      const result = parseCompletion("no json here", "json");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should extract last valid JSON from mixed content", () => {
      const result = parseCompletion(
        'logs...\n{"status":"done","summary":"All good"}',
        "json",
      );
      expect(result).toEqual({ status: "done", summary: "All good" });
    });
  });

  describe("dispatcher behavior", () => {
    it("should be a pure function (same input = same output)", () => {
      const text = "Test\nDONE";
      const result1 = parseCompletion(text, "marker");
      const result2 = parseCompletion(text, "marker");
      expect(result1).toEqual(result2);
    });

    it("should handle empty text in marker mode", () => {
      const result = parseCompletion("", "marker");
      expect(result).toEqual({ status: "continue" });
    });

    it("should handle empty text in json mode", () => {
      const result = parseCompletion("", "json");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });
  });
});
```

**Validation** : `npm test -- completion.test.ts`

### Étape 4 : Vérifier l'intégration

Exécuter la suite complète de tests pour s'assurer que le dispatcher n'introduit pas de régression :

```bash
cd project
npm test
npm run lint
```

## Contraintes

- **Pure function** : le dispatcher ne doit avoir aucun effet de bord (cf. `docs/06-codage-guidelines.md`)
- **Exhaustive switch** : TypeScript doit garantir que tous les cas de `CompletionMode` sont traités
- **Pas de default** : ne pas utiliser de clause `default` pour bénéficier du contrôle exhaustif
- **Imports ESM** : utiliser l'extension `.js` pour les imports locaux

## Definition of Done

- [ ] Fichier `project/src/completion/index.ts` créé avec `parseCompletion`
- [ ] Tests dans `project/tests/unit/completion.test.ts` passent
- [ ] `npm test` réussit (tous les tests passent)
- [ ] `npm run lint` réussit (aucune erreur lint/TS)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Architecture technique
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code (pure functions)
- [clarifications/002-contrat-completion-json.md](clarifications/002-contrat-completion-json.md) — Contrat JSON
- [project/src/completion/marker.ts](project/src/completion/marker.ts) — Parser mode marker
- [project/src/completion/json.ts](project/src/completion/json.ts) — Parser mode JSON
- [project/src/completion/types.ts](project/src/completion/types.ts) — Types de complétion
