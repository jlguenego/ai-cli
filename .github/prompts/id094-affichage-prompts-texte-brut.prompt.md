---
agent: agent
description: Implémenter l'affichage des prompts en texte brut complet pour le niveau de verbosité 3
---

# id094 — Implémenter l'affichage des prompts en texte brut (niveau 3)

## Objectif

Afficher le prompt complet envoyé au backend lorsque le niveau de verbosité est >= 3, conformément à la règle métier RG-020.

## Contexte

Le système de verbosité est en place (id090, id091, id092). La fonction `logPrompt()` existe déjà dans `verbosity.ts` mais n'est pas encore appelée dans les runners `run.ts` et `loop.ts`.

- Réf : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décision Q5 : "Texte brut complet"
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de verbosité
- Dépendances : `id092` (option `--verbosity` ajoutée aux commandes)

## Pré-requis

- [x] Tâches dépendantes complétées : `id090`, `id091`, `id092`
- [x] Fonction `logPrompt()` disponible dans `project/src/output/verbosity.ts`

## Fichiers impactés

| Fichier                                | Action   | Description                                            |
| -------------------------------------- | -------- | ------------------------------------------------------ |
| `project/src/runner/run.ts`            | Modifier | Appeler `logPrompt()` avant l'exécution du prompt      |
| `project/src/runner/loop.ts`           | Modifier | Appeler `logPrompt()` avant chaque itération du prompt |
| `project/tests/unit/verbosity.test.ts` | Modifier | Ajouter tests pour `logPrompt()` si manquants          |

## Critères d'acceptation

- [ ] `logPrompt()` est appelée dans `run.ts` avant `adapter.runOnce()`
- [ ] `logPrompt()` est appelée dans `loop.ts` avant chaque appel `adapter.runOnce()` dans la boucle
- [ ] Le prompt s'affiche uniquement si `verbosity >= 3`
- [ ] Le format respecte la spécification : séparateurs + emoji 📝 + prompt complet
- [ ] Les logs sont écrits sur stderr (pas stdout)
- [ ] Tests unitaires passent (`npm test`)

## Tests requis

**Unitaires** : `project/tests/unit/verbosity.test.ts`

- Vérifier que `logPrompt()` affiche le prompt si `level >= 3`
- Vérifier que `logPrompt()` n'affiche rien si `level < 3`
- Vérifier le format de sortie (séparateurs, emoji, contenu)

**Intégration** (manuel) :

```bash
cd project
npx tsx src/cli.ts run "Test prompt" --verbosity=3
# Doit afficher le prompt complet avant la réponse

npx tsx src/cli.ts run "Test prompt" --verbosity=2
# Ne doit PAS afficher le prompt
```

## Instructions

### Étape 1 : Modifier run.ts pour appeler logPrompt()

**Fichier** : `project/src/runner/run.ts`

Importer `logPrompt` en plus des imports existants :

```typescript
import {
  createVerbosityConfig,
  logCost,
  logPrompt
} from "../output/verbosity.js";
```

Ajouter l'appel à `logPrompt()` juste avant `adapter.runOnce()` :

```typescript
// Afficher le prompt si verbosity >= 3 (RG-020)
logPrompt(verbosityConfig, options.prompt);

// Exécuter le prompt
const result = await adapter.runOnce({
  prompt: options.prompt,
  cwd,
  env: options.env,
  timeoutMs: options.timeoutMs
});
```

**Validation** : `npm run typecheck`

### Étape 2 : Modifier loop.ts pour appeler logPrompt()

**Fichier** : `project/src/runner/loop.ts`

Importer `logPrompt` en plus des imports existants :

```typescript
import {
  createVerbosityConfig,
  logCost,
  logPrompt
} from "../output/verbosity.js";
```

Ajouter l'appel à `logPrompt()` dans la boucle, juste avant `adapter.runOnce()` :

```typescript
// Afficher le prompt si verbosity >= 3 (RG-020)
logPrompt(verbosityConfig, currentPrompt);

// Exécuter le prompt sur le backend
const result = await adapter.runOnce({
  prompt: currentPrompt,
  cwd,
  env: options.env,
  timeoutMs: remainingTimeout
});
```

**Validation** : `npm run typecheck`

### Étape 3 : Vérifier/ajouter les tests unitaires

**Fichier** : `project/tests/unit/verbosity.test.ts`

S'assurer que les tests couvrent `logPrompt()` :

```typescript
describe("logPrompt", () => {
  it("should display prompt when level >= 3", () => {
    const config = createVerbosityConfig(3);
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logPrompt(config, "Test prompt content");

    expect(stderrSpy).toHaveBeenCalled();
    expect(stderrSpy.mock.calls.flat().join("\n")).toContain(
      "Test prompt content"
    );
    stderrSpy.mockRestore();
  });

  it("should NOT display prompt when level < 3", () => {
    const config = createVerbosityConfig(2);
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logPrompt(config, "Test prompt content");

    expect(stderrSpy).not.toHaveBeenCalled();
    stderrSpy.mockRestore();
  });
});
```

**Validation** : `npm test`

## Contraintes

- Les logs doivent aller sur **stderr** (pas stdout) — cf. [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- Le format de sortie doit être exactement :
  ```
  ────────────────────────────────────────
  📝 Prompt envoyé :
  ────────────────────────────────────────
  <contenu du prompt>
  ────────────────────────────────────────
  ```
- Ne pas modifier le comportement existant de `logPrompt()` dans `verbosity.ts`
- Utiliser les imports ES modules avec `.js` extension

## Definition of Done

- [ ] Code conforme aux guidelines
- [ ] `logPrompt()` appelée dans `run.ts` et `loop.ts`
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint && npm run typecheck`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décisions verbosité
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions logging
- [project/src/output/verbosity.ts](project/src/output/verbosity.ts) — Fonction `logPrompt()`
