---
name: dbt-sql-reviewer
description: >
  Use this skill to review any Bloomwell dbt or Python code before merging to production.
  Trigger whenever someone says "review my code", "check this model", "is this correct",
  "PR review", or pastes a dbt SQL model, macro, schema.yml, or Python pipeline script.
  Also trigger proactively when writing NEW models or macros — apply this skill during
  development, not only at PR time. Covers dbt SQL (models, macros, snapshots),
  dbt YAML (schema.yml, sources, tests), Snowflake SQL, and Python Lambda/pipeline scripts
  (app_tickets.py, app_metadata.py, backfill pattern). Always cross-reference
  bloomwell-conventions, dbt-test-strategy, and dimensional-modeling skills.
---

# dbt & SQL Code Reviewer — Bloomwell

Reviews code against Bloomwell conventions, Kimball principles, and production-safety rules.
Output is always a **checklist**: what is missing or wrong, severity, and how to fix it.

---

## Skill Map

| Situation | Skill to invoke |
|---|---|
| Starting a new dbt project | `dbt-project-checklist` (setup phase) |
| Adding a new dim, fact, or bronze model | `dbt-project-checklist` (per-model phase) |
| Pre-PR check before merging | This skill |
| Naming a table, column, or schema | `bloomwell-conventions` |
| SQL style, CTE structure, model patterns | `bloomwell-conventions` → `references/sql_style_guide.md` |
| Where and how many tests to add | `dbt-test-strategy` |
| Designing dims, facts, SCDs, grain | `dimensional-modeling` |
| Running dbt commands (build, test, compile) | `dbt-agents-running-dbt-commands` |
| Building or modifying models interactively | `dbt-agents-using-dbt-for-analytics-engineering` |
| dbt Cloud job failed | `dbt-agents-troubleshooting-dbt-job-errors` |
| Documenting a model or pipeline | `analytics-code-documentation` |

---

> **Cross-reference skills — load when review requires deeper guidance:**
> - `bloomwell-conventions` — naming, schema, layer conventions, SQL style, Bloomwell-specific anti-patterns
> - `dbt-test-strategy` — test type selection, severity, net-new principle, email notifications; use this instead of Checklist 3 when the review is primarily about test coverage design
> - `dimensional-modeling` — Kimball rules, fact table types, SCD patterns, grain decisions
> - `analytics-code-documentation` — full documentation standards; use this when Checklist 6 findings need to be acted on (writing new docs, not just flagging gaps)
>
> For deep pattern reference: `references/review_checklists.md`

---

## How to Run a Review

1. Identify the code type (see table below)
2. Run the matching checklist from `references/review_checklists.md`
3. Output findings grouped by severity: 🔴 Blocking · 🟡 Warning · 🔵 Suggestion
4. Always end with: "X blocking issues, Y warnings, Z suggestions"

| Code type | Detect by |
|---|---|
| dbt SQL model | `SELECT`, `{{ ref() }}`, `{{ config() }}`, layer folder (`1_bronze/`, `2_silver/`, `3_gold/`) |
| dbt Macro | `{% macro %}` / `{% endmacro %}` |
| dbt YAML | `version: 2`, `models:`, `sources:`, `columns:`, `data_tests:` |
| Python Lambda | `lambda_handler`, `write_pandas`, `hubspot`, AWS imports |
| Python Backfill | `FileProcessor`, `HubSpotClient`, `SnowflakeLoader`, `main.py` pattern |

---

## Severity Definitions

**🔴 Blocking** — Will break production, cause data loss, or violate a hard convention. Must fix before merge.

**🟡 Warning** — Won't break immediately but will cause problems at scale, during incidents, or in future development. Should fix.

**🔵 Suggestion** — Style, maintainability, or consistency improvement. Nice to have.

---

## Quick Pattern Reference

These are the most common issues found in the Bloomwell codebase. Check these first.

### dbt SQL — Top Issues

**Naming violations (Blocking)**
```sql
-- ❌ Layer in table name
BRONZE.HUBSPOT.brz_hubspot_contacts   -- "brz" redundant
-- ✅
BRONZE.HUBSPOT.contacts

-- ❌ SCD type in name
dim_pipeline_stages_scd2              -- document in YAML instead
-- ✅ dim_pipeline_stages + SCD strategy in description
```

**Missing `{% if execute %}` guard in macros using `run_query()` (Blocking)**
```sql
-- ❌ Crashes at parse time (not execute time)
{% set results = run_query(my_query) %}
{% for row in results %}...{% endfor %}

-- ✅ Guard with execute check
{% if execute %}
  {% set results = run_query(my_query) %}
  {% for row in results %}...{% endfor %}
{% endif %}
```
*Seen in: `macros_timedelta.sql` uses this correctly — `get_timedelta_columns()` guards with `{%- if execute -%}`.*

**SCD2 model: `unique_key` mismatch (Blocking)**
```sql
-- ❌ unique_key in config != surrogate_key in macro
{{ config(unique_key='stages_key') }}   -- wrong key name
{{ scd2_merge(surrogate_key='stage_key', ...) }}

-- ✅ Must match exactly
{{ config(unique_key='stage_key') }}
{{ scd2_merge(surrogate_key='stage_key', ...) }}
```
*Found in: `dim_pipeline_stages_scd2.sql` — `unique_key='stages_key'` vs `surrogate_key='stage_key'`.*

**`merge_update_columns` incomplete for SCD2 (Warning)**
```sql
-- ❌ Missing is_closed from update columns (tracked col won't update on expire)
merge_update_columns=['valid_to', 'is_active', 'loaded_at', 'is_closed']

-- ✅ Include ALL tracked_cols that need updating on expire
merge_update_columns=['valid_to', 'is_active', 'loaded_at']
-- Note: tracked_cols only need to be in merge_update_columns when they
-- can be patched on existing rows. For SCD2 expiry, valid_to + is_active
-- are the minimum. New versions are inserted, not updated.
```

**Hard-coded database/schema references (Warning)**
```sql
-- ❌ Bypasses dbt ref() and breaks environment switching
select * from bloomwell_bronze.hubspot_tickets_stg_tickets

-- ✅ Always use ref() or source()
select * from {{ ref('brz_tickets_staged') }}
```
*Found in: `int_tickets_cleaned.md` — direct table reference bypasses dbt DAG.*

**Wrong file extension for dbt model (Blocking)**
```
-- ❌ dbt models must be .sql — not .md
models/2_silver/int_tickets_cleaned.md

-- ✅
models/2_silver/int_tickets_cleaned.sql
```
*Found in repo: `int_tickets_cleaned.md` will be ignored by dbt entirely.*

**Missing surrogate key test on Silver/Gold (Blocking)**
```yaml
# ❌ No unique+not_null on _key column
- name: stage_key
  description: Surrogate key

# ✅ Required for all _key columns in Silver/Gold
- name: stage_key
  description: Surrogate key
  data_tests:
    - unique
    - not_null
```

### dbt YAML — Top Issues

**Silver/Gold model missing grain statement (Blocking — CI fails)**
```yaml
# ❌ No grain — CI will fail
- name: dim_pipelines
  description: >
    SCD Type 2 dimension table for HubSpot ticket pipelines.

# ✅ Must include grain in one sentence
- name: dim_pipelines
  description: >
    Grain: one row per pipeline version. SCD Type 2 dimension for
    HubSpot ticket pipelines. Tracks historical changes over time.
```

**`data_tests` vs `tests` key (Warning)**
```yaml
# ❌ Old syntax (dbt < 1.8) — inconsistent across files
columns:
  - name: owner_id
    tests:
      - not_null

# ✅ Consistent: use data_tests everywhere (dbt 1.8+)
columns:
  - name: owner_id
    data_tests:
      - not_null
```
*Both are used in the repo — standardize to `data_tests`.*

**Missing relationships test on FK columns (Warning)**
```yaml
# ❌ Foreign key with no referential integrity test
- name: pipeline_key
  description: Foreign key to dim_pipelines

# ✅
- name: pipeline_key
  description: Foreign key to dim_pipelines
  data_tests:
    - relationships:
        to: ref('dim_pipelines')
        field: pipeline_key
```

### Python Lambda — Top Issues

**SQL injection via f-string (Blocking)**
```python
# ❌ Direct string interpolation — SQL injection risk
cursor.execute(f"""
    SELECT * FROM config
    WHERE pipeline_id = '{pipeline_id}'
""")

# ✅ Parameterized query
cursor.execute("""
    SELECT * FROM config
    WHERE pipeline_id = %s
""", (pipeline_id,))
```
*Found in: `app_tickets.py` — `get_pipeline_config()` and `get_properties()`.*
*Also in: `app_metadata.py` — same pattern.*

**Hardcoded config values that belong in config table (Warning)**
```python
# ❌ Hardcoded in lambda_handler
pipeline_id = 'hubspot_tickets'
data_object = 'tickets'

# ✅ Read from Lambda event
pipeline_id = event.get('pipeline_id', 'hubspot_tickets')
data_object = event.get('data_object', 'tickets')
```
*Found in: `app_tickets.py` and `app_metadata.py`.*

**Missing `pytz` in requirements.txt (Blocking)**
```
# ❌ Used in code but not in requirements.txt (hs-tickets-tickets)
import pytz  # in app_tickets.py

# ✅ Add explicitly — don't rely on transitive dependency
pytz==2024.1
```

**`validate_row_count` uses unqualified table name (Warning)**
```python
# ❌ Missing database + schema — fails if session context changes
sql = f'SELECT COUNT(*) FROM "{table_name}"'

# ✅ Fully qualified
sql = f'SELECT COUNT(*) FROM "{db}"."{schema}"."{table_name}"'
```
*Found in: `snowflake_loader.py` — `validate_row_count()`.*

---

## Full Checklists

For the complete per-type review checklists (all items, not just top issues), load:

📄 `references/review_checklists.md`

Load when:
- Doing a full PR review (not just a spot check)
- Reviewing a new model type you haven't seen before
- The quick patterns above don't cover the code being reviewed
