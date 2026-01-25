---
id: "006"
slug: "stack-outillage-node-tests-ci"
status: "cloture" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T14:01:05Z"
related_docs:
  - "05-specifications-techniques"
  - "08-tests-verification"
  - "09-integration-deploiement"
---

# Clarification : Stack outillage (Node version, tests, logs, CI)

## Contexte

Les docs laissent certains choix en TBD/“à confirmer” : version Node, framework de tests, logger, et détails CI. Les figer tôt évite des reworks.

## Question 1 : Version Node.js supportée (MVP)

- [ ] **A) Node 20 LTS uniquement**
- [ ] **B) Node 20 + 22** (matrix CI)
- [x] **C) Node >= 20 (sans matrix)**
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Framework de tests

- [x] **A) Vitest**
- [ ] **B) Jest**
- [ ] **C) Node test runner natif** (`node --test`)
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Logging

- [ ] **A) `console` + niveaux** (MVP simple)
- [ ] **B) `pino`** (logs structurés + output JSON propre)
- [ ] **C) `winston`**
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [x] **E) Laisser l’IA décider et justifier son choix**

## Question 4 : CI — matrice OS

- [ ] **A) Windows uniquement (MVP)**
- [ ] **B) Windows + macOS (MVP)**
- [x] **C) Windows + macOS + Linux (MVP)**
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->

---

## Décision finale

**Choix retenus (MVP)**

- **Node.js** : **Node >= 20** (sans matrix de versions).
- **Tests** : **Vitest**.
- **CI (OS matrix)** : **Windows + macOS + Linux**.

**Logging (option “Laisser l’IA décider”) — décision**

**Choix retenu** : **B) `pino`**.

**Justification**

- `pino` permet des **logs structurés** (JSON) et des niveaux, utile pour CI et debug.
- Il est performant, simple à configurer, et standard dans l’écosystème Node.
- Il facilite la séparation stdout/stderr (important pour le mode `json` où la sortie machine doit rester parseable).

**Règles pratiques (MVP)**

- Émettre le **résultat final “json mode” sur stdout**, et router les logs sur **stderr**.
- Ajouter un flag (ex: `--log-level`) + valeur par défaut (ex: `info`).
