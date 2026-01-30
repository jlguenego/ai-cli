---
agent: agent
description: Implémenter le parser de complétion mode `marker` qui détecte DONE en dernière ligne
---

# id040 — Implémenter le parser de complétion mode `marker` (DONE)

## Objectif

Créer un module TypeScript qui analyse la sortie textuelle d'un backend et détecte si la dernière ligne contient exactement le marqueur `DONE`. Ce parser retourne un statut `done` ou `continue` pour piloter la boucle d'exécution itérative.

## Contexte

Le CLI `jlgcli` supporte deux modes de complétion pour déterminer si une exécution itérative doit s'arrêter :

- **Mode `marker`** : détection stricte du mot `DONE` en dernière ligne (cette tâche)
- **Mode `json`** : extraction d'un objet JSON final avec un champ `status`

Ce module sera utilisé par le dispatcher de complétion (`id042`) et le runner loop (`id050`).

- Réf : [clarifications/002-contrat-completion-json.md](../../clarifications/002-contrat-completion-json.md) — Contrat de complétion
- Réf : [docs/05-specifications-techniques.md](../../docs/05-specifications-techniques.md) — `CompletionParser` section
- Réf : [docs/06-codage-guidelines.md](../../docs/06-codage-guidelines.md) — Patterns recommandés

## Pré-requis

- [x] Aucune dépendance préalable (première tâche du protocole de complétion)
- [x] Environnement configuré : `npm install` exécuté dans `project/`

## Fichiers impactés

| Fichier                            | Action | Description                     |
| ---------------------------------- | ------ | ------------------------------- |
| `project/src/completion/marker.ts` | Créer  | Parser mode marker              |
| `project/src/completion/types.ts`  | Créer  | Types partagés pour les parsers |

## Critères d'acceptation

- [ ] Fonction `parseMarkerCompletion(text: string): MarkerResult` exportée
- [ ] Retourne `{ status: 'done' }` si et seulement si la dernière ligne non-vide est exactement `DONE`
- [ ] Retourne `{ status: 'continue' }` dans tous les autres cas
- [ ] Gère les cas limites : texte vide, whitespace seul, `DONE` avec espaces autour, multi-lignes
- [ ] Le marqueur `DONE` est **case-sensitive** (minuscules/variantes = continue)
- [ ] TypeScript strict, pas de `any`

## Tests requis

**Unitaires** : `project/tests/unit/completion-marker.test.ts`

Cas à couvrir :

- Texte vide → `continue`
- Texte avec seulement des espaces/newlines → `continue`
- `DONE` seul → `done`
- `DONE` avec espaces avant/après (trimming) → `done`
- `DONE\n` (trailing newline) → `done`
- Multi-lignes avec `DONE` à la fin → `done`
- Multi-lignes avec `DONE` au milieu → `continue`
- `done` (lowercase) → `continue`
- `DONE!` ou `DONE.` → `continue`
- `NOT DONE` → `continue`

## Instructions

### Étape 1 : Créer les types partagés

**Fichier** : `project/src/completion/types.ts`

```typescript
/**
 * Statut de complétion
 */
export type CompletionStatus = "done" | "continue" | "error";

/**
 * Résultat du parser mode marker
 */
export interface MarkerResult {
  status: "done" | "continue";
}

/**
 * Résultat du parser mode JSON (pour id041)
 */
export interface JsonResult {
  status: CompletionStatus;
  summary?: string;
  next?: string;
  error?: string;
}

/**
 * Résultat unifié de complétion
 */
export type CompletionResult = MarkerResult | JsonResult;
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Implémenter le parser marker

**Fichier** : `project/src/completion/marker.ts`

```typescript
import type { MarkerResult } from "./types.js";

/** Marqueur de fin attendu (case-sensitive) */
const DONE_MARKER = "DONE";

/**
 * Extrait la dernière ligne non-vide d'un texte
 * @param text - Le texte à analyser
 * @returns La dernière ligne trimmée, ou chaîne vide si aucune
 */
function getLastNonEmptyLine(text: string): string {
  const lines = text.split(/\r?\n/);

  // Parcourir depuis la fin pour trouver la dernière ligne non-vide
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return "";
}

/**
 * Analyse la sortie d'un backend en mode marker.
 *
 * Retourne `{ status: 'done' }` si et seulement si la dernière ligne
 * non-vide est exactement le marqueur `DONE` (case-sensitive).
 *
 * @param text - La sortie texte du backend
 * @returns Le résultat de complétion (done ou continue)
 *
 * @example
 * parseMarkerCompletion("Hello\nDONE") // { status: 'done' }
 * parseMarkerCompletion("Hello\nDone") // { status: 'continue' }
 * parseMarkerCompletion("DONE\nMore") // { status: 'continue' }
 */
