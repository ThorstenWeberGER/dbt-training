# dbt Training — Tier 2 Exercises

> **Setup:** Before starting these exercises, ensure the exercise project runs on your machine.
> See `README.md` for setup instructions.
>
> Run `dbt build` from the `excercises/` directory to confirm everything passes before Module 08.
>
> **Python version:** Python ≤ 3.12 is required. dbt-core 1.11 is not compatible with Python 3.13+.

---

## Module 08 — Seeds and Variables

**Duration: 45 min**

> **Context:** The exercise project has a full staging and Silver layer from Modules 01–07. This module adds two lookup seeds and a configurable variable to an existing Silver model.

The exercise project already contains `seeds/country_codes.csv` and `seeds/product_categories.csv`. You will load them, write a Gold mart that uses a seed, and add a runtime-configurable variable to an existing model.

---

### Task 1 — Load seeds and inspect the output

Run `dbt seed` and confirm that both seeds loaded successfully:

```bash
dbt seed
```

You should see two `OK created seed` lines in the output — one for `country_codes` and one for `product_categories`.

Then inspect the seed data:

```bash
dbt show --select country_codes --limit 10
```

**Expected output:** Rows with three columns — `country_code`, `country_name`, `region`. You should see entries for DE (Germany), AT (Austria), CH (Switzerland), and others.

**Answer in one sentence:** Why is `country_codes` a seed and not a source?

**Verify:**
```bash
dbt ls --select country_codes
```
Expected: `dbt_training.country_codes`

---

### Task 2 — Write `models/gold/mrt_country_summary.sql`

Create a new Gold mart at `models/gold/mrt_country_summary.sql`.

This model should:
- Join `dim_contact` with the `country_codes` seed on `country_code`
- Group by `country_name` and `region` (from the seed)
- Count distinct contacts per country as `contact_count`
- Use `materialized='table'` (Gold layer convention)

Expected output columns: `country_code`, `country_name`, `region`, `contact_count`.

Start with the join first. Get it working before adding the aggregation.

<details>
<summary>Hint — join structure</summary>

Reference the seed with `{{ ref('country_codes') }}` — exactly like any other model. The join key is `country_code`.

```sql
FROM {{ ref('dim_contact') }} AS c
LEFT JOIN {{ ref('country_codes') }} AS cc
    ON c.country_code = cc.country_code
```

</details>

<details>
<summary>Expected solution</summary>

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

</details>

**Verify:**
```bash
dbt run --select mrt_country_summary
```
Expected: `OK created table model`

---

### Task 3 — Add a `min_deal_amount` variable to `fct_deal.sql`

**Step 1 — Add the variable default to `dbt_project.yml`**

The `vars:` key goes at the **root level** of the file — not nested inside `models:` or `seeds:`.

Before:
```yaml
name: 'dbt_training'
version: '1.0.0'

models:
  dbt_training:
    +materialized: view
```

After:
```yaml
name: 'dbt_training'
version: '1.0.0'

vars:
  min_deal_amount: 0

models:
  dbt_training:
    +materialized: view
```

**Step 2 — Edit `models/silver/fct_deal.sql`**

Find the WHERE clause in `fct_deal.sql` (or add one if missing) and add a filter using the variable:

```sql
WHERE amount >= {{ var('min_deal_amount', 0) }}
```

**Step 3 — Run with the default**

```bash
dbt run --select fct_deal
```

Expected: the model runs and all deals are included (default is 0, so all deals pass the filter).

**Step 4 — Override the variable at runtime**

```bash
dbt run --select fct_deal --vars '{"min_deal_amount": 500}'
```

**Step 5 — Verify the substitution in compiled SQL**

```bash
dbt compile --select fct_deal --vars '{"min_deal_amount": 500}'
```

Open `target/compiled/dbt_training/models/silver/fct_deal.sql` and confirm the literal `500` appears in the WHERE clause — not `{{ var(...) }}`.

<details>
<summary>Expected compiled WHERE clause</summary>

```sql
WHERE amount >= 500
```

