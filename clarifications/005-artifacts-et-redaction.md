---
id: "005"
slug: "artifacts-et-redaction"
status: "cloture" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T14:01:05Z"
related_docs:
  - "00-vision"
  - "03-specifications-fonctionnelles"
  - "04-decisions-architectures"
  - "05-specifications-techniques"
  - "10-maintenance-exploitation"
---

# Clarification : Artifacts & stratégie de redaction (secrets)

## Contexte

Les artefacts (`--artifacts`) apportent de la traçabilité, mais risquent de persister des données sensibles (tokens, secrets, PII). Les docs parlent d’opt-in et d’une redaction “best-effort”. Il faut définir un cadre opérationnel.

## Question 1 : Format d’artefacts pour le MVP

- [ ] **A) Simple** : `summary.json` + `transcript.txt`
- [x] **B) NDJSON** : `meta.json` + `transcript.ndjson` + `result.json`
- [ ] **C) Markdown** : `report.md` + `raw.txt`
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Redaction — niveau de protection

- [ ] **A) Aucune redaction** (responsabilité utilisateur, doc seulement)
- [ ] **B) Best-effort** : patterns courants (token/api key/bearer) + avertissements
- [ ] **C) Strict** : redaction agressive (risque de retirer des infos utiles)
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [x] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Échec d’écriture des artefacts (droits, disque, path)

- [ ] **A) Ne doit pas casser le run** : warning + continuer (exit code selon statut principal)
- [x] **B) Doit échouer** : arrêt avec code dédié
- [ ] **C) Configurable** : `--artifacts-strict`
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->

---

## Décision finale

**Choix retenus (MVP)**

- **Format d’artefacts** : **NDJSON** (`meta.json` + `transcript.ndjson` + `result.json`).
- **Échec d’écriture des artefacts** : si `--artifacts` est activé, une erreur d’écriture **fait échouer le run** avec un code dédié.

**Redaction (option “Laisser l’IA décider”) — décision**

**Choix retenu** : **B) Best-effort** (patterns courants) + garde-fous.

**Justification**

- Le mode `--artifacts` est **opt-in** : l’utilisateur choisit explicitement la persistance.
- Une redaction “best-effort” protège contre les fuites les plus probables (bearer tokens, API keys, secrets courants) sans dégrader excessivement la valeur de debug.
- Une redaction “strict” risquerait de supprimer des éléments utiles (ex: extraits de diff, noms de fichiers, erreurs), et un mode “aucune redaction” augmente inutilement le risque.

**Règles opérationnelles (MVP)**

- Redaction appliquée à tout contenu écrit dans `transcript.ndjson` et aux champs textuels de `result.json`.
- Patterns minimaux : `Bearer\s+\S+`, clés type `sk-...`, tokens JWT (forme `xxxxx.yyyyy.zzzzz`), `AWS_SECRET_ACCESS_KEY`, variables `*_TOKEN`, `*_API_KEY`.
- Journaliser un warning quand une redaction a été appliquée (sans révéler la valeur).

**Code de sortie recommandé (artefacts-write-failed)**

- Recommandation POSIX-like : **`EX_CANTCREAT (73)`** (impossible de créer/écrire un fichier).