export function parseMarkerCompletion(text: string): MarkerResult {
  const lastLine = getLastNonEmptyLine(text);

  if (lastLine === DONE_MARKER) {
    return { status: "done" };
  }

  return { status: "continue" };
}
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Créer les tests unitaires

**Fichier** : `project/tests/unit/completion-marker.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { parseMarkerCompletion } from "../../src/completion/marker.js";

describe("parseMarkerCompletion", () => {
  describe("should return 'continue'", () => {
    it("when text is empty", () => {
      expect(parseMarkerCompletion("")).toEqual({ status: "continue" });
    });

    it("when text contains only whitespace", () => {
      expect(parseMarkerCompletion("   ")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("\n\n")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("  \n  \n  ")).toEqual({
        status: "continue",
      });
    });

    it("when DONE is not in the last line", () => {
      expect(parseMarkerCompletion("DONE\nMore text")).toEqual({
        status: "continue",
      });
      expect(parseMarkerCompletion("First\nDONE\nLast")).toEqual({
        status: "continue",
      });
    });

    it("when done is lowercase", () => {
      expect(parseMarkerCompletion("done")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("Done")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("dOnE")).toEqual({ status: "continue" });
    });

    it("when DONE has additional characters", () => {
      expect(parseMarkerCompletion("DONE!")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("DONE.")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("NOT DONE")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("DONE:")).toEqual({ status: "continue" });
    });

    it("when DONE is part of a word", () => {
      expect(parseMarkerCompletion("UNDONE")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("DONENESS")).toEqual({ status: "continue" });
    });
  });

  describe("should return 'done'", () => {
    it("when text is exactly DONE", () => {
      expect(parseMarkerCompletion("DONE")).toEqual({ status: "done" });
    });

    it("when DONE is on the last line with leading/trailing spaces", () => {
      expect(parseMarkerCompletion("  DONE  ")).toEqual({ status: "done" });
      expect(parseMarkerCompletion("\tDONE\t")).toEqual({ status: "done" });
    });

    it("when DONE is on the last line with trailing newline", () => {
      expect(parseMarkerCompletion("DONE\n")).toEqual({ status: "done" });
      expect(parseMarkerCompletion("DONE\r\n")).toEqual({ status: "done" });
      expect(parseMarkerCompletion("DONE\n\n")).toEqual({ status: "done" });
    });

    it("when DONE is on the last non-empty line after content", () => {
      expect(parseMarkerCompletion("Some output\nDONE")).toEqual({
        status: "done",
      });
      expect(parseMarkerCompletion("Line 1\nLine 2\nLine 3\nDONE")).toEqual({
        status: "done",
      });
    });

    it("when DONE follows content with trailing empty lines", () => {
      expect(parseMarkerCompletion("Output\nDONE\n")).toEqual({
        status: "done",
      });
      expect(parseMarkerCompletion("Output\nDONE\n\n\n")).toEqual({
        status: "done",
      });
      expect(parseMarkerCompletion("Output\n  DONE  \n  \n")).toEqual({
        status: "done",
      });
    });
  });
});
```

**Validation** : `npm test -- completion-marker`

## Contraintes

- **TypeScript strict** : pas de `any`, types explicites
- **Pure function** : pas d'effets de bord, déterministe
- **Case-sensitive** : seul `DONE` exact est reconnu (pas `done`, `Done`, etc.)
- **Trimming** : les espaces autour de `DONE` sont ignorés
- **Multi-plateforme** : gérer `\n` et `\r\n`

## Definition of Done

- [ ] Fichier `project/src/completion/types.ts` créé avec les types
- [ ] Fichier `project/src/completion/marker.ts` créé avec `parseMarkerCompletion`
- [ ] Tests passent (`npm test -- completion-marker`)
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/002-contrat-completion-json.md](../../clarifications/002-contrat-completion-json.md) — Contrat de complétion
- [docs/05-specifications-techniques.md](../../docs/05-specifications-techniques.md) — Spécifications techniques
- [docs/06-codage-guidelines.md](../../docs/06-codage-guidelines.md) — Guidelines de code
- [docs/08-tests-verification.md](../../docs/08-tests-verification.md) — Stratégie de tests
