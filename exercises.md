# dbt Training — Exercises

All hands-on exercises across the full curriculum, in one place.

**How to use this document:**
- Exercises are designed to be done solo, in order, immediately after the corresponding theory block
- Each exercise lists what you need to know before starting — if you're unsure, review that module first
- Trainers: expected answers are included inline. Keep this doc for yourself and share only the task sections with participants if you prefer

---

## Module 01 — What is dbt? (25 min)

**Prerequisite:** Module 01 theory block  
**Goal:** Navigate the project structure and find real examples without guidance

### Task — Explore and document

Answer all four questions using only the dbt project — no Googling.

**Q1.** What is the project name defined in `dbt_project.yml`?

**Q2.** Find one Silver dimension model (`dim_*`). What table does it reference using `{{ ref() }}`?

**Q3.** How many models are in the `models/gold/` folder? List their names.

**Q4.** Open `dbt_project.yml`. What is the default materialisation for Silver models?

**Bonus:** Run `dbt ls` in the terminal. How many models are listed?

---

## Module 02 — Local Setup

No exercise this session. Hands-on begins in Module 03 when you write your first Jinja model.

By the end of this session you should be able to answer:

1. What does `dbt_project.yml` configure?
2. What is the difference between dbt Core and dbt Cloud?
3. dbt does NOT do three things — name them.
4. Which layer does dbt own in this project?

---

## Module 03 — Jinja Basics (20 min)

**Prerequisite:** Module 03 theory block; `profiles.yml` configured and `dbt debug` passing  
**Goal:** Read compiled output confidently; write a model with correct Jinja syntax from scratch

### Task 1 — Read and predict compiled output

Given this model, write what the compiled SQL will look like for the **prod** target:

```sql
{{ config(materialized='table') }}

SELECT
    c.contact_id,
    c.email,
    p.pipeline_name
FROM {{ source('hubspot', 'contacts') }} c
LEFT JOIN {{ ref('dim_pipeline') }} p
    ON c.pipeline_id = p.hubspot_pipeline_id
```

<details>
<summary>Expected answer</summary>

```sql
CREATE OR REPLACE TABLE SILVER.PUBLIC.your_model_name AS

SELECT
    c.contact_id,
    c.email,
    p.pipeline_name
FROM BRONZE.HUBSPOT.contacts c
LEFT JOIN SILVER.PUBLIC.dim_pipeline p
    ON c.pipeline_id = p.hubspot_pipeline_id
```

</details>

### Task 2 — Write from scratch

Write a model called `stg_hubspot__deals.sql` that:
- References the `hubspot` source, `deals` table using `{{ source() }}`
- Selects: `deal_id`, `deal_name`, `pipeline_id`, `close_date`
- Renames `close_date` to `expected_close_date`
- Is materialised as a `view`

Run `dbt compile --select stg_hubspot__deals` and verify the compiled output in `target/compiled/`.

---

## Module 04 — Materializations (25 min)

**Prerequisite:** Module 04 theory block; understand `view`, `table`, `incremental`, `ephemeral`  
**Goal:** Identify wrong materializations, explain why they are wrong, write the corrected config

### Task — Read, diagnose, fix

Three models are misconfigured. For each: identify the problem, explain why it is wrong, write the corrected config block.

**Model 1 — `stg_hubspot__pipeline_stages.sql`**

```sql
{{ config(materialized='table') }}

SELECT pipeline_stage_id, stage_name, is_closed
FROM {{ source('hubspot', 'pipeline_stages') }}
```

**Model 2 — `fct_daily_ticket_volume.sql`** (processes 50M rows daily)

```sql
{{ config(materialized='table') }}

SELECT
    ticket_date,
    COUNT(*) AS ticket_count
FROM {{ ref('dim_ticket') }}
GROUP BY 1
```

**Model 3 — `dim_contact.sql`** (incremental)

```sql
{{ config(
    materialized = 'incremental',
    unique_key   = 'contact_key',
    on_schema_change = 'ignore'
) }}

SELECT contact_key, email, updated_at
FROM {{ ref('stg_hubspot__contacts') }}

{{ if is_incremental() }}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{{ endif }}
```

<details>
<summary>Expected answers</summary>

1. **Model 1:** Staging models must be `view`, not `table`. Views are rebuilt on every query, cost nothing to store, and staging is low-volume by definition.

2. **Model 2:** Rebuilding 50M rows every night as a full `table` is expensive. Should be `incremental` with `unique_key = 'ticket_date'` (or a surrogate key) so only new dates are merged.

3. **Model 3:** Two bugs:
   - `on_schema_change = 'ignore'` should be `'sync_all_columns'` — `ignore` silently drops new columns
   - `{{ if }}` / `{{ endif }}` are wrong delimiters. Jinja control flow uses `{% if %}` / `{% endif %}`. The current code will compile to literal text, not a conditional.

