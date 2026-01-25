---
id: "003"
slug: "exit-codes-et-erreurs"
status: "cloture" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T14:01:05Z"
related_docs:
  - "02-user-stories-flows"
  - "03-specifications-fonctionnelles"
  - "05-specifications-techniques"
  - "06-codage-guidelines"
  - "08-tests-verification"
  - "10-maintenance-exploitation"
---

# Clarification : Exit codes & classification des erreurs

## Contexte

Plusieurs documents mentionnent des exit codes (ex: 2=backend indispo, 3=timeout, 4=max iterations) et `NoProgressError` “exit 1 ou code dédié”. Pour garantir une UX stable (CI/scripts), il faut figer un mapping complet.

## Question 1 : Stratégie globale pour les codes de sortie

- [ ] **A) Minimaliste** : 0=ok, 1=erreur générique, le reste via messages
- [ ] **B) Codes dédiés** : plusieurs codes stables (backend-missing/unauth/timeout/max-iterations/no-progress)
- [x] **C) Codes POSIX-like** : s’aligner sur conventions existantes (ex. sysexits) autant que possible
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Code de sortie pour “no progress”

- [ ] **A) Exit 1** (erreur générique)
- [x] **B) Exit 5** (nouveau code dédié)
- [ ] **C) Exit 10** (regrouper les erreurs “runner”)
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Différencier `missing` vs `unauthenticated` côté exit codes ?

- [ ] **A) Non** : même exit code (ex. 2)
- [x] **B) Oui** : `missing`=2, `unauthenticated`=6
- [ ] **C) Oui** : `missing`=2, `unauthenticated`=2 mais avec `reasonCode` en JSON
- [ ] **D) Autre** : **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->
<!-- Si vous choisissez "Autre", complétez la ligne -->

---

## Décision finale

**Stratégie retenue** : approche **POSIX-like** (inspirée des conventions `sysexits`) autant que possible, avec quelques codes “produit” stables quand nécessaire.

**Mapping recommandé (MVP)**

- `0` : succès
- `64` : erreur d’usage / arguments invalides (`EX_USAGE`)
- `65` : données invalides (ex: **invalid-json** en mode `json`) (`EX_DATAERR`)
- `2` : backend **missing** (binaire absent / non détecté)
- `6` : backend **unauthenticated** (token manquant/invalide, login requis)
- `75` : timeout / indisponibilité temporaire (aligné `EX_TEMPFAIL` quand pertinent)
- `4` : max-iterations atteintes (runner)
- `5` : **no progress** (runner)

**Notes d’implémentation/documentation**

- `missing` et `unauthenticated` doivent produire des codes différents (2 vs 6) pour faciliter scripts/CI.
- Quand un code “sysexits” est applicable, il est privilégié (ex: 64/65/75).
- Les codes “runner” (4/5) restent des codes dédiés stables car déjà utilisés dans les parcours/UX.