Without `--vars`, it compiles to:
```sql
WHERE amount >= 0
```

</details>

---

### Bonus — Find a seed candidate in existing code

Open any two staging or Silver models. Find one place where a lookup value is hardcoded in a CASE WHEN or WHERE clause that would be better managed as a seed CSV.

Write down:
1. Which model contains it (file path)
2. What the seed file would look like (column names + 3 sample rows)
3. How you would rewrite the model to use `{{ ref('your_seed_name') }}`

There is no single right answer — the goal is recognizing the pattern.

---

## Module 09 — Jinja and Macros

**Duration: 90 min**

> **Context:** The exercise project has a staging layer and Silver models from earlier modules. You are adding a shared utility macro and applying it in two places.
>
> Before starting, run `dbt deps` to ensure `dbt_utils` is installed.

---

### Task 1 — Write `macros/safe_cast.sql`

Create the file `macros/safe_cast.sql`. The macro must:
- Take three parameters: `column_name`, `target_type`, and `fallback` (optional, default `None`)
- When `fallback` is provided: output `COALESCE(TRY_CAST(column_name AS target_type), fallback)`
- When `fallback` is omitted: output `TRY_CAST(column_name AS target_type)`

Remember: macro definitions use `{% macro %}` / `{% endmacro %}` (statement delimiters), not `{{ }}`.

<details>
<summary>Starter skeleton</summary>

```sql
{% macro safe_cast(column_name, target_type, fallback=None) %}
    -- your code here: use TRY_CAST for DuckDB
    -- if fallback is not none, wrap in COALESCE(TRY_CAST(...), fallback)
{% endmacro %}
```

</details>

<details>
<summary>Expected solution</summary>

```sql
{% macro safe_cast(column_name, target_type, fallback=None) %}
    {%- if fallback is not none -%}
        COALESCE(TRY_CAST({{ column_name }} AS {{ target_type }}), {{ fallback }})
    {%- else -%}
        TRY_CAST({{ column_name }} AS {{ target_type }})
    {%- endif -%}
{% endmacro %}
```

The `-` inside `{%- -%}` strips surrounding whitespace from the compiled output. This is a style choice — the macro works correctly without it.

</details>

**Verify:**
```bash
dbt compile --select stg_hubspot__deals
```

If the macro file has a syntax error, dbt will report a parse error here. Fix any errors before moving to Task 2.

---

### Task 2 — Use `safe_cast` in `stg_hubspot__deals.sql`

Confirm the model exists:
```bash
dbt ls --select stg_hubspot__deals
```

Open `models/staging/hubspot/stg_hubspot__deals.sql`. The `amount` column is currently selected as a raw value. Replace it with a safe cast to `DOUBLE`:

```sql
{{ safe_cast('amount', 'DOUBLE') }} AS amount,
```

**Verify the macro resolves in compiled output:**
```bash
dbt compile --select stg_hubspot__deals
```

Open `target/compiled/dbt_training/models/staging/hubspot/stg_hubspot__deals.sql`. Confirm the `amount` line shows `TRY_CAST(amount AS DOUBLE)` — no Jinja in the output.

<details>
<summary>Expected model (amount line)</summary>

```sql
{{ config(materialized='view') }}

SELECT
    deal_id,
    deal_name,
    pipeline_id,
    {{ safe_cast('amount', 'DOUBLE') }}   AS amount,
    _ingested_at                           AS ingested_at
FROM {{ source('hubspot', 'deals') }}
```

</details>

**Run and confirm:**
```bash
dbt build --select stg_hubspot__deals
```

Expected: green output — model builds and all tests pass.

---

### Task 3 — Add `dbt_utils.generate_surrogate_key` to `fct_deal.sql`

Confirm the model exists:
```bash
dbt ls --select fct_deal
```

Open `models/silver/fct_deal.sql`. Add a surrogate key column `deal_key` by hashing `deal_id`. Place this in the **source CTE**, as the first selected column:

```sql
{{ dbt_utils.generate_surrogate_key(['deal_id']) }} AS deal_key,
```

<details>
<summary>Expected source CTE</summary>

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
),

final AS (
    SELECT * FROM source
)

SELECT * FROM final
```

If `dbt_utils` is not installed, run `dbt deps` first.

</details>

**Verify:**
```bash
dbt build --select fct_deal
```

Open `target/compiled/.../models/silver/fct_deal.sql`. Confirm `deal_key` compiles to an `MD5(...)` expression — not `{{ dbt_utils.generate_surrogate_key(...) }}`.

Expected compiled key line (DuckDB):
```sql
MD5(CAST(deal_id AS TEXT)) AS deal_key,
```

---

### Bonus — Macro candidate review

Open any two Silver models (`dim_contact.sql`, `fct_prescription.sql`, or `mrt_deals_funnel.sql`). Find one CTE or expression that repeats across models and answer:

1. Is it a good candidate for extraction as a macro? Why or why not?
2. If yes: write the macro signature (name and parameters). You don't need to implement it.
3. If no: explain what makes it better left as SQL.

Use the decision framework from the module:
- Repeated **structural pattern** (type coercion, key generation) → macro candidate
- **Business logic** (CASE WHEN rules, domain classifications) → leave in SQL

---

## Module 10 — Slowly Changing Dimensions and Snapshots

**Duration: 90 min**

> **Context:** `stg_hubspot__contacts` is already built. You are adding snapshot tracking for contacts — the first SCD2 layer in the exercise project.
>
> Snapshots live in the `snapshots/` folder (not `models/`). They are run with `dbt snapshot`, not `dbt run`.

---

### Task 1 — Create `snapshots/snap_contacts.sql`

Create the file `snapshots/snap_contacts.sql`. Use the `timestamp` strategy. Track these columns: `contact_id`, `first_name`, `last_name`, `email`, `pipeline_stage`, `updated_at`.

Configuration requirements:
- `target_schema = 'snapshots'`
- `unique_key = 'contact_id'`
- `strategy = 'timestamp'`
- `updated_at = 'updated_at'`

The source for the SELECT is `{{ ref('stg_hubspot__contacts') }}`.

<details>
<summary>Expected solution</summary>

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

</details>

---

### Task 2 — Build the initial snapshot

Run `dbt snapshot` to create the snapshot table:

```bash
dbt snapshot
```

Expected terminal output: `Created snapshot snapshots.snap_contacts`

Verify it was created and inspect the contents. Open a DuckDB connection or use `dbt show`:

```bash
dbt show --select snap_contacts --limit 10
```

Or query directly in DuckDB:
```sql
SELECT COUNT(*) FROM snapshots.snap_contacts;
SELECT contact_id, email, dbt_valid_from, dbt_valid_to FROM snapshots.snap_contacts;
```

**Expected:**
- Row count matches the number of rows in `raw_contacts.csv`
- All rows have `dbt_valid_to = NULL` (every contact is current — this is the initial load)
- All rows have the same `dbt_valid_from` timestamp (the moment you ran `dbt snapshot`)

---

### Task 3 — Simulate a change and observe SCD2 in action

These steps must be run **in order**. Skipping Step 2 is the most common mistake.

**Step 1 — Edit `seeds/raw_contacts.csv`**

Find `contact_id = 3`. Change their `email` to any new address (e.g., `new.email@example.com`). Then bump their `updated_at` by one day.

Example: if `updated_at` was `2024-05-10 08:00:00`, change it to `2024-05-11 08:00:00`.

**Step 2 — Run `dbt seed`** (do not skip)

```bash
dbt seed
```

This reloads the changed CSV data into DuckDB. Without this step, the snapshot sees no changes.

**Step 3 — Run `dbt snapshot`**

```bash
dbt snapshot
```

dbt now detects the change in `contact_id = 3` (the `updated_at` value is newer than the snapshot's stored `dbt_updated_at`) and inserts a new SCD2 row.

**Step 4 — Query the snapshot table**

```sql
SELECT
    contact_id,
    email,
    dbt_valid_from,
    dbt_valid_to
