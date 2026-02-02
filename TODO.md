# TODO — @jlguenego/ai-cli

> Dernière mise à jour : 2026-02-02 13:00
> Progression : 26/34 tâches (76%)

## 🎯 Objectif actuel

**Phase 3 — Verbosité & Traçabilité** : Implémenter le système de verbosité avec niveaux 0-3 et affichage du coût.

**Prochaine étape démontrable** : Pouvoir exécuter `jlgcli run --verbosity=0|1|2|3` avec comportement différencié.

---

## 🔥 Priorité haute (Quick Wins / Démontrable)

- [ ] `id090` — Ajouter le champ `verbosity` dans le schéma de configuration
  - 📁 Fichiers : `project/src/config/schema.ts`
  - 🔗 Dépend de : —
  - 📋 Critères : Type `verbosity: 0 | 1 | 2 | 3`, défaut 3, validation
  - 🔗 Référence : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md), [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)

- [ ] `id091` — Créer l'interface VerbosityConfig et les helpers de logging
  - 📁 Fichiers : `project/src/output/verbosity.ts`
  - 🔗 Dépend de : `id090`
  - 📋 Critères : `log(level, msg)`, `logCost(cost)`, `streamResponse(chunk)` selon spécs
  - 🔗 Référence : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)

- [ ] `id092` — Ajouter l'option `--verbosity` aux commandes `run` et `loop`
  - 📁 Fichiers : `project/src/commands/run.ts`, `project/src/commands/loop.ts`
  - 🔗 Dépend de : `id091`
  - 📋 Critères : Option `-V, --verbosity <level>` acceptant 0,1,2,3

---

## 🚧 En cours

_(aucune tâche en cours)_

---

## 📋 Backlog

### Phase 3 — Verbosité (suite)

- [ ] `id093` — Implémenter l'affichage du coût (toujours affiché, même nul)
  - 📁 Fichiers : `project/src/output/verbosity.ts`, `project/src/runner/run.ts`, `project/src/runner/loop.ts`
  - 🔗 Dépend de : `id092`
  - 📋 Critères : Format `💰 Coût : X.XX $`, affiché même si 0.00 — RG-018

- [ ] `id094` — Implémenter l'affichage des prompts en texte brut (niveau 3)
  - 📁 Fichiers : `project/src/output/verbosity.ts`, `project/src/runner/run.ts`, `project/src/runner/loop.ts`
  - 🔗 Dépend de : `id092`
  - 📋 Critères : Afficher prompt complet si verbosity >= 3 — RG-020

- [ ] `id095` — Implémenter le streaming temps réel des réponses (niveau 3)
  - 📁 Fichiers : `project/src/output/verbosity.ts`, `project/src/runner/run.ts`
  - 🔗 Dépend de : `id092`
  - 📋 Critères : Tokens affichés dès réception si verbosity >= 3 — RG-019

- [ ] `id096` — Ajouter les tests unitaires pour la verbosité
  - 📁 Fichiers : `project/tests/unit/verbosity.test.ts`
  - 🔗 Dépend de : `id095`
  - 📋 Critères : Couvrir les 4 niveaux, affichage coût, prompts, streaming

### Phase 2 — Déploiement & polish (reste)

- [ ] `id083` — Documenter le processus de release dans README
  - 📁 Fichiers : `project/README.md`
  - 🔗 Dépend de : —
  - 📋 Critères : Section "Release" avec instructions pour mainteneurs

---

## ✅ Terminé

### Déploiement NPM

- [x] `id082` — Créer le fichier CHANGELOG.md initial _(2026-01-30)_
  - 📁 Fichiers : `project/CHANGELOG.md`
  - 📋 Critères : Format Keep a Changelog, section Unreleased

- [x] `id080` — Créer le script de déploiement `scripts/deploy.js` _(2026-01-30)_
  - 📁 Fichiers : `project/scripts/deploy.js`
  - 📋 Critères : Script Node.js (pas PowerShell), vérif branche, tests, build, version check, publish, tag git, changelog
  - 🔗 Référence : [clarifications/009-deploy-npmjs-normalized.md](clarifications/009-deploy-npmjs-normalized.md)

- [x] `id081` — Ajouter le script "deploy" dans package.json _(2026-01-30)_
  - 📁 Fichiers : `project/package.json`
  - 📋 Critères : `npm run deploy` et `npm run deploy -- --dry-run` fonctionnels

---

## ✅ Terminé

### Protocole de complétion

- [x] `id042` — Créer le dispatcher de complétion selon config _(2026-01-30)_
  - 📁 Fichiers : `project/src/completion/index.ts`, `project/tests/unit/completion.test.ts`

- [x] `id041` — Implémenter le parser de complétion mode `json` _(2026-01-30)_
  - 📁 Fichiers : `project/src/completion/json.ts`

- [x] `id040` — Implémenter le parser de complétion mode `marker` (DONE) _(2026-01-30)_
  - 📁 Fichiers : `project/src/completion/marker.ts`, `project/src/completion/types.ts`

### Setup & CLI de base

- [x] `id001` — Initialiser le projet Node.js/TypeScript avec package.json _(2026-01-28)_
  - 📁 Fichiers : `project/package.json`, `project/tsconfig.json`

- [x] `id002` — Créer le point d'entrée CLI avec commander (`jlgcli --version`) _(2026-01-28)_
  - 📁 Fichiers : `project/src/cli.ts`, `project/src/index.ts`

- [x] `id003` — Implémenter la commande `jlgcli backends` (liste statique) _(2026-01-28)_
  - 📁 Fichiers : `project/src/commands/backends.ts`

