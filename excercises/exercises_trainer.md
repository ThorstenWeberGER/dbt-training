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

## Module 04 — Fix and Extend Staging (25 min)

### What participants do

1. Fix `stg_hubspot__pipeline_stages.sql` (materialization bug + add missing columns)
2. Write `stg_hubspot__deals.sql` from scratch
3. Run `dbt run --select staging.*` and verify 3 views in Snowflake
4. Identify two bugs in a snippet (Bonus — no running required)

### Expected outcome: Task 1

**Before (buggy):**
```sql
{{ config(materialized='table') }}

SELECT pipeline_stage_id, stage_name, is_closed
FROM {{ source('hubspot', 'pipeline_stages') }}
```

**After (fixed):**
```sql
{{ config(materialized='view') }}

SELECT
    pipeline_stage_id,
    stage_name,
    is_closed,
    pipeline_id,
    _loaded_at AS loaded_at
FROM {{ source('hubspot', 'pipeline_stages') }}
```

One-sentence explanation: Staging models must always be views because they're a lightweight alias with no storage cost — materialising them as tables wastes compute and storage.

### Expected outcome: Task 2

```sql
{{ config(materialized='view') }}

SELECT
    deal_id,
    deal_name,
    pipeline_id,
    close_date   AS expected_close_date,
    _loaded_at AS loaded_at
FROM {{ source('hubspot', 'deals') }}
```

### Expected outcome: Task 3

```
dbt run --select staging.*
```

Output should show 3 green `OK` rows:
- `stg_hubspot__contacts`
- `stg_hubspot__pipeline_stages`
- `stg_hubspot__deals`

In Snowflake: all three appear as `VIEW` objects in `SILVER_DEV.TESTING__dev_yourname`.

### Expected outcome: Bonus (two bugs)

1. `on_schema_change = 'ignore'` — silently drops new columns. Should be `'sync_all_columns'`.
2. `{{ if }}` / `{{ endif }}` — wrong delimiter type. Control flow requires `{% if %}` / `{% endif %}`. These compile to literal text in the SQL, not a conditional.

### Common mistakes

| Mistake | Fix |
|---|---|
| Only changes materialization in Task 1, doesn't add missing columns | Point them to `data/bronze/hubspot_pipeline_stages.csv` — five columns in the source, not three |
| Forgets to rename `close_date` in Task 2 | The exercise says "rename `close_date` → `expected_close_date`" — this is a staging transformation |
| Bonus: only spots one bug | Ask "what does `{{ if }}` actually do?" — it renders the condition expression as text, not SQL logic |

### Verify success

In Snowflake, run:
```sql
SHOW VIEWS IN SCHEMA SILVER_DEV.TESTING__dev_yourname;
```
Three staging views should be present.

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
