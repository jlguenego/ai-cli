# Spécifications Fonctionnelles — `@jlguenego/ai-cli` (CLI : `jlgcli`)

## Vue d'ensemble des modules

```mermaid
graph TB
  subgraph "CLI"
    CLI1[jlgcli: parsing commandes]
    CLI2[Output: humain + --json]
  end

  subgraph "Core Runner"
    R1[run: one-shot]
    R2[loop: itératif]
    R3[Garde-fous: timeout/itérations/no-progress]
  end

  subgraph "Backends"
    B1[Adapter Copilot]
    B2[Adapter Codex]
    B3[Adapter Claude (hors MVP)]
  end

  subgraph "Completion Protocol"
    CP1[marker: DONE]
    CP2[json: {status, summary?, next?}]
  end

  subgraph "Config & State"
    C1[Config locale]
    C2[Artifacts .jlgcli/runs/<id>/]
  end

  CLI1 --> R1
  CLI1 --> R2
  R1 --> B1
  R2 --> B1
  R1 --> CP1
  R2 --> CP1
  R1 --> C1
  R2 --> C1
  R2 --> C2
  B2 -. MVP .-> R1
  B3 -. extensible .-> R1
  CP2 -. optionnel .-> R2
```

---

## Hypothèses et principes

- Les backends IA sont des **CLIs externes** déjà installés et authentifiés.
- `jlgcli` ne remplace pas ces CLIs : il **orchestre** et **normalise** (streaming, erreurs, codes retour).
- La boucle `loop` est **idempotente côté orchestrateur** : elle évite des relances infinies via garde-fous, et produit des artefacts exploitables.
- Windows est **prioritaire** (chemins, quoting, encodage).

---

## Fonctionnalités détaillées

### F-001 : Gestion de configuration (lecture/écriture)

| Attribut      | Valeur                 |
| ------------- | ---------------------- |
| Module        | Config & State         |
| Priorité      | Must                   |
| Complexité    | Moyenne                |
| Stories liées | US-002, US-009, US-010 |

#### Description

Permettre de configurer et persister des paramètres, notamment :

- `backend` (par défaut)
- `maxIterations`
- `timeoutMs`
- `completionMode` (`marker|json`)
- `noProgressLimit`

#### Règles métier

- **RG-001** : la configuration est **persistée localement** et relue à chaque commande.
- **RG-002** : une option CLI explicite surcharge la config (ex. `--backend`).
- **RG-003** : une clé inconnue ou une valeur invalide retourne une erreur contrôlée.

#### Comportement attendu

| Entrée                        | Traitement                            | Sortie                        |
| ----------------------------- | ------------------------------------- | ----------------------------- |
| `config set backend copilot`  | Valide `backend` ∈ backends supportés | Confirmation + code 0         |
| `config set timeoutMs 120000` | Valide entier > 0                     | Confirmation + code 0         |
| `config get backend`          | Lit config                            | Valeur + code 0               |
| `config set foo bar`          | Clé inconnue                          | Message clair + code non-zéro |

#### Cas limites et erreurs

| Cas                  | Comportement attendu                       |
| -------------------- | ------------------------------------------ |
| Config inexistante   | Utiliser defaults raisonnables, sans crash |
| Config non parseable | Erreur claire + action (réinitialiser)     |
| Valeur hors bornes   | Erreur + exemple de valeurs acceptées      |

---

### F-002 : Liste des backends et diagnostic de disponibilité

| Attribut      | Valeur         |
| ------------- | -------------- |
| Module        | CLI + Backends |
| Priorité      | Must           |
| Complexité    | Moyenne        |
| Stories liées | US-003, US-011 |

#### Description

Afficher les backends supportés et leur statut local :

- `available` : binaire détecté + auth minimale ok
- `missing` : binaire non trouvé
- `unauthenticated` : binaire présent mais non prêt (auth requise)
- `unsupported` : backend connu mais **hors périmètre MVP** (non implémenté)

#### Règles métier

- **RG-004** : le diagnostic n’exécute pas de tâche longue ; il reste rapide.
- **RG-005** : `--json` retourne un format stable et parseable.

#### Comportement attendu

