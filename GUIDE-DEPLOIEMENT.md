# Guide de Déploiement — @jlguenego/ai-cli

> Ce guide décrit le processus complet de publication du package sur npmjs.com.

---

## Table des matières

1. [Pré-requis](#pré-requis)
2. [Configuration initiale](#configuration-initiale)
3. [Processus de déploiement](#processus-de-déploiement)
4. [Commandes disponibles](#commandes-disponibles)
5. [Étapes du script](#étapes-du-script)
6. [Versioning](#versioning)
7. [Dépannage](#dépannage)

---

## Pré-requis

### Environnement

- **Node.js** : version 20.0.0 ou supérieure
- **npm** : version 10.0.0 ou supérieure
- **Git** : installé et configuré

### Compte npmjs.com

- Compte npmjs créé : [https://www.npmjs.com](https://www.npmjs.com)
- Authentification configurée localement

---

## Configuration initiale

### 1. Authentification npm

Connectez-vous à npm depuis votre terminal :

```bash
npm login
```

Entrez vos identifiants npmjs.com. Cela crée/met à jour le fichier `~/.npmrc` avec votre token d'authentification.

### 2. Vérifier l'authentification

```bash
npm whoami
```

Doit afficher votre nom d'utilisateur npm (ex: `jlguenego`).

### 3. Vérifier les droits sur le scope

Pour publier sous `@jlguenego/ai-cli`, vous devez être propriétaire du scope `@jlguenego`.

```bash
npm org ls jlguenego
```

---

## Processus de déploiement

### Workflow standard

```
1. Développer et tester localement
2. Commiter tous les changements
3. Incrémenter la version dans package.json
4. Commiter le changement de version
5. Exécuter npm run deploy
```

### Étapes détaillées

#### 1. S'assurer d'être sur la branche `master`

```bash
git checkout master
git pull origin master
```

#### 2. Vérifier qu'il n'y a pas de changements non commités

```bash
git status
```

Si des fichiers sont modifiés, les commiter ou les stasher.

#### 3. Incrémenter la version

```bash
# Patch (1.0.0 → 1.0.1) - corrections de bugs
npm version patch --no-git-tag-version

# Minor (1.0.0 → 1.1.0) - nouvelles fonctionnalités
npm version minor --no-git-tag-version

# Major (1.0.0 → 2.0.0) - changements breaking
npm version major --no-git-tag-version
```

#### 4. Commiter le changement de version

```bash
git add package.json
git commit -m "chore: bump version to X.Y.Z"
git push origin master
```

#### 5. Simuler le déploiement (dry-run)

```bash
cd project
npm run deploy -- --dry-run
```

Vérifier que toutes les étapes passent sans erreur.

#### 6. Déployer pour de vrai

```bash
npm run deploy
```

---

## Commandes disponibles

| Commande                      | Description                        |
| ----------------------------- | ---------------------------------- |
| `npm run deploy`              | Déploiement complet sur npmjs.com  |
| `npm run deploy -- --dry-run` | Simulation sans publication réelle |

---

## Étapes du script

Le script `scripts/deploy.js` exécute 7 étapes dans l'ordre :

### 1. Vérification de la branche

- Vérifie que la branche courante est `master`
- Vérifie qu'il n'y a pas de changements non commités

### 2. Exécution des tests

```bash
npm test
```

Tous les tests doivent passer.

### 3. Build TypeScript

```bash
npm run build
```

Compile les sources TypeScript vers `dist/`.

### 4. Vérification de la version

- Compare la version locale (`package.json`) avec la version publiée sur npm
- Refuse de publier si la version existe déjà

### 5. Publication sur npm

```bash
npm publish --access public
```

Publie le package sur le registre npmjs.com.

### 6. Création du tag Git

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Crée et pousse un tag Git correspondant à la version.

### 7. Mise à jour du CHANGELOG

- Met à jour `CHANGELOG.md` avec la nouvelle version
- Commite et pousse le changement

---

## Versioning

Le projet suit [Semantic Versioning](https://semver.org/) :

| Type      | Quand l'utiliser                             | Exemple       |
| --------- | -------------------------------------------- | ------------- |
| **MAJOR** | Changements incompatibles (breaking changes) | 1.0.0 → 2.0.0 |
| **MINOR** | Nouvelles fonctionnalités (rétrocompatibles) | 1.0.0 → 1.1.0 |
| **PATCH** | Corrections de bugs                          | 1.0.0 → 1.0.1 |

### Conventional Commits

Utilisez les préfixes de commit standards :

- `feat:` — nouvelle fonctionnalité (→ minor)
- `fix:` — correction de bug (→ patch)
- `docs:` — documentation
- `chore:` — maintenance
- `refactor:` — refactoring
- `test:` — ajout/modification de tests
- `BREAKING CHANGE:` — changement incompatible (→ major)

---

## Dépannage

### Erreur : "La branche courante est 'xxx', mais seule 'master' est autorisée"

```bash
git checkout master
git pull origin master
```

### Erreur : "Des changements non commités sont présents"

```bash
git status
git add .
git commit -m "chore: commit before deploy"
```

### Erreur : "La version X.Y.Z est déjà publiée sur npm"

Incrémentez la version dans `package.json` :

```bash
npm version patch --no-git-tag-version
git add package.json
git commit -m "chore: bump version"
git push
```

### Erreur : "npm ERR! 403 Forbidden"

- Vérifiez votre authentification : `npm whoami`
- Reconnectez-vous : `npm login`
- Vérifiez les droits sur le scope `@jlguenego`

### Erreur : "npm ERR! 402 Payment Required"

Pour les packages scoped (`@jlguenego/...`), ils sont privés par défaut. Utilisez `--access public` (déjà configuré dans le script).

### Tests échouent

Corrigez les tests avant de déployer :

```bash
npm test
npm run test:watch  # pour débugger
```

### Build échoue

Vérifiez les erreurs TypeScript :

```bash
npm run typecheck
npm run build
```

---

## Liens utiles

- **Package npm** : https://www.npmjs.com/package/@jlguenego/ai-cli
- **Documentation npm publish** : https://docs.npmjs.com/cli/publish
- **Semantic Versioning** : https://semver.org/
- **Keep a Changelog** : https://keepachangelog.com/

---

## Checklist de release

Avant chaque release, vérifier :

- [ ] Tous les tests passent (`npm test`)
- [ ] Pas d'erreurs lint (`npm run lint`)
- [ ] Pas d'erreurs TypeScript (`npm run typecheck`)
- [ ] Version incrémentée dans `package.json`
- [ ] Changements commités et poussés
- [ ] Branche `master` à jour
- [ ] Dry-run réussi (`npm run deploy -- --dry-run`)
