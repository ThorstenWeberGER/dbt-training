# Bloomwell Infrastructure Reference — All 25 Checklist Items

Full macro code, YAML snippets, and per-item configuration for the Bloomwell dbt + Snowflake
stack. Migrated from `hs-tickets-v2/docs/checklist.md`.

---

## Items 1–3 — Env-Routing Macros

These three macros must all exist. Missing any one breaks environment routing silently.

**`macros/target_db.sql`** — single source of truth for env detection:

```sql
{% macro target_db(base_name) -%}
    {%- set env = var('env', 'prod' if (target.name | lower == 'prod') else 'dev') -%}
    {%- if env | lower == 'prod' -%}
        {{ base_name | upper }}
    {%- else -%}
        {{ (base_name ~ '_DEV') | upper }}
    {%- endif -%}
{%- endmacro %}
```

**`macros/generate_database_name.sql`**:

```sql
{% macro generate_database_name(custom_database_name, node) -%}
    {%- if custom_database_name is none -%}
        {{ target_db('STAGING') }}
    {%- else -%}
        {{ target_db(custom_database_name | trim) }}
    {%- endif -%}
{%- endmacro %}
```

**`macros/generate_schema_name.sql`**:

```sql
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
```

**Result:** A model configured with `+database: SILVER` lands in `SILVER` on prod and `SILVER_DEV` on dev.

---

## Item 4 — `dbt_project.yml` Layer Routing

```yaml
models:
  <project_name>:
    +persist_docs:
      relation: true
      columns: true
    1_bronze:
      +database: BRONZE
      +schema: <SOURCE_SYSTEM>
      +materialized: table
      +transient: false
      +tags: ['hourly', 'bronze', 'prod']
    2_silver:
      +database: SILVER
      +schema: <SOURCE_SYSTEM>
      +materialized: table
      +transient: false
      +tags: ['hourly', 'silver', 'prod']
    3_gold:
      +database: GOLD
      +schema: <SOURCE_SYSTEM>
      +materialized: table
      +transient: false
      +tags: ['hourly', 'gold', 'prod']
    unit_tests:
      +database: STAGING
      +schema: UNIT_TESTS
      +tags: ['dev']
```

---

## Item 5 — `persist_docs`

```yaml
# dbt_project.yml — under models: <project_name>:
+persist_docs:
  relation: true
  columns: true
```

---

## Item 6 — `store_failures` + Failures Schema

```yaml
# dbt_project.yml
tests:
  +severity: warn
  +store_failures: true
  +database: REFERENCE
  +schema: <PROJECT_NAME>___DBT_TEST_FAILURES
```

---

## Item 7 — Test Severity Global Default

```yaml
# dbt_project.yml — global default
tests:
  +severity: warn

# Override to error per column for critical keys:
# models/2_silver/config.yml
models:
  - name: dim_pipeline_stage
    columns:
      - name: pipeline_stage_key
        data_tests:
          - not_null:
              config:
                severity: error
          - unique:
              config:
                severity: error
```

---

## Item 8 — PK/FK `post_hook` Constraints

**Option A — In config.yml (preferred Bloomwell standard):**

```yaml
# models/2_silver/config.yml
models:
  - name: dim_team
    config:
      materialized: table
      post_hook:
        - "ALTER TABLE {{ this }} ADD CONSTRAINT pk_dim_team PRIMARY KEY (team_key)"
        - "ALTER TABLE {{ this }} ADD CONSTRAINT fk_dim_team_owner
               FOREIGN KEY (owner_key) REFERENCES {{ ref('dim_owner') }}(owner_key)"
```

**Option B — In SQL model (for incremental models, wrap in guard):**

```sql
{{
    config(
        post_hook=[
            "{% if not is_incremental() %}
                ALTER TABLE {{ this }} ADD CONSTRAINT pk_fct_ticket_status_history
                    PRIMARY KEY (ticket_status_key);
            {% endif %}"
        ]
    )
}}
```

**Rules:**
- Wrap incremental model hooks in `{% if not is_incremental() %}` — the constraint already exists after the first run.
- Tables (non-incremental) don't need the guard.
- Add a corresponding dbt `relationships` test to validate FK integrity.

---

## Item 9 — `on-run-end` Audit Macro

```yaml
# dbt_project.yml
on-run-end:
  - "{{ audit_refresh_history() }}"

vars:
  audit_database: REFERENCE
  audit_schema: <PROJECT_NAME>___AUDIT
```

Key guard inside the macro — only runs in prod:
```sql
{% if target.name | lower != 'prod' %}
    {{ log("audit_refresh_history: skipped (non-prod target)", info=True) }}
    {{ return('') }}
{% endif %}
```

Five append-only audit tables:

| Table | Content |
|---|---|
| `INGESTION_HEALTH_HISTORY` | Daily run count vs expected 24 |
| `TABLE_ROW_COUNT_HISTORY` | Row counts for key source/bronze tables |
| `DBT_TEST_SUMMARY_HISTORY` | Aggregate pass/fail counts + pass-rate % |
| `DBT_TEST_BY_TYPE_HISTORY` | Breakdown by test category |
| `DBT_TEST_DETAIL_HISTORY` | Per-test PASS/FAIL with failure row counts |

