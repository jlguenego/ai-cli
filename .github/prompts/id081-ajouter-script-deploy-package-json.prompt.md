---
agent: agent
description: Ajouter le script "deploy" dans package.json pour exécuter le script de déploiement
---

# id081 — Ajouter le script "deploy" dans package.json

## Objectif

Ajouter le script npm `deploy` dans `package.json` pour permettre l'exécution du script de déploiement via `npm run deploy` et `npm run deploy -- --dry-run`.

## Contexte

Le script de déploiement `scripts/deploy.js` a été créé (id080). Il faut maintenant l'intégrer dans les scripts npm pour faciliter son utilisation.

- Réf : [clarifications/009-deploy-npmjs-normalized.md](clarifications/009-deploy-npmjs-normalized.md) — Décision de déclenchement manuel
- Dépendances : `id080` (Créer le script de déploiement) — ✅ Complété

## Pré-requis

- [x] Tâche `id080` complétée : script `scripts/deploy.js` existant
- [x] Environnement Node.js 20+ configuré

## Fichiers impactés

| Fichier                | Action   | Description                |
| ---------------------- | -------- | -------------------------- |
| `project/package.json` | Modifier | Ajouter le script "deploy" |

## Critères d'acceptation

- [ ] `npm run deploy -- --dry-run` s'exécute sans erreur (simulation)
- [ ] `npm run deploy` déclenche le script de déploiement complet
- [ ] Le script est ajouté dans la section `scripts` de `package.json`
- [ ] La commande utilise `node scripts/deploy.js`

## Tests requis

**Validation manuelle** :

```bash
cd project
npm run deploy -- --dry-run
```

Le script doit s'exécuter et afficher les étapes de vérification (branche, tests, build, version check) en mode simulation.

## Instructions

### Étape 1 : Ajouter le script "deploy" dans package.json

**Fichier** : `project/package.json`

Ajouter dans la section `scripts` :

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build",
    "deploy": "node scripts/deploy.js"
  }
}
```

**Validation** : `npm run deploy -- --dry-run`

### Étape 2 : Vérifier l'exécution

Exécuter en mode dry-run pour valider le fonctionnement :

```bash
cd project
npm run deploy -- --dry-run
```

Vérifier que :

- Le script démarre correctement
- Les étapes sont affichées (vérification branche, tests, build, version)
- Le mode `--dry-run` est bien détecté et aucune publication réelle n'a lieu

## Contraintes

- Utiliser `node scripts/deploy.js` et non un chemin absolu
- Ne pas modifier d'autres scripts existants
- Le passage d'arguments (`--dry-run`) doit fonctionner via `npm run deploy -- --dry-run`

## Definition of Done

- [ ] Script `deploy` ajouté dans `package.json`
- [ ] `npm run deploy -- --dry-run` fonctionne correctement
- [ ] Aucune erreur lint/TS (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/009-deploy-npmjs-normalized.md](clarifications/009-deploy-npmjs-normalized.md) — Stratégie de déploiement
- [project/scripts/deploy.js](project/scripts/deploy.js) — Script de déploiement
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions de code
