---
id: "004"
slug: "strategie-config-paths"
status: "cloture" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T14:01:05Z"
related_docs:
  - "03-specifications-fonctionnelles"
  - "04-decisions-architectures"
  - "05-specifications-techniques"
---

# Clarification : Emplacement de la configuration (projet vs utilisateur)

## Contexte

L’ADR-004 propose une config “les deux” (projet + user) avec un ordre de priorité. Pour implémenter proprement (Windows-first), il faut préciser :

- emplacements exacts (paths)
- nom des fichiers
- stratégie de découverte du “projet” (cwd, repo root, etc.)

## Question 1 : Emplacement de la config utilisateur (Windows)

- [ ] **A) `%APPDATA%\\jlgcli\\config.json`**
- [ ] **B) `%LOCALAPPDATA%\\jlgcli\\config.json`**
- [x] **C) Dossier home : `%USERPROFILE%\\.jlgcli.json`**
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Config projet — emplacement

- [ ] **A) Dans le repo : `.jlgcli/config.json`** (à la racine projet)
- [x] **B) Dans le repo : `.jlgcli.json`** (fichier unique)
- [ ] **C) Dans `package.json`** (section `jlgcli`)
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Comment déterminer la “racine projet” ?

- [ ] **A) CWD uniquement** (pas de recherche)
- [ ] **B) Remonter jusqu’à trouver `.git/`**
- [ ] **C) Remonter jusqu’à trouver `package.json`**
- [x] **D) Remonter jusqu’à trouver `.jlgcli/`**
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->

---

## Décision finale

**Chemins retenus (MVP)**

- **Config utilisateur (Windows)** : `%USERPROFILE%\.jlgcli.json`.
- **Config projet** : fichier unique à la racine projet : `.jlgcli.json`.

**Détection de la racine projet**

- À partir du CWD, **remonter l’arborescence** jusqu’à trouver `.jlgcli.json`.
- Si non trouvé : considérer qu’on est en “mode global” (config utilisateur seule) ou produire une erreur explicite selon le besoin de la commande.

**Rationale**

- `.jlgcli.json` (projet) + `%USERPROFILE%\.jlgcli.json` (utilisateur) est simple à expliquer et à debugger.
- La détection par présence de `.jlgcli.json` évite les faux positifs liés à `.git/` ou `package.json` dans des mono-repos.