FROM snapshots.snap_contacts
WHERE contact_id = 3
ORDER BY dbt_valid_from;
```

**Expected:** Exactly **two rows** for contact 3:
- Row 1: original email address, `dbt_valid_to` set to the change timestamp (non-NULL)
- Row 2: new email address, `dbt_valid_to = NULL` (current row)

All other contacts should still have exactly one row.

**Verify:**
```sql
SELECT contact_id, COUNT(*) AS row_count
FROM snapshots.snap_contacts
GROUP BY contact_id
ORDER BY row_count DESC;
```

Only `contact_id = 3` should have `row_count = 2`.

---

### Bonus — Answer a historical question

Write a SQL query that answers: **"What email address did contact_id 3 have on 2024-06-01?"**

Use only the snapshot table. Do not look at `raw_contacts`.

Requirements:
- Returns exactly one row
- Uses the `dbt_valid_from` and `dbt_valid_to` columns to find the active version on that date
- Handles the current row correctly (hint: `dbt_valid_to = NULL` means "still active")

<details>
<summary>Expected solution</summary>

```sql
SELECT
    contact_id,
    email
FROM snapshots.snap_contacts
WHERE contact_id = 3
  AND dbt_valid_from  <= '2024-06-01'
  AND (dbt_valid_to    > '2024-06-01' OR dbt_valid_to IS NULL);
```

This returns exactly one row: the version of contact 3 that was active on June 1, 2024.

The `OR dbt_valid_to IS NULL` is essential — the current row has no end date. Without this condition, the current row is excluded from all point-in-time queries. This is the most common SCD2 querying mistake.

Whether you get the original or new email depends on whether the change date you used in Task 3 was before or after June 1, 2024. Either result is correct.

</details>

---

## Module 11 — Selectors, Tags, and Running Subsets

**Duration: 45 min**

> **Context:** You are working in the exercise project. Write the exact `dbt` command for each scenario below. You do not need to run every command — but try each one and check the output of `dbt ls` to confirm you selected the right models.

For reference, here is the relevant subset of the exercise project's DAG:

```
stg_hubspot__contacts ──┐
                         ├─► dim_contact ──► fct_prescription ──► mrt_contact_prescriptions
