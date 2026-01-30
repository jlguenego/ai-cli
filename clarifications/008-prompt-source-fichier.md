---
id: "008"
slug: "prompt-source-fichier"
status: "cloture"
created_at: "2026-01-30T13:45:00Z"
updated_at: "2026-01-30T13:45:00Z"
related_docs:
  - "02-user-stories-flows"
  - "03-specifications-fonctionnelles"
  - "05-specifications-techniques"
---

# Clarification : Source du prompt (fichier, pas inline)

## Contexte

Les spécifications actuelles montrent des exemples avec prompt inline :

- `jlgcli run "Explique ce repo"`
- `jlgcli loop "Fais X et termine par DONE"`

Cependant, l'intention est que les prompts soient **toujours des fichiers**, pas des chaînes passées en argument.

## Question 1 : Format de l'argument prompt

- [ ] **A) Chaîne inline** : `jlgcli run "Mon prompt ici"`
- [x] **B) Chemin de fichier** : `jlgcli run ./prompt.txt`
- [ ] **C) Les deux** : détecter automatiquement si c'est un fichier existant
- [ ] **D) Option explicite** : `jlgcli run --file ./prompt.txt` ou `--prompt "inline"`

## Question 2 : Support de stdin

- [ ] **A) Non supporté**
- [x] **B) Supporté avec `-`** : `cat prompt.txt | jlgcli run -`
- [ ] **C) Supporté avec `--stdin`** : `cat prompt.txt | jlgcli run --stdin`

## Question 3 : Comportement si le fichier n'existe pas

- [x] **A) Erreur immédiate** : exit code dédié (ex: 66 `EX_NOINPUT`)
- [ ] **B) Interpréter comme prompt inline** (fallback)

---

## Décision finale

**Le prompt est TOUJOURS un fichier, jamais une chaîne inline.**

### Syntaxe retenue

```bash
# Fichier prompt
jlgcli run ./prompt.txt
jlgcli loop ./task.md

# Stdin (optionnel, avec tiret)
cat prompt.txt | jlgcli run -
echo "Quick task" | jlgcli run -
```

### Règles d'implémentation

| Règle             | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| **RG-PROMPT-001** | L'argument `<prompt>` est un chemin de fichier (relatif ou absolu)            |
| **RG-PROMPT-002** | Si le fichier n'existe pas → erreur `EX_NOINPUT` (exit 66) avec message clair |
| **RG-PROMPT-003** | Le tiret `-` signifie "lire depuis stdin"                                     |
| **RG-PROMPT-004** | Le contenu du fichier est lu en UTF-8                                         |
| **RG-PROMPT-005** | Cette règle s'applique à toutes les commandes : `run`, `loop`, etc.           |

### Justification

- Les prompts sont souvent longs et multi-lignes → fichier plus pratique
- Permet le versioning des prompts (git)
- Évite les problèmes de quoting shell (guillemets, caractères spéciaux)
- Cohérent avec les conventions Unix (fichiers de configuration, scripts)

### Exemples de messages d'erreur

```
Fichier prompt introuvable : ./prompt.txt
Vérifiez le chemin ou créez le fichier.
```

```
Aucun prompt fourni.
Usage : jlgcli run <fichier-prompt>
```

### Impact sur la documentation

Les documents suivants doivent être mis à jour :

- `docs/02-user-stories-flows.md` : exemples avec fichiers
- `docs/03-specifications-fonctionnelles.md` : F-003, F-004
- `docs/05-specifications-techniques.md` : commandes CLI
