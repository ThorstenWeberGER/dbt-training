# Plan: Build Complete Tier 2 dbt Training Curriculum (Modules 8–12)

> Runtime 49 minutes, consumed 1.43 mio tokens
> Used separate agents for different tasks and multitasking
## Context

The dbt-training repo has a complete Tier 1 (Modules 1–7) with lesson plans, Slidev decks, and a trainer guide. Tier 2 (Modules 8–12) exists only as an agenda outline — no lesson plans, no slides, no exercises, no runnable dbt code. This plan creates everything end-to-end, including a DuckDB-based exercise project that participants can run locally without Snowflake credentials.

---

## Deliverables

| # | File | Type |
|---|------|------|
| 1 | `module_08_seeds_variables.md` | Lesson plan |
| 2 | `module_09_jinja_macros.md` | Lesson plan |
| 3 | `module_10_snapshots_scd2.md` | Lesson plan |
| 4 | `module_11_selectors_tags.md` | Lesson plan |
| 5 | `module_12_cicd_slim_ci.md` | Lesson plan |
| 6 | `presentation/module_08_slides.md` | Slidev deck |
| 7 | `presentation/module_09_slides.md` | Slidev deck |
| 8 | `presentation/module_10_slides.md` | Slidev deck |
| 9 | `presentation/module_11_slides.md` | Slidev deck |
| 10 | `presentation/module_12_slides.md` | Slidev deck |
| 11 | `excercises/trainer_guide.md` | Append Tier 2 sections to existing file |
| 12 | `excercises/exercises_participant.md` | New participant-facing exercise guide |
| 13 | `excercises/dbt_project.yml` | dbt project config (DuckDB) |
| 14 | `excercises/profiles.yml` | DuckDB profile |
| 15 | `excercises/packages.yml` | dbt_utils dependency |
| 16 | `excercises/seeds/*.csv` | 8 seed CSV files |
| 17 | `excercises/models/**/*.sql` | All Tier 1 + Tier 2 model SQL files |
| 18 | `excercises/models/**/*.yml` | Schema YAML with tests |
| 19 | `excercises/macros/*.sql` | Tier 2 macro files |
| 20 | `excercises/snapshots/*.sql` | Tier 2 snapshot files |

---

## Module Scope

| Module | Topic | Duration |
|--------|-------|----------|
| 08 | Seeds and Variables | 45 min |
| 09 | Jinja and Macros | 1.5 h |
| 10 | Slowly Changing Dimensions and Snapshots | 1.5 h |
| 11 | Selectors, Tags, and Running Subsets | 45 min |
| 12 | CI/CD and Slim CI | 1.5 h |

---

## Slide Format (must match Tier 1 exactly)

Every module follows this slide sequence:
1. **Title slide** — module number, tier badge (🟡 Working Effectively), duration
2. **Recap slide** — 2–3 cold-recall questions from previous module
3. **Intro slide** — "The problem this feature solves" before showing the solution
4. **Theory slides** — concept explanation with Mermaid diagrams, code blocks, v-click reveals
5. **Live demo slide** — explicit "trainer does this, you watch" framing
6. **Exercise slide** — worksheet questions (4 questions + bonus)
7. **Key takeaways slide** — 3-bullet summary
8. **Discussion questions slide** — 3 questions for students to answer cold

Frontmatter: same YAML as Tier 1 (theme: default, DM Sans font, JetBrains Mono, slide-left transition). Tier badge: `🟡 Working Effectively`.

---

## dbt Exercise Project Design (DuckDB)

### Adapter
`dbt-duckdb` — runs fully offline, no credentials needed.

### Seeds (simulate Bronze layer)

| File | Rows | Purpose |
|------|------|---------|
| `raw_contacts.csv` | ~20 | HubSpot contacts — id, first_name, last_name, email, country_code, created_at, updated_at |
| `raw_pipeline_stages.csv` | ~10 | HubSpot pipeline stages — stage_id, stage_name, pipeline_id, sort_order, probability |
| `raw_deals.csv` | ~30 | HubSpot deals — deal_id, contact_id, stage_id, amount, close_date, created_at |
| `raw_products.csv` | ~15 | Products — product_id, product_name, category_code, price |
| `raw_prescriptions.csv` | ~25 | Prescriptions — prescription_id, contact_id, product_id, doctor_id, quantity, created_at |
| `raw_doctors.csv` | ~8 | Doctors — doctor_id, first_name, last_name, specialty |

Tier 2 lookup seeds (for Module 08 exercise):

