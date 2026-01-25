# Vision Produit — `@jlguenego/ai-cli` (CLI : `jlgcli`)

## Résumé exécutif

`@jlguenego/ai-cli` est une librairie NPM fournissant un exécutable `jlgcli` qui orchestre des assistants IA en ligne de commande (ex. Copilot CLI, Claude Code CLI, Codex CLI) afin d’exécuter des tâches longues de manière autonome.

Le produit vise à réduire la supervision manuelle (relances, découpages, micro-prompts) et à standardiser l’orchestration multi-backends via une abstraction unique, avec une exécution itérative _idempotente_ jusqu’à un signal de fin explicite.

## Problème adressé

### Contexte

Dans les IDE (VS Code, etc.) avec des assistants IA, exécuter une “grosse tâche” (scaffolding complet, refactor, migration, rédaction de docs, etc.) nécessite souvent une supervision continue : attendre, relancer, segmenter, vérifier.

### Pain points actuels

- Supervision manuelle permanente (on ne peut pas “lancer et oublier”).
- Faible parallélisation du temps : l’utilisateur reste bloqué dans la boucle IA.
- Expérience hétérogène selon les CLIs (sorties, codes retour, auth, streaming).
- Risque de boucles (l’IA n’indique pas clairement la fin, ou répète).

### Coût de l’inaction

- Temps perdu sur des tâches répétitives (relances, reformulations, monitoring).
- Abandon ou sous-utilisation des assistants IA pour les tâches longues.
- Difficulté à industrialiser l’usage en contexte CI (scripts) ou en équipe.

## Solution proposée

### Proposition de valeur unique

Un orchestrateur CLI unique (`jlgcli`) capable de piloter différents backends IA, de normaliser l’exécution, et de rejouer automatiquement un prompt itératif jusqu’à complétion, avec garde-fous et un résumé final.

### Bénéfices clés

- Une commande pour lancer un run : simple ou itératif.
- Multi-backends via adaptateurs (abstraction commune).
- Protocole de complétion explicite : marqueur (`DONE`) ou JSON (`{status: ...}`).
- Robustesse : timeouts, limites d’itérations, détection de non-progrès.
- UX CLI : logs lisibles, niveaux de verbosité, sortie JSON optionnelle.

## Objectifs business

| Objectif                        | Métrique                                | Cible                    | Échéance      |
| ------------------------------- | --------------------------------------- | ------------------------ | ------------- |
| Réduire la supervision manuelle | % de runs “sans intervention”           | > 70% (MVP)              | 8-12 semaines |
| Améliorer la complétion         | Taux de runs terminés en `done`         | > 80% sur tâches ciblées | 8-12 semaines |
| Encadrer les boucles            | Itérations moyennes / run               | ≤ 8 (médiane)            | 8-12 semaines |
| Donner une UX fiable            | % de runs en timeout / erreur contrôlée | < 10%                    | 8-12 semaines |

> Note : ces cibles sont proposées à partir du PRD et seront ajustées avec des retours d’usage et la variabilité des backends.

## Périmètre

### In scope (MVP)

- **Configuration**
  - Définir un backend par défaut (persisté en config locale).
  - Paramètres de sécurité : `maxIterations`, `timeoutMs`, `maxNoProgress`.
  - Choix du protocole de complétion : `marker|json`.

- **Adaptateurs backend**
  - Interface commune : disponibilité, exécution, streaming, résultat normalisé.
  - Backends initiaux : au moins 1 backend fonctionnel, structure extensible.

- **Exécution one-shot**
  - Exécuter un prompt sur le backend sélectionné et afficher le résultat.

- **Exécution itérative (loop)**
  - Boucler : prompt → sortie → décision `continue|done|error`.
  - Détection de fin :
    - Mode marqueur : ligne finale exactement `DONE`.
    - Mode JSON : objet final avec `status` (`continue|done|error`).
  - Garde-fous : maximum d’itérations, timeout global, non-progrès.

