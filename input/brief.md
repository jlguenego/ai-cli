# Brief projet : [Nom du projet]

## 1) Contexte & problème

Dans les IDE (VS Code, etc.) avec des assistants IA, l’exécution de “grosses tâches” demande souvent une supervision continue :

- attendre la fin des prompts,
- découper le travail en petites étapes,
- relancer manuellement l’assistant à chaque itération.

Résultat : faible parallélisation du temps (on ne peut pas “lancer et oublier”) et perte de productivité sur des tâches longues.

## 2) Objectif du produit

Créer une librairie NPM (avec un exécutable CLI) qui orchestre des assistants IA en ligne de commande (ex. GitHub Copilot CLI, Codex CLI, Claude Code CLI) pour exécuter des tâches longues de manière autonome, pendant que l’utilisateur peut faire autre chose.

## 3) Public cible

- Développeurs (solo, équipes, freelances)
- Makers / porteurs de projets
- Toute personne pilotant des projets “IA + code” et souhaitant automatiser des itérations

## 4) Proposition de valeur

- Lancer une tâche complexe en une commande
- Standardiser l’orchestration multi-CLI (un seul outil, plusieurs backends)
- Répéter automatiquement un prompt “itératif et idempotent” jusqu’à complétion
- Réduire le besoin de supervision permanente

## 5) Périmètre fonctionnel (MVP)

### 5.1 Sélection du backend IA

- Définir un CLI par défaut (Copilot / Claude / Codex…)
- Permettre d’en sélectionner un au lancement de la commande
- Persister la préférence utilisateur (config locale)

### 5.2 Wrapper / adaptateurs

- Fournir une couche d’abstraction commune au-dessus des CLIs supportés
- Normaliser : exécution, streaming, codes de sortie, erreurs, timeouts

### 5.3 Exécution “itérative et idempotente”

- Lancer un prompt en mode itératif
- Répéter automatiquement tant que l’assistant n’indique pas explicitement la fin
- Définir un protocole de complétion robuste (ex. marqueur final “DONE”, ou JSON structuré)
- Protéger contre les boucles infinies (max itérations, timeouts, détection de répétition)

## 6) Contraintes & exigences

- **Runtime** : Node.js (script exécutable)
- **Distribution** : package NPM publiable
- **Nom / scope** : `@jlguenego/ai-cli`
- **Binaire** : `jlgcli`
- **Compatibilité** : Windows en priorité (et idéalement macOS/Linux)
- **Ergonomie** : logs lisibles, statut de progression, résumé final
- **Fiabilité** : reprise / redémarrage possible d’une tâche si interrompue (à préciser)

## 7) Livrables attendus

- Package NPM `@jlguenego/ai-cli`
- CLI `jlgcli` couvrant les user stories via des commandes dédiées
- Documentation : installation, configuration, exemples, troubleshooting

## 8) Questions ouvertes (à cadrer)

- Quels CLIs sont supportés au départ (priorité) ?
- Quel format de “contrat” pour l’idempotence et la complétion (marqueur, JSON, autre) ?
- Gestion des secrets/credentials (variables d’environnement, fichiers, intégrations) ?
- Besoin de sandbox (répertoires autorisés, restrictions d’écriture) ?

---

## Document associé

- PRD (spécifications + user stories + commandes) : `input/prd.md`
