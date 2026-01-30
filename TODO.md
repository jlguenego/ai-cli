# TODO — @jlguenego/ai-cli

> Dernière mise à jour : 2026-01-25
> Progression : 8/24 tâches (33%)

## 🎯 Objectif actuel

**Phase 1 — MVP Core** : Avoir un CLI fonctionnel capable d'exécuter un prompt sur un backend et de boucler jusqu'à complétion.

---

## 🔥 Priorité haute (Quick Wins / Démontrable)

- [x] `id001` — Initialiser le projet Node.js/TypeScript avec package.json
  - 📁 Fichiers : `project/package.json`, `project/tsconfig.json`
  - 🔗 Dépend de : —

- [x] `id002` — Créer le point d'entrée CLI avec commander (`jlgcli --version`)
  - 📁 Fichiers : `project/src/cli.ts`, `project/src/index.ts`
  - 🔗 Dépend de : `id001`

- [x] `id003` — Implémenter la commande `jlgcli backends` (liste statique)
  - 📁 Fichiers : `project/src/commands/backends.ts`
  - 🔗 Dépend de : `id002`

---

## 🚧 En cours

_(aucune tâche en cours)_

---

## 📋 Backlog

### Phase 1 — MVP Core

#### Configuration

- [x] `id010` — Définir le schéma de configuration (types TypeScript)
  - 📁 Fichiers : `project/src/config/schema.ts`
  - 🔗 Dépend de : `id001`

- [x] `id011` — Implémenter le chargement/sauvegarde de la config utilisateur
  - 📁 Fichiers : `project/src/config/loader.ts`
  - 🔗 Dépend de : `id010`

- [x] `id012` — Implémenter `jlgcli config get <key>`
  - 📁 Fichiers : `project/src/commands/config.ts`
  - 🔗 Dépend de : `id011`

- [x] `id013` — Implémenter `jlgcli config set <key> <value>`
  - 📁 Fichiers : `project/src/commands/config.ts`
  - 🔗 Dépend de : `id011`

- [x] `id014` — Implémenter `jlgcli config show` et `jlgcli config path`
  - 📁 Fichiers : `project/src/commands/config.ts`
  - 🔗 Dépend de : `id012`

#### Adaptateurs backend

- [x] `id020` — Définir l'interface commune Adapter (types + contrat)
  - 📁 Fichiers : `project/src/adapters/types.ts`
  - 🔗 Dépend de : `id001`

- [x] `id021` — Implémenter l'adaptateur Copilot (isAvailable + runOnce)
  - 📁 Fichiers : `project/src/adapters/copilot.ts`, `project/tests/unit/copilot-adapter.test.ts`
  - 🔗 Dépend de : `id020`

- [x] `id022` — Implémenter l'adaptateur Codex (isAvailable + runOnce)
  - 📁 Fichiers : `project/src/adapters/codex.ts`
  - 🔗 Dépend de : `id020`

- [x] `id023` — Créer le registre d'adaptateurs et la sélection par id
  - 📁 Fichiers : `project/src/adapters/registry.ts`
  - 🔗 Dépend de : `id021`, `id022`

- [ ] `id024` — Mettre à jour `jlgcli backends` avec détection réelle (available/missing)
  - 📁 Fichiers : `project/src/commands/backends.ts`
  - 🔗 Dépend de : `id023`

#### Exécution one-shot

- [ ] `id030` — Implémenter le Runner pour exécution one-shot
  - 📁 Fichiers : `project/src/runner/run.ts`
  - 🔗 Dépend de : `id023`

- [ ] `id031` — Implémenter la commande `jlgcli run <prompt>`
  - 📁 Fichiers : `project/src/commands/run.ts`
  - 🔗 Dépend de : `id030`

#### Protocole de complétion

- [ ] `id040` — Implémenter le parser de complétion mode `marker` (DONE)
  - 📁 Fichiers : `project/src/completion/marker.ts`
  - 🔗 Dépend de : `id001`

- [ ] `id041` — Implémenter le parser de complétion mode `json`
  - 📁 Fichiers : `project/src/completion/json.ts`
  - 🔗 Dépend de : `id001`

- [ ] `id042` — Créer le dispatcher de complétion selon config
  - 📁 Fichiers : `project/src/completion/index.ts`
  - 🔗 Dépend de : `id040`, `id041`

#### Exécution itérative (loop)

- [ ] `id050` — Implémenter le Runner loop avec garde-fous (maxIterations, timeout)
  - 📁 Fichiers : `project/src/runner/loop.ts`
  - 🔗 Dépend de : `id030`, `id042`

- [ ] `id051` — Implémenter la détection de non-progrès (noProgressLimit)
  - 📁 Fichiers : `project/src/runner/loop.ts`
  - 🔗 Dépend de : `id050`

- [ ] `id052` — Implémenter la commande `jlgcli loop <prompt>`
  - 📁 Fichiers : `project/src/commands/loop.ts`
  - 🔗 Dépend de : `id050`

#### Observabilité & artifacts

- [ ] `id060` — Implémenter le résumé final (humain + --json)
  - 📁 Fichiers : `project/src/output/summary.ts`
  - 🔗 Dépend de : `id031`

- [ ] `id061` — Implémenter l'écriture des artifacts (--artifacts)
  - 📁 Fichiers : `project/src/artifacts/writer.ts`
  - 🔗 Dépend de : `id050`

### Phase 2 — Robustesse & polish

- [ ] `id070` — Ajouter les tests unitaires pour les parsers de complétion
  - 📁 Fichiers : `project/src/completion/*.test.ts`
  - 🔗 Dépend de : `id042`

- [ ] `id071` — Ajouter les tests d'intégration pour le runner
  - 📁 Fichiers : `project/src/runner/*.test.ts`
  - 🔗 Dépend de : `id052`

- [ ] `id072` — Configurer la CI GitHub Actions (Windows + macOS + Linux)
  - 📁 Fichiers : `project/.github/workflows/ci.yml`
  - 🔗 Dépend de : `id070`

---

## ✅ Terminé

_(aucune tâche terminée)_