</details>

---

## Module 05 — Sources and the Medallion Architecture (25 min)

**Prerequisite:** Module 05 theory block; know how `sources.yml` and `{{ source() }}` work  
**Goal:** Declare a new source with freshness checks and write a staging model that uses it correctly

### Task — Add an owner source and staging model

You are adding a new HubSpot source: the `owners` table (`BRONZE.HUBSPOT.owners`). It has a `_ingested_at` timestamp column and is updated every 12 hours.

**Step 1:** Add the `owners` table to `sources.yml` with appropriate freshness thresholds.

```yaml
# Thresholds to implement:
# warn_after: 14 hours
# error_after: 25 hours
# loaded_at_field: _ingested_at
```

**Step 2:** Write a staging model `stg_hubspot__owners.sql` that:
- References the source correctly using `{{ source() }}` — no hardcoded table paths
- Selects: `owner_id`, `first_name`, `last_name`, `email`, `_ingested_at`
- Renames `_ingested_at` to `ingested_at` (strip the leading underscore)
- Is materialized as a view

**Step 3:** Run `dbt compile --select stg_hubspot__owners` and verify the compiled output references the correct Bronze table (`BRONZE.HUBSPOT.owners`), not a hardcoded path.

<details>
<summary>Expected sources.yml entry</summary>

```yaml
sources:
  - name: hubspot
    database: BRONZE
    schema: HUBSPOT
    tables:
      - name: owners
        loaded_at_field: _ingested_at
        freshness:
          warn_after: {count: 14, period: hour}
          error_after: {count: 25, period: hour}
```

</details>

<details>
<summary>Expected stg_hubspot__owners.sql</summary>

```sql
{{ config(materialized='view') }}

SELECT
    owner_id,
    first_name,
    last_name,
    email,
    _ingested_at AS ingested_at
FROM {{ source('hubspot', 'owners') }}
```

</details>

---

## Module 06 — Testing Data Quality (30 min)

**Prerequisite:** Module 06 theory block; know the four built-in generic tests and singular test syntax  
**Goal:** Write a complete test suite for a Silver model; run tests; read failure output; write a singular test

### Task — Test `fct_prescription`

The model `fct_prescription.sql` exists in Silver with no tests. Add the correct tests to `schema.yml`.

The model has these columns:

| Column | Type | Description |
|---|---|---|
| `prescription_key` | Surrogate PK | MD5 hash |
| `patient_key` | FK → `dim_patient` | — |
| `doctor_key` | FK → `dim_doctor` | — |
| `prescription_date` | Date | — |
| `medication_type` | String | One of: `tablet`, `liquid`, `injection`, `topical` |
| `dosage_amount` | Number | Can be null if not yet confirmed |
| `notes` | String | Optional free text |

**Step 1:** Write the full `schema.yml` block for `fct_prescription` with all required tests.

Required minimums for a Silver fact model:
- `unique` + `not_null` on all `_key` columns
- `relationships` on all FK columns
- `accepted_values` where a controlled list exists
- Severity: `error` on key columns, `warn` on soft checks

**Step 2:** Add a `warn`-severity `not_null` test for `dosage_amount`.

**Step 3:** Run `dbt test --select fct_prescription`. Then deliberately introduce a duplicate `prescription_key` in your dev environment and run again. Note exactly what the failure output says.

**Step 4 — Singular test:** Write a singular test file `tests/assert_fct_prescription_no_zero_dosage.sql` that fails if any row has a `dosage_amount` of exactly `0`. Use the `GROUP BY ... HAVING` pattern. Run it with:

```bash
dbt test --select test_type:singular
```

> Zero is different from null. A zero dosage is a data error; a null means "not yet confirmed."

<details>
<summary>Expected schema.yml (Step 1 + 2)</summary>

```yaml
models:
  - name: fct_prescription
    description: >
      Grain: one row per prescription record. Each row represents a single
      dispensing event linked to a patient and prescribing doctor.
    columns:
      - name: prescription_key
        description: Surrogate primary key — MD5 hash of prescription_id.
        tests:
          - unique:
              config:
                severity: error
          - not_null:
              config:
                severity: error

      - name: patient_key
        description: Foreign key to dim_patient.
        tests:
          - not_null:
              config:
                severity: error
          - relationships:
              to: ref('dim_patient')
              field: patient_key
              config:
                severity: error

      - name: doctor_key
        description: Foreign key to dim_doctor.
        tests:
          - not_null:
              config:
                severity: error
          - relationships:
              to: ref('dim_doctor')
              field: doctor_key
              config:
                severity: error

      - name: prescription_date
        description: Date the prescription was issued.
        tests:
          - not_null:
              config:
                severity: error

      - name: medication_type
        description: Delivery form of the medication.
        tests:
          - accepted_values:
              values: [tablet, liquid, injection, topical]
              config:
                severity: error

      - name: dosage_amount
        description: Prescribed dose quantity. Null if not yet confirmed.
        tests:
          - not_null:
              config:
                severity: warn   # soft check — nulls are expected here

      - name: notes
        description: Optional free-text clinical notes.
```

