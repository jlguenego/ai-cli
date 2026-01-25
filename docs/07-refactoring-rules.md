# Règles de Refactoring — `@jlguenego/ai-cli` (CLI : `jlgcli`)

## Principes directeurs

Objectif : garder un code **prédictible** et **testable** (runner/adapters) et une CLI simple.

### Quand refactorer

- [ ] Duplication (> 3 occurrences) dans runner/adapters.
- [ ] Fonction > 40 lignes (sauf parsing/formatting purement “table-driven”).
- [ ] Module qui mélange I/O (FS/process) et logique pure (parsing/decision).
- [ ] Couplage excessif CLI ↔ core (tests difficiles).
- [ ] Complexité cyclomatique > 10 sur du code critique (`loop`, parsing completion).

### Quand NE PAS refactorer

- Code legacy stable **sans tests** (d’abord ajouter des tests autour).
- Veille de release (risque non maîtrisé).
- Sans compréhension complète du protocole d’exécution d’un backend.

---

## Catalogue des refactorings

### Niveau 1 : Cosmétique

| Refactoring | Déclencheur | Action |
|-------------|-------------|--------|
| Rename | Nom ambigu | Renommer selon conventions (`parseCompletion`, `runOnce`) |
| Extract constant | Valeur répétée | `DEFAULT_TIMEOUT_MS`, `EXIT_CODE_TIMEOUT` |
| Extract variable | Expression complexe | Extraire pour lisibilité |

### Niveau 2 : Structurel

| Refactoring | Déclencheur | Action |
|-------------|-------------|--------|
| Extract method | Fonction trop longue | Découper en helpers (pur vs I/O) |
| Extract module | Responsabilités multiples | `core/runner`, `core/completion`, `core/artifacts` |
| Introduce interface | Plusieurs impl | `Adapter`, `Logger`, `Clock` |

### Niveau 3 : Architectural

| Refactoring | Déclencheur | Action |
|-------------|-------------|--------|
| Replace conditionals with strategy | `switch(backendId)` partout | registry d’adapters + stratégie |
| Separate core/cli | CLI trop “intelligente” | CLI = parsing/formatting, core = logique |
| Replace inheritance with composition | Hiérarchie rigide | préf. composition/fonctions pures |

---

## Gestion de la dette technique

### Classification

| Niveau | Impact | Exemple | Action |
|--------|--------|---------|--------|
| Critique | Bloquant / sécurité | fuite env vars dans artifacts | Immédiat |
| Majeur | Fiabilité/perf | timeouts non respectés | Sprint suivant |
| Mineur | Maintenabilité | noms confus | Backlog |

### Suivi

| ID | Description | Type | Priorité | Estimation | Status |
|----|-------------|------|----------|------------|--------|
| DT-001 | Stabiliser parsing JSON (fin de réponse) | fiabilité | Haute | M | Backlog |
| DT-002 | Redaction best-effort plus robuste | sécurité | Haute | M | Backlog |
| DT-003 | Matrice CI Windows/macOS/Linux | qualité | Moyenne | M | Backlog |

---

## Métriques qualité

| Métrique | Outil | Seuil acceptable | Seuil cible |
|----------|------|------------------|-------------|
| Couverture tests | vitest/jest | > 70% | > 85% |
| Complexité cyclomatique | ESLint rule / Sonar (optionnel) | < 15 | < 10 |
| Duplication | revue + tooling optionnel | < 5% | < 3% |

---

## Checklist pré-refactoring

- [ ] Les tests existants passent
- [ ] Une branche dédiée est créée
- [ ] Le scope est défini et limité (1 objectif)
- [ ] Les invariants du runner sont listés (codes sortie, stop conditions)
- [ ] Review planifiée (si PR)
