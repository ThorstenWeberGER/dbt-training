# dbt Training — Trainer Guide

This document is for you, the trainer. It covers what participants need to do per exercise, the expected outcome at every step, common mistakes to watch for, and how to verify success.

**Participant-facing document:** `exercises.md`
**Data reference:** `seeds/` (Bronze) and `reference/` (Silver expected output)

---

## First: demonstration of dbt in snowflake

#### Done by instructor only

> Contains setup, config of `project.yml`, run in dev, prod, check folders, locate compiled code and see results.

Steps:
* open Snowflake
* create new workspace
* create new dbt project, select warehouse, schema (explain that is fallback)
* edit profiles.yml
	* explain what they see
	* add user: your.email@bloomwell.de
	* change database/schema: bloomwell_staging.dev_schema
	* add prod environment bloomwell_staging.prod_schema
* run it in dev
	* look at output
	* look at results in compiled -> a sql file
	* look at database tables
	* look at the DAG
	* look at documentation in hubspot-tickets-tickets

## Deliberate Bugs in the Pre-built Project

Two bugs have been planted in the scaffold. Participants aren't told about the second one — the test suite reveals it in Module 06.

| Bug | File | What's wrong | When it surfaces |
|-----|------|-------------|-----------------|
| **Bug 1** (visible) | `models/staging/hubspot/stg_hubspot__pipeline_stages.sql` | `materialized='table'` and three columns missing | Module 01 Task 3 (spot it); Module 04 Task 1 (fix it) |
| **Bug 2** (hidden) | `models/silver/fct_prescription.sql` | `patient_key` and `doctor_key` aliases are swapped | Module 06 Task 2 — FK relationship tests fail |

**Bug 2 detail:** The SELECT reads `p.contact_id AS doctor_key` and `p.owner_id AS patient_key` — the aliases are reversed. The model compiles and runs without error, but produces wrong data. The FK relationship tests catch it: `patient_key` contains `OWN001`-style values which don't exist in `dim_patient`, and `doctor_key` contains `C001`-style values which don't exist in `dim_doctor`. The fix is a two-line swap of the aliases.

**Teaching point:** This is exactly why tests matter. A model can run successfully and still be wrong. Tests are the safety net.

---

## Module 01 — Orientation (25 min)

### What participants do

Download repo in their workspace.
* add user, change dev to bloomwell_staging, schema: dev_tweber, dev_a...., dev_lastname


1. Read `dbt_project.yml` and answer four questions
2. List all `.sql` files in `models/silver/` and find one `{{ ref() }}` or `{{ source() }}` call in each
3. Open `stg_hubspot__pipeline_stages.sql` and spot the bug (without fixing it)
4. Run `dbt ls`

### Expected outcomes

| Task | Expected answer |
|---|---|
| Project name | `analytics` |
| Staging materialization | `view` |
| Silver materialization | `table` |
| `+database` key | Routes Silver models to a specific Snowflake database instead of the profile default |
| Silver models | `dim_pipeline`, `dim_patient`, `dim_doctor`, `fct_prescription` |
| Bug in pipeline stages | `materialized='table'` — should be `'view'` |
| `dbt ls` count | 5 (4 Silver + 1 staging pre-built) |

### Common mistakes

- Participants try to fix the bug immediately — redirect them: "note it, fix it in Module 04"
- Participants can't find `dbt_project.yml` — it's at the repo root, not inside `models/`

### Trainer notes

The goal here is orientation, not comprehension. If participants struggle with any question, that signals a gap to revisit — not a reason to slow down. The Module 01 theory block should have covered all of this.

---

## Module 02 — Local Setup (no exercise)

### Success criterion

```
dbt debug
```

All lines show `OK`. The most common failure is an incorrect `account` field in `profiles.yml` — Snowflake account locators must include the region suffix (e.g., `xy12345.eu-west-1`).

### Trainer notes

Don't proceed to Module 03 with anyone whose `dbt debug` is still failing. Snowflake auth with `externalbrowser` requires a browser window — make sure participants aren't in a headless environment.

---

## Module 03 — Write Your First Staging Model (20 min)

### What participants do

1. Write down their prediction of how a given model compiles (Task 1 — no tools)
2. Create `models/staging/hubspot/stg_hubspot__contacts.sql` (Task 2)
3. Run `dbt compile --select stg_hubspot__contacts`
4. Open the compiled output file and compare to their prediction

### Expected outcome: Task 1

| Jinja expression | Compiled to |
|---|---|
| `{{ source('hubspot', 'contacts') }}` | `BRONZE.HUBSPOT.contacts` |
| `{{ ref('dim_pipeline') }}` | `SILVER_DEV.TESTING__dev_yourname.dim_pipeline` (dev target) |
| `{{ config(materialized='view') }}` | Removed; becomes a `CREATE OR REPLACE VIEW` wrapper |

This trips people up: participants often write `SILVER.PUBLIC.dim_pipeline` for the `ref()`. On **dev**, `ref()` resolves to the **dev** database and personal schema.

### Expected outcome: Task 2

```sql
{{ config(materialized='view') }}

SELECT
    contact_id,
    email,
    pipeline_id,
    _loaded_at AS loaded_at
FROM {{ source('hubspot', 'contacts') }}
```

Compiled SQL (dev):
```sql
CREATE OR REPLACE VIEW SILVER_DEV.TESTING__dev_yourname.stg_hubspot__contacts AS (

  SELECT
      contact_id,
      email,
      pipeline_id,
      _loaded_at AS loaded_at
  FROM BRONZE.HUBSPOT.contacts

)
```