| Entrée            | Traitement                           | Sortie                 |
| ----------------- | ------------------------------------ | ---------------------- |
| `backends`        | Probe par adaptateur (`isAvailable`) | Liste lisible + code 0 |
| `backends --json` | Idem + sérialisation JSON            | JSON + code 0          |

#### Cas limites et erreurs

| Cas                      | Comportement attendu                                          |
| ------------------------ | ------------------------------------------------------------- |
| Aucun backend disponible | Message “aucun backend détecté” + code non-zéro dédié (ex. 2) |
| Détection partielle      | Afficher chaque backend avec statut individuel                |

---

### F-003 : Exécution one-shot (`run`)

| Attribut      | Valeur                 |
| ------------- | ---------------------- |
| Module        | Core Runner            |
| Priorité      | Must                   |
| Complexité    | Moyenne                |
| Stories liées | US-004, US-012, US-013 |

#### Description

Exécuter un prompt sur un backend choisi (config ou `--backend`), streamer la sortie, puis produire un résultat normalisé.

#### Règles métier

- **RG-006** : si le backend est indisponible → erreur contrôlée (code dédié, ex. 2).
- **RG-007** : ne pas logguer de secrets (respect des variables d’environnement).
- **RG-008** : `--json` produit un objet final parseable (métadonnées + texte).

#### Comportement attendu

| Entrée                             | Traitement                      | Sortie                              |
| ---------------------------------- | ------------------------------- | ----------------------------------- |
| `run ./prompt.txt`                 | Lit fichier + exécute `runOnce` | Sortie assistant + code 0 si succès |
| `run ./prompt.txt --backend codex` | Surcharge backend               | Sortie assistant                    |
| `run ./prompt.txt --quiet`         | Réduit les logs                 | Sortie minimale                     |
| `run -`                            | Lit stdin                       | Sortie assistant                    |

> Note : Le prompt est toujours un fichier (cf. [clarifications/008-prompt-source-fichier.md](../clarifications/008-prompt-source-fichier.md))

#### Cas limites et erreurs

| Cas                    | Comportement attendu                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| Fichier introuvable    | Erreur + exit 66 (`EX_NOINPUT`)                                       |
| Backend renvoie erreur | Message clair + code 1                                                |
| Sortie énorme          | Stream + tronquer uniquement les logs UI, pas le transcript artifacts |

---

### F-004 : Exécution itérative (`loop`) jusqu’à complétion

| Attribut      | Valeur                            |
| ------------- | --------------------------------- |
| Module        | Core Runner + Completion Protocol |
| Priorité      | Must                              |
| Complexité    | Élevée                            |
| Stories liées | US-005, US-006, US-010, US-014    |

#### Description

Boucler automatiquement :

1. envoyer le prompt initial (et, si défini, le contexte d’itération)
2. streamer la sortie
3. analyser la sortie via `completionMode`
4. décider `continue|done|error`
5. appliquer garde-fous (itérations/timeout/no-progress)

#### Règles métier

- **RG-009** : le protocole `marker` considère `DONE` comme fin **si et seulement si** une ligne finale exactement `DONE` est présente.
- **RG-010** : le protocole `json` extrait le **dernier objet JSON valide** de la sortie, attend `{ status, summary?, next? }` et interprète `status` ∈ {`continue`,`done`,`error`}.
- **RG-011** : la boucle s’arrête au plus tard à `maxIterations`.
- **RG-012** : la boucle s’arrête si `timeoutMs` est dépassé.
- **RG-013** : la boucle s’arrête si `noProgressLimit` est dépassé (sorties identiques/quasi identiques).

#### Comportement attendu

| Entrée                              | Traitement                      | Sortie                  |
| ----------------------------------- | ------------------------------- | ----------------------- |
| `loop ./task.md`                    | Boucle jusqu'à détection `DONE` | Résumé + code 0         |
| `loop ./task.md --max-iterations 3` | Limite stricte                  | Si non terminé → code 4 |
| `loop ./task.md --timeout 2m`       | Timeout global                  | Si dépassé → code 75    |

#### Cas limites et erreurs

