---
agent: agent
description: Créer l'interface VerbosityConfig et les helpers de logging pour la verbosité CLI
---

# id091 — Créer l'interface VerbosityConfig et les helpers de logging

## Objectif

Implémenter le module de verbosité qui fournit :
- L'interface `VerbosityConfig` pour configurer le comportement de sortie
- Les fonctions helpers `log()`, `logCost()` et `streamResponse()` pour afficher les traces selon le niveau de verbosité

## Contexte

Le CLI `jlgcli` doit supporter 4 niveaux de verbosité (0-3) pour contrôler finement l'affichage des informations lors de l'exécution des commandes `run` et `loop`.

- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Section "Verbosité (niveaux de trace)"
- Réf : [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décisions sur la verbosité
- Dépendances : `id090` (type `VerbosityLevel` déjà défini dans `schema.ts`)

## Pré-requis

- [x] Tâche `id090` complétée : type `VerbosityLevel` disponible dans `project/src/config/schema.ts`
- [x] Environnement configuré : Node.js 22 LTS, TypeScript compilable

## Fichiers impactés

| Fichier                             | Action   | Description                                        |
| ----------------------------------- | -------- | -------------------------------------------------- |
| `project/src/output/verbosity.ts`   | Créer    | Module principal avec interface et helpers         |
| `project/src/output/index.ts`       | Modifier | Exporter le nouveau module                         |
| `project/tests/unit/verbosity.test.ts` | Créer | Tests unitaires (optionnel, couvert par id096)   |

## Critères d'acceptation

- [ ] Interface `VerbosityConfig` avec propriétés `level`, `showCost`, `showPrompt`, `streamResponse`, `showTechnical`
- [ ] Fonction `createVerbosityConfig(level)` retourne une config pré-remplie selon le niveau
- [ ] Fonction `log(config, level, message)` affiche sur stderr si `config.level >= level`
- [ ] Fonction `logCost(config, cost)` affiche toujours le coût formaté `💰 Coût : X.XX $`
- [ ] Fonction `streamResponse(config, chunk)` écrit sur stdout si `config.level >= 3`
- [ ] Fonction `logPrompt(config, prompt)` affiche le prompt si `config.level >= 3`
- [ ] Export correct depuis `project/src/output/index.ts`
- [ ] Compilation TypeScript sans erreur

## Spécifications techniques

### Niveaux de verbosité

| Niveau | Nom        | Comportement                                                                |
| ------ | ---------- | --------------------------------------------------------------------------- |
| 0      | Silencieux | Résultat final uniquement                                                   |
| 1      | Minimal    | Résultat + coût                                                             |
| 2      | Normal     | Résultat + coût + indicateur de progression                                 |
| 3      | Debug      | Résultat + coût + prompts complets + réponses stream + infos techniques     |

### Règles métier

- **RG-018** : Le coût est **toujours affiché** (même `0.00 $`)
- **RG-019** : Les réponses sont streamées en **temps réel** au niveau 3
- **RG-020** : Les prompts sont affichés en **texte brut complet** au niveau 3

## Instructions

### Étape 1 : Créer le fichier verbosity.ts

**Fichier** : `project/src/output/verbosity.ts`

```typescript
/**
 * Module de gestion de la verbosité pour les commandes CLI
 *
 * Niveaux de verbosité :
 * - 0: Silencieux — Résultat final uniquement
 * - 1: Minimal — Résultat + coût
 * - 2: Normal — Résultat + coût + indicateur de progression
 * - 3: Debug — Tout : résultat, coût, prompts, réponses stream, infos techniques
 */

import type { VerbosityLevel } from "../config/schema.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration de verbosité résolue
 * Détermine ce qui doit être affiché selon le niveau
 */
export interface VerbosityConfig {
  /** Niveau de verbosité (0-3) */
  level: VerbosityLevel;
  /** Toujours true - le coût est toujours affiché (RG-018) */
  showCost: boolean;
  /** true si level >= 3 - afficher les prompts envoyés (RG-020) */
  showPrompt: boolean;
  /** true si level >= 3 - streamer les réponses en temps réel (RG-019) */
  streamResponse: boolean;
  /** true si level >= 3 - afficher les infos techniques */
  showTechnical: boolean;
  /** true si level >= 2 - afficher l'indicateur de progression */
  showProgress: boolean;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Crée une configuration de verbosité à partir d'un niveau
 * @param level Niveau de verbosité (0-3)
 * @returns Configuration de verbosité résolue
 */
export function createVerbosityConfig(level: VerbosityLevel): VerbosityConfig {
  return {
    level,
    showCost: true, // Toujours affiché (RG-018)
    showPrompt: level >= 3,
    streamResponse: level >= 3,
    showTechnical: level >= 3,
    showProgress: level >= 2,
  };
}

// ============================================================================
// Helpers de logging
// ============================================================================

/**
 * Affiche un message si le niveau de verbosité est suffisant
 * Les logs sont écrits sur stderr pour ne pas polluer stdout (réservé aux résultats)
 *
 * @param config Configuration de verbosité
 * @param minLevel Niveau minimum requis pour afficher le message
 * @param message Message à afficher
 */
export function log(
  config: VerbosityConfig,
  minLevel: VerbosityLevel,
  message: string,
): void {
  if (config.level >= minLevel) {
    console.error(message);
  }
}

/**
 * Affiche le coût d'utilisation
 * Le coût est toujours affiché, même s'il est nul (RG-018)
 *
 * @param config Configuration de verbosité
 * @param cost Coût en dollars
 */
export function logCost(config: VerbosityConfig, cost: number): void {
  // Le coût est affiché si level >= 1 (minimal et au-dessus)
  if (config.level >= 1) {
    console.error(`💰 Coût : ${cost.toFixed(2)} $`);
  }
}

/**
 * Affiche un chunk de réponse en temps réel (streaming)
 * Écrit directement sur stdout sans buffering (RG-019)
 *
 * @param config Configuration de verbosité
 * @param chunk Portion de texte à afficher
 */
export function streamResponse(config: VerbosityConfig, chunk: string): void {
  if (config.streamResponse) {
    process.stdout.write(chunk);
  }
}

/**
 * Affiche le prompt envoyé au backend
 * Affiché uniquement au niveau 3 (debug) en texte brut complet (RG-020)
 *
 * @param config Configuration de verbosité
 * @param prompt Prompt complet
 */
export function logPrompt(config: VerbosityConfig, prompt: string): void {
  if (config.showPrompt) {
    console.error("─".repeat(40));
    console.error("📝 Prompt envoyé :");
    console.error("─".repeat(40));
    console.error(prompt);
    console.error("─".repeat(40));
  }
}

/**
 * Affiche un indicateur de progression
 * Affiché uniquement au niveau 2+ (normal et debug)
 *
 * @param config Configuration de verbosité
 * @param current Itération courante
 * @param max Maximum d'itérations (optionnel)
 */
export function logProgress(
  config: VerbosityConfig,
  current: number,
  max?: number,
): void {
  if (config.showProgress) {
    const maxStr = max !== undefined ? `/${max}` : "";
    console.error(`⏳ Itération ${current}${maxStr}...`);
  }
}

/**
 * Affiche une information technique
 * Affiché uniquement au niveau 3 (debug)
 *
 * @param config Configuration de verbosité
 * @param message Message technique
 */
export function logTechnical(config: VerbosityConfig, message: string): void {
  if (config.showTechnical) {
    console.error(`🔧 ${message}`);
  }
}
```

**Validation** : `npx tsc --noEmit`

### Étape 2 : Mettre à jour les exports

**Fichier** : `project/src/output/index.ts`

Ajouter les exports du nouveau module :

```typescript
/**
 * Module output - Formatage des résumés d'exécution et verbosité
 */

export {
  formatDuration,
  statusToHumanMessage,
  formatRunHumanSummary,
  formatLoopHumanSummary,
  formatRunJsonSummary,
  formatLoopJsonSummary,
} from "./summary.js";

export type { RunJsonSummary, LoopJsonSummary } from "./types.js";

// Verbosité
export {
  createVerbosityConfig,
  log,
  logCost,
  streamResponse,
  logPrompt,
  logProgress,
  logTechnical,
} from "./verbosity.js";

export type { VerbosityConfig } from "./verbosity.js";
```

**Validation** : `npx tsc --noEmit`

### Étape 3 : Vérifier la compilation

```bash
cd project
npx tsc --noEmit
npm run lint
```

## Contraintes

- **Logs sur stderr** : Tous les logs (`log`, `logCost`, `logPrompt`, etc.) utilisent `console.error()` ou `process.stderr` pour ne pas polluer stdout
- **Stream sur stdout** : `streamResponse()` écrit sur `process.stdout` pour le streaming temps réel
- **Pas de dépendances externes** : Utiliser uniquement les APIs Node.js natives
- **Import du type VerbosityLevel** : Réutiliser le type défini dans `config/schema.ts`

## Definition of Done

- [ ] Fichier `project/src/output/verbosity.ts` créé avec toutes les fonctions
- [ ] Interface `VerbosityConfig` exportée
- [ ] Factory `createVerbosityConfig(level)` fonctionnelle
- [ ] Helpers `log()`, `logCost()`, `streamResponse()`, `logPrompt()`, `logProgress()`, `logTechnical()` implémentés
- [ ] Exports ajoutés dans `project/src/output/index.ts`
- [ ] Compilation TypeScript réussie (`npx tsc --noEmit`)
- [ ] Lint sans erreur (`npm run lint`)
- [ ] Tâche cochée dans `/TODO.md`

## Références

- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — Section Verbosité
- [clarifications/010-verbosite-normalized.md](clarifications/010-verbosite-normalized.md) — Décisions verbosité
- [project/src/config/schema.ts](project/src/config/schema.ts) — Type VerbosityLevel
