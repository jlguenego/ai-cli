---
agent: agent
description: Implémenter le streaming temps réel des réponses des backends (RG-019)
---

# id095 — Implémenter le streaming temps réel des réponses (niveau 3)

## Objectif

Implémenter l'affichage en temps réel des réponses des backends lorsque `verbosity >= 3`. Les tokens doivent être affichés dès leur réception, sans buffering, conformément à la règle métier **RG-019**.

## Contexte

Le système de verbosité est déjà en place avec :

- Le helper `streamResponseChunk()` dans [project/src/output/verbosity.ts](project/src/output/verbosity.ts) qui écrit sur stdout sans buffering
- L'option `--verbosity` dans les commandes `run` et `loop`
- La config `streamResponse: true` quand `level >= 3`

Actuellement, les adaptateurs (`CopilotAdapter`, `CodexAdapter`) utilisent `execa` de manière **synchrone** (attente de la fin du processus). Pour le streaming, il faut modifier l'interface et l'implémentation pour capturer les données au fur et à mesure.

- Réf : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décision Q4: Temps réel brut
- Réf : [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — RG-019
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions streaming
- Dépendances : `id092` (option --verbosity)

## Pré-requis

- [x] Tâche `id092` complétée (option --verbosity ajoutée)
- [x] Helper `streamResponseChunk()` existant dans `verbosity.ts`
- [x] Environnement configuré avec Node.js 22 LTS

## Fichiers impactés

| Fichier                           | Action   | Description                                                 |
| --------------------------------- | -------- | ----------------------------------------------------------- |
| `project/src/adapters/types.ts`   | Modifier | Ajouter callback `onChunk` dans `AdapterRunOnceArgs`        |
| `project/src/adapters/copilot.ts` | Modifier | Implémenter le streaming stdout avec callback               |
| `project/src/adapters/codex.ts`   | Modifier | Implémenter le streaming stdout avec callback               |
| `project/src/runner/run.ts`       | Modifier | Passer le callback `onChunk` à l'adaptateur                 |
| `project/src/output/verbosity.ts` | Vérifier | S'assurer que `streamResponseChunk` fonctionne correctement |

## Critères d'acceptation

- [ ] Les tokens sont affichés sur stdout dès réception quand `verbosity >= 3`
- [ ] Le callback `onChunk` est optionnel (rétrocompatibilité)
- [ ] Le streaming fonctionne pour les adaptateurs `copilot` et `codex`
- [ ] Le résultat final `text` reste disponible dans `AdapterRunOnceResult`
- [ ] Le comportement est inchangé quand `verbosity < 3` (pas de streaming)
- [ ] Les tests existants passent toujours

## Tests requis

**Unitaires** : `project/tests/unit/verbosity.test.ts`

- Vérifier que `streamResponseChunk` écrit sur stdout quand `streamResponse=true`
- Vérifier que `streamResponseChunk` n'écrit rien quand `streamResponse=false`

**Intégration** : Valider manuellement que `jlgcli run "dis bonjour" --verbosity=3` affiche les tokens en temps réel.

## Instructions

### Étape 1 : Modifier l'interface AdapterRunOnceArgs

**Fichier** : `project/src/adapters/types.ts`

Ajouter un callback optionnel pour recevoir les chunks en streaming :

```typescript
export interface AdapterRunOnceArgs {
  prompt: string;
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  /** Callback appelé pour chaque chunk reçu en streaming (optionnel) */
  onChunk?: (chunk: string) => void;
}
```

**Validation** : `npm run typecheck` doit passer

### Étape 2 : Modifier CopilotAdapter pour supporter le streaming

**Fichier** : `project/src/adapters/copilot.ts`

Utiliser `execa` avec l'option `stdio` pour capturer stdout en streaming :

```typescript
async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
  const detected = await detectBackend();
  const env = { ...process.env, ...args.env };

  if (detected.kind === "copilot") {
    const copilotArgs = [
      "-p",
      args.prompt,
      "-s",
      "--allow-all-tools",
      "--allow-all-paths",
    ];

    // Créer le subprocess avec streaming
    const subprocess = execa(COPILOT_CMD, copilotArgs, {
      cwd: args.cwd,
      env,
      timeout: args.timeoutMs,
      reject: false,
    });

    // Collecter le stdout complet et streamer si callback fourni
    let stdout = "";
    let stderr = "";

    if (subprocess.stdout) {
      subprocess.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        if (args.onChunk) {
          args.onChunk(chunk);
        }
      });
    }

    if (subprocess.stderr) {
      subprocess.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
    }

    const result = await subprocess;

    return {
      exitCode: result.exitCode ?? 1,
      text: stdout.trim() || stderr,
      raw: { stdout, stderr, exitCode: result.exitCode },
    };
  }

  return {
    exitCode: detected.kind === "unauthenticated" ? 6 : 2,
    text: detected.details ?? "Backend copilot indisponible",
    raw: detected,
  };
}
```

**Validation** : `npm run typecheck` et `npm test` doivent passer

### Étape 3 : Modifier CodexAdapter pour supporter le streaming

**Fichier** : `project/src/adapters/codex.ts`

Appliquer le même pattern que pour CopilotAdapter. Note : Codex utilise stdin pour le prompt.

```typescript
async runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
  const detected = await detectAvailability();
  const env = { ...process.env, ...args.env };

  if (detected.kind === "available") {
    // Créer le subprocess avec streaming et input stdin
    const subprocess = execa(CODEX_CMD, [], {
      cwd: args.cwd,
      env,
      timeout: args.timeoutMs,
      reject: false,
      input: args.prompt,
    });

    let stdout = "";
    let stderr = "";

    if (subprocess.stdout) {
      subprocess.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        if (args.onChunk) {
          args.onChunk(chunk);
        }
      });
    }

    if (subprocess.stderr) {
      subprocess.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
    }

    const result = await subprocess;

    return {
      exitCode: result.exitCode ?? 1,
      text: stdout.trim() || stderr,
      raw: { stdout, stderr, exitCode: result.exitCode },
    };
  }

  return {
    exitCode: detected.kind === "unauthenticated" ? 6 : 2,
    text: detected.details ?? "Backend codex indisponible",
    raw: detected,
  };
}
```

**Validation** : `npm run typecheck` et `npm test` doivent passer

### Étape 4 : Modifier runOnce dans runner/run.ts pour passer le callback

**Fichier** : `project/src/runner/run.ts`

Passer le callback `onChunk` à l'adaptateur quand `verbosity >= 3` :

```typescript
import {
  createVerbosityConfig,
  logCost,
  logPrompt,
  streamResponseChunk
} from "../output/verbosity.js";

// ... dans runOnce(), après logPrompt() ...

// Créer le callback de streaming si verbosity >= 3
const onChunk = verbosityConfig.streamResponse
  ? (chunk: string) => streamResponseChunk(verbosityConfig, chunk)
  : undefined;

// Exécuter le prompt avec streaming
const result = await adapter.runOnce({
  prompt: options.prompt,
  cwd,
  env: options.env,
  timeoutMs: options.timeoutMs,
  onChunk
});

// Ajouter un saut de ligne après le stream si on a streamé
if (verbosityConfig.streamResponse) {
  process.stdout.write("\n");
}
```

**Validation** : `npm run typecheck` et `npm test` doivent passer

### Étape 5 : Tester manuellement le streaming

**Commande** :

```bash
cd project
npm run build
node dist/cli.js run "Dis bonjour en français" --verbosity=3
```

**Résultat attendu** : Les tokens de la réponse apparaissent progressivement sur stdout.

## Contraintes

- **Rétrocompatibilité** : Le callback `onChunk` est optionnel. Si non fourni, le comportement est identique à avant.
- **Pas de buffering** : Utiliser `process.stdout.write()` et non `console.log()` pour éviter le buffering.
- **stdout pour le stream** : Les réponses streamées vont sur stdout (pas stderr) car c'est le contenu principal.
- **stderr pour les logs** : Les logs de verbosité (coût, prompt, progression) restent sur stderr.
- **Gestion des erreurs** : Si le subprocess échoue, capturer quand même ce qui a été reçu.

## Definition of Done

- [ ] Code conforme aux guidelines (`project/docs/06-codage-guidelines.md`)
- [ ] Interface `AdapterRunOnceArgs` mise à jour avec `onChunk` optionnel
- [ ] Adaptateurs `copilot` et `codex` supportent le streaming
- [ ] Runner `runOnce` passe le callback quand `verbosity >= 3`
- [ ] Tests passent (`npm test`)
- [ ] Aucune erreur lint/TS (`npm run lint && npm run typecheck`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décisions verbosité
- [docs/03-specifications-fonctionnelles.md](docs/03-specifications-fonctionnelles.md) — RG-019
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Conventions streaming
- [project/src/output/verbosity.ts](project/src/output/verbosity.ts) — Helper streamResponseChunk
- [project/src/adapters/types.ts](project/src/adapters/types.ts) — Interface Adapter