- **Observabilité CLI**
  - Logs lisibles + résumé final (backend, durée, itérations, statut).
  - Sortie JSON optionnelle (`--json`) pour CI.

- **Artifacts (optionnel MVP)**
  - Avec `--artifacts`, écrire un dossier `.jlgcli/runs/<id>/` contenant transcript + résumé.

### Out of scope

- UI graphique.
- Orchestration distribuée multi-machines.
- Exécution simultanée massive de jobs (l’objectif est un orchestrateur simple et extensible).
- Auto-correction illimitée sans garde-fous.

### Évolutions futures

- Modèle de plugins pour adaptateurs (API stable + registry).
- Gestion de file d’attente locale (reprise automatique, retries, scheduling).
- Multiples jobs en parallèle (contrôle de concurrence).
- Mode “sandbox” (répertoires autorisés, restrictions d’écriture, dry-run).
- Intégration CI plus poussée (annotations, artefacts standardisés).

## Critères de succès

- `jlgcli --version` fonctionne (installation validée, code retour 0).
- `jlgcli backends` affiche la liste des backends supportés + statut `available|missing|unauthenticated`.
- `jlgcli run <prompt>` retourne une sortie et un code retour cohérent.
- `jlgcli loop <prompt>` s’arrête :
  - dès qu’un `DONE` (mode marker) ou `{"status":"done"}` (mode JSON) est détecté ;
  - sinon à `maxIterations` / `timeoutMs` avec un échec contrôlé et un résumé.
- Le run produit un résumé final humain-lisible, et optionnellement JSON.

## Principes de conception (MVP)

- **Idempotence et reprise** : un run doit pouvoir être relancé sans “effets de bord” imprévisibles ; l’option `--artifacts` doit permettre d’inspecter et, à terme, de reprendre un run interrompu.
- **Contrat explicite de complétion** : la fin doit être détectable sans ambiguïté (marqueur `DONE` ou JSON structuré), sinon le runner applique des garde-fous.
- **Multi-backends sans surprise** : l’utilisateur change de backend sans devoir réapprendre l’outil ; les différences de streaming, erreurs et codes retour sont normalisées.
- **Sécurité par défaut** : logs utiles mais sobres ; ne pas exposer de secrets ; privilégier des variables d’environnement et une documentation claire.
- **Windows-first** : chemins, quoting, encodage et comportements shell doivent être robustes sur Windows (puis macOS/Linux).

## Contraintes & exigences clés

| Élément       | Exigence                                             |
| ------------- | ---------------------------------------------------- |
| Runtime       | Node.js                                              |
| Distribution  | Package NPM publiable                                |
| Nom / scope   | `@jlguenego/ai-cli`                                  |
| Binaire       | `jlgcli`                                             |
| Compatibilité | Windows prioritaire (idéalement macOS/Linux)         |
| Ergonomie     | Logs lisibles, statut de progression, résumé final   |
| Fiabilité     | Timeouts, limites, et mécanismes de reprise à cadrer |

## Risques et hypothèses

| Type                | Description                                        | Mitigation                                                     |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Dépendance externe  | Les CLIs IA doivent être installés + authentifiés  | `isAvailable()`, messages d’erreur clairs, doc troubleshooting |
| Variabilité backend | Sorties non déterministes, formats changeants      | Normalisation, parsing robuste, mode JSON recommandé           |
| Boucles infinies    | L’IA ne termine pas ou répète                      | `maxIterations`, `timeoutMs`, `noProgressLimit`                |
| Compatibilité OS    | Windows prioritaire, comportements shell variables | Tests sur Windows, chemins/quoting robustes                    |
| Sécurité            | Risque de fuite de secrets via logs                | Redaction/filtrage, doc “ne pas logguer” + options verbose     |
| Reprise de run      | “reprise / redémarrage” non encore cadrée          | Définir un format d’état + artefacts, clarifier scope MVP      |

---

## Références

- Brief : `input/brief.md`
- PRD : `input/prd.md`
