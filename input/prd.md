# PRD — `@jlguenego/ai-cli` (CLI: `jlgcli`)

Date : 2026-01-25

## 1) Résumé

`@jlguenego/ai-cli` fournit un exécutable `jlgcli` qui orchestre des assistants IA en CLI (ex. GitHub Copilot CLI, Claude Code CLI, Codex CLI) pour exécuter des tâches longues de manière autonome.

Le produit vise à :

- réduire la supervision manuelle des “grosses tâches”,
- standardiser l’exécution multi-backends via une abstraction unique,
- exécuter des boucles itératives _idempotentes_ jusqu’à complétion (ou limite de sécurité).

## 2) Problème

Dans un IDE, l’utilisateur doit souvent :

- attendre la fin d’une génération,
- découper la tâche en petites étapes,
- relancer manuellement l’IA.

Cela empêche le mode “lancer et oublier” et coûte du temps.

## 3) Objectifs (succès produit)

### Objectifs

- Lancer une tâche longue avec une commande unique.
- Supporter plusieurs backends IA via des adaptateurs.
- Exécuter une boucle itérative jusqu’à un signal de fin explicite.
- Offrir une UX CLI robuste (logs, statut, codes de sortie, erreurs compréhensibles).

### Indicateurs (proposés)

- Taux de complétion des runs sans intervention.
- Temps moyen d’exécution par run (et taux d’échec/timeouts).
- Nombre moyen d’itérations avant `DONE`.

## 4) Non-objectifs (MVP)

- UI graphique.
- Planification distribuée multi-machines.
- Exécution simultanée de dizaines de jobs (on vise un orchestrateur simple, extensible).
- “Auto-correction” illimitée sans garde-fous.

## 5) Personas

- **Développeur solo** : veut automatiser refactors, scaffolding, tickets.
- **Freelance** : lance des tâches pendant un call / autre projet.
- **Maker** : veut générer/itérer rapidement sur un projet.

## 6) Hypothèses

- Les CLIs externes sont déjà installés et authentifiés sur la machine.
- L’utilisateur accepte que la fiabilité dépende en partie des backends.
- La boucle itérative doit être encadrée (limites, timeouts) pour éviter les boucles infinies.

## 7) Portée fonctionnelle (MVP)

### 7.1 Configuration

- Définir un backend par défaut.
- Définir des paramètres de sécurité : `maxIterations`, `timeoutMs`, `maxNoProgress`.
- Choisir le “protocole de complétion” (marqueur texte ou JSON).

### 7.2 Adaptateurs backend

- Une interface d’adaptateur commune :
  - exécuter un prompt,
  - stream stdout/stderr,
  - retourner un résultat normalisé (texte, statut, métadonnées).

### 7.3 Exécution simple

- Lancer un prompt “one-shot” sur le backend choisi.

### 7.4 Exécution itérative (loop)

- Rejouer automatiquement une séquence d’itérations :
  - envoyer le prompt initial,
  - analyser la sortie,
  - décider `continue` / `done` / `error`,
  - éventuellement enrichir le contexte avec la sortie précédente.

### 7.5 Observabilité (CLI UX)

- Logs clairs, niveau de verbosité.
- Résumé final : backend, durée, nombre d’itérations, statut.

## 8) Exigences non-fonctionnelles

- **Runtime** : Node.js (Windows en priorité, macOS/Linux si possible).
- **Distribution** : package NPM `@jlguenego/ai-cli`.
- **Binaire** : `jlgcli`.
- **Robustesse** : gestion des timeouts, erreurs backend, interruptions.
- **Sécurité** : ne pas logguer de secrets ; permettre l’usage via variables d’environnement.

## 9) Architecture (proposée)

### 9.1 Composants

- **CLI** (`jlgcli`) : parsing des commandes, config, output.
- **Core Runner** : exécution d’un run simple ou loop.
- **Adapters** : un module par backend (copilot/claude/codex…).
- **Completion Protocol** : détecte la complétion (marqueur / JSON).
- **State/Artifacts** : écrit un dossier `.jlgcli/` optionnel (logs, transcript, résumé).

### 9.2 Contrat d’adaptateur (concept)

- `id`: string
- `isAvailable()`: vérifie binaire + auth minimale
- `runOnce({ prompt, cwd, env, ... }) -> { text, raw, exitCode }`

## 10) Protocole de complétion (MVP)

Deux modes (configurables) :

### A) Marqueur texte (simple)

- L’assistant doit terminer par une ligne exactement : `DONE`
- Tout autre résultat → itération suivante (jusqu’à limites)

### B) JSON structuré (recommandé)

- L’assistant doit produire un JSON final (sur la dernière ligne ou dans un bloc identifiable) :

```json
{ "status": "done", "summary": "…", "next": null }
```

- Statuts possibles : `continue`, `done`, `error`

Garde-fous :

- `maxIterations` (ex. 20)
- `timeoutMs` global (ex. 30 min)
- `noProgressLimit` (si la sortie est identique trop souvent)

## 11) User stories + critères d’acceptation

### US-1 — Installer et vérifier

**En tant qu’utilisateur**, je veux installer `@jlguenego/ai-cli` et vérifier que `jlgcli` fonctionne.

**AC**

- Given le package est installé, When je lance `jlgcli --version`, Then un numéro de version est affiché et le code retour est 0.

### US-2 — Choisir un backend par défaut