---

## Item 10 — `vars` Block

```yaml
# dbt_project.yml
vars:
  threshold_date: '2024-01-01'
  sla_start_hour: 8
  sla_end_hour: 18
  sentinel_pipeline_stage_key: "fb8cb8ac051a4297cb62c7517f1564f4"
  audit_database: REFERENCE
  audit_schema: <PROJECT_NAME>___AUDIT
```

Reference in models: `{{ var('sla_start_hour') }}`.
Override at runtime: `dbt run --vars '{"sla_start_hour": 9}'`.

---

## Item 11 — Seeds in `REFERENCE.config`

```yaml
# dbt_project.yml
seeds:
  +quote_columns: false
  <project_name>:
    +database: REFERENCE
    +schema: config
    +tags: ['seeds', 'prod']
```

Run with: `dbt seed` or `dbt seed --select pipeline_config`.

---

## Item 12 — Source Freshness Checks

```yaml
# models/0_staging/config.yml
sources:
  - name: hubspot_raw
    database: bloomwell_staging
    schema: hubspot___ticket
    tables:
      - name: stg_tickets
        config:
          freshness:
            warn_after:  {count: 2, period: hour}
            error_after: {count: 5, period: hour}
          loaded_at_field: "TO_TIMESTAMP_LTZ(loaded_at)"
```

Run with: `dbt source freshness`.

---

## Item 13 — dbt Native Unit Tests

```yaml
# dbt_project.yml routing
models:
  <project_name>:
    unit_tests:
      +database: STAGING
      +schema: UNIT_TESTS
      +tags: ['dev']
```

```yaml
# models/unit_tests/my_model.yml
unit_tests:
  - name: test_my_model_sla_breach
    model: fct_accumulating_ticket_status
    given:
      - input: ref('int_ticket_renamed')
        rows:
          - {ticket_id: 1, created_at: '2024-01-01 08:00:00', pipeline_stage_key: 'abc123'}
    expect:
      rows:
        - {ticket_id: 1, is_sla_breached: false}
```

Run unit tests: `dbt test --select tag:dev`
Exclude from prod: `dbt build --exclude tag:dev`

---

## Item 14 — `packages.yml`

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: "1.3.0"
  - package: calogica/dbt_expectations
    version: "0.10.4"
```

After adding/updating: `dbt deps`.

---

## Item 15 — `transient: false`

```yaml
# dbt_project.yml — inside each layer block
+transient: false
```

Verify: `SHOW TABLES LIKE '%<model_name>%' IN DATABASE SILVER;` — `is_transient` column should be `N`.

---

## Item 16 — Bloomwell Naming Charter

→ See `bloomwell-conventions` skill. This item is fully owned there.

---

## Item 17 — Silver/Gold Grain + Column Docs

CI fails if Silver or Gold models have missing descriptions or undocumented columns.

```yaml
models:
  - name: fct_prescription
    description: >
      Grain: one prescription event per patient per doctor per prescription_date.
      One row per prescription issued. Source: BRONZE.ERP.prescriptions.
    columns:
      - name: prescription_key
        description: "Surrogate key. MD5-hash over patient_id, doctor_id, prescription_date."
        data_tests:
          - unique:
              config:
                severity: error
          - not_null:
              config:
                severity: error
      - name: patient_key
        description: "FK to dim_patient (patient_key)."
        data_tests:
          - not_null
          - relationships:
              to: ref('dim_patient')
              field: patient_key
```

**Rule:** Every column must have a `description`. Every `_key` column must have `unique` + `not_null`. Every FK column must have a `relationships` test.

---

## Item 18 — Generic Custom Tests

```
tests/
  generic/
    test_not_in_future.sql
    test_non_negative_milliseconds.sql
```

```sql
-- tests/generic/test_not_in_future.sql
{% test not_in_future(model, column_name) %}
select {{ column_name }}
from {{ model }}
where {{ column_name }} is not null
  and {{ column_name }} > current_timestamp()
{% endtest %}
```

Usage:
```yaml
columns:
  - name: created_at
    data_tests:
      - not_in_future
```

---

## Item 19 — Singular Assertion Tests

```sql
-- tests/assert_fct_accumulating_min_row_count.sql
select count(*) as actual_row_count
from {{ ref('fct_accumulating_ticket_status') }}
having count(*) < 1000
```

```sql
-- tests/assert_gold_dims_no_nulls.sql
select 'dim_owner' as dim_name, 'owner_name' as failing_column, count(*) as null_count
from {{ ref('dim_owner') }} where owner_name is null having count(*) > 0
union all
select 'dim_team', 'team_name', count(*)
from {{ ref('dim_team') }} where team_name is null having count(*) > 0
```

---

## Item 20 — `profiles.yml`

```yaml
<project_name>:
  target: dev

  outputs:
    dev:
      type: snowflake
      account: <ACCOUNT_LOCATOR>
      user: <USER>@bloomwell.de
      role: ANALYTICS_SERVICE_ROLE
      warehouse: DBT_WH
      database: STAGING_DEV
      schema: <SOURCE_SYSTEM>
      threads: 4

    prod:
      type: snowflake
      account: <ACCOUNT_LOCATOR>
      user: <USER>@bloomwell.de
      role: ANALYTICS_SERVICE_ROLE
      warehouse: DBT_WH
      database: STAGING
      schema: <SOURCE_SYSTEM>
      threads: 8
