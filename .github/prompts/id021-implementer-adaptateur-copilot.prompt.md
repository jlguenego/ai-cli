---
agent: agent
description: Implementer l'adaptateur Copilot (isAvailable + runOnce) via execa
---

# id021 — Implémenter l'adaptateur Copilot (isAvailable + runOnce)

## Objectif

Implémenter l’adaptateur Copilot (backend `copilot`) en respectant le contrat `Adapter` :

- `isAvailable()` : détecter si le backend Copilot CLI est utilisable (`available`/`missing`/`unauthenticated`/`unsupported`).
- `runOnce()` : exécuter un prompt en one-shot et retourner `{ exitCode, text, raw? }`.

## Contexte

Le CLI `jlgcli` orchestre des backends externes via des adaptateurs.

- Réf : [project/src/adapters/types.ts](project/src/adapters/types.ts) — contrat `Adapter`
- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — “Integrations externes” + contrat minimal
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — éviter `shell: true`, pas de `any`
- Réf : [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md) — MVP = Copilot + Codex
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — distinguer `missing` (2) vs `unauthenticated` (6)

Dépendances : `id020`.

## Pré-requis

- [x] `id020` terminé (contrat `Adapter` présent)
- [ ] Node.js compatible (cf. `project/package.json`)
- [ ] Le code doit rester cross-platform (Windows + macOS + Linux)

## Fichiers impactés

| Fichier                          | Action   | Description |
| ------------------------------- | -------- | ----------- |
| `project/src/adapters/copilot.ts` | Créer    | Implémentation `CopilotAdapter` |
| `project/src/adapters/index.ts`   | Créer*   | (Optionnel) re-export propre des adapters |
| `project/tests/unit/copilot-adapter.test.ts` | Créer | Tests unitaires (sans dépendre d'un vrai Copilot) |

\* Créer `index.ts` uniquement si ça simplifie les imports; sinon l’omettre.

## Critères d'acceptation

- [ ] `project/src/adapters/copilot.ts` exporte un objet/une classe conforme à `Adapter` avec `id: "copilot"`.
- [ ] `isAvailable()` retourne :
  - `missing` si la commande Copilot n’est pas trouvable.
  - `unauthenticated` si Copilot est présent mais nécessite login (détection best-effort via stdout/stderr/exit code).
  - `available` si Copilot répond correctement.
  - `unsupported` uniquement si vous décidez explicitement de stubber (normalement non, car Copilot est dans le MVP).
- [ ] `runOnce()` exécute le backend via **execa** (sans `shell: true`), respecte `cwd`, et applique `env`.
- [ ] `runOnce()` retourne `text` = stdout (ou combinaison stdout+stderr si pertinent) sous forme de string.
- [ ] Pas de `any` (utiliser `unknown`).
- [ ] `npm run typecheck` passe.
- [ ] `npm test` passe.

## Tests requis

Écrire des tests unitaires déterministes, **sans dépendre** d’un Copilot installé :

- Mock `execa` pour simuler :
  - binaire absent (throw type ENOENT)
  - présent mais non authentifié (exit code non-zéro + message typique)
  - présent et ok (exit code 0)
- Vérifier que `runOnce()` passe bien `cwd`, `timeoutMs`, et merge `env`.

## Instructions

### Étape 1 : Implémenter `CopilotAdapter`

**Fichier** : `project/src/adapters/copilot.ts`

Contraintes :

- utiliser `execa` (déjà dépendance du projet)
- ne pas exécuter via shell
- ne pas faire d’I/O fichier ici

Implémentation attendue (structure minimale recommandée) :

```ts
import { execa } from "execa";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";

export class CopilotAdapter implements Adapter {
  public readonly id = "copilot" as const;

  async isAvailable(): Promise<AdapterAvailability> {
    // best-effort: appeler une commande légère (ex: --version)
  }

  async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    // exécuter Copilot en one-shot
  }
}
```

Notes :

- Commande Copilot : implémenter en best-effort, mais garder un point d’extension clair (const `COPILOT_CMD` + `COPILOT_ARGS_*`).
- `isAvailable()` :
  - tenter `copilot --version` (ou une commande équivalente légère)
  - si ENOENT → `{ status: "missing", details }`
  - sinon si sortie indique auth requise → `{ status: "unauthenticated", details }`
  - sinon `{ status: "available" }`
- `runOnce()` :
  - construire argv proprement
  - appliquer `timeoutMs` (si fourni) via execa
  - retourner `exitCode` et `text`

### Étape 2 : Tests unitaires

**Fichier** : `project/tests/unit/copilot-adapter.test.ts`

- Mock `execa` (vitest)
- Couvrir au moins 3 cas sur `isAvailable()` + 1 cas sur `runOnce()`.

### Étape 3 : Validation

Depuis `project/` :

- `npm run typecheck`
- `npm test`

## Contraintes

- Respecter [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) : pas de `shell: true`, pas de `any`.
- Comportement best-effort acceptable pour la détection `unauthenticated` (message matching simple).
- Ne pas intégrer de logique runner ici (pas de boucle/complétion).

## Definition of Done

- [ ] Adapter Copilot implémenté
- [ ] Tests unitaires ajoutés et passants
- [ ] `npm run typecheck` OK
- [ ] `npm test` OK
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [project/src/adapters/types.ts](project/src/adapters/types.ts)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md)
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md)