**En tant qu’utilisateur**, je veux configurer un backend par défaut pour ne pas le répéter à chaque commande.

**AC**

- Given aucun backend n’est configuré, When je lance `jlgcli config set backend copilot`, Then le backend par défaut devient `copilot`.
- Given un backend est configuré, When je lance `jlgcli config get backend`, Then la valeur renvoyée correspond.

### US-3 — Lister les backends disponibles

**En tant qu’utilisateur**, je veux voir quels backends sont supportés et disponibles sur ma machine.

**AC**

- When je lance `jlgcli backends`, Then je vois la liste des backends supportés.
- And chaque backend affiche un statut `available`/`missing`/`unauthenticated`.

### US-4 — Exécuter un prompt simple

**En tant qu’utilisateur**, je veux exécuter un prompt one-shot sur le backend.

**AC**

- Given un backend est sélectionné, When je lance `jlgcli run "Explique ce repo"`, Then la sortie de l’assistant est imprimée.
- And le code retour est 0 si le backend a réussi.

### US-5 — Exécuter une boucle itérative jusqu’à complétion

**En tant qu’utilisateur**, je veux lancer un prompt itératif et laisser l’outil boucler jusqu’à `DONE`.

**AC**

- Given `maxIterations=5`, When je lance `jlgcli loop "Fais X et termine par DONE"`, Then le CLI s’arrête dès qu’un `DONE` est détecté.
- Given la complétion n’arrive pas, When la 5e itération est atteinte, Then le CLI s’arrête avec un statut d’échec contrôlé (code non-zéro) et un résumé.

### US-6 — Définir des limites de sécurité

**En tant qu’utilisateur**, je veux éviter les boucles infinies.

**AC**

- When je lance `jlgcli loop ... --max-iterations 3`, Then le run s’arrête au maximum après 3 itérations.
- When je passe `--timeout 2m`, Then le run s’arrête avec message clair si le temps est dépassé.

### US-7 — Produire un résumé final

**En tant qu’utilisateur**, je veux un résumé machine- et humain-lisible.

**AC**

- When un run se termine, Then un résumé (durée, backend, itérations, statut) s’affiche.
- And optionnellement `--json` renvoie un objet JSON en stdout.

### US-8 — Sauvegarder les artifacts

**En tant qu’utilisateur**, je veux retrouver le transcript et les logs d’un run.

**AC**

- When je lance un run avec `--artifacts`, Then un dossier `.jlgcli/runs/<id>/` est créé avec transcript et résumé.

## 12) Spécification CLI (proposée)

Conventions :

- `--backend <id>` surcharge la config.
- `--cwd <path>` définit le répertoire de travail.
- `--json` force une sortie JSON (utile CI).
- Codes de sortie (proposition) :
  - `0` succès / done
  - `1` erreur d’exécution
  - `2` backend indisponible / non configuré
  - `3` timeout
  - `4` max itérations atteintes

### 12.1 `jlgcli backends`

Affiche les backends supportés et leur disponibilité.

Exemples :

- `jlgcli backends`
- `jlgcli backends --json`

### 12.2 `jlgcli config`

- `jlgcli config get <key>`
- `jlgcli config set <key> <value>`
- `jlgcli config path`
- `jlgcli config show`

Clés (MVP) :

- `backend`
- `maxIterations`
- `timeoutMs`
- `completionMode` (`marker|json`)

### 12.3 `jlgcli run <prompt>`

Exécute un prompt one-shot.

Options :

- `--backend <id>`
- `--cwd <path>`
- `--json`
- `--quiet|--verbose`

Exemples :

- `jlgcli run "Explique le but de ce projet"`
- `jlgcli run "Refactorise ce fichier" --backend claude --verbose`

### 12.4 `jlgcli loop <prompt>`

Exécute une boucle itérative.

Options :

- `--backend <id>`
- `--max-iterations <n>`
- `--timeout <duration>` (ex. `30s`, `2m`, `1h`)
- `--completion marker|json`
- `--artifacts` (écrit `.jlgcli/runs/...`)
- `--json` (résumé JSON final)

Exemples :

- `jlgcli loop "Crée un plan, exécute-le, puis termine par DONE" --max-iterations 10 --timeout 30m`
- `jlgcli loop "…" --completion json --json`

### 12.5 (Optionnel MVP+) `jlgcli doctor`

Diagnostique l’environnement : Node, présence des binaires, auth.

## 13) Configuration & stockage (proposition)

- Fichier de config utilisateur :
  - Windows : `%APPDATA%/jlgcli/config.json` (ou via lib standard type `env-paths`)
- Artifacts run : `.jlgcli/` dans le `cwd` (opt-in via `--artifacts`)

## 14) Erreurs & messages

Principes :

- Messages d’erreur actionnables (“installez X”, “authentifiez-vous”, etc.).
- `--json` doit produire une sortie parseable même en cas d’erreur (avec champ `error`).

## 15) Risques & mitigations

- **Boucles infinies / non progression** → limites strictes + détection de répétition.
- **Différences entre CLIs** → adaptateurs dédiés + normalisation.
- **Sorties non structurées** → mode marqueur simple en fallback.

## 16) Roadmap (suggestion)

- MVP : `backends`, `config`, `run`, `loop` (marker), artifacts.
- V1 : completion JSON, `doctor`, meilleure détection no-progress.
- V2 : templates de tâches, presets, intégration CI.