### Configuration

- [x] `id010` — Définir le schéma de configuration (types TypeScript) _(2026-01-29)_
  - 📁 Fichiers : `project/src/config/schema.ts`

- [x] `id011` — Implémenter le chargement/sauvegarde de la config utilisateur _(2026-01-29)_
  - 📁 Fichiers : `project/src/config/loader.ts`

- [x] `id012` — Implémenter `jlgcli config get <key>` _(2026-01-29)_
  - 📁 Fichiers : `project/src/commands/config.ts`

- [x] `id013` — Implémenter `jlgcli config set <key> <value>` _(2026-01-29)_
  - 📁 Fichiers : `project/src/commands/config.ts`

- [x] `id014` — Implémenter `jlgcli config show` et `jlgcli config path` _(2026-01-29)_
  - 📁 Fichiers : `project/src/commands/config.ts`

### Adaptateurs backend

- [x] `id020` — Définir l'interface commune Adapter (types + contrat) _(2026-01-29)_
  - 📁 Fichiers : `project/src/adapters/types.ts`

- [x] `id021` — Implémenter l'adaptateur Copilot (isAvailable + runOnce) _(2026-01-29)_
  - 📁 Fichiers : `project/src/adapters/copilot.ts`, `project/tests/unit/copilot-adapter.test.ts`

- [x] `id022` — Implémenter l'adaptateur Codex (isAvailable + runOnce) _(2026-01-29)_
  - 📁 Fichiers : `project/src/adapters/codex.ts`

- [x] `id023` — Créer le registre d'adaptateurs et la sélection par id _(2026-01-30)_
  - 📁 Fichiers : `project/src/adapters/registry.ts`

- [x] `id024` — Mettre à jour `jlgcli backends` avec détection réelle _(2026-01-30)_
  - 📁 Fichiers : `project/src/commands/backends.ts`

### Exécution one-shot

- [x] `id030` — Implémenter le Runner pour exécution one-shot _(2026-01-30)_
  - 📁 Fichiers : `project/src/runner/run.ts`, `project/src/runner/types.ts`, `project/src/runner/index.ts`

- [x] `id031` — Implémenter la commande `jlgcli run <prompt>` _(2026-01-30)_
  - 📁 Fichiers : `project/src/commands/run.ts`, `project/src/cli.ts`

### Exécution itérative (loop)

- [x] `id050` — Implémenter le Runner loop avec garde-fous (maxIterations, timeout) _(2026-01-30)_
  - 📁 Fichiers : `project/src/runner/loop.ts`, `project/src/runner/types.ts`
  - 🔗 Dépendait de : `id030`, `id042`
  - 📋 Critères : Boucle prompt→parse→décision, respecter `maxIterations` et `timeoutMs`

- [x] `id051` — Implémenter la détection de non-progrès (noProgressLimit) _(2026-01-30)_
  - 📁 Fichiers : `project/src/runner/loop.ts`
  - 🔗 Dépend de : `id050`
  - 📋 Critères : Stopper si sortie identique N fois consécutives

- [x] `id052` — Implémenter la commande `jlgcli loop <prompt>` _(2026-01-30)_
  - 📁 Fichiers : `project/src/commands/loop.ts`, `project/src/cli.ts`
  - 🔗 Dépend de : `id050`
  - 📋 Critères : Options `--max-iterations`, `--timeout`, afficher progression

### Observabilité & artifacts

- [x] `id060` — Implémenter le résumé final (humain + --json) _(2026-01-30)_
  - 📁 Fichiers : `project/src/output/summary.ts`
  - 🔗 Dépend de : `id031`
  - 📋 Critères : Afficher backend, durée, itérations, statut ; supporter `--json`

- [x] `id061` — Implémenter l'écriture des artifacts (--artifacts) _(2026-01-30)_
  - 📁 Fichiers : `project/src/artifacts/writer.ts`
  - 🔗 Dépend de : `id050`
  - 📋 Critères : Écrire `.jlgcli/runs/<id>/` avec meta.json, transcript.ndjson, result.json
  - 🔗 Référence : [clarifications/005-artifacts-et-redaction.md](clarifications/005-artifacts-et-redaction.md)

### Tests & CI

- [x] `id070` — Ajouter les tests unitaires pour les parsers de complétion _(2026-01-30)_
  - 📁 Fichiers : `project/tests/unit/completion-marker.test.ts`, `project/tests/unit/completion-json.test.ts`
  - 🔗 Dépend de : `id042`
  - 📋 Couverture : marker.ts 100%, json.ts 96.66%

- [x] `id071` — Ajouter les tests d'intégration pour le runner loop _(2026-01-30)_
  - 📁 Fichiers : `project/tests/integration/loop.test.ts`, `project/tests/fixtures/mock-backend.js`
  - 🔗 Dépend de : `id052`
  - 📋 Scénarios : INT-003 à INT-006c (marker, json, timeout, maxIterations, no-progress, invalid-json)

- [x] `id072` — Configurer la CI GitHub Actions (Windows + macOS + Linux) _(2026-01-30)_
  - 📁 Fichiers : `.github/workflows/ci.yml`
  - 🔗 Dépend de : `id070`
  - 📋 Matrice OS : ubuntu-latest, macos-latest, windows-latest ; Node 22 ; lint + typecheck + tests + coverage
  - 🔗 Référence : [clarifications/006-stack-outillage-node-tests-ci.md](clarifications/006-stack-outillage-node-tests-ci.md)