```

`target: dev` prevents accidental prod runs. `database` in the profile is the fallback only — `generate_database_name` overrides per model.

---

## Item 21 — `+tags` Per Layer

```yaml
# dbt_project.yml
1_bronze:
  +tags: ['hourly', 'hubspot', 'bronze', 'prod']
2_silver:
  +tags: ['hourly', 'hubspot', 'silver', 'prod']
3_gold:
  +tags: ['hourly', 'hubspot', 'gold', 'prod']
unit_tests:
  +tags: ['dev']
```

Common patterns:
```bash
dbt build --exclude tag:dev          # production job
dbt run --select tag:bronze          # bronze only
dbt test --select tag:dev            # unit tests locally
```

---

## Item 22 — Sentinel Row Pattern

Every `dim_` table contains one hardcoded `-1` / `'n.a.'` row so FK joins never produce NULLs.

```sql
sentinel as (
    select
        -1                                 as team_id,
        'n.a.'                             as team_name,
        '1970-01-01'::timestamp_ltz        as updated_at,
        current_timestamp()::timestamp_ltz as loaded_at
),

final as (
    select * from real_teams
    union all
    select * from ghost_teams
    union all
    select * from sentinel
)
```

Store MD5 sentinel keys in `dbt_project.yml` `vars:` — never hardcode the hash in multiple places.

In fact models, coalesce FK columns to sentinel before joining:
```sql
coalesce(si.specialist_involvement_key, md5('-1')) as specialist_involvement_key
```

---

## Item 23 — Ghost Row Pattern

Ghost rows are placeholder dimension rows for source entities that are referenced in facts
but deleted from the source API. Without them, FK values have no matching PK.

**Step 1 — Ephemeral ghost detector (`int_dim_team.sql`):**

```sql
{{ config(materialized='ephemeral') }}

with ticket_team_ids as (
    select distinct try_cast(hubspot_team_id as integer) as team_id
    from {{ ref('brz_tickets_staged') }}
    where try_cast(hubspot_team_id as integer) is not null
),
known_teams as (
    select team_id from {{ ref('brz_teams') }}
),
ghost_rows as (
    select
        t.team_id,
        'n.a.'                             as team_name,
        '1970-01-01'::timestamp_ltz        as updated_at,
        current_timestamp()::timestamp_ltz as loaded_at
    from ticket_team_ids t
    where t.team_id not in (select team_id from known_teams)
      and t.team_id != -1
)
select * from ghost_rows
```

**Key rules:**
- Ghost detector reads from bronze, not silver (avoids dependency cycle)
- Ghost rows use `'n.a.'` for strings, `'1970-01-01'` for timestamps — never NULL
- `and t.team_id != -1` prevents the sentinel from being re-emitted as a ghost row

---

## Item 24 — `coalesce_fk_str` Macro

HubSpot raw data produces SQL `NULL`, empty string `''`, and literal `'None'` for missing
FK columns. All three must normalise to sentinel `'-1'` before any join.

```sql
-- macros/macros_clean_values.sql
{% macro coalesce_fk_str(column_name, sentinel='-1') %}
COALESCE(NULLIF(NULLIF({{ column_name }}, ''), 'None'), '{{ sentinel }}')
{%- endmacro %}
```

Usage:
```sql
{{ coalesce_fk_str('pipeline_id') }}          as pipeline_id,
{{ coalesce_fk_str('hubspot_owner_id') }}     as hubspot_owner_id
```

| FK column type | Pattern |
|---|---|
| VARCHAR (raw from HubSpot JSON) | `{{ coalesce_fk_str('col') }}` |
| NUMBER (already cast in bronze) | `COALESCE(col, -1)` |

---

## Item 25 — `relationships` Test with `where` Filter

```yaml
- name: owner_id
  data_tests:
    - not_null:
        config:
          severity: error
    - relationships:
        arguments:
          to: ref('dim_owner')
          field: owner_id
        config:
          severity: warn
          where: "owner_id != -1"
```

For surrogate key FKs where the sentinel hash is present in the dim, no `where` filter is
needed — but `severity: error` is appropriate:

```yaml
- name: pipeline_stage_key
  data_tests:
    - not_null:
        config:
          severity: error
    - relationships:
        arguments:
          to: ref('dim_pipeline_stage')
          field: pipeline_stage_key
        config:
          severity: error
```