stg_prescriptions ───────┘
stg_hubspot__deals  ──────────────────────► fct_deal         ──► mrt_deals_funnel
```

---

### Scenario 1 — Rebuild only the Silver fact models and their tests

> "The Silver fact tables need a clean rebuild after a source schema change. Run only the Silver facts with their tests."

Write the command.

<details>
<summary>Answer</summary>

```bash
dbt build --select silver.facts.*
```

Or, using the tag:

```bash
dbt build --select tag:daily
```

Both select `fct_deal` and `fct_prescription`. The `dbt build` ensures tests run immediately after each model — not just the models themselves.

</details>

**Preview with `dbt ls`:**
```bash
dbt ls --select silver.facts.*
```

---

### Scenario 2 — Run `fct_prescription` and everything it depends on

> "Something is wrong with `fct_prescription`. You want to rebuild it from scratch, including all the models it reads from."

Write the command.

<details>
<summary>Answer</summary>

```bash
dbt run --select +fct_prescription
```

The prefix `+` walks upstream in the DAG. This selects `stg_hubspot__contacts`, `stg_prescriptions`, `dim_contact`, and `fct_prescription` — the full upstream chain.

Memory aid: the `+` is on the side where the graph extends. Prefix `+model` → extends toward parents (upstream).

</details>

**Preview with `dbt ls`:**
```bash
dbt ls --select +fct_prescription
```

---

### Scenario 3 — Run `mrt_deals_funnel` and all models downstream of it

> "You want to see what `mrt_deals_funnel` produces and whether anything reads from it. Run it and everything that depends on it."

Write the command.

<details>
<summary>Answer</summary>

```bash
dbt run --select mrt_deals_funnel+
```

The trailing `+` walks downstream. In this project, `mrt_deals_funnel` is in the Gold layer and has no downstream dependents, so only the one model runs. In a larger project with reports or downstream marts referencing it, they would all be selected.

</details>

**Preview with `dbt ls`:**
```bash
dbt ls --select mrt_deals_funnel+
```

---

### Scenario 4 — Run all daily-tagged models but skip Gold marts

> "The nightly job should rebuild Silver facts but not the Gold marts (which run separately on Sunday). Write the command."

Write the command.

<details>
<summary>Answer</summary>

```bash
dbt build --select tag:daily --exclude tag:weekly
```

Or equivalently:

```bash
dbt build --select tag:daily --exclude gold.*
```

Both produce the same result: `fct_deal` and `fct_prescription` run with their tests; Gold marts are skipped. `--exclude` accepts the same syntax as `--select` — dbt selects first, then removes the excluded nodes.

</details>

**Preview with `dbt ls`:**
```bash
dbt ls --select tag:daily --exclude gold.*
```

---

### Scenario 5 — After a partial failure, rerun only the models that errored

> "Last night's `dbt build` failed on 3 models. The other 15 ran cleanly. Rerun only the failures."

Write the command.

<details>
<summary>Answer</summary>

```bash
dbt run --select result:error --state ./target
```

`./target` contains the `run_results.json` from the failed run. dbt reads it to identify which nodes have status `error` and selects only those. This avoids rerunning the 15 models that already passed.

</details>

---

### Bonus — Add a tag and write the selection command

1. Open `dbt_project.yml` and add a `finance` tag to `fct_deal` and `mrt_deals_funnel`.

> You can add this in `dbt_project.yml` (folder- or model-level using `+tags:`) or in each model's `schema.yml` config block. Both work.

2. Write a command to run only finance-tagged models with all their tests.

<details>
<summary>Answer</summary>

**`dbt_project.yml` option:**

```yaml
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

Or in `schema.yml`:

```yaml
models:
  - name: fct_deal
    config:
      tags: ['daily', 'finance']
```

**Selection command:**

```bash
dbt build --select tag:finance
```

This runs `fct_deal` and `mrt_deals_funnel` with their tests.

</details>

---

## Module 12 — CI/CD and Slim CI

**Duration: 90 min**

> **Context:** This module has no dbt project exercise tasks — no `dbt build` commands needed. The exercise is a code review of a broken GitHub Actions YAML. Work through the tasks on paper or in a text editor.

---

### Task 1 — Fix the broken CI config

The workflow file below has **three bugs**. For each bug:
1. Identify what is wrong
2. Explain why it is a problem (one sentence)
3. Write the corrected line(s)

```yaml
name: dbt CI

on:
  pull_request:
    branches: [main]

jobs:
  slim_ci:
    runs-on: ubuntu-latest

    env:
      DBT_TARGET: ci
      SNOWFLAKE_ACCOUNT:   ${{ secrets.SNOWFLAKE_ACCOUNT }}
      SNOWFLAKE_USER:      ${{ secrets.SNOWFLAKE_USER }}
      SNOWFLAKE_PASSWORD:  "Snowflake_Prod_2024_v3"
      SNOWFLAKE_DATABASE:  ${{ secrets.SNOWFLAKE_DATABASE }}
      SNOWFLAKE_WAREHOUSE: ${{ secrets.SNOWFLAKE_WAREHOUSE }}
      SNOWFLAKE_ROLE:      ${{ secrets.SNOWFLAKE_ROLE }}
      DBT_SCHEMA:          DBT_CI_${{ github.run_id }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dbt
        run: pip install dbt-snowflake==1.8.4

      - name: Download production manifest
        run: |
          mkdir -p ./prod-artifacts
          aws s3 cp s3://bloomwell-dbt-artifacts/prod/manifest.json ./prod-artifacts/manifest.json
        env:
          AWS_ACCESS_KEY_ID:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION:            eu-central-1

      - name: dbt deps
        run: dbt deps

      - name: dbt build — slim CI
        run: |
          dbt run \
            --select state:modified+ \
            --defer \
            --state ./target \
            --target ci
```

<details>
<summary>The three bugs and fixes</summary>

**Bug 1 — Hardcoded password**

```yaml
SNOWFLAKE_PASSWORD:  "Snowflake_Prod_2024_v3"
```

Why it matters: The YAML file is committed to the repository. Anyone with read access — including external contributors — can see this password in plaintext. GitHub also scans for secrets and will flag it. Even if the file is later changed, the password remains in Git history.

Fix:
```yaml
SNOWFLAKE_PASSWORD:  ${{ secrets.SNOWFLAKE_PASSWORD }}
```

---

**Bug 2 — `dbt run` instead of `dbt build`**

```yaml
dbt run \
```

Why it matters: `dbt run` builds models but does not run tests. The entire purpose of CI is to catch test failures before merge. Using `dbt run` means a PR with failing `not_null`, `unique`, or `relationships` tests will pass CI silently and be unblocked for merge.

Fix:
```yaml
dbt build \
```

---

**Bug 3 — Wrong `--state` path**

```yaml
--state ./target \
```

Why it matters: `./target` is the output directory for the *current* CI run — it starts empty. The production manifest (`manifest.json`) was explicitly downloaded to `./prod-artifacts` in the step above. Pointing `--state` at `./target` means `state:modified+` either errors or treats all models as modified — defeating Slim CI.

Fix:
```yaml
--state ./prod-artifacts \
```

</details>

---

### Task 2 — Write the CI `--select` command

You are opening a PR that modifies only `fct_deal.sql`. The model graph looks like this:

```
stg_hubspot__deals → fct_deal → mart_revenue
                              → mart_pipeline_summary
```

Write the exact `dbt build` command you would use in CI to:
- Build only the changed model and its downstream dependents
- Use production data for upstream staging models (do not rebuild `stg_hubspot__deals`)
- Compare against the production manifest stored at `./prod-artifacts`

<details>
<summary>Answer</summary>

```bash
dbt build \
  --select state:modified+ \
  --defer \
  --state ./prod-artifacts \
  --target ci
```

`state:modified+` selects `fct_deal` (the modified model) plus `mart_revenue` and `mart_pipeline_summary` (all downstream dependents). `--defer` tells dbt to read `stg_hubspot__deals` directly from the production relation — it is not rebuilt in CI.

Result: 3 models built instead of 18. CI time drops significantly.

</details>

---

### Task 3 — Explain `--defer`

Answer each question in exactly one sentence.

1. What does `--defer` do when dbt encounters an unmodified upstream model?
2. Why does this matter for CI compute cost?
3. What would happen without `--defer` if only one Gold mart changed?

<details>
<summary>Answers</summary>

1. `--defer` tells dbt to use the production relation for any model not in the current selection set, instead of rebuilding it in CI.

2. Without `--defer`, even a change to a single leaf model would force CI to rebuild every upstream model in its lineage just to have data to test against.

3. Without `--defer`, a change to one Gold mart would require CI to rebuild all staging views, dimension tables, and Silver models upstream of it — typically 12–15 models — before it could even reach the changed mart.

</details>

---

## Tier 2 Complete

You have completed all Tier 2 exercises. You can now:

- Load and reference seeds in models with `{{ ref() }}`
- Use variables to remove hardcoded constants from SQL and override them at runtime
- Write macros for repeated structural patterns and call them in models
- Use `dbt_utils.generate_surrogate_key` to create stable surrogate keys
- Create dbt snapshots with the `timestamp` strategy to track SCD2 history
- Simulate data changes end-to-end: edit a seed CSV, reload with `dbt seed`, and observe SCD2 rows
- Write precise selection commands using graph operators (`+model`, `model+`), tags, and `result:error`
- Identify and fix the three most common CI configuration bugs

**Next:** Tier 3 — Production and Advanced Patterns covers advanced testing, complex incremental strategies, the `scd2_merge` macro deep dive, and model contracts.
