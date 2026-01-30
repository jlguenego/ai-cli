---
agent: agent
description: Configurer la CI GitHub Actions avec matrice Windows + macOS + Linux
---

# id072 — Configurer la CI GitHub Actions (Windows + macOS + Linux)

## Objectif

Créer un workflow GitHub Actions qui exécute les tests, le lint et le typecheck sur les trois OS (Windows, macOS, Linux) à chaque push et pull request.

## Contexte

Le projet `@jlguenego/ai-cli` doit être validé sur les trois plateformes majeures pour garantir la compatibilité multi-OS. Le framework de tests est Vitest, la version Node.js minimale est 20.

- Réf : [clarifications/006-stack-outillage-node-tests-ci.md](clarifications/006-stack-outillage-node-tests-ci.md) — Décisions CI/Node/Tests
- Réf : [docs/09-integration-deploiement.md](docs/09-integration-deploiement.md) — Intégration continue
- Dépendances : `id070` ✅

## Pré-requis

- [ ] Tâche `id070` complétée (tests unitaires parsers)
- [ ] Dépôt Git initialisé avec structure `project/`

## Fichiers impactés

| Fichier                    | Action | Description           |
| -------------------------- | ------ | --------------------- |
| `.github/workflows/ci.yml` | Créer  | Workflow CI principal |

## Critères d'acceptation

- [ ] Workflow déclenché sur `push` et `pull_request` (branches `main`, `develop`)
- [ ] Matrice OS : `ubuntu-latest`, `macos-latest`, `windows-latest`
- [ ] Node.js >= 20 (version unique, pas de matrice de versions)
- [ ] Étapes : checkout → setup-node → install → lint → typecheck → test
- [ ] Cache npm pour accélérer les builds
- [ ] Tests avec couverture (`npm run test -- --coverage`)
- [ ] Upload de la couverture en artifact (optionnel mais recommandé)

## Tests requis

**Validation manuelle** : Pousser une branche et vérifier que le workflow s'exécute correctement sur les 3 OS.

## Instructions

### Étape 1 : Créer le fichier workflow

**Fichier** : `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Permissions minimales
permissions:
  contents: read

jobs:
  test:
    name: Test on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    defaults:
      run:
        working-directory: ./project

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: "./project/package-lock.json"

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run typecheck
        run: npm run typecheck

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: matrix.os == 'ubuntu-latest'
        with:
          name: coverage-report
          path: project/coverage/
          retention-days: 7
```

**Validation** : Créer le fichier et pousser sur une branche pour tester.

### Étape 2 : Vérifier que package-lock.json existe

Le cache npm nécessite un `package-lock.json`. S'il n'existe pas, le générer :

**Commande** : `cd project && npm install`

Cela crée/met à jour le `package-lock.json` qui sera utilisé pour le cache.

### Étape 3 : Valider localement

Avant de pousser, vérifier que les commandes fonctionnent :

```bash
cd project
npm run lint
npm run typecheck
npm test -- --coverage
```

## Contraintes

- **Node.js >= 20** : Utiliser Node 22 (LTS actuelle) dans le workflow
- **Pas de matrix versions** : Une seule version Node pour simplifier (cf. clarifications/006)
- **fail-fast: false** : Continuer les autres OS même si un échoue pour voir tous les problèmes
- **working-directory** : Le projet est dans `./project`, pas à la racine
- **Cache npm** : Utiliser le cache intégré de `actions/setup-node` pour accélérer
- **Permissions minimales** : `contents: read` uniquement

## Bonnes pratiques CI

- **Checkout@v4** : Dernière version stable
- **setup-node@v4** : Support natif du cache npm
- **upload-artifact@v4** : Pour la couverture (un seul OS suffit)
- **npm ci** : Installation propre et reproductible (vs `npm install`)

## Definition of Done

- [ ] Fichier `.github/workflows/ci.yml` créé
- [ ] Workflow valide (syntaxe YAML correcte)
- [ ] Push sur une branche déclenche le workflow
- [ ] Les 3 OS passent : lint ✓, typecheck ✓, tests ✓
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/006-stack-outillage-node-tests-ci.md](clarifications/006-stack-outillage-node-tests-ci.md) — Stack et CI
- [docs/09-integration-deploiement.md](docs/09-integration-deploiement.md) — Stratégie CI/CD
- [GitHub Actions documentation](https://docs.github.com/en/actions) — Référence officielle