### Common mistakes

| Mistake | Fix |
|---|---|
| Hardcodes `BRONZE.HUBSPOT.contacts` instead of `{{ source() }}` | Explain: if the database name changes, every hardcoded path breaks; source declarations fix it in one place |
| Uses `{{ source('contacts') }}` (missing source name) | Must be `{{ source('hubspot', 'contacts') }}` — two arguments: source block name, then table name |
| Forgets `{{ config(materialized='view') }}` | Without it, the default from `dbt_project.yml` applies — which is also view for staging, but participants should learn to be explicit |
| Uses `SELECT *` | Fine for staging in production, but discouraged here — participants should practise naming columns explicitly |

### Verify success

```bash
dbt compile --select stg_hubspot__contacts
cat target/compiled/analytics/models/staging/hubspot/stg_hubspot__contacts.sql
```

Confirm `BRONZE.HUBSPOT.contacts` appears in the output.

### Bonus — Variables and environment-aware filtering

Participants use an AI assistant to figure this out independently. There's no prescribed solution — the goal is the discovery process, not a specific answer. Valid solutions share these properties:

- A variable declared under `vars:` in `dbt_project.yml`, e.g. `limit_rows: 1000`
- A `WHERE` clause in the model body using `{{ target.name }}` to gate the filter on dev only
- `{{ var('limit_rows') }}` used inside the condition

A correct model looks roughly like:

```sql
SELECT ...
FROM {{ source('hubspot', 'contacts') }}
{% if target.name == 'dev' %}
WHERE contact_id IN (
    SELECT contact_id FROM {{ source('hubspot', 'contacts') }} LIMIT {{ var('limit_rows') }}
)
{% endif %}
```

Or more simply using `LIMIT` directly:

```sql
SELECT ...
FROM {{ source('hubspot', 'contacts') }}
{% if target.name == 'dev' %}
LIMIT {{ var('limit_rows') }}
{% endif %}
```

Command-line override to verify:

```bash
dbt compile --select stg_hubspot__contacts --vars '{"limit_rows": 100}'
```

The compiled SQL should contain `LIMIT 100`. Without `--vars`, `LIMIT 1000` (the default) appears in dev. In prod the `LIMIT` clause disappears entirely.

---

## Module 04 — Code Review Exercise (25 min)

### Scenario

A colleague pushed 3 new models and `dbt build` is now broken. Participants check out the exercise branch (`exercises/module-04`), run the project, read the code, and identify all 5 bugs.

### Setup (trainer only — before the session)

The 3 exercise files live on a separate Git branch (`exercises/module-04`) or in an `exercises/` folder excluded from `dbt_project.yml` model paths. **Do not put them in the active model path.** Model 3 contains a Jinja Parse error (`{{ if }}`/`{{ endif }}`), which prevents `dbt compile` from running at all if the file is parsed as a live model.

Suggested setup:
```bash
git checkout -b exercises/module-04
# place exercise files in exercises/module04/
# confirm model-paths in dbt_project.yml does NOT include exercises/
git push origin exercises/module-04
```

Participants:
```bash
git checkout exercises/module-04
dbt build   # → Parse error from Model 3 — that's the starting point
```

---

### The 3 buggy models

**Model 1 — `int_pipeline_stages.sql`**
```sql
{{ config(materialized='table') }}
SELECT pipeline_stage_id, stage_name, is_closed
FROM {{ source('hubspot', 'pipeline_stages') }}
```

**Model 2 — `fct_daily_ticket_volume.sql`** *(annotated: 50M rows/day)*
```sql
{{ config(materialized='table') }}
SELECT ticket_date, COUNT(*) AS ticket_count
FROM {{ ref('dim_ticket') }} GROUP BY 1
```

**Model 3 — `dim_contact.sql`**
```sql
{{ config(materialized='incremental', unique_key='contact_key', on_schema_change='ignore') }}
SELECT contact_key, email, updated_at FROM {{ ref('stg_hubspot__contacts') }}
{{ if is_incremental() }} WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }}) {{ endif }}
```

---

### All 5 bugs with fixes

| # | Model | Bug | Type | Fix |
|---|---|---|---|---|
| 1 | Model 1 | `materialized='table'` on a staging/intermediate model | Silent (convention violation) | Change to `materialized='view'` |
| 2 | Model 2 | `materialized='table'` on a 50M-row/day fact table | Silent (cost) | Change to `incremental` with `unique_key` + `on_schema_change` + `{% if is_incremental() %}` filter |
| 3 | Model 3 | `on_schema_change='ignore'` | Silent (data) | Change to `on_schema_change='sync_all_columns'` |
| 4 | Model 3 | `{{ if is_incremental() }}` — wrong delimiter | Compile error (Parse) | Change to `{% if is_incremental() %}` |
| 5 | Model 3 | `{{ endif }}` — wrong delimiter | Compile error (Parse) | Change to `{% endif %}` |

**Key teaching point:** Bugs 4 and 5 cause immediate failure — dbt raises a Parse error and tells participants exactly where. Bugs 1, 2, and 3 are silent: the project runs, builds succeed, but the output is wrong or expensive. The dangerous bugs are the ones dbt doesn't catch.

---

### Expected solutions

**Model 1 — fixed:**
```sql
{{ config(materialized='view') }}

SELECT pipeline_stage_id,
       stage_name,
       is_closed
FROM {{ source('hubspot', 'pipeline_stages') }}
```

