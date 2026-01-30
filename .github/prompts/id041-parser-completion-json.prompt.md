---
agent: agent
description: Implémenter le parser de complétion mode JSON avec extraction du dernier objet JSON valide
---

# id041 — Implémenter le parser de complétion mode `json`

## Objectif

Créer un parser qui extrait le **dernier objet JSON valide** d'une sortie texte et valide son schéma `{status, summary?, next?}`. Ce parser complète le mode `marker` existant et sera utilisé par le dispatcher de complétion.

## Contexte

Le CLI `jlgcli` supporte deux modes de complétion :

- **marker** (implémenté) : détecte `DONE` en dernière ligne
- **json** (à implémenter) : parse un objet JSON final structuré

- Réf : [clarifications/002-contrat-completion-json.md](clarifications/002-contrat-completion-json.md) — Contrat du mode JSON
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- Réf : [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests (95% couverture cible)
- Code existant : [project/src/completion/marker.ts](project/src/completion/marker.ts) — Parser marker à suivre comme modèle
- Types existants : [project/src/completion/types.ts](project/src/completion/types.ts) — Interface `JsonResult` déjà définie

## Pré-requis

- [ ] Aucune dépendance bloquante
- [ ] Types `JsonResult` et `CompletionStatus` disponibles dans `types.ts`

## Fichiers impactés

| Fichier                                      | Action | Description                               |
| -------------------------------------------- | ------ | ----------------------------------------- |
| `project/src/completion/json.ts`             | Créer  | Parser JSON avec extraction et validation |
| `project/tests/unit/completion-json.test.ts` | Créer  | Tests unitaires du parser                 |

## Critères d'acceptation

- [ ] Extraire le **dernier objet JSON valide** de la sortie (pas forcément dernière ligne)
- [ ] Valider le schéma minimal : `status` ∈ `continue | done | error` (obligatoire)
- [ ] Supporter les champs optionnels : `summary?: string`, `next?: string`
- [ ] Retourner `{ status: 'error', error: 'invalid-json' }` si aucun JSON valide ou schéma invalide
- [ ] Ignorer le texte avant/après l'objet JSON (logs, explications, code fences)
- [ ] Couverture de tests ≥ 95%

## Tests requis

**Unitaires** : `project/tests/unit/completion-json.test.ts`

Cas à couvrir :

| Cas                           | Entrée                                                 | Résultat attendu                                        |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| JSON valide minimal           | `{"status":"done"}`                                    | `{ status: 'done' }`                                    |
| JSON avec summary             | `{"status":"done","summary":"Task completed"}`         | `{ status: 'done', summary: 'Task completed' }`         |
| JSON avec next                | `{"status":"continue","next":"Run tests"}`             | `{ status: 'continue', next: 'Run tests' }`             |
| JSON complet                  | `{"status":"error","summary":"Failed","next":"Retry"}` | `{ status: 'error', summary: 'Failed', next: 'Retry' }` |
| JSON après texte              | `Some logs...\n{"status":"done"}`                      | `{ status: 'done' }`                                    |
| JSON avant texte              | `{"status":"done"}\nMore output`                       | `{ status: 'done' }`                                    |
| Plusieurs JSON (dernier pris) | `{"status":"continue"}\n{"status":"done"}`             | `{ status: 'done' }`                                    |
| JSON dans code fence          | ` ```json\n{"status":"done"}\n``` `                    | `{ status: 'done' }`                                    |
| JSON invalide                 | `{status: done}`                                       | `{ status: 'error', error: 'invalid-json' }`            |
| Pas de JSON                   | `Just some text`                                       | `{ status: 'error', error: 'invalid-json' }`            |
| Status invalide               | `{"status":"unknown"}`                                 | `{ status: 'error', error: 'invalid-json' }`            |
| Status manquant               | `{"summary":"test"}`                                   | `{ status: 'error', error: 'invalid-json' }`            |
| Texte vide                    | ``                                                     | `{ status: 'error', error: 'invalid-json' }`            |
| Whitespace seul               | `   \n\t  `                                            | `{ status: 'error', error: 'invalid-json' }`            |

## Instructions

### Étape 1 : Créer le parser JSON

**Fichier** : `project/src/completion/json.ts`

```typescript
import type { JsonResult, CompletionStatus } from "./types.js";

/** Statuts valides pour le champ status */
const VALID_STATUSES: readonly CompletionStatus[] = [
  "done",
  "continue",
  "error",
];

/**
 * Expression régulière pour trouver des objets JSON dans un texte.
 * Capture les objets qui commencent par { et finissent par }
 */
const JSON_OBJECT_REGEX = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;

/**
 * Vérifie si un objet a un schéma valide pour le résultat de complétion.
 * @param obj - L'objet à valider
 * @returns true si l'objet a un status valide
 */
function isValidCompletionSchema(obj: unknown): obj is JsonResult {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;

  // status est obligatoire et doit être une valeur valide
  if (typeof record.status !== "string") {
    return false;
  }

  if (!VALID_STATUSES.includes(record.status as CompletionStatus)) {
    return false;
  }

  // summary est optionnel mais doit être string si présent
  if (record.summary !== undefined && typeof record.summary !== "string") {
    return false;
  }

  // next est optionnel mais doit être string si présent
  if (record.next !== undefined && typeof record.next !== "string") {
    return false;
  }

  return true;
}

/**
 * Extrait tous les objets JSON valides d'un texte.
 * @param text - Le texte à analyser
 * @returns Un tableau d'objets parsés avec succès
 */
function extractJsonObjects(text: string): unknown[] {
  const matches = text.match(JSON_OBJECT_REGEX);
  if (!matches) {
    return [];
  }

  const parsed: unknown[] = [];
  for (const match of matches) {
    try {
      const obj = JSON.parse(match) as unknown;
      parsed.push(obj);
    } catch {
      // Ignorer les matches qui ne sont pas du JSON valide
    }
  }

  return parsed;
}

/**
 * Analyse la sortie d'un backend en mode JSON.
 *
 * Extrait le dernier objet JSON valide de la sortie et vérifie
 * qu'il respecte le schéma `{status, summary?, next?}`.
 *
 * @param text - La sortie texte du backend
 * @returns Le résultat de complétion ou une erreur si parsing échoue
 *
 * @example
 * parseJsonCompletion('{"status":"done"}') // { status: 'done' }
 * parseJsonCompletion('logs\n{"status":"continue","next":"step2"}')
 *   // { status: 'continue', next: 'step2' }
 * parseJsonCompletion('no json') // { status: 'error', error: 'invalid-json' }
 */
export function parseJsonCompletion(text: string): JsonResult {
  const jsonObjects = extractJsonObjects(text);

  // Parcourir depuis la fin pour trouver le dernier objet valide
  for (let i = jsonObjects.length - 1; i >= 0; i--) {
    const obj = jsonObjects[i];
    if (isValidCompletionSchema(obj)) {
      // Construire le résultat avec uniquement les champs valides
      const result: JsonResult = { status: obj.status };
      if (obj.summary !== undefined) {
        result.summary = obj.summary;
      }
      if (obj.next !== undefined) {
        result.next = obj.next;
      }
      return result;
    }
  }

  // Aucun JSON valide trouvé
  return { status: "error", error: "invalid-json" };
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Créer les tests unitaires

**Fichier** : `project/tests/unit/completion-json.test.ts`

````typescript
import { describe, it, expect } from "vitest";
import { parseJsonCompletion } from "../../src/completion/json.js";

describe("parseJsonCompletion", () => {
  describe("JSON valide minimal", () => {
    it("should return done when status is done", () => {
      const result = parseJsonCompletion('{"status":"done"}');
      expect(result).toEqual({ status: "done" });
    });

    it("should return continue when status is continue", () => {
      const result = parseJsonCompletion('{"status":"continue"}');
      expect(result).toEqual({ status: "continue" });
    });

    it("should return error when status is error", () => {
      const result = parseJsonCompletion('{"status":"error"}');
      expect(result).toEqual({ status: "error" });
    });
  });

  describe("JSON avec champs optionnels", () => {
    it("should include summary when present", () => {
      const result = parseJsonCompletion(
        '{"status":"done","summary":"Task completed"}',
      );
      expect(result).toEqual({ status: "done", summary: "Task completed" });
    });

    it("should include next when present", () => {
      const result = parseJsonCompletion(
        '{"status":"continue","next":"Run tests"}',
      );
      expect(result).toEqual({ status: "continue", next: "Run tests" });
    });

    it("should include both summary and next when present", () => {
      const result = parseJsonCompletion(
        '{"status":"error","summary":"Failed","next":"Retry"}',
      );
      expect(result).toEqual({
        status: "error",
        summary: "Failed",
        next: "Retry",
      });
    });
  });

  describe("extraction du dernier JSON", () => {
    it("should extract JSON after text", () => {
      const result = parseJsonCompletion('Some logs...\n{"status":"done"}');
      expect(result).toEqual({ status: "done" });
    });

    it("should extract JSON before text", () => {
      const result = parseJsonCompletion('{"status":"done"}\nMore output');
      expect(result).toEqual({ status: "done" });
    });

    it("should use the last valid JSON when multiple present", () => {
      const result = parseJsonCompletion(
        '{"status":"continue"}\nsome text\n{"status":"done"}',
      );
      expect(result).toEqual({ status: "done" });
    });

    it("should extract JSON from code fence", () => {
      const result = parseJsonCompletion('```json\n{"status":"done"}\n```');
      expect(result).toEqual({ status: "done" });
    });

    it("should handle JSON embedded in explanation", () => {
      const text = `
I've completed the task. Here's the result:
{"status":"done","summary":"All tests pass"}
Let me know if you need anything else.
      `;
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done", summary: "All tests pass" });
    });
  });

  describe("gestion des erreurs", () => {
    it("should return error for malformed JSON", () => {
      const result = parseJsonCompletion("{status: done}");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when no JSON present", () => {
      const result = parseJsonCompletion("Just some text without JSON");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error for invalid status value", () => {
      const result = parseJsonCompletion('{"status":"unknown"}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when status is missing", () => {
      const result = parseJsonCompletion('{"summary":"test"}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error for empty string", () => {
      const result = parseJsonCompletion("");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error for whitespace only", () => {
      const result = parseJsonCompletion("   \n\t  ");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when status is not a string", () => {
      const result = parseJsonCompletion('{"status":123}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when summary is not a string", () => {
      const result = parseJsonCompletion('{"status":"done","summary":123}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when next is not a string", () => {
      const result = parseJsonCompletion('{"status":"done","next":true}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });
  });

  describe("cas limites", () => {
    it("should handle JSON with extra fields (ignore them)", () => {
      const result = parseJsonCompletion(
        '{"status":"done","extra":"ignored","summary":"ok"}',
      );
      expect(result).toEqual({ status: "done", summary: "ok" });
      expect(result).not.toHaveProperty("extra");
    });

    it("should handle nested JSON objects (use last valid)", () => {
      const text = '{"data":{"status":"continue"}}\n{"status":"done"}';
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done" });
    });

    it("should handle JSON with unicode characters", () => {
      const result = parseJsonCompletion(
        '{"status":"done","summary":"Tâche terminée ✓"}',
      );
      expect(result).toEqual({ status: "done", summary: "Tâche terminée ✓" });
    });

    it("should handle JSON with escaped quotes", () => {
      const result = parseJsonCompletion(
        '{"status":"done","summary":"Said \\"hello\\""}',
      );
      expect(result).toEqual({ status: "done", summary: 'Said "hello"' });
    });

    it("should skip invalid JSON and use valid one", () => {
      const text = '{invalid}\n{"status":"done"}';
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done" });
    });
  });
});
````

**Validation** : `npm test -- completion-json`

### Étape 3 : Vérifier la compilation et les tests

```bash
cd project
npx tsc --noEmit
npm test -- completion-json
npm run lint
```

## Contraintes

- **Pure function** : pas d'effets de bord, pas d'I/O
- **Typage strict** : utiliser les types de `types.ts`, pas de `any`
- **Cohérence** : suivre le style de `marker.ts` (documentation JSDoc, structure similaire)
- **Performance** : la regex doit gérer des sorties de taille raisonnable (<1MB)
- **Robustesse** : ne jamais lever d'exception, toujours retourner un `JsonResult`

## Definition of Done

- [ ] Fichier `project/src/completion/json.ts` créé avec `parseJsonCompletion()`
- [ ] Fichier `project/tests/unit/completion-json.test.ts` créé avec tous les cas de test
- [ ] `npx tsc --noEmit` réussit sans erreur
- [ ] `npm test -- completion-json` passe (tous les tests verts)
- [ ] `npm run lint` passe sans erreur
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/002-contrat-completion-json.md](clarifications/002-contrat-completion-json.md) — Contrat mode JSON
- [project/src/completion/marker.ts](project/src/completion/marker.ts) — Parser marker (modèle)
- [project/src/completion/types.ts](project/src/completion/types.ts) — Types partagés
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests
