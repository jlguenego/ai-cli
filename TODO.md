# TODO — @jlguenego/ai-cli

> Dernière mise à jour : 2026-01-30 14:45
> Progression : 24/28 tâches (86%)

## 🎯 Objectif actuel

**Phase 2 — Déploiement NPM** : Mettre en place le script de déploiement Node.js pour publier sur npmjs.com.

**Prochaine étape démontrable** : Pouvoir exécuter `npm run deploy` pour publier automatiquement le package.

---

## 🔥 Priorité haute (Quick Wins / Démontrable)

- [x] `id080` — Créer le script de déploiement `scripts/deploy.js` _(2026-01-30)_
  - 📁 Fichiers : `project/scripts/deploy.js`
  - 🔗 Dépend de : —
  - 📋 Critères : Script Node.js (pas PowerShell), vérif branche, tests, build, version check, publish, tag git, changelog
  - 🔗 Référence : [clarifications/009-deploy-npmjs-normalized.md](clarifications/009-deploy-npmjs-normalized.md)

- [x] `id081` — Ajouter le script "deploy" dans package.json _(2026-01-30)_
  - 📁 Fichiers : `project/package.json`
  - 🔗 Dépend de : `id080`
  - 📋 Critères : `npm run deploy` et `npm run deploy -- --dry-run` fonctionnels

---

## 🚧 En cours

_(aucune tâche en cours)_

---

## 📋 Backlog

### Phase 2 — Déploiement & polish

- [ ] `id082` — Créer le fichier CHANGELOG.md initial
  - 📁 Fichiers : `project/CHANGELOG.md`
  - 🔗 Dépend de : `id080`
  - 📋 Critères : Format Keep a Changelog, section Unreleased

- [ ] `id083` — Documenter le processus de release dans README
  - 📁 Fichiers : `project/README.md`
  - 🔗 Dépend de : `id081`
  - 📋 Critères : Section "Release" avec instructions pour mainteneurs

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