**Model 2 — fixed:**
```sql
{{ config(
    materialized='incremental',
    unique_key='ticket_date',
    on_schema_change='sync_all_columns'
) }}
SELECT ticket_date,
       COUNT(*) AS ticket_count
FROM {{ ref('dim_ticket') }}
{% if is_incremental() %}
WHERE ticket_date > (SELECT MAX(ticket_date) FROM {{ this }})
{% endif %}
GROUP BY 1
```

**Model 3 — fixed:**
```sql
{{ config(
    materialized='incremental',
    unique_key='contact_key',
    on_schema_change='sync_all_columns'
) }}
SELECT contact_key,
       email,
       updated_at
FROM {{ ref('stg_hubspot__contacts') }}
{% if is_incremental() %}
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

---

### Common mistakes

| Mistake | Guidance |
|---|---|
| Fixes only Bug 4/5 (compile errors) and misses the silent bugs | Ask: "The project now runs — are you done? Check the config carefully." |
| Doesn't know why Model 1 must be a view | "What does staging do? It renames and casts. No logic, no storage needed." |
| Converts Model 2 to incremental but forgets `{% if is_incremental() %}` | "Without the filter, every run is a full scan — same cost as a table." |
| Fixes `on_schema_change` in Model 3 but doesn't explain the risk | Push for explanation: "What would happen in production if this stayed as `ignore`?" |
| Confuses `{{ }}` (expression) with `{% %}` (statement) | Draw the distinction: `{{ }}` renders a value in SQL; `{% %}` controls execution flow — it produces nothing in the output |

---

### Debrief order

1. **Start with Model 3, Bugs B/C** — the compile errors. Most participants find these first via the dbt error message. Confirm everyone understands *why* `{% %}` is required for control flow.
2. **Model 3, Bug A** — `on_schema_change='ignore'`. Ask: "Would dbt have warned you?" → No. Ask: "When would you notice?" → Only when a column goes missing downstream, possibly weeks later.
3. **Model 1** — straightforward convention violation. Reinforce: staging is always a view; CI will enforce this.
4. **Model 2** — the cost argument. Ask: "How long would a full rebuild of 50M rows take every night?" Make it concrete.

Close with: "Two of five bugs crashed the build immediately. Three ran quietly and produced wrong results or wasted money. Which category is more dangerous?"

### Verify success

Participants should be able to state the fix *and* the reason for each bug. Running is secondary — the goal is code reading and materialization reasoning.

---

## Module 05 — Add Sources and Complete the Staging Layer (25 min)

### What participants do

1. Add `owners` to `sources.yml` with freshness config
2. Write `stg_hubspot__owners.sql`
3. Compile and verify the source path
4. Run all staging and check freshness

### Expected outcome: Task 1

The `sources.yml` should now have three tables under `hubspot`:

```yaml
version: 2

sources:
  - name: hubspot
    database: BRONZE
    schema: HUBSPOT
    tables:
      - name: contacts
      - name: deals
      - name: owners
        loaded_at_field: _loaded_at
        freshness:
          warn_after:  {count: 14, period: hour}
          error_after: {count: 25, period: hour}
```

Note: `contacts` and `deals` don't need freshness config for this exercise. Only `owners` adds it here.

### Expected outcome: Task 2

```sql
{{ config(materialized='view') }}

SELECT
    owner_id,
    first_name,
    last_name,
    email,
    _loaded_at AS loaded_at
FROM {{ source('hubspot', 'owners') }}
```

### Expected outcome: Task 3

Compiled output contains: `BRONZE.HUBSPOT.owners`

### Expected outcome: Task 4

```
dbt run --select staging.*   → 4 green OK rows
dbt source freshness         → shows pass/warn/error per source
```

The freshness result depends on the actual data in the training Snowflake environment. If `_loaded_at` was populated within 14 hours, it passes. Between 14–25 hours, it warns. Beyond 25 hours, it errors. In a training environment, it'll typically warn or error — that's fine and expected. The goal is to read the output, not to have it pass.

### Common mistakes

| Mistake | Fix |
|---|---|
| Adds `owners` outside the `hubspot` source block (wrong indentation) | YAML indentation is critical — `owners` must be under `tables:` which is under the `hubspot` source |
| Uses `loaded_at: _loaded_at` instead of `loaded_at_field` | The correct key is `loaded_at_field` |
| Forgets `period: hour` and just writes `count: 14` | Both `count` and `period` are required |

---

## Module 06 — Test the Silver Layer (30 min)

### What participants do

1. Create `models/silver/schema.yml` with all tests for `fct_prescription`
2. Run `dbt test --select fct_prescription` — all pass
3. Insert a duplicate row, re-run tests — one fails; read and understand the failure
4. Write `tests/assert_fct_prescription_no_zero_dosage.sql`
5. Run `dbt build --select silver.*`

### Expected outcome: Task 1

File: `models/silver/schema.yml`

Seven tests on `fct_prescription`:
- `prescription_key`: unique (error), not_null (error)
- `patient_key`: not_null (error), relationships to dim_patient (error)
- `doctor_key`: not_null (error), relationships to dim_doctor (error)
- `prescription_date`: not_null (error)
- `medication_type`: accepted_values [tablet, liquid, injection, topical] (error)
- `dosage_amount`: not_null (warn)

(`notes` has no test.)

### Expected outcome: Task 2

```
dbt test --select fct_prescription
```

**The FK relationship tests will fail** — this is intentional. `fct_prescription.sql` contains Bug 2 (see the deliberate bugs section at the top of this guide): `patient_key` and `doctor_key` aliases are swapped. The tests surface this:

```
Failure in test relationships_fct_prescription_patient_key__patient_key__ref_dim_patient_
  Got 10 results (OWN001-style values not found in dim_patient)

