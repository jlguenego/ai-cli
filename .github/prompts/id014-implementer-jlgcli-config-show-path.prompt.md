---
agent: agent
description: Implémenter jlgcli config show/path pour afficher la config résolue et les chemins de config
---

# id014 — Implémenter `jlgcli config show` et `jlgcli config path`

## Objectif

Ajouter deux sous-commandes à `jlgcli config` :

- `jlgcli config show` : afficher la **configuration résolue** (defaults + user + project)
- `jlgcli config path` : afficher les **chemins des fichiers de configuration** (user + project détecté)

Le tout avec une UX stable (stdout/stderr), testée, et conforme aux conventions du repo (ESM, TS strict).

## Contexte

- La stratégie de chemins est fixée :
  - config utilisateur : `%USERPROFILE%\.jlgcli.json` (via `USER_CONFIG_PATH`)
  - config projet : `.jlgcli.json` détectée en remontant depuis le CWD
- Le loader existe déjà : `resolveConfig()`, `findProjectRoot()`, `loadUserConfig()`, `loadProjectConfig()`.

Références :

- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — F-001 (config persistée + règles)
- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — commandes `config get/set/show/path`
- [docs/04-decisions-architectures.md](docs/04-decisions-architectures.md) — ADR-004 (emplacement config + priorité)
- [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md) — détails chemins/détection
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — conventions ESM/TS et erreurs

Dépendances : `id012` (config get) doit être complétée.

## Pré-requis

- [x] Tâches dépendantes complétées : `id012`
- [ ] Dépendances installées : depuis `project/`, exécuter `npm install`

## Fichiers impactés

| Fichier                                     | Action   | Description                                   |
| ------------------------------------------- | -------- | --------------------------------------------- |
| `project/src/commands/config.ts`            | Modifier | Ajouter `config show` + `config path`         |
| `project/tests/unit/config-command.test.ts` | Modifier | Ajouter tests unitaires pour `show` et `path` |

## Critères d'acceptation

- [ ] `jlgcli config show` affiche sur stdout un JSON pretty (indentation 2 espaces) de la configuration **résolue** et sort en `0`.
- [ ] `jlgcli config path` affiche sur stdout un JSON stable décrivant les chemins de config et sort en `0`.
- [ ] Si aucune config projet n’est détectée, `projectConfigPath` vaut `null` (pas d’erreur).
- [ ] En cas d’erreur contrôlée de config (`ConfigError`), la commande écrit un message clair sur stderr et sort en `1`.
- [ ] `npm run typecheck` passe.
- [ ] `npm test` passe.

## Tests requis

Unitaires : `project/tests/unit/config-command.test.ts`

Cas à couvrir :

- `handleConfigShow()` :
  - appelle `resolveConfig()`
  - écrit `JSON.stringify(resolvedConfig, null, 2)` sur stdout
- `handleConfigPath()` :
  - écrit un JSON `{ userConfigPath, projectConfigPath }`
  - `projectConfigPath` = `join(findProjectRoot() ?? "", PROJECT_CONFIG_FILENAME)` si root trouvé, sinon `null`

## Instructions

### Étape 1 : Ajouter les sous-commandes `show` et `path`

Fichier : `project/src/commands/config.ts`

1. Étendre les imports :

- Depuis `../config/loader.js` : importer `resolveConfig`, `findProjectRoot` (et garder `ConfigError`)
- Depuis `../config/schema.js` : importer `USER_CONFIG_PATH`, `PROJECT_CONFIG_FILENAME`
- Depuis `node:path` : importer `join`

2. Enregistrer les sous-commandes dans `registerConfigCommand()` :

- `config show`
- `config path`

Exemple :

```ts
configCmd
  .command("show")
  .description("Affiche la configuration résolue")
  .action(async () => {
    await handleConfigShow();
  });

configCmd
  .command("path")
  .description("Affiche les chemins des fichiers de configuration")
  .action(async () => {
    await handleConfigPath();
  });
```

3. Implémenter les handlers (idéalement exportés pour tests) :

```ts
export async function handleConfigShow(): Promise<void> {
  try {
    const resolved = await resolveConfig();
    console.log(JSON.stringify(resolved, null, 2));
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Erreur de configuration: ${error.message}`);
      console.error(`Fichier: ${error.filePath}`);
      process.exit(1);
    }
    throw error;
  }
}

export async function handleConfigPath(): Promise<void> {
  try {
    const projectRoot = findProjectRoot();
    const projectConfigPath = projectRoot
      ? join(projectRoot, PROJECT_CONFIG_FILENAME)
      : null;

    console.log(
      JSON.stringify(
        {
          userConfigPath: USER_CONFIG_PATH,
          projectConfigPath,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`Erreur de configuration: ${error.message}`);
      console.error(`Fichier: ${error.filePath}`);
      process.exit(1);
    }
    throw error;
  }
}
```

Notes :

- `findProjectRoot()` est synchrone et ne doit pas lever d’erreur dans l’état actuel, mais garder une gestion d’erreurs cohérente.
- Stdout = uniquement le JSON (pas de texte additionnel).
- Stderr = messages d’erreurs contrôlées.

Validation : depuis `project/`, exécuter `npm run typecheck`.

### Étape 2 : Ajouter les tests unitaires

Fichier : `project/tests/unit/config-command.test.ts`

1. Étendre le mock `vi.mock("../../src/config/loader.js", ...)` pour inclure :

- `resolveConfig: vi.fn()`
- `findProjectRoot: vi.fn()`

2. Tests `handleConfigShow()` :

- mock `resolveConfig` pour retourner un objet stable
- spy `console.log`
- appeler `handleConfigShow()`
- vérifier le JSON pretty exact

3. Tests `handleConfigPath()` :

- cas 1 : `findProjectRoot` retourne un path → `projectConfigPath` doit être `join(root, PROJECT_CONFIG_FILENAME)`
- cas 2 : `findProjectRoot` retourne `null` → `projectConfigPath` doit être `null`

Astuce de robustesse : pour `userConfigPath`, comparer à `USER_CONFIG_PATH` importé depuis `../../src/config/schema.js`.

Validation : depuis `project/`, exécuter `npm test`.

## Contraintes

- Respecter ESM (imports avec extensions `.js` côté src).
- Ne pas introduire de changements non liés à `config show/path`.
- Éviter toute I/O dans les tests : tout mocker via `vi.mock`.

## Definition of Done

- [ ] Sous-commandes `jlgcli config show` et `jlgcli config path` visibles dans `jlgcli config --help`
- [ ] Tests unitaires ajoutés et passants
- [ ] `npm run typecheck` et `npm test` passent
- [ ] Tâche `id014` cochée dans `TODO.md`

## Références

- [project/src/commands/config.ts](project/src/commands/config.ts)
- [project/src/config/loader.ts](project/src/config/loader.ts)
- [project/src/config/schema.ts](project/src/config/schema.ts)
- [clarifications/004-strategie-config-paths.md](clarifications/004-strategie-config-paths.md)
