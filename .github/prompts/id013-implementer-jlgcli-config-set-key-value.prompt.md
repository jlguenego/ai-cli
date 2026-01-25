---
agent: agent
description: Implémenter la commande jlgcli config set <key> <value> avec validation et persistance
---

# id013 — Implémenter `jlgcli config set <key> <value>`

## Objectif

Ajouter la sous-commande `jlgcli config set <key> <value>` afin de **persister** une valeur de configuration utilisateur, avec **validation stricte** (clé + valeur) et un comportement CLI stable (stdout/stderr + exit codes).

La commande doit :

1. Valider que `<key>` fait partie des clés supportées
2. Parser `<value>` selon le type attendu de la clé
3. Charger la config utilisateur existante
4. Mettre à jour la clé, re-valider l’objet complet, puis sauvegarder
5. Afficher une confirmation sur stdout et sortir avec code `0`

## Contexte

- La configuration est stockée en JSON et relue à chaque commande.
- Les clés supportées sont centralisées dans le schéma.
- Les fonctions de chargement/sauvegarde existent déjà côté `config/loader`.

Références :

- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — F-001 (règles métier + exemples `config set`)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — Endpoints CLI (`config get/set/show/path`)
- [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md) — chemins retenus (user: `%USERPROFILE%\\.jlgcli.json`, projet: `.jlgcli.json`)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — ESM, conventions, erreurs

Dépendances : `id011` (load/save config) est requis et est déjà réalisé.

## Pré-requis

- [ ] Tâches dépendantes complétées : `id011`
- [ ] Node.js + npm installés
- [ ] Dépendances installées : `cd project` puis `npm install`

## Fichiers impactés

| Fichier                                     | Action   | Description                                         |
| ------------------------------------------- | -------- | --------------------------------------------------- |
| `project/src/commands/config.ts`            | Modifier | Ajouter la sous-commande `set` + parsing/validation |
| `project/tests/unit/config-command.test.ts` | Modifier | Ajouter les tests unitaires pour `config set`       |

## Critères d'acceptation

- [ ] `jlgcli config set backend copilot` persiste la valeur et sort en `0`
- [ ] `jlgcli config set timeoutMs 120000` persiste un nombre > 0 et sort en `0`
- [ ] `jlgcli config set noProgressLimit 0` est accepté (borne >= 0)
- [ ] `jlgcli config set completionMode json` persiste une valeur valide (`marker|json`)
- [ ] `jlgcli config set foo bar` (clé inconnue) affiche une erreur claire sur stderr et sort en `1`
- [ ] `jlgcli config set maxIterations -1` (valeur invalide) affiche une erreur claire sur stderr et sort en `1`
- [ ] La commande écrit uniquement une confirmation sur stdout (ex: `OK`) et aucune stacktrace en cas d’erreur contrôlée
- [ ] `npm run typecheck` passe
- [ ] `npm test` passe

## Tests requis

Unitaires : `project/tests/unit/config-command.test.ts`

Cas à couvrir :

- parsing/validation des valeurs par clé :
  - backend: `copilot|codex` OK, autre KO
  - completionMode: `marker|json` OK
  - maxIterations/timeoutMs: entier strictement positif
  - noProgressLimit: entier >= 0
- comportement du handler `set` :
  - appelle `loadUserConfig()` puis `saveUserConfig()` avec l’objet mis à jour
  - refuse les clés invalides
  - refuse les valeurs invalides

## Instructions

### Étape 1 : Ajouter la sous-commande `set` et le parsing de valeurs

Fichier : `project/src/commands/config.ts`

1. Étendre les imports depuis `../config/loader.js` pour pouvoir charger/sauver :

- `loadUserConfig`
- `saveUserConfig`
- (garder `ConfigError` si déjà utilisé)

2. Ajouter une fonction de parsing/validation (pure) exportée, testable :