| File | Rows | Purpose |
|------|------|---------|
| `country_codes.csv` | ~10 | country_code → country_name mapping |
| `product_categories.csv` | ~5 | category_code → category_label, is_prescription_required |

### Tier 1 Model Scaffold (starting state for Tier 2)

```
models/
  staging/
    stg_hubspot__contacts.sql        → view on raw_contacts seed
    stg_hubspot__pipeline_stages.sql → view on raw_pipeline_stages seed
    stg_hubspot__deals.sql           → view on raw_deals seed
    stg_products.sql                 → view on raw_products seed
    stg_prescriptions.sql            → view on raw_prescriptions seed
    staging.yml                      → sources + model tests
  silver/
    dim_contact.sql                  → cleaned contacts with country_name join
    dim_pipeline_stage.sql           → cleaned stages
    dim_product.sql                  → cleaned products
    fct_deal.sql                     → deal facts with surrogate keys
    fct_prescription.sql             → prescription facts
    silver.yml                       → grain statements + FK tests
  gold/
    mrt_deals_funnel.sql             → pipeline funnel summary
    mrt_contact_prescriptions.sql    → contact-level prescription summary
    gold.yml                         → documentation
```

### Tier 2 Model Extensions

```
models/
  silver/
    dim_contact_scd2.sql             → Module 10: snapshot-based SCD2 view
  gold/
    mrt_country_summary.sql          → Module 08: uses country_codes seed
macros/
  generate_surrogate_key.sql         → Module 09: custom macro exercise
  safe_cast.sql                      → Module 09: utility macro
snapshots/
  snap_contacts.sql                  → Module 10: snapshot definition
```

---

## Execution Phases

### Phase 1 — Content Creation (parallel agents)
Spin up 5 agents in parallel, one per module. Each agent:
- Reads `dbt_training_agenda_bloomwell.md` for the module outline
- Reads one complete Tier 1 lesson plan for format reference
- Reads one complete Tier 1 slide deck for format reference
- Produces: `module_0X_[topic].md` + `presentation/module_0X_slides.md`

### Phase 2 — Learner Feedback (parallel agents)
Spin up 3 "student" agents that read the new content as if they are a dbt beginner who just completed Tier 1:
- Student A: reads Module 08 + 09, reports confusion points, missing explanations, exercise gaps
- Student B: reads Module 10 + 11, same
- Student C: reads Module 12, same

The feedback is collected and used to improve each module before finalizing.

### Phase 3 — Exercise Project Creation
Create all dbt project files:
1. Scaffold files (`dbt_project.yml`, `profiles.yml`, `packages.yml`)
2. Seed CSV files (realistic but fictional data)
3. All model SQL files (Tier 1 scaffold + Tier 2 extensions)
4. Schema YAML files with tests

### Phase 4 — Run & Verify
```bash
cd excercises

# Create and activate a virtual environment
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install dbt-duckdb

dbt deps
dbt seed
dbt run
dbt test
```
Fix any errors in SQL or YAML until `dbt build` passes clean.

### Phase 5 — Consistency Review
One agent reviews all 5 slide decks + 5 lesson plans together for:
- Narrative continuity (each module references the previous)
- No redundant slides across modules
- Consistent terminology (seeds, macros, snapshots — used the same way everywhere)
- Correct Tier badge (🟡 Working Effectively) and module numbers
- Recap questions at start of each module match the prior module's key takeaways

### Phase 6 — Update Trainer Guide + Create Participant Guide
- Append Tier 2 section to `excercises/trainer_guide.md` (same structure as Tier 1 sections)
- Create `excercises/exercises_participant.md` with:
  - Setup instructions (install dbt-duckdb, run `dbt seed`)
  - Per-module exercise worksheets (questions + starter code where needed)
  - Expected outcomes per exercise

---

## Critical Files to Read Before Implementation

- `module_01_what_is_dbt.md` — canonical lesson plan format
- `presentation/module_04_slides.md` — most complex Tier 1 slide deck, best format reference
- `excercises/trainer_guide.md` — existing Tier 1 trainer sections to match style
- `dbt_training_agenda_bloomwell.md` lines 275–400 — Tier 2 module outlines

---

## Verification

1. `dbt build` exits 0 (all models run + all tests pass)
2. Every lesson plan has the 9-column agenda table, theory blocks, live demo script, exercise worksheet, 3-bullet debrief, prep questions
3. Every slide deck has: title → recap → intro/problem → theory → demo → exercise → takeaways → discussion questions
4. `excercises/exercises_participant.md` covers all 5 Tier 2 modules with runnable exercise steps
5. `excercises/trainer_guide.md` Tier 2 section mirrors the Tier 1 section structure