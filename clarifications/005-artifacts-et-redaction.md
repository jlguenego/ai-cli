---
id: "005"
slug: "artifacts-et-redaction"
status: "ouvert" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T13:36:24.9556869Z"
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
- [ ] **B) NDJSON** : `meta.json` + `transcript.ndjson` + `result.json`
- [ ] **C) Markdown** : `report.md` + `raw.txt`
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Redaction — niveau de protection

- [ ] **A) Aucune redaction** (responsabilité utilisateur, doc seulement)
- [ ] **B) Best-effort** : patterns courants (token/api key/bearer) + avertissements
- [ ] **C) Strict** : redaction agressive (risque de retirer des infos utiles)
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Échec d’écriture des artefacts (droits, disque, path)

- [ ] **A) Ne doit pas casser le run** : warning + continuer (exit code selon statut principal)
- [ ] **B) Doit échouer** : arrêt avec code dédié
- [ ] **C) Configurable** : `--artifacts-strict`
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->

---

## Décision finale

<!-- Section remplie automatiquement par l'IA après clôture -->
<!-- Ne pas modifier manuellement -->
