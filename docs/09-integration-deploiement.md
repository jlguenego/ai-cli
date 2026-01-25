# Intégration & Déploiement — `@jlguenego/ai-cli` (CLI : `jlgcli`)

Ce projet est un **package NPM** (CLI) : le “déploiement” vise surtout la **CI**, la **publication NPM**, et des releases reproductibles.

## Pipeline CI/CD (OBLIGATOIRE)

```mermaid
flowchart LR
  subgraph "CI"
    A[Push / PR] --> B[Install deps]
    B --> C[Build (tsc)]
    C --> D[Test]
    D --> E[Lint / SAST]
    E --> F[Pack (npm pack)]
  end

  subgraph "CD"
    F --> G{Branch / Tag?}
    G -->|PR| H[No publish]
    G -->|main| I[Release prep]
    G -->|tag v*| J[Publish NPM]
    J --> K[Create GitHub Release]
  end
```

---

## Environnements

| Environnement | “URL”          | Déploiement                 | Usage           |
| ------------- | -------------- | --------------------------- | --------------- |
| Development   | local          | Manuel                      | dev/itérations  |
| CI            | GitHub Actions | Automatique                 | build/test/lint |
| Release       | NPM registry   | Automatique (tag) ou manuel | distribution    |

---

## Configuration par environnement

| Variable       | Dev    | CI                  | Release |
| -------------- | ------ | ------------------- | ------- |
| `NODE_VERSION` | 20+    | 20+                 | 20+     |
| `NPM_TOKEN`    | absent | secret (si publish) | secret  |
| `LOG_LEVEL`    | debug  | info                | info    |

Notes CI :

- exécuter la CI sur une matrice OS **Windows + macOS + Linux** (ex: `windows-latest`, `macos-latest`, `ubuntu-latest`).

Notes sécurité :

- ne jamais écrire les tokens dans les logs
- privilégier `NPM_TOKEN` (secret GitHub Actions) + permissions minimales

---

## Procédures de déploiement

### Déploiement standard (publication NPM)

1. Merger sur `main` (CI verte)
2. Bumper version (`npm version patch|minor|major`) selon la politique
3. Créer un tag `vX.Y.Z` (ou laisser `npm version` le faire)
4. Le workflow CD publie sur NPM avec `npm publish`
5. Créer une GitHub Release (notes + changelog)

### Rollback

1. Identifier la dernière version stable `vX.Y.Z`
2. Republier une correction `vX.Y.(Z+1)` (préféré)
3. En cas d’urgence, déprécier la version fautive sur NPM (`npm deprecate`)

---

## Infrastructure as Code

Non applicable au MVP : pas de service déployé. Si une infra apparaît plus tard (ex: serveur d’orchestration), alors :

- définir `infrastructure/` (terraform)
- et environnements `staging/production`

---

## Checklist de release

### Pré-release

- [ ] Tests passants (unit + integration)
- [ ] `npm pack` OK (contenu du package validé)
- [ ] `README.md` à jour (install, usage, troubleshooting)
- [ ] Version bump effectuée
- [ ] Changelog/notes de release rédigés

### Post-release

- [ ] `npm install -g @jlguenego/ai-cli@<version>` fonctionne
- [ ] `jlgcli --version` OK
- [ ] Smoke `jlgcli backends` OK (au moins sur environnement de dev)
- [ ] Annonce/communication (si nécessaire)
