---
id: "006"
slug: "stack-outillage-node-tests-ci"
status: "ouvert" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T13:36:24.9556869Z"
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
- [ ] **C) Node >= 20 (sans matrix)**
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Framework de tests

- [ ] **A) Vitest**
- [ ] **B) Jest**
- [ ] **C) Node test runner natif** (`node --test`)
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Logging

- [ ] **A) `console` + niveaux** (MVP simple)
- [ ] **B) `pino`** (logs structurés + output JSON propre)
- [ ] **C) `winston`**
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 4 : CI — matrice OS

- [ ] **A) Windows uniquement (MVP)**
- [ ] **B) Windows + macOS (MVP)**
- [ ] **C) Windows + macOS + Linux (MVP)**
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->

---

## Décision finale

<!-- Section remplie automatiquement par l'IA après clôture -->
<!-- Ne pas modifier manuellement -->