```ts
import {
  VALID_BACKENDS,
  VALID_COMPLETION_MODES,
  type BackendId,
  type CompletionMode,
  type ConfigKey,
  type UserConfig,
  isValidConfig,
} from "../config/schema.js";

export function parseConfigValue(
  key: ConfigKey,
  raw: string,
): UserConfig[ConfigKey] {
  switch (key) {
    case "backend": {
      if (!VALID_BACKENDS.includes(raw as BackendId)) {
        throw new Error(`Valeur invalide pour backend: "${raw}"`);
      }
      return raw as BackendId;
    }
    case "completionMode": {
      if (!VALID_COMPLETION_MODES.includes(raw as CompletionMode)) {
        throw new Error(`Valeur invalide pour completionMode: "${raw}"`);
      }
      return raw as CompletionMode;
    }
    case "maxIterations":
    case "timeoutMs":
    case "noProgressLimit": {
      // Entiers en base 10, sans suffixes
      const value = Number(raw);
      if (!Number.isFinite(value) || !Number.isInteger(value)) {
        throw new Error(`Valeur invalide (entier requis): "${raw}"`);
      }
      if ((key === "maxIterations" || key === "timeoutMs") && value <= 0) {
        throw new Error(`${key} doit être > 0`);
      }
      if (key === "noProgressLimit" && value < 0) {
        throw new Error(`noProgressLimit doit être >= 0`);
      }
      return value;
    }
  }
}
```

Notes :

- Conserver les imports ESM avec extensions `.js`.
- La fonction doit rester **pure** (pas de FS), pour tests simples.

3. Ajouter l’enregistrement de la sous-commande dans `registerConfigCommand()` :

```ts
configCmd
  .command("set <key> <value>")
  .description("Définit la valeur d'une clé de configuration")
  .action(async (key: string, value: string) => {
    await handleConfigSet(key, value);
  });
```

4. Implémenter `handleConfigSet(key, value)` avec :

- validation de la clé via `isValidConfigKey()` (déjà existante)
- parsing via `parseConfigValue()`
- chargement de la config utilisateur via `loadUserConfig()`
- création d’un nouvel objet `{ ...current, [key]: parsedValue }`
- validation via `isValidConfig(updated)` (du schéma)
- sauvegarde via `saveUserConfig(updated)`
- sortie : afficher `OK` sur stdout

Gestion d’erreurs :

- erreurs de clé/valeur => stderr + `process.exit(1)`
- `ConfigError` => stderr (message + file path) + `process.exit(1)`

Validation : depuis `project/`, exécuter `npm run typecheck`.

### Étape 2 : Ajouter / adapter les tests unitaires

Fichier : `project/tests/unit/config-command.test.ts`

1. Ajouter des tests pour `parseConfigValue()` (cas OK/KO) sur toutes les clés.

2. Tester la logique `set` sans écrire sur disque en mockant le module `../../src/config/loader.js` via `vi.mock` :

- `loadUserConfig` retourne un objet initial (ex: `{}`)
- `saveUserConfig` est un mock spy
- invoquer le handler (idéalement exporté pour test, ou via `registerConfigCommand` et parsing commander si déjà en place)

Validation : depuis `project/`, exécuter `npm test`.

## Contraintes

- Respecter les conventions du projet (ESM, imports `.js`, TS strict).
- Stdout : uniquement la confirmation (ex: `OK`).
- Stderr : messages d’erreur et hints (pas de JSON si non demandé).
- Pas de changements non liés à `config set`.

## Definition of Done

- [ ] La sous-commande `jlgcli config set <key> <value>` est disponible et documentée via `--help`
- [ ] La validation clé/valeur suit les règles de F-001
- [ ] Les tests unitaires couvrent parsing + handler `set`
- [ ] `npm run typecheck` et `npm test` passent
- [ ] La tâche `id013` est cochée dans `TODO.md`

## Références

- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
- [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md)
- [project/src/config/schema.ts](project/src/config/schema.ts)
- [project/src/config/loader.ts](project/src/config/loader.ts)
