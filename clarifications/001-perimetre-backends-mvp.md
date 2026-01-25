---
id: "001"
slug: "perimetre-backends-mvp"
status: "cloture" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T14:01:05Z"
related_docs:
  - "03-specifications-fonctionnelles"
  - "04-decisions-architectures"
  - "05-specifications-techniques"
  - "08-tests-verification"
---

# Clarification : Périmètre MVP des backends

## Contexte

Les documents mentionnent plusieurs backends (Copilot, Claude, Codex) avec une notion d’“optionnel”. Pour cadrer le MVP (charge de dev + tests + robustesse), il faut décider :

- quels backends sont **implémentés réellement** au MVP
- si les autres sont seulement “déclarés” (stubs / non disponibles)
- quelle stratégie de support multi-OS / Windows-first

## Question 1 : Quels backends sont réellement supportés au MVP ?

- [ ] **A) 1 seul backend réel : Copilot uniquement** (les autres sont “non supportés” au MVP)
- [ ] **B) 1 seul backend réel : Claude uniquement**
- [x] **C) 2 backends réels : Copilot + Codex**
- [ ] **D) 3 backends réels : Copilot + Claude + Codex**
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Que fait `jlgcli backends` pour les backends non implémentés (MVP) ?

- [ ] **A) Ils n’apparaissent pas** (liste = uniquement ce qui est implémenté)
- [ ] **B) Ils apparaissent avec `missing`** (car binaire absent / pas géré)
- [x] **C) Ils apparaissent avec `unsupported`** (nouveau statut)
- [ ] **D) Ils apparaissent avec `planned`** (nouveau statut)
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Windows-first — quelle exigence minimum pour le MVP ?

- [ ] **A) Windows uniquement** (support macOS/Linux “best effort” hors MVP)
- [ ] **B) Windows + macOS** (Linux après)
- [x] **C) Windows + macOS + Linux** (matrice CI complète dès MVP)
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->
<!-- Si vous choisissez "Autre", complétez la ligne -->
<!-- Sauvegardez le fichier puis relancez la commande validate/next -->

---

## Décision finale

**Choix retenus (MVP)**

- **Backends réellement supportés** : **Copilot + Codex**.
- **Backends non implémentés** : visibles dans `jlgcli backends` avec le statut **`unsupported`**.
- **Support OS (MVP)** : **Windows + macOS + Linux** avec matrice CI.

**Impacts principaux sur la documentation/implémentation**

- Les parcours, user stories et specs doivent refléter un MVP à 2 backends (pas 1, pas 3).
- L’UX de `jlgcli backends` doit distinguer clairement `missing` (binaire absent pour un backend implémenté) vs `unsupported` (backend hors MVP).
- Les décisions d’architecture et la CI doivent explicitement inclure les 3 OS.
