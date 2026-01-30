---
id: "007"
slug: "github-copilot-cli"
status: "cloture" # ouvert | cloture
created_at: "2026-01-30T12:12:56.4419260Z"
updated_at: "2026-01-30T12:12:56.4419260Z"
related_docs:
  - "05-specifications-techniques"
  - "06-codage-guidelines"
  - "09-integration-deploiement"
---

# Clarification : Commande GitHub Copilot CLI (invocation)

## Contexte

Le projet prévoit un backend « Copilot ». Pour que l’adaptateur soit portable et que la doc d’installation soit correcte, il faut figer la **commande de base** utilisée pour lancer Copilot en CLI.

Une note utilisateur indique explicitement que la commande est `copilot` (et **pas** `gh copilot`).

## Question 1 : Quelle commande utiliser pour le backend GitHub Copilot ?

- [x] **A) `copilot`** (commande directe)
- [ ] **B) `gh copilot`** (extension GitHub CLI)
- [ ] **C) Autre** : **\*\*\*\*\_\_\*\*\*\***
- [ ] **D) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->

---

## Décision finale

**Choix retenu** : A) `copilot`

**Justification** :

- Alignement avec l’environnement cible (Windows) et avec l’intention « backend Copilot » telle que notée par l’utilisateur.
- Évite une dépendance implicite à GitHub CLI + extension (qui aurait des prérequis d’installation, auth, versions).

**Conséquences** :

- L’adaptateur Copilot doit invoquer `copilot` comme binaire.
- La doc doit mentionner l’installation/présence de `copilot` dans le PATH.

---

## Annexe (source)

Note d’origine conservée : [clarifications/007-github-copilot.md](clarifications/007-github-copilot.md)
