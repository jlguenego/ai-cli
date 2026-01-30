---
id: "009"
slug: "deploy-npmjs"
status: "cloture"
created_at: "2026-01-30T14:00:00Z"
updated_at: "2026-01-30T14:30:00Z"
related_docs:
  - "09-integration-deploiement"
---

# Clarification : Déploiement sur npmjs.com

## Contexte

L'utilisateur souhaite automatiser le déploiement du package `@jlguenego/ai-cli` sur **npmjs.com**.

### Informations fournies

- Compte npmjs : `jlguenego`
- Contrainte : **Pas de PowerShell**, préférer un script Node.js
- Besoin : Script de déploiement avec architecture à proposer

### Points à clarifier

Le déploiement npm implique plusieurs choix structurants :

- Stratégie de versioning (manuel, automatique, semantic-release)
- Étapes du pipeline de publication (tests, build, publish)
- Gestion des credentials npm (token, variables d'environnement)
- Déclenchement (manuel, CI/CD, les deux)

---

## Question 1 : Quelle stratégie de versioning souhaitez-vous ?

- [ ] **A) Manuel** — Vous modifiez manuellement la version dans `package.json` avant chaque release
- [x] **B) Automatique avec semantic-release** — Versioning automatique basé sur les conventional commits
- [ ] **C) Semi-automatique avec npm version** — Script qui incrémente la version (patch/minor/major) via commande
- [ ] **D) Autre** : \***\*\*\*\*\***\*\*\***\*\*\*\*\***\_\_\_\***\*\*\*\*\***\*\*\***\*\*\*\*\***
- [ ] **E) Laisser l'IA décider et justifier son choix**

## Question 2 : Comment voulez-vous déclencher la publication ?

- [x] **A) Manuellement** — Exécution locale d'un script `npm run deploy` ou `node scripts/deploy.js`
- [ ] **B) CI/CD uniquement** — Déclenchement via GitHub Actions sur tag/release
- [ ] **C) Les deux** — Script local + workflow CI/CD
- [ ] **D) Autre** : \***\*\*\*\*\***\*\*\***\*\*\*\*\***\_\_\_\***\*\*\*\*\***\*\*\***\*\*\*\*\***
- [ ] **E) Laisser l'IA décider et justifier son choix**

## Question 3 : Comment gérer le token npm pour l'authentification ?

- [ ] **A) Variable d'environnement locale** — `NPM_TOKEN` défini dans le terminal ou `.env`
- [x] **B) Fichier `.npmrc` local** — Token stocké dans `~/.npmrc` (déjà configuré sur votre machine)
- [ ] **C) GitHub Secrets** — Token stocké en secret pour CI/CD
- [ ] **D) Combinaison B + C** — `.npmrc` local pour dev + GitHub Secrets pour CI
- [ ] **E) Autre** : \***\*\*\*\*\***\*\*\***\*\*\*\*\***\_\_\_\***\*\*\*\*\***\*\*\***\*\*\*\*\***
- [ ] **F) Laisser l'IA décider et justifier son choix**

## Question 4 : Quelles étapes inclure dans le script de déploiement ?

Cochez toutes les étapes souhaitées :

- [x] **Vérification de la branche** (ex: autoriser uniquement `main`)
- [x] **Exécution des tests** avant publication
- [x] **Build TypeScript** (`tsc`)
- [x] **Vérification de la version** (pas déjà publiée)
- [x] **Dry-run optionnel** (`npm publish --dry-run`)
- [x] **Tag Git automatique** après publication réussie
- [x] **Génération de changelog** (CHANGELOG.md)
- [ ] **Autre** : \***\*\*\*\*\***\*\*\***\*\*\*\*\***\_\_\_\***\*\*\*\*\***\*\*\***\*\*\*\*\***

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->
<!-- Si vous choisissez "Autre", complétez la ligne -->
<!-- Sauvegardez le fichier puis relancez le prompt -->

---

## Décision finale

**Choix retenus** :

### 1. Versioning : Automatique avec semantic-release

Le versioning sera géré automatiquement via **semantic-release** basé sur les conventional commits :

- `fix:` → version patch (1.0.x)
- `feat:` → version minor (1.x.0)
- `BREAKING CHANGE:` → version major (x.0.0)

### 2. Déclenchement : Manuel

Publication déclenchée localement via `npm run deploy` ou `node scripts/deploy.js`.

### 3. Authentification : Fichier `.npmrc` local

Le token npm est stocké dans `~/.npmrc` (déjà configuré sur la machine de l'utilisateur).

### 4. Étapes du script de déploiement

Le script Node.js inclura les étapes suivantes :

1. ✅ Vérification de la branche (`main` uniquement)
2. ✅ Exécution des tests (`npm test`)
3. ✅ Build TypeScript (`npm run build`)
4. ✅ Vérification de la version (pas déjà publiée sur npm)
5. ✅ Dry-run optionnel (`--dry-run` flag)
6. ✅ Publication npm (`npm publish --access public`)
7. ✅ Tag Git automatique après publication réussie
8. ✅ Génération de changelog (CHANGELOG.md)

### Architecture proposée

```
project/
├── scripts/
│   └── deploy.js          # Script principal de déploiement (Node.js)
├── package.json           # Script "deploy" ajouté
└── CHANGELOG.md           # Généré automatiquement
```

---

## Annexe : Note originale de l'utilisateur

> Le deploiement doit etre fait completement sur le site https://npmjs.com
>
> J'ai un compte.
> Identifiant: jlguenego
>
> Il faut faire le script de deploiement. Je te laisse proposer une architecture.
>
> Evite le powershell.
> Fais plutot du script nodejs.