Failure in test relationships_fct_prescription_doctor_key__doctor_key__ref_dim_doctor_
  Got 10 results (C001-style values not found in dim_doctor)
```

**Guide participants through the debugging process:**
1. Read the error — which column, which model, which expected reference?
2. Open `fct_prescription.sql` — look at the SELECT aliases
3. Compare: `p.contact_id` should produce patient-style keys (`C001`) but it's aliased as `doctor_key`
4. Fix: swap the two alias labels
5. Re-run `dbt run --select fct_prescription` then `dbt test --select fct_prescription`

After fixing the bug, 9 tests pass. The `dosage_amount` not_null shows `WARN` for rows `rx-005` and `rx-009` (those have null dosage in the training data). The pipeline continues — warn doesn't fail the build.

### Expected outcome: Task 3

After inserting a duplicate `rx-001`:

```
Failure in test unique_fct_prescription_prescription_key (models/silver/schema.yml)
  Got 2 results, configured to fail if != 0
```

The test SQL in the failure output looks like:
```sql
SELECT prescription_key, COUNT(*) AS n
FROM SILVER_DEV.TESTING__dev_yourname.fct_prescription
GROUP BY prescription_key
HAVING COUNT(*) > 1
```

After `dbt run --select fct_prescription`, the duplicate is gone and tests pass again.

### Expected outcome: Task 4

File: `tests/assert_fct_prescription_no_zero_dosage.sql`

```sql
SELECT
    prescription_key,
    dosage_amount
FROM {{ ref('fct_prescription') }}
WHERE dosage_amount = 0
```

Running this against the clean training data returns **0 rows** → test passes. (No prescription in the training data has `dosage_amount = 0`.)

### Expected outcome: Task 5

```
dbt build --select silver.*
```

Execution order (DAG):
1. `dim_patient` → tests
2. `dim_doctor` → tests
3. `dim_pipeline` → tests (none yet — no schema.yml entry for dim_pipeline)
4. `fct_prescription` → tests (after dim_patient and dim_doctor confirm clean)

### Common mistakes

| Mistake | Fix |
|---|---|
| Writes `severity: error` at the top of the column block, not inside `config:` | Correct: `- unique:\n    config:\n      severity: error` |
| Uses `ref('dim_patient')` without quotes inside `to:` | Must be `to: ref('dim_patient')` — the function call is the value |
| Singular test uses `HAVING COUNT(*) > 0` | The simple `WHERE dosage_amount = 0` pattern is correct — any returned row fails the test, no aggregation needed |
| Forgets `version: 2` header in schema.yml | dbt 1.5+ doesn't require it but it's good practice and avoids confusion |

---

## Module 07 — Document the Silver Layer (20 min)

### What participants do

1. Add description + grain statement to `fct_prescription` in `schema.yml`
2. Add full documentation for `dim_pipeline` (grain + 7 column descriptions + tests)
3. Run `dbt docs generate && dbt docs serve` and navigate the docs site

### Expected outcome: Task 1

The `fct_prescription` description must include a grain statement. Accept any wording that clearly states: **one row = one prescription record**.

Acceptable: *"Grain: one row per prescription event, identified by prescription_key."*

Not acceptable: *"This model contains prescriptions."* (No grain statement.)

Column descriptions: any clear, accurate prose. The content matters more than exact phrasing.

### Expected outcome: Task 2

The `dim_pipeline` grain statement must explain the SCD2 pattern. Accept any wording that states: **one row per pipeline per validity period** and that `dbt_valid_to IS NULL` marks the current version.

The `dbt_valid_to` column description must mention that `NULL` means current — this is the most commonly missed detail.

Tests on `dim_pipeline`:
- `pipeline_key`: unique + not_null (error)
- `is_current`: not_null (error)

(No test required on `hubspot_pipeline_id` for this exercise — it's not unique in an SCD2 table.)

### Expected outcome: Task 3

```
dbt docs generate
dbt docs serve
```

Browser opens at `http://localhost:8080`. Participants should be able to:
1. Find `fct_prescription` → see their grain statement in the description panel
2. Find `dim_pipeline` → click the lineage DAG tab → see Bronze sources upstream
3. Click `dbt_valid_to` in the column list → see their description

### Common mistakes

| Mistake | Fix |
|---|---|
| Writes a description for `dim_pipeline` but forgets the grain statement | A grain statement is mandatory for Silver models — the CI check fails without it |
| Adds `hubspot_pipeline_id` as unique test | It's NOT unique in SCD2 — `hs-pipeline-003` appears twice. Point them to `data/silver/dim_pipeline.csv` |
| `dbt docs serve` shows blank or 404 | You must run `dbt docs generate` first — the serve command reads the generated artifact |

### Verify success (trainer check)

After `dbt docs generate`, the `catalog.json` in `target/` contains column descriptions. You can grep for the grain statement:

```bash
grep -l "one row per prescription" target/catalog.json
```

---

## End of Tier 1 — Debrief Checklist

Run through this list with participants. Everyone should be able to answer **from memory**:

- [ ] What is the difference between `{{ source() }}` and `{{ ref() }}`?
- [ ] Why is staging always a view?
- [ ] Where does `profiles.yml` live, and why is it not in the repo?
- [ ] What does `dbt build` do differently from `dbt run && dbt test`?
- [ ] What is a grain statement, and where does it go?
- [ ] What is the difference between `error` and `warn` severity? Give an example of each.
- [ ] What does the `relationships` test check?
- [ ] What is `dbt_valid_to` in an SCD2 model?

If anyone can't answer items 1–4, they're not ready for Tier 2. Recommend they redo Module 03 and Module 06 exercises independently before the next session.

---

## Data Reference

All training data lives in `data/`. It's consistent — all foreign keys resolve, no invalid `medication_type` values, no zero dosages, and the SCD2 example clearly shows a pipeline rename.

**Key values to know for demos and debugging:**

| Table | Notable rows |
|---|---|
| `fct_prescription` | `rx-005`, `rx-009` have null `dosage_amount` — the warn test fires on these |
| `fct_prescription` | No row has `dosage_amount = 0` — singular test passes clean |
| `dim_pipeline` | `hs-pipeline-003` has two rows — `pipeline_key = 3` (historical, `is_current = false`) and `pipeline_key = 4` (current) |
| `hubspot_contacts` | `C006`, `C007` belong to `hs-pipeline-003` — will get two rows if joined to `dim_pipeline` without `WHERE is_current = true` |

Use the `hs-pipeline-003` double-join scenario as a live demo of why `is_current = true` is always required when joining SCD2 dimensions.

---

## Tier 2 — Working Effectively (Modules 08–12)

> The exercise project runs on DuckDB. All `dbt build` commands run locally — no Snowflake needed.
> Python ≤ 3.12 is required (dbt-core 1.11 is not compatible with Python 3.13+).

---

## Module 08 — Seeds and Variables (45 min)

### What participants do

1. Run `dbt seed` and inspect terminal output for both seeds
2. Verify seed contents with `dbt show --select country_codes --limit 10`
3. Write `models/gold/mrt_country_summary.sql` — joins `dim_contact` to the `country_codes` seed
4. Add `min_deal_amount: 0` to the `vars:` block in `dbt_project.yml` (root level, not inside `models:`)
5. Edit `models/silver/fct_deal.sql` to use `{{ var('min_deal_amount', 0) }}` in a WHERE clause
6. Verify the variable substitution with `dbt compile --select fct_deal --vars '{"min_deal_amount": 500}'`

### Expected outcomes

| Task | Expected result |
|---|---|
| `dbt seed` | Both seeds show `OK created seed` — `country_codes` and `product_categories` |
| `dbt show --select country_codes` | Rows with `country_code`, `country_name`, `region` columns; DE, AT, CH, FR etc. visible |
| `mrt_country_summary.sql` | Builds without error; columns: `country_code`, `country_name`, `region`, `contact_count` |
| `dbt run --select fct_deal` | Passes with default variable; all deals included when `min_deal_amount = 0` |
| `dbt compile --select fct_deal --vars '{"min_deal_amount": 500}'` | `target/compiled/` shows literal `500` in the WHERE clause |

**Expected `mrt_country_summary.sql` solution:**

```sql
{{ config(materialized='table') }}

SELECT
    cc.country_code,
    cc.country_name,
    cc.region,
    COUNT(DISTINCT c.contact_key) AS contact_count
FROM {{ ref('dim_contact') }} AS c
LEFT JOIN {{ ref('country_codes') }} AS cc
    ON c.country_code = cc.country_code
GROUP BY 1, 2, 3
ORDER BY contact_count DESC
```

**Expected `dbt_project.yml` change:** The `vars:` key goes at the root level of the file, parallel to `name:` and `models:`. If placed inside the `models:` block, `dbt run` fails with a parse error.

### Common mistakes

| Mistake | Fix |
|---|---|
| Places `vars:` inside the `models:` block | It must be at root level — show the before/after snippet from the lesson plan |
| Forgets to add `min_deal_amount` to `dbt_project.yml` and only edits `fct_deal.sql` | Without the `vars:` default, running without `--vars` raises "variable not defined" |
| Hardcodes `BRONZE.HUBSPOT.contacts` in `mrt_country_summary` instead of `ref('country_codes')` | Seeds are referenced with `{{ ref() }}` exactly like models |
| Uses `materialized='view'` for the Gold mart | Gold convention is `table`; discuss cost implications of views over large joins |
| Joins on the wrong column (e.g., `country_name` instead of `country_code`) | Point to the seed CSV — the join key is `country_code` |

### Verify success

```bash
dbt seed
dbt run --select mrt_country_summary
dbt compile --select fct_deal --vars '{"min_deal_amount": 500}'
```

Inspect `target/compiled/.../models/silver/fct_deal.sql` — confirm `500` appears in the WHERE clause.

### Bonus challenge expected answer

Participants scan staging and Silver models for hardcoded lookup values. Common correct answers include:
- A CASE WHEN on `pipeline_stage` labels in `stg_hubspot__contacts` → seed: `pipeline_stages.csv` with `stage_id, stage_name, is_closed`
- A CASE WHEN on `medication_type` in `fct_prescription` → seed: `medication_types.csv` with `type_code, label`

Accept any answer that (a) identifies a real model and column, (b) shows valid CSV column names, and (c) rewrites the model to use `{{ ref('seed_name') }}`. The goal is the reasoning process, not a specific right answer.