</details>

<details>
<summary>Expected singular test (Step 4)</summary>

```sql
-- tests/assert_fct_prescription_no_zero_dosage.sql
-- Fails if any prescription has a dosage_amount of exactly 0.
-- Zero is a data error; null means "not yet confirmed" and is allowed.

SELECT
    prescription_key,
    dosage_amount
FROM {{ ref('fct_prescription') }}
WHERE dosage_amount = 0
```

</details>

---

## Module 07 — Documentation (20 min)

**Prerequisite:** Module 07 theory block; understand grain statements, `schema.yml` structure, `dbt docs generate`  
**Goal:** Write complete documentation for an undocumented Silver model; verify it renders correctly

### Task — Document `dim_pipeline`

The model `dim_pipeline` exists in Silver with no documentation.

The model has these columns:

| Column | Type | Role |
|---|---|---|
| `pipeline_key` | Integer | Surrogate PK |
| `hubspot_pipeline_id` | String | Business key from HubSpot |
| `pipeline_name` | String | Human-readable name |
| `is_active` | Boolean | Whether pipeline is currently in use |
| `dbt_valid_from` | Timestamp | SCD2 validity start |
| `dbt_valid_to` | Timestamp | SCD2 validity end (NULL = current record) |
| `is_current` | Boolean | True if this is the active version of the record |

**Requirements:**
- Write a **grain statement** in the model description. This is an SCD2 model — the grain includes the validity period, not just the pipeline.
- Write **descriptions for all 7 columns**
- Add appropriate tests to `pipeline_key`, `hubspot_pipeline_id`, and `is_current`
- Run `dbt docs generate` and confirm the model appears correctly in the docs site (`dbt docs serve`)

<details>
<summary>Expected schema.yml</summary>

```yaml
models:
  - name: dim_pipeline
    description: >
      Grain: one row per HubSpot pipeline per validity period (SCD2).
      A pipeline that has been renamed will appear as two rows — one with
      dbt_valid_to set (historical) and one with dbt_valid_to NULL (current).
      Use is_current = true to get the latest version of each pipeline.
    columns:
      - name: pipeline_key
        description: Surrogate primary key — unique per pipeline version.
        tests:
          - unique:
              config:
                severity: error
          - not_null:
              config:
                severity: error

      - name: hubspot_pipeline_id
        description: Business key assigned by HubSpot. Stable across SCD2 versions.
        tests:
          - not_null:
              config:
                severity: error

      - name: pipeline_name
        description: Human-readable pipeline name as configured in HubSpot.

      - name: is_active
        description: True if the pipeline is currently active in HubSpot.

      - name: dbt_valid_from
        description: Timestamp when this version of the pipeline record became effective.

      - name: dbt_valid_to
        description: >
          Timestamp when this version was superseded. NULL means this is the
          current active version of the record.

      - name: is_current
        description: >
          True if this row represents the current state of the pipeline.
          Equivalent to dbt_valid_to IS NULL, provided as a convenience flag.
        tests:
          - not_null:
              config:
                severity: error
```

</details>

---

## Modules 08–16 — Tier 2 and Tier 3

Exercises for the Intermediate and Advanced tiers will be added as lesson content is developed.

Planned exercises:

| Module | Planned exercise |
|---|---|
| 08 — Advanced Materializations | Debug an incremental model with a late-arriving data bug; fix the lookback window |
| 09 — Seeds and Variables | Add a status mapping seed table; wire it into a Silver model via `ref()` |
| 10 — Jinja and Macros | Write a `safe_divide` macro; use it in two models |
| 11 — SCD2 and Snapshots | Compare native snapshot output against `scd2_merge` macro output |
| 12 — Selectors | Write selector expressions to target specific layers and trace downstream impact |
| 13 — CI/CD and Slim CI | Simulate a slim CI run using a saved `manifest.json`; observe which models are selected |
| 14 — Advanced Testing | Add `store_failures: true` to a test; query the failure table in Snowsight |
| 15 — Incremental Patterns | Reproduce the reopened-ticket bug; apply the fix |
| 16 — Governance | Write a model contract for a Gold mart; intentionally break it and read the compile error |
