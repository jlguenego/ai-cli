---
id: "010"
slug: "verbosite"
status: "cloture"
created_at: "2026-02-02T10:00:00Z"
updated_at: "2026-02-02T11:00:00Z"
related_docs:
  - "03-specifications-fonctionnelles"
  - "05-specifications-techniques"
  - "06-codage-guidelines"
---

# Clarification : Verbosité et traçabilité des commandes CLI

## Contexte

L'utilisateur souhaite que les commandes `jlgcli run` et `jlgcli loop` soient **verboses par défaut**.

### Besoins exprimés (note originale)

> Par défaut, le `jlgcli run` ou `jlgcli loop` doivent être verbeux :
>
> - tracer le coût de l'utilisation du client (copilot cli, et codex cli) lorsqu'il n'est pas nul et lorsqu'il est nul.
> - tracer les prompts envoyés aux assistants cli (copilot cli, et codex cli)
> - tracer les réponses en stream des clients.

### Points à clarifier

La verbosité implique plusieurs choix de conception :

- **Niveau de verbosité par défaut** : Quelle quantité d'informations afficher sans option ?
- **Options de contrôle** : Comment l'utilisateur peut-il ajuster la verbosité ?
- **Format de sortie** : Comment formater les traces (couleur, préfixes, timestamps) ?
- **Stream des réponses** : Comment afficher les réponses en temps réel ?

---

## Question 1 : Quel niveau de verbosité par défaut ?

- [ ] **A) Minimal** — Uniquement le résultat final, pas de traces intermédiaires
- [ ] **B) Normal** — Résultat + coût + indicateur de progression
- [ ] **C) Verbose** — Résultat + coût + prompts envoyés + réponses en stream
- [x] **D) Debug** — Tout ce qui précède + informations techniques détaillées
- [ ] **E) Laisser l'IA décider et justifier son choix**

## Question 2 : Comment contrôler la verbosité ?

- [ ] **A) Flag `--quiet` / `-q`** — Ajouter un flag pour réduire la verbosité
- [ ] **B) Flag `--verbose` / `-v`** — Garder le défaut minimal, option pour augmenter
- [ ] **C) Les deux** — `--quiet` et `--verbose` disponibles, défaut intermédiaire
- [x] **D) Niveaux numériques `--verbosity=0|1|2|3`** — Contrôle fin du niveau
- [ ] **E) Laisser l'IA décider et justifier son choix**

## Question 3 : Comment afficher le coût d'utilisation ?

- [x] **A) Toujours affiché** — Même si le coût est nul (afficher "Coût : 0.00 $")
- [ ] **B) Uniquement si non nul** — Masquer quand le coût est 0
- [ ] **C) Résumé en fin de session** — Afficher le cumul à la fin uniquement
- [ ] **D) Les trois** — Coût par requête + résumé en fin de session
- [ ] **E) Laisser l'IA décider et justifier son choix**

## Question 4 : Comment afficher les réponses en stream ?

- [x] **A) Affichage en temps réel brut** — Tokens affichés dès réception
- [ ] **B) Affichage avec préfixe** — Préfixer chaque ligne (ex: `[AI] texte...`)
- [ ] **C) Affichage formaté Markdown** — Rendu Markdown en temps réel si possible
- [ ] **D) Spinner + résultat final** — Indicateur de progression, puis résultat complet
- [ ] **E) Laisser l'IA décider et justifier son choix**

## Question 5 : Format des traces (prompts envoyés) ?

- [x] **A) Texte brut complet** — Afficher le prompt tel quel
- [ ] **B) Texte tronqué** — Afficher les X premiers caractères + "..."
- [ ] **C) Métadonnées seulement** — Afficher longueur, tokens estimés, backend cible
- [ ] **D) Mode debug uniquement** — Ne pas afficher par défaut, option `--debug`
- [ ] **E) Laisser l'IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->
<!-- Si vous choisissez "Autre", complétez la ligne -->
<!-- Sauvegardez le fichier puis relancez le prompt -->

---

## Décision finale

**Choix retenus** :

| Question                | Choix                     | Description                                                                                      |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ | --- | --- | -------------------- |
| Q1 - Niveau par défaut  | **D) Debug**              | Mode verbose complet par défaut : résultat + coût + prompts + réponses stream + infos techniques |
| Q2 - Contrôle verbosité | **D) Niveaux numériques** | Flag `--verbosity=0                                                                              | 1   | 2   | 3` pour contrôle fin |
| Q3 - Affichage coût     | **A) Toujours affiché**   | Afficher le coût même s'il est nul ("Coût : 0.00 $")                                             |
| Q4 - Réponses stream    | **A) Temps réel brut**    | Tokens affichés dès réception, sans formatage                                                    |
| Q5 - Format prompts     | **A) Texte brut complet** | Afficher le prompt tel quel, sans troncature                                                     |

**Niveaux de verbosité définis** :

| Niveau | Flag            | Comportement                                                                                       |
| ------ | --------------- | -------------------------------------------------------------------------------------------------- |
| 0      | `--verbosity=0` | Silencieux — Uniquement le résultat final, pas de traces                                           |
| 1      | `--verbosity=1` | Minimal — Résultat + coût                                                                          |
| 2      | `--verbosity=2` | Normal — Résultat + coût + indicateur de progression                                               |
| 3      | `--verbosity=3` | **Debug (défaut)** — Tout : résultat, coût, prompts complets, réponses en stream, infos techniques |

**Implémentation recommandée** :

```typescript
interface VerbosityConfig {
  level: 0 | 1 | 2 | 3;
  showCost: boolean; // Toujours true selon Q3
  showPrompt: boolean; // true si level >= 3
  streamResponse: boolean; // true si level >= 3
  showTechnical: boolean; // true si level >= 3
}

const DEFAULT_VERBOSITY = 3; // Mode debug par défaut
```

**Format de sortie du coût** :

```
💰 Coût : 0.00 $
```

**Impact sur les documents** :

- [03-specifications-fonctionnelles](../docs/03-specifications-fonctionnelles.md) : Ajouter règles métier pour la verbosité
- [05-specifications-techniques](../docs/05-specifications-techniques.md) : Documenter l'interface VerbosityConfig
- [06-codage-guidelines](../docs/06-codage-guidelines.md) : Conventions pour les traces

---

## Annexe : Note originale

```markdown
Par defaut, le `jlgcli run` ou `jlgcli loop` doivent etre verbeux :

- tracer le cout de l'utilisation du client (copilot cli, et codex cli) lorsqu'il n'est pas nul et lorsqu'il est nul.
- tracer les prompts envoyés aux assistants cli (copilot cli, et codex cli)
- tracer les reponses en stream des clients.
```