---

## Module 09 — Jinja and Macros (90 min)

### What participants do

1. Create `macros/safe_cast.sql` with three parameters: `column_name`, `target_type`, `fallback=None`
2. Verify the macro compiles: `dbt compile --select stg_hubspot__deals`
3. Replace the raw `amount` column in `stg_hubspot__deals.sql` with `{{ safe_cast('amount', 'DOUBLE') }}`
4. Run `dbt build --select stg_hubspot__deals` and confirm it passes
5. Open `target/compiled/` and confirm `amount` compiles to `TRY_CAST(amount AS DOUBLE)` (no Jinja in output)
6. Add `{{ dbt_utils.generate_surrogate_key(['deal_id']) }} AS deal_key` to `fct_deal.sql` source CTE
7. Run `dbt build --select fct_deal` and open compiled SQL to confirm `deal_key` compiles to an MD5 expression

### Expected outcomes

| Task | Expected result |
|---|---|
| `macros/safe_cast.sql` exists | File compiles without error; `dbt ls` shows no warnings |
| `dbt compile --select stg_hubspot__deals` | `target/compiled/` shows `TRY_CAST(amount AS DOUBLE)` — no Jinja in output |
| `dbt build --select stg_hubspot__deals` | Green — model and all tests pass |
| `dbt build --select fct_deal` | Green — `deal_key` column present, compiles to `MD5(CAST(deal_id AS TEXT))` in DuckDB |

**Expected `safe_cast.sql`:**

```sql
{% macro safe_cast(column_name, target_type, fallback=None) %}
    {%- if fallback is not none -%}
        COALESCE(TRY_CAST({{ column_name }} AS {{ target_type }}), {{ fallback }})
    {%- else -%}
        TRY_CAST({{ column_name }} AS {{ target_type }})
    {%- endif -%}
{% endmacro %}
```

**Note:** The `-` whitespace-stripping inside `{%- -%}` is optional but good practice — without it, extra blank lines appear in compiled output.

**Expected `fct_deal.sql` source CTE:**

```sql
WITH source AS (
    SELECT
        {{ dbt_utils.generate_surrogate_key(['deal_id']) }} AS deal_key,
        deal_id,
        deal_name,
        pipeline_id,
        amount,
        expected_close_date,
        ingested_at
    FROM {{ ref('stg_hubspot__deals') }}
)
SELECT * FROM source
```

### Common mistakes

| Mistake | Fix |
|---|---|
| Uses `{{ macro safe_cast(...) }}` instead of `{% macro safe_cast(...) %}` | `{{ }}` is an expression delimiter (outputs a value); `{% %}` is a statement delimiter (defines structure). Using `{{ }}` for macro definition causes an immediate parse error |
| Forgets `{% endmacro %}` | dbt raises a parse error — the block is never closed |
| Uses `CAST()` instead of `TRY_CAST()` | `CAST()` raises an error on type mismatch; `TRY_CAST()` returns NULL — the whole point of the macro |
| Doesn't run `dbt deps` before Task 3 | `dbt_utils` must be installed first — `dbt deps` downloads it to `dbt_packages/` |
| Puts `generate_surrogate_key` in a macro instead of in the model CTE | Surrogate key generation is structural identity — it belongs in the model's source CTE, not in a shared abstraction |
| Calls `{{ safe_cast(amount, 'DOUBLE') }}` (unquoted column name) | The column name must be a string argument: `{{ safe_cast('amount', 'DOUBLE') }}` |

### Verify success

```bash
dbt compile --select stg_hubspot__deals
# open target/compiled/.../stg_hubspot__deals.sql — confirm TRY_CAST appears, no Jinja
dbt build --select stg_hubspot__deals
dbt build --select fct_deal
# open compiled fct_deal.sql — confirm MD5 expression for deal_key
```

### Bonus challenge expected answer

There is no single correct answer. Accept any response that:
1. Names a real model in the project
2. Applies the decision framework correctly (macro for structural patterns, SQL CTE for business logic)
3. If recommending a macro: states a clear name, parameter list, and explains why it's structural not business logic
4. If recommending against: explains what makes it better left as SQL (single-use, business meaning, testability)

Common good answers: the `updated_at > MAX(updated_at)` incremental filter that appears in multiple models (yes, macro candidate — structural watermark pattern). The `CASE WHEN medication_type IN (...)` logic (no — business rule, should stay in SQL).

---

## Module 10 — Slowly Changing Dimensions and Snapshots (90 min)

### What participants do

1. Create `snapshots/snap_contacts.sql` with `timestamp` strategy, `unique_key = 'contact_id'`, `target_schema = 'snapshots'`
2. Run `dbt snapshot` to build the initial snapshot
3. Verify: `SELECT COUNT(*) FROM snapshots.snap_contacts` — all rows have `dbt_valid_to = NULL`
4. Edit `seeds/raw_contacts.csv` — change `contact_id = 3`'s email, bump their `updated_at` by one day
5. Run `dbt seed` to reload the changed CSV into DuckDB
6. Run `dbt snapshot` to detect the change and insert a new SCD2 row
7. Query the snapshot table to confirm two rows exist for contact 3

> **Task 3 special note:** This task requires participants to edit `seeds/raw_contacts.csv`, change an email address for `contact_id = 3`, bump the `updated_at` timestamp, then run `dbt seed` before `dbt snapshot`. The most common mistake is skipping `dbt seed` — without it, the snapshot sees no changes because DuckDB still holds the old data. Always confirm participants ran `dbt seed` before `dbt snapshot` if their snapshot shows no new rows.