| Cas                                    | Comportement attendu                                                 |
| -------------------------------------- | -------------------------------------------------------------------- |
| Assistant ne respecte pas le protocole | Continuer jusqu’aux garde-fous + diagnostic                          |
| Sortie non JSON en mode `json`         | Arrêt immédiat en erreur **invalid-json** (recommandation : exit 65) |
| JSON invalide                          | Arrêt immédiat en erreur **invalid-json** (recommandation : exit 65) |
| Boucle répétitive                      | Déclencher no-progress + résumé                                      |

---

### F-005 : Résumé final et mode machine-readable

| Attribut      | Valeur |
| ------------- | ------ |
| Module        | CLI    |
| Priorité      | Must   |
| Complexité    | Faible |
| Stories liées | US-007 |

#### Description

À la fin d’un `run` ou `loop`, produire :

- un résumé humain : backend, durée, itérations (si loop), statut
- option `--json` : un objet JSON stable (utile CI)

#### Règles métier

- **RG-014** : le résumé indique clairement la cause d’arrêt (done/timeout/max-iterations/no-progress/backend-missing).

#### Comportement attendu

| Entrée            | Traitement                    | Sortie |
| ----------------- | ----------------------------- | ------ |
| `run ...`         | Résumé + texte                | Humain |
| `run ... --json`  | Résumé structuré              | JSON   |
| `loop ... --json` | Résumé + metrics d’itérations | JSON   |

---

### F-006 : Artifacts de run (transcript, résumé, logs)

| Attribut      | Valeur         |
| ------------- | -------------- |
| Module        | Config & State |
| Priorité      | Should         |
| Complexité    | Moyenne        |
| Stories liées | US-008         |

#### Description

Quand `--artifacts` est activé, écrire un dossier : `.jlgcli/runs/<id>/` contenant au minimum :

- `meta.json` : backend, options, timings (sans `process.env`)
- `transcript.ndjson` : événements stdout/stderr (streamables)
- `result.json` : résumé structuré, status, exitCode

#### Règles métier

- **RG-015** : le chemin d’artefacts doit être compatible Windows.
- **RG-016** : si `--artifacts` est activé, une erreur d’écriture **fait échouer** le run (recommandation : `EX_CANTCREAT = 73`).

#### Comportement attendu

| Entrée                 | Traitement                      | Sortie             |
| ---------------------- | ------------------------------- | ------------------ |
| `run ... --artifacts`  | Crée dossier + écrit fichiers   | Chemin affiché     |
| `loop ... --artifacts` | Écrit par itération (optionnel) | Transcript complet |

#### Cas limites et erreurs

| Cas                 | Comportement attendu                                        |
| ------------------- | ----------------------------------------------------------- |
| Droits insuffisants | Erreur explicite + proposition (changer `--cwd` ou dossier) |
| Nom de run invalide | Générer un id safe (timestamp/uuid)                         |

---

## Matrice des règles métier

| ID     | Règle                           | Fonctionnalités     | Validation                   |
| ------ | ------------------------------- | ------------------- | ---------------------------- |
| RG-001 | Config persistée localement     | F-001               | Tests unitaires + e2e config |
| RG-002 | Options CLI surchargent config  | F-001, F-003, F-004 | Tests d’intégration          |
| RG-004 | Diagnostic backends rapide      | F-002               | Tests unitaires adaptateurs  |
| RG-006 | Backend indispo → code dédié    | F-003, F-004        | Tests e2e                    |
| RG-009 | Marker `DONE` strict            | F-004               | Tests unitaires parser       |
| RG-010 | JSON `status` pour complétion   | F-004               | Tests unitaires parser       |
| RG-011 | `maxIterations` stop            | F-004               | Tests d’intégration          |
| RG-012 | `timeoutMs` stop                | F-004               | Tests d’intégration          |
| RG-013 | `noProgressLimit` stop          | F-004               | Tests unitaires “similarité” |
| RG-014 | Résumé inclut cause d’arrêt     | F-005               | Tests snapshot JSON          |
| RG-016 | Artifacts: échec si écriture KO | F-006               | Tests d’intégration FS       |

---

## Glossaire

- **Backend** : assistant IA accessible via CLI externe.
- **Adaptateur** : couche de normalisation pour exécuter un backend.
- **Completion protocol** : convention d’arrêt (`DONE` ou JSON).
- **Artifacts** : fichiers produits pour audit/CI/support.
