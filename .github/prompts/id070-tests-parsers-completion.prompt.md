---
agent: agent
description: Compléter les tests unitaires des parsers de complétion (marker + json) pour atteindre 95% de couverture
---

# id070 — Ajouter les tests unitaires pour les parsers de complétion

## Objectif

Vérifier et compléter les tests unitaires des parsers de complétion (`parseMarkerCompletion` et `parseJsonCompletion`) pour atteindre la couverture cible de 95% définie dans la stratégie de tests.

## Contexte

Les parsers de complétion sont des modules **critiques** qui déterminent si le runner doit continuer ou s'arrêter. Une couverture de 95% est requise.

- Réf : [docs/08-tests-verification.md](docs/08-tests-verification.md) — Couverture cible 95% pour completion parser
- Réf : [clarifications/002-contrat-completion-json.md](clarifications/002-contrat-completion-json.md) — Contrat JSON
- Dépendances : `id042` (dispatcher de complétion) ✅

## Pré-requis

- [x] Tâche dépendante complétée : `id042`
- [x] Fichiers de tests existants avec couverture partielle

## Fichiers impactés

| Fichier                                        | Action   | Description              |
| ---------------------------------------------- | -------- | ------------------------ |
| `project/tests/unit/completion-marker.test.ts` | Modifier | Ajouter tests edge cases |
| `project/tests/unit/completion-json.test.ts`   | Modifier | Ajouter tests edge cases |

## Critères d'acceptation

- [ ] Couverture du module `completion/marker.ts` ≥ 95%
- [ ] Couverture du module `completion/json.ts` ≥ 95%
- [ ] Tous les tests passent (`npm test`)
- [ ] Cas limites documentés dans les clarifications sont couverts

## Tests requis

### Mode Marker — Cas à vérifier

Les tests existants couvrent déjà :

- ✅ Texte vide → continue
- ✅ Whitespace only → continue
- ✅ DONE pas en dernière ligne → continue
- ✅ Lowercase/mixedcase → continue
- ✅ DONE avec caractères additionnels → continue
- ✅ DONE partie d'un mot → continue
- ✅ DONE exact → done
- ✅ DONE avec espaces → done
- ✅ DONE avec newline trailing → done
- ✅ DONE après contenu → done

**Cas potentiellement manquants :**

- CRLF Windows (`\r\n`) dans différentes positions
- Très longues chaînes (performance)
- Caractères spéciaux/unicode avant DONE

### Mode JSON — Cas à vérifier

Les tests existants couvrent déjà :

- ✅ JSON minimal valide (done/continue/error)
- ✅ Champs optionnels (summary, next)
- ✅ Extraction après/avant texte
- ✅ Dernier JSON quand multiples
- ✅ Code fence
- ✅ JSON embarqué dans explication
- ✅ JSON malformé → error
- ✅ Pas de JSON → error
- ✅ Status invalide → error
- ✅ Status manquant → error
- ✅ Texte vide → error
- ✅ Types invalides pour status/summary/next
- ✅ Champs extra (ignorés)
- ✅ JSON imbriqués
- ✅ Unicode
- ✅ Escaped quotes
- ✅ Skip JSON invalide pour trouver valide

**Cas potentiellement manquants :**

- JSON arrays (doivent être ignorés)
- JSON avec nombres/booleans comme valeurs (robustesse)
- Très grand JSON (performance)
- JSON multilignes avec indentation
- JSON dans différents types de code fences (`json vs ` vs ```javascript)

## Instructions

### Étape 1 : Mesurer la couverture actuelle

**Commande** :

```bash
cd project
npm test -- --coverage completion-marker completion-json
```

Analyser le rapport et identifier les lignes non couvertes.

### Étape 2 : Ajouter les tests manquants pour marker

**Fichier** : `project/tests/unit/completion-marker.test.ts`

```typescript
// Ajouter dans le describe "should return 'continue'"
it("when text has mixed line endings (CRLF)", () => {
  expect(parseMarkerCompletion("Line1\r\nLine2\r\nNot done")).toEqual({
    status: "continue",
  });
});

it("when text contains special characters before DONE", () => {
  expect(parseMarkerCompletion("émoji 🎉\nDONE")).toEqual({ status: "done" });
});

// Ajouter dans le describe "should return 'done'"
it("when DONE follows CRLF line endings", () => {
  expect(parseMarkerCompletion("Line1\r\nLine2\r\nDONE")).toEqual({
    status: "done",
  });
  expect(parseMarkerCompletion("Output\r\nDONE\r\n")).toEqual({
    status: "done",
  });
});
```

**Validation** : `npm test -- completion-marker`

### Étape 3 : Ajouter les tests manquants pour JSON

**Fichier** : `project/tests/unit/completion-json.test.ts`

````typescript
// Ajouter dans le describe "cas limites"
it("should ignore JSON arrays", () => {
  const text = '[1,2,3]\n{"status":"done"}';
  const result = parseJsonCompletion(text);
  expect(result).toEqual({ status: "done" });
});

it("should handle multiline JSON with indentation", () => {
  const json = `{
    "status": "done",
    "summary": "All good"
  }`;
  const result = parseJsonCompletion(json);
  expect(result).toEqual({ status: "done", summary: "All good" });
});

it("should handle JSON in different code fence types", () => {
  const text1 = '```\n{"status":"done"}\n```';
  expect(parseJsonCompletion(text1)).toEqual({ status: "done" });

  const text2 = '```javascript\nconst x = {"status":"continue"};\n```';
  expect(parseJsonCompletion(text2)).toEqual({ status: "continue" });
});

it("should handle JSON with null values", () => {
  const result = parseJsonCompletion('{"status":"done","summary":null}');
  // null n'est pas une string, donc devrait être ignoré ou erreur
  expect(result.status).toBe("error");
});

it("should handle deeply nested JSON (last valid wins)", () => {
  const text = '{"a":{"b":{"status":"continue"}}}\n{"status":"done"}';
  const result = parseJsonCompletion(text);
  expect(result).toEqual({ status: "done" });
});

it("should handle JSON at end of very long text", () => {
  const longText = "x".repeat(10000) + '\n{"status":"done"}';
  const result = parseJsonCompletion(longText);
  expect(result).toEqual({ status: "done" });
});
````

**Validation** : `npm test -- completion-json`

### Étape 4 : Vérifier la couverture finale

**Commande** :

```bash
npm test -- --coverage completion-marker completion-json
```

S'assurer que la couverture atteint 95% pour les deux modules.

## Contraintes

- Respecter le pattern `should <verbe> when <condition>` pour les descriptions
- Ne pas modifier le code source des parsers (tests only)
- Utiliser le format AAA (Arrange, Act, Assert) implicite
- Tests déterministes (pas de random, pas de dates)

## Definition of Done

- [ ] Couverture ≥ 95% pour `completion/marker.ts`
- [ ] Couverture ≥ 95% pour `completion/json.ts`
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/08-tests-verification.md](docs/08-tests-verification.md) — Stratégie de tests
- [clarifications/002-contrat-completion-json.md](clarifications/002-contrat-completion-json.md) — Contrat JSON
- [project/src/completion/marker.ts](project/src/completion/marker.ts) — Implémentation marker
- [project/src/completion/json.ts](project/src/completion/json.ts) — Implémentation JSON