### Expected outcomes

| Task | Expected result |
|---|---|
| `snapshots/snap_contacts.sql` exists | File has `{% snapshot %}` / `{% endsnapshot %}` block; config has `strategy='timestamp'`, `updated_at='updated_at'`, `unique_key='contact_id'`, `target_schema='snapshots'` |
| First `dbt snapshot` | Terminal shows `Created snapshot snapshots.snap_contacts`; all rows have `dbt_valid_to = NULL` |
| `SELECT COUNT(*) FROM snapshots.snap_contacts` | Count matches number of rows in `raw_contacts.csv` |
| After seed + snapshot cycle | Contact 3 has exactly two rows: original email with a non-NULL `dbt_valid_to`, new email with `dbt_valid_to = NULL` |
| All other contacts | Still one row each; `dbt_valid_to = NULL` unchanged |

**Expected `snap_contacts.sql`:**

```sql
{% snapshot snap_contacts %}

{{
    config(
        target_schema = 'snapshots',
        unique_key    = 'contact_id',
        strategy      = 'timestamp',
        updated_at    = 'updated_at'
    )
}}

SELECT
    contact_id,
    first_name,
    last_name,
    email,
    pipeline_stage,
    updated_at
FROM {{ ref('stg_hubspot__contacts') }}

{% endsnapshot %}
```

**Expected verification query for Task 3:**

```sql
SELECT contact_id, email, dbt_valid_from, dbt_valid_to
FROM snapshots.snap_contacts
WHERE contact_id = 3
ORDER BY dbt_valid_from;
```

Expected: two rows. Row 1: original email, `dbt_valid_to` = bumped timestamp. Row 2: new email, `dbt_valid_to = NULL`.

### Common mistakes

| Mistake | Fix |
|---|---|
| Runs `dbt snapshot` without running `dbt seed` first after editing the CSV | DuckDB holds the seed data in its tables — the CSV change is invisible until `dbt seed` reloads it. Make participants run both commands in order |
| Uses `{% snapshot %}` with `{{ config() }}` on the same line as the `{% snapshot %}` tag | The `{{ config() }}` block goes on its own line inside the snapshot, not on the opening tag line |
| Sets `strategy = 'check'` instead of `'timestamp'` | Valid approach, but slower and not the intended exercise. Redirect to `timestamp` and explain why it's preferred when `updated_at` is reliable |
| Bumps `updated_at` but doesn't change the email | The snapshot still detects the change (any difference in `updated_at` triggers a new row) — but participants may be confused that a "timestamp strategy" depends on the timestamp, not column values. This is a good teaching moment |
| Forgets `OR dbt_valid_to IS NULL` in the bonus query | The current row has no end date. Without this condition, current-state rows are excluded from point-in-time queries — a classic SCD2 bug |

### Verify success

```bash
dbt snapshot
# query: SELECT COUNT(*) FROM snapshots.snap_contacts — expect N rows, all dbt_valid_to = NULL

# after CSV edit:
dbt seed && dbt snapshot
# query: SELECT * FROM snapshots.snap_contacts WHERE contact_id = 3 ORDER BY dbt_valid_from
# expect: 2 rows
```

### Bonus challenge expected answer

```sql
SELECT
    contact_id,
    email
FROM snapshots.snap_contacts
WHERE contact_id = 3
  AND dbt_valid_from  <= '2024-06-01'
  AND (dbt_valid_to    > '2024-06-01' OR dbt_valid_to IS NULL);
```

Returns exactly one row: the version active on 2024-06-01. If the edit used a date before June 1, the new email is returned. If after June 1, the original email. Either is correct — the important thing is the `OR dbt_valid_to IS NULL` guard.

---

## Module 11 — Selectors, Tags, and Running Subsets (45 min)

### What participants do

5 written scenarios: participants write the exact `dbt` command for each. No dbt project execution required — the exercise is command syntax.

1. Rebuild only Silver fact models and their tests
2. Run `fct_prescription` and all upstream dependencies
3. Run `mrt_deals_funnel` and everything downstream
4. Run all daily-tagged models, excluding Gold marts
5. After a partial failure, rerun only the models that errored

Bonus: add a `finance` tag to two models and write the selection command.

### Expected outcomes

| Scenario | Correct command |
|---|---|
| 1 — Silver facts + tests | `dbt build --select silver.facts.*` or `dbt build --select tag:daily` |
| 2 — `fct_prescription` + upstream | `dbt run --select +fct_prescription` |
| 3 — `mrt_deals_funnel` + downstream | `dbt run --select mrt_deals_funnel+` |
| 4 — Daily models, exclude Gold | `dbt build --select tag:daily --exclude tag:weekly` or `--exclude gold.*` |
| 5 — Rerun failures only | `dbt run --select result:error --state ./target` |

**Bonus expected answer:**

```yaml
# dbt_project.yml
models:
  analytics:
    silver:
      facts:
        fct_deal:
          +tags: ['daily', 'finance']
    gold:
      mrt_deals_funnel:
        +tags: ['weekly', 'finance']
```

Selection command:

```bash
dbt build --select tag:finance
```

### Common mistakes

