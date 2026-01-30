---
agent: agent
description: Implementer l'adaptateur Codex (isAvailable + runOnce) via execa
---

# id022 — Implémenter l'adaptateur Codex (isAvailable + runOnce)

## Objectif

Implémenter l’adaptateur Codex (backend `codex`) en respectant le contrat `Adapter` :

- `isAvailable()` : détecter si la Codex CLI est utilisable (`available`/`missing`/`unauthenticated`/`unsupported`).
- `runOnce()` : exécuter un prompt en one-shot et retourner `{ exitCode, text, raw? }`.

## Contexte

Le CLI `jlgcli` orchestre des backends externes via des adaptateurs. Le MVP supporte réellement **Copilot + Codex**.

- Réf : [project/src/adapters/types.ts](project/src/adapters/types.ts) — contrat `Adapter`
- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — intégration CLI externe `codex`
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — execa, pas de `shell: true`, pas de `any`
- Réf : [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md) — MVP = Copilot + Codex
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — distinguer `missing` (2) vs `unauthenticated` (6)

Dépendances : `id020`.

## Pré-requis

- [x] Tâches dépendantes complétées : `id020`
- [ ] Node.js compatible (cf. `project/package.json`)
- [ ] Le code doit rester cross-platform (Windows + macOS + Linux)

## Fichiers impactés

| Fichier                                    | Action | Description                                     |
| ------------------------------------------ | ------ | ----------------------------------------------- |
| `project/src/adapters/codex.ts`            | Créer  | Implémentation `CodexAdapter`                   |
| `project/tests/unit/codex-adapter.test.ts` | Créer  | Tests unitaires (sans dépendre d'un vrai codex) |

## Critères d'acceptation

- [ ] `project/src/adapters/codex.ts` exporte une classe (ou un objet) conforme à `Adapter` avec `id: "codex"`.
- [ ] `isAvailable()` retourne :
  - `missing` si le binaire `codex` n’est pas trouvable (ENOENT).
  - `unauthenticated` si le binaire existe mais nécessite login/clé (best-effort via message matching stdout/stderr).
  - `available` si `codex --version` (ou équivalent léger) répond correctement.
  - `unsupported` uniquement si vous choisissez explicitement de stubber (normalement non, car Codex est dans le MVP).
- [ ] `runOnce()` exécute le backend via **execa** (sans `shell: true`), respecte `cwd`, `timeoutMs`, et merge `env`.
- [ ] `runOnce()` retourne `text` = stdout (ou stderr si stdout vide) sous forme de string.
- [ ] Pas de `any` (utiliser `unknown`).
- [ ] `npm run typecheck` passe.
- [ ] `npm test` passe.

## Tests requis

Écrire des tests unitaires déterministes, **sans dépendre** d’un Codex installé :

- Mock `execa` pour simuler :
  - binaire absent (throw avec `code: "ENOENT"`)
  - présent mais non authentifié (exit code non-zéro + message typique, ex: mention d’`OPENAI_API_KEY`, `api key`, `login`)
  - présent et ok (exit code 0)
- Vérifier que `runOnce()` passe bien `cwd`, `timeoutMs`, et merge `env`.

## Instructions

### Étape 1 : Implémenter `CodexAdapter`

**Fichier** : `project/src/adapters/codex.ts`

Contraintes :

- utiliser `execa` (déjà dépendance du projet)
- ne pas exécuter via shell
- pas d’I/O fichier ici

Hypothèse MVP (à respecter pour cette tâche) :

- La commande du backend est `codex` (cf. diagramme `COD[codex]` dans la spec technique).
- La sonde la plus légère est `codex --version`.
- Pour `runOnce()`, on envoie le prompt via stdin (option `input` d’execa), ce qui permet de rester agnostique sur des sous-commandes (et reste testable via mock).

Structure minimale recommandée :

```ts
import { execa } from "execa";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";

export class CodexAdapter implements Adapter {
  public readonly id = "codex" as const;

  async isAvailable(): Promise<AdapterAvailability> {
    // best-effort: appeler une commande légère (ex: --version)
  }

  async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    // exécuter codex en one-shot
  }
}
```

Recommandations d’implémentation (alignées sur `CopilotAdapter`) :

- Définir `CODEX_CMD = "codex"` et `CODEX_VERSION_ARGS = ["--version"]`.
- Utiliser `execa(command, args, { reject: false, cwd, env, timeout })` pour éviter les throw sur exit code != 0.
- Détecter `missing` via erreur `ENOENT`.
- Détecter `unauthenticated` via regex best-effort sur la sortie combinée `stdout + stderr` (ex: `api key`, `OPENAI_API_KEY`, `login`, `unauthorized`).
- Dans `runOnce()` :
  - construire `env = { ...process.env, ...args.env }`
  - passer `cwd` et `timeout: args.timeoutMs`
  - passer `input: args.prompt`
  - retourner `{ exitCode, text, raw }` où `raw` est l’objet de résultat (stdout/stderr/exitCode) ou une structure simplifiée.
- Si `isAvailable()` conclut à `missing` / `unauthenticated` : `runOnce()` doit retourner un code stable :
  - `missing` → `exitCode: 2`
  - `unauthenticated` → `exitCode: 6`

### Étape 2 : Tests unitaires

**Fichier** : `project/tests/unit/codex-adapter.test.ts`

- Mock `execa` (vitest) comme dans `project/tests/unit/copilot-adapter.test.ts`.
- Couvrir au moins :
  - `isAvailable()` → missing (ENOENT)
  - `isAvailable()` → unauthenticated (message)
  - `isAvailable()` → available (exitCode 0)
  - `runOnce()` → passe `cwd/timeout`, merge `env`, utilise `input`

### Étape 3 : Validation

Depuis `project/` :

- `npm run typecheck`
- `npm test`

## Contraintes

- Respecter [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) : pas de `shell: true`, pas de `any`.
- Comportement best-effort acceptable pour la détection `unauthenticated` (regex simple).
- Ne pas intégrer de logique runner ici (pas de boucle/complétion).

## Definition of Done

- [ ] Adapter Codex implémenté
- [ ] Tests unitaires ajoutés et passants
- [ ] `npm run typecheck` OK
- [ ] `npm test` OK
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [project/src/adapters/types.ts](project/src/adapters/types.ts)
- [project/src/adapters/copilot.ts](project/src/adapters/copilot.ts)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md)
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md)
