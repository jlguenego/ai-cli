# Guidelines de Développement — `@jlguenego/ai-cli` (CLI : `jlgcli`)

## Structure du projet

Arborescence recommandée (lib NPM + binaire CLI) :

```
project/
├── src/
│   ├── cli/               # commands, parsing, output
│   ├── core/              # runner, completion, artifacts
│   ├── adapters/          # copilot/claude/codex...
│   ├── config/            # load/save/merge config
│   ├── utils/             # fs, time, redact, similarity
│   └── types/             # types partagés (Adapter, Result, etc.)
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
├── package.json
├── tsconfig.json
└── README.md
```

Notes :

- séparer clairement **CLI** (UX) et **core** (logique runner) pour testabilité.
- éviter les imports circulaires (runner ↔ adapters).

---

## Conventions de nommage

| Élément    | Convention      | Exemple                |
| ---------- | --------------- | ---------------------- |
| Fichiers   | kebab-case      | `completion-parser.ts` |
| Classes    | PascalCase      | `CopilotAdapter`       |
| Fonctions  | camelCase       | `parseCompletion()`    |
| Constantes | SCREAMING_SNAKE | `DEFAULT_TIMEOUT_MS`   |
| Variables  | camelCase       | `currentIteration`     |

---

## Standards de code

### Principes

- **SOLID** : surtout séparation des responsabilités (CLI vs runner vs adapter).
- **DRY** : mutualiser ce qui est commun (spawn, timeouts, logs), éviter la duplication d’adaptateurs.
- **KISS** : privilégier des formats simples (JSON/NDJSON), pas d’abstraction prématurée.

### TypeScript

- `strict: true` recommandé.
- Exposer des types stables : `Adapter`, `RunResult`, `CompletionStatus`, etc.
- Ne pas typer `any` sans justification ; isoler les `unknown` et les parser.

### Logging

- Utiliser un logger structuré (recommandation : `pino`).
- Écrire les logs sur **stderr**.
- Réserver **stdout** à la sortie “résultat” (notamment en mode `--json`).

### Verbosité (niveaux de trace)

> Référence : [clarification 010-verbosite](../clarifications/010-verbosite-normalized.md)

Le niveau de verbosité par défaut est **3 (Debug)**. Respecter les conventions suivantes :

| Niveau | Nom        | Ce qui est affiché                                           |
| ------ | ---------- | ------------------------------------------------------------ |
| 0      | Silencieux | Résultat final uniquement                                    |
| 1      | Minimal    | Résultat + coût                                              |
| 2      | Normal     | Résultat + coût + indicateur de progression                  |
| 3      | Debug      | Résultat + coût + prompts complets + réponses stream + infos |

**Conventions d'implémentation** :

```typescript
// Utiliser une fonction helper pour conditionner l'affichage
function log(level: number, message: string): void {
  if (config.verbosity >= level) {
    console.error(message); // logs sur stderr
  }
}

// Affichage du coût (toujours, même si nul)
function logCost(cost: number): void {
  console.error(`💰 Coût : ${cost.toFixed(2)} $`);
}

// Stream des réponses (niveau 3 uniquement)
function streamResponse(chunk: string): void {
  if (config.verbosity >= 3) {
    process.stdout.write(chunk); // temps réel, pas de buffering
  }
}
```

**Règles** :

- Le coût est **toujours affiché** (même `0.00 $`) — RG-018
- Les prompts sont affichés en **texte brut complet** au niveau 3 — RG-020
- Les réponses sont streamées en **temps réel** au niveau 3 — RG-019

### Règles ESLint / Linter

Configuration recommandée (indicative) :

- `@typescript-eslint` + règles strictes
- `eslint:recommended`
- `no-floating-promises`
- `no-console` (sauf couche CLI, ou encapsulé via un logger)

### Documentation du code

Documenter les fonctions critiques (runner/completion/artifacts) :

```typescript
/**
 * Analyse la sortie d'un backend et détermine si l'exécution doit continuer.
 * - mode marker: DONE strict en dernière ligne
 * - mode json: parse d'un JSON final { status, summary?, next? }
 */
export function parseCompletion(/* ... */) {
  // ...
}
```

---

## Patterns recommandés

| Pattern         | Cas d'usage                         | Exemple                                     |
| --------------- | ----------------------------------- | ------------------------------------------- |
| Ports/Adapters  | Normaliser des backends hétérogènes | `Adapter` interface + impl `CopilotAdapter` |
| Pure functions  | Parsers & logique de décision       | `parseCompletion(output)`                   |
| “Result object” | Éviter exceptions incontrôlées      | `{ ok: boolean, errorCode?: ... }`          |
| NDJSON events   | Streaming + persistance             | `transcript.ndjson` (stdout/stderr/ts)      |

---

## Anti-patterns à éviter

| Anti-pattern                               | Problème                                    | Alternative                                                                                                                |
| ------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `shell: true` / exécution via shell        | quoting Windows fragile + surface d’attaque | passer argv à `execa/spawn`                                                                                                |
| Sérialiser `process.env`                   | fuite de secrets                            | whitelister uniquement des clés nécessaires                                                                                |
| Parser JSON “optimiste”                    | casse si backend écrit du texte autour      | extraire le **dernier JSON valide** ; en mode JSON, si aucun JSON valide n’est extractible → erreur (reco `EX_DATAERR=65`) |
| Logguer des prompts/sorties sans redaction | risque PII/secrets                          | redaction best-effort + opt-in artifacts                                                                                   |
| Ignorer le niveau de verbosité             | logs trop verbeux ou trop silencieux        | utiliser `config.verbosity` pour conditionner l'affichage (0-3)                                                            |

---

## Gestion des erreurs

### Hiérarchie des erreurs

Recommandation : erreurs “métier” avec codes stables (alignés avec les specs fonctionnelles) :

- `BackendUnavailableError` → exit 2
- `BackendUnauthenticatedError` → exit 6
- `BackendUnsupportedError` → exit 64
- `TimeoutError` → exit 75
- `MaxIterationsError` → exit 4
- `NoProgressError` → exit 5
- `InvalidJsonError` → exit 65
- `ArtifactsWriteError` → exit 73

### Format des messages

- 1 ligne “headline” + 1-2 lignes d’actions (quoi faire ensuite)
- inclure le backend, la commande, et le hint (ex: “auth requise”)
- éviter de dump un stack trace en mode normal ; le réserver à `--verbosity=3`

---

## Git workflow

### Branches

| Type    | Format                           | Exemple                       |
| ------- | -------------------------------- | ----------------------------- |
| Feature | `feature/<ticket>-<description>` | `feature/US-005-loop-runner`  |
| Bugfix  | `fix/<ticket>-<description>`     | `fix/BUG-042-timeout-parsing` |
| Chore   | `chore/<description>`            | `chore/ci-windows-matrix`     |

### Commits (Conventional Commits)

```
feat(runner): add loop completion parser
fix(copilot): handle unauthenticated state
chore(ci): add windows job
docs: update usage examples
```

### Pull Requests

- Template recommandé (problème → solution → tests)
- CI verte requise
- (si équipe) 1 review minimum