| Mistake | Fix |
|---|---|
| Uses `dbt run` for scenarios 1 and 4 instead of `dbt build` | The scenarios explicitly ask for tests to run — only `dbt build` runs models and tests together |
| Writes `+fct_prescription+` for scenario 2 | The trailing `+` adds downstream dependents; the scenario asks for upstream only — correct answer is `+fct_prescription` (prefix only) |
| Writes `fct_prescription+` for scenario 2 | That selects downstream, not upstream. The `+` is on the wrong side. Draw the DAG direction to clarify |
| Writes `--state ./prod-artifacts` for scenario 5 | In scenario 5 the run was local and the state is in `./target`. The `--state` path depends on where the previous run's `manifest.json` lives |
| Adds `finance` tag in wrong YAML nesting | Show the correct nesting depth in `dbt_project.yml` — the tag must be under the specific model name, not at the `silver:` level |

### Verify success

```bash
dbt ls --select +fct_prescription
# confirm: stg_hubspot__contacts, stg_prescriptions, dim_contact, fct_prescription

dbt ls --select tag:daily
# confirm: fct_deal, fct_prescription

dbt ls --select silver.facts.*
# confirm: same two models
```

---

## Module 12 — CI/CD and Slim CI (90 min)

> **Note:** This module has no dbt exercise project tasks. The exercise is a code review of a broken GitHub Actions YAML — no `dbt build` commands are run. Participants work through the YAML analysis on paper or in a text editor.

### What participants do

1. Read a broken GitHub Actions YAML and identify all 3 bugs
2. For each bug: explain what it is, why it is a problem, and write the fix
3. Write the exact `dbt build` command for a specific CI scenario
4. Answer three one-sentence questions about `--defer`

### Expected outcomes

**Task 1 — Three bugs in the broken YAML:**

| Bug | Location | Problem | Fix |
|---|---|---|---|
| **Bug 1** | `SNOWFLAKE_PASSWORD: "Snowflake_Prod_2024_v3"` | Hardcoded credential in a committed file — visible to all repo members; fails GitHub secret scanning | `SNOWFLAKE_PASSWORD: ${{ secrets.SNOWFLAKE_PASSWORD }}` |
| **Bug 2** | `dbt run \` in the build step | `dbt run` builds models but does not run tests — the core CI guarantee is broken silently | Change to `dbt build \` |
| **Bug 3** | `--state ./target \` | `./target` is the local output of the *current* run (empty at start); the production manifest was downloaded to `./prod-artifacts` — wrong path causes `state:modified+` to fail or treat all models as modified | Change to `--state ./prod-artifacts \` |

**Task 2 — Correct `dbt build` command for the CI scenario:**

```bash
dbt build \
  --select state:modified+ \
  --defer \
  --state ./prod-artifacts \
  --target ci
```

**Task 3 — `--defer` one-sentence answers (accept paraphrases):**

1. `--defer` tells dbt to read the production relation for any model not in the current selection set, instead of rebuilding it in CI.
2. This matters because without it, a change to a single Gold mart would force CI to rebuild every upstream staging and dimension model just to have input data.
3. Without `--defer`, CI would rebuild all 15+ upstream models before it could even reach the changed mart — defeating the cost savings of Slim CI.

### Common mistakes

| Mistake | Guidance |
|---|---|
| Finds bugs 2 and 3 but misses bug 1 | Ask: "What happens if a contractor forks this repo and reads the YAML?" — the hardcoded password is the most serious bug even if it's not the most technically obvious |
| Explains bug 3 as "the manifest doesn't exist" rather than "wrong path" | Both are valid descriptions; probe for understanding: "Where did the workflow download the manifest to?" |
| Task 2: omits `--defer` | Ask: "If you only select `state:modified+`, what happens when dbt tries to read `stg_hubspot__deals` — does it rebuild it?" — yes, without `--defer` it would try to rebuild all upstream |
| Task 3: conflates `--defer` with `--state` | They are separate flags: `--state` provides the manifest for comparison; `--defer` controls which relations are read from production at runtime |
| Claims CI writes to PROD | CI writes to `DBT_CI_<run-id>` — a unique throwaway schema. Ask: "Which target does the `slim_ci` job use?" → `ci` target, never `prod` |

### Verify success

Participants should be able to state all three bugs with fixes and explain the reasoning. No `dbt` commands are run for this exercise. The trainer check is whether each participant can explain:
- Why hardcoded secrets are a security risk (not just "it's bad practice")
- Why `dbt build` is required (not `dbt run`) for CI to have any value
- Why `--state ./target` is wrong (the production manifest is in `./prod-artifacts`)

---

## End of Tier 2 — Debrief Checklist

Run through this list with participants. Everyone should be able to answer **from memory**:

- [ ] What is the difference between a lookup seed and a development seed?
- [ ] When is a piece of data better managed as a seed versus a source?
- [ ] What is the difference between `{{ }}` and `{% %}` in Jinja? Give an example of each in a macro.
- [ ] What does a macro compile to — is there any Jinja in the final SQL sent to the warehouse?
- [ ] Why does dbt native `--full-refresh` break downstream foreign keys when using native snapshots?
- [ ] What does `dbt_valid_to = NULL` mean in a snapshot table?
- [ ] What does `state:modified+` select in a Slim CI build?
- [ ] Why is `dbt build` required in CI and not `dbt run`?
- [ ] What is `--defer`, and what problem does it solve for CI compute cost?

If anyone cannot answer items 7–9, they are not ready for Tier 3. Recommend they re-read Modules 11 and 12 and attempt the exercises independently before the next session.
