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

| Élément | Convention | Exemple |
|---------|------------|---------|
| Fichiers | kebab-case | `completion-parser.ts` |
| Classes | PascalCase | `CopilotAdapter` |
| Fonctions | camelCase | `parseCompletion()` |
| Constantes | SCREAMING_SNAKE | `DEFAULT_TIMEOUT_MS` |
| Variables | camelCase | `currentIteration` |

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

| Pattern | Cas d'usage | Exemple |
| ------- | ----------- | ------- |
| Ports/Adapters | Normaliser des backends hétérogènes | `Adapter` interface + impl `CopilotAdapter` |
| Pure functions | Parsers & logique de décision | `parseCompletion(output)` |
| “Result object” | Éviter exceptions incontrôlées | `{ ok: boolean, errorCode?: ... }` |
| NDJSON events | Streaming + persistance | `transcript.ndjson` (stdout/stderr/ts) |

---

## Anti-patterns à éviter

| Anti-pattern | Problème | Alternative |
| ------------ | -------- | ----------- |
| `shell: true` / exécution via shell | quoting Windows fragile + surface d’attaque | passer argv à `execa/spawn` |
| Sérialiser `process.env` | fuite de secrets | whitelister uniquement des clés nécessaires |
| Parser JSON “optimiste” | casse si backend écrit du texte autour | chercher un JSON final, sinon fallback |
| Logguer des prompts/sorties sans redaction | risque PII/secrets | redaction best-effort + opt-in artifacts |

---

## Gestion des erreurs

### Hiérarchie des erreurs

Recommandation : erreurs “métier” avec codes stables (alignés avec les specs fonctionnelles) :
- `BackendUnavailableError` → exit 2
- `TimeoutError` → exit 3
- `MaxIterationsError` → exit 4
- `NoProgressError` → exit 1 (ou code dédié si souhaité)

### Format des messages

- 1 ligne “headline” + 1-2 lignes d’actions (quoi faire ensuite)
- inclure le backend, la commande, et le hint (ex: “auth requise”)
- éviter de dump un stack trace en mode normal ; le réserver à `--verbose`

---

## Git workflow

### Branches

| Type | Format | Exemple |
| ---- | ------ | ------- |
| Feature | `feature/<ticket>-<description>` | `feature/US-005-loop-runner` |
| Bugfix | `fix/<ticket>-<description>` | `fix/BUG-042-timeout-parsing` |
| Chore | `chore/<description>` | `chore/ci-windows-matrix` |

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

