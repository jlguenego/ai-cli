---
agent: agent
description: Definir le contrat TypeScript commun des adapters (isAvailable/runOnce)
---

# id020 — Définir l'interface commune Adapter (types + contrat)

## Objectif

Créer le contrat TypeScript commun des adaptateurs de backend (Copilot/Codex/Claude) afin que le runner et la commande `backends` puissent s’appuyer sur une interface stable :

- un identifiant d’adapter
- une détection d’état (`isAvailable`)
- une exécution one-shot (`runOnce`)

## Contexte

Le projet `jlgcli` orchestre des backends externes via des adaptateurs.

- Réf : [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md) — section « Contrats d'API (internes) / Adapter (contrat minimal) »
- Réf : [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) — sections « TypeScript » et « Patterns recommandés »
- Réf : [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md) — MVP = Copilot + Codex ; Claude visible en `unsupported`
- Réf : [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md) — statuts `missing` vs `unauthenticated`

Dépendances : `id001` (complétée)

## Pré-requis

- [x] Tâches dépendantes complétées : `id001`
- [ ] Environnement configuré : Node.js `>=20` et npm (cf. [project/package.json](project/package.json) `engines`)

## Fichiers impactés

| Fichier                         | Action | Description                           |
| ------------------------------- | ------ | ------------------------------------- |
| `project/src/adapters/types.ts` | Créer  | Types et interface `Adapter` partagés |

## Critères d'acceptation

- [ ] Le fichier `project/src/adapters/types.ts` exporte un contrat `Adapter` conforme aux specs (id, `isAvailable`, `runOnce`).
- [ ] Les statuts de disponibilité incluent exactement : `available`, `missing`, `unauthenticated`, `unsupported`.
- [ ] Les types n’utilisent pas `any` (utiliser `unknown` si nécessaire).
- [ ] `npm run typecheck` passe.
- [ ] `npm test` passe.

## Tests requis

**Unitaires** : aucun test additionnel obligatoire (types uniquement, pas de logique runtime).

**Validation** : TypeScript compile/typecheck.

## Instructions

### Étape 1 : Créer le module de types d’adapter

**Fichier** : `project/src/adapters/types.ts`

Créer (si nécessaire) le dossier `project/src/adapters/`.

Le module doit exporter au minimum :

- `AdapterId` : identifiants supportés au MVP (et extensible)
- `AdapterAvailabilityStatus` et `AdapterAvailability`
- `AdapterRunOnceArgs` et `AdapterRunOnceResult`
- `Adapter` : interface commune

Implémentation attendue (exemple de forme, à adapter si besoin) :

```typescript
export type AdapterId = "copilot" | "codex" | "claude";

export type AdapterAvailabilityStatus =
  | "available"
  | "missing"
  | "unauthenticated"
  | "unsupported";

export interface AdapterAvailability {
  status: AdapterAvailabilityStatus;
  details?: string;
}

export interface AdapterRunOnceArgs {
  prompt: string;
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}

export interface AdapterRunOnceResult {
  exitCode: number;
  text: string;
  raw?: unknown;
}

export interface Adapter {
  id: AdapterId;

  /**
   * Retourne l'état de disponibilité du backend (binaire présent, auth ok, supporté, etc.).
   */
  isAvailable(): Promise<AdapterAvailability>;

  /**
   * Exécute une seule passe du backend et retourne le texte produit (stdout parsé/normalisé).
   */
  runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult>;
}
```

Notes :

- `isAvailable()` doit être async (les implémentations vont généralement vérifier un binaire / une auth).
- `runOnce()` est async et retourne un `exitCode` + un `text` normalisé (le runner fera le parsing de complétion plus tard).
- Ne pas inclure de logique (pas de spawn ici) : ce fichier est un **contrat**.

### Étape 2 : Vérifier la compilation TypeScript

Depuis `project/` :

- `npm run typecheck`

### Étape 3 : Vérifier la non-régression tests

Depuis `project/` :

- `npm test`

## Contraintes

- Respecter les règles de [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md) : `strict`, pas de `any`, utiliser `unknown`.
- Garder le contrat minimal, stable et réutilisable par `registry` et `runner` (tâches suivantes `id021+`).
- Les statuts doivent permettre de distinguer :
  - `missing` (backend implémenté mais binaire absent)
  - `unauthenticated` (backend implémenté mais login/token manquant)
  - `unsupported` (backend hors MVP mais visible)

## Definition of Done

- [ ] Types et interface `Adapter` créés dans `project/src/adapters/types.ts`
- [ ] `npm run typecheck` OK
- [ ] `npm test` OK
- [ ] Tâche cochée dans [TODO.md](TODO.md)

## Références

- [docs/05-specifications-techniques.md](docs/05-specifications-techniques.md)
- [docs/06-codage-guidelines.md](docs/06-codage-guidelines.md)
- [clarifications/001-perimetre-backends-mvp.md](clarifications/001-perimetre-backends-mvp.md)
- [clarifications/003-exit-codes-et-erreurs.md](clarifications/003-exit-codes-et-erreurs.md)
