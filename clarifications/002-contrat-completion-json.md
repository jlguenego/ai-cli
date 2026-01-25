---
id: "002"
slug: "contrat-completion-json"
status: "ouvert" # ouvert | cloture
created_at: "2026-01-25T13:36:24.9556869Z"
updated_at: "2026-01-25T13:36:24.9556869Z"
related_docs:
  - "02-user-stories-flows"
  - "03-specifications-fonctionnelles"
  - "04-decisions-architectures"
  - "05-specifications-techniques"
  - "08-tests-verification"
---

# Clarification : Contrat du mode de complétion JSON

## Contexte

Le mode de complétion `json` est recommandé comme plus robuste que le marker `DONE`. Pour éviter les ambiguïtés de parsing (texte autour, code fences, logs), il faut définir un contrat précis :

- emplacement du JSON (dernière ligne ? bloc final ?)
- schéma minimal (clés obligatoires)
- comportement quand le JSON est invalide

## Question 1 : Où doit se trouver l’objet JSON de décision (`status`) ?

- [ ] **A) Dernière ligne uniquement** (ex: `{"status":"done"}` comme dernière ligne stdout)
- [ ] **B) Dernier bloc JSON** (chercher le dernier objet JSON valide dans la sortie)
- [ ] **C) Bloc délimité** (ex: lignes `BEGIN_JSON` / `END_JSON` autour de l’objet)
- [ ] **D) Dans un code fence** (ex: `json ... ` )
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 2 : Schéma minimal de l’objet final

- [ ] **A) Minimal strict : `{ "status": "continue"|"done"|"error" }`**
- [ ] **B) Étendu : `{ status, summary?, next? }`** (où `summary` est texte, `next` est consigne)
- [ ] **C) Étendu : `{ status, reasonCode?, metrics? }`** (mieux pour CI)
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

## Question 3 : Que faire si le parsing JSON échoue en mode `json` ?

- [ ] **A) Fallback `continue` + warning** (jusqu’aux garde-fous)
- [ ] **B) Stop immédiat en erreur** (exit code “invalid-json” dédié)
- [ ] **C) Réessayer 1 fois** (ex: demander au backend de renvoyer uniquement le JSON)
- [ ] **D) Autre** : **************\_\_**************
- [ ] **E) Laisser l’IA décider et justifier son choix**

---

## Réponses utilisateur

<!-- INSTRUCTIONS : Cochez vos réponses en remplaçant [ ] par [x] -->
<!-- Si vous choisissez "Autre", complétez la ligne -->

---

## Décision finale

<!-- Section remplie automatiquement par l'IA après clôture -->
<!-- Ne pas modifier manuellement -->
