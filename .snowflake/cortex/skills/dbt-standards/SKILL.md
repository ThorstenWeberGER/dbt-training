---
name: dbt-standards
description: >
  Apply this skill whenever building, scaffolding, reviewing, or modifying a dbt project
  targeting Snowflake. This includes: creating new models (staging, warehouse, or marts),
  writing or reviewing SQL in dbt, structuring YAML schema files, setting up dbt_project.yml,
  configuring CI/CD for dbt, designing dimensional models (dims/facts), writing dbt tests,
  creating macros, or answering "how should I structure this dbt project?". Also trigger when
  the user mentions medallion architecture, staging layers, surrogate keys, CTE patterns,
  star schema in dbt, or any dbt + Snowflake combination. Use this skill proactively — if the
  conversation involves any dbt model, Snowflake SQL, or data warehouse layer decision,
  consult this skill first before writing code or proposing structure.
---

# dbt Project Standards (Snowflake + Bloomwell Conventions)

Opinionated, production-ready conventions for dbt projects on Snowflake. Based on
Kimball dimensional modeling, the dbt Labs style guide, and Bloomwell data warehouse
naming conventions. Follow these unless the user explicitly overrides something.

---

## Medallion Architecture & Schema Organization

Every layer lives in its own database or schema. The schema name communicates the layer —
table names never repeat this information.

| Layer | Schema Pattern | Purpose | Example |
|---|---|---|---|
| **Bronze** | `BRONZE.{source_system}` | Raw data from sources, as-is | `BRONZE.HUBSPOT`, `BRONZE.SHOPIFY` |
| **Staging** | `STAGING.{purpose}` *(views only)* | Casting, renaming, dedup between Bronze and Silver | `STAGING.HUBSPOT_PREP` |
| **Silver** | `SILVER.{subject_area}` | Conformed star schemas, enterprise view | `SILVER.APPOINTMENTS`, `SILVER.MEDICATIONS` |
| **Gold** | `GOLD.{use_case}` | Aggregated marts, data products, external sharing | `GOLD.FINANCE_REPORTING` |
| **Playground** | `TESTING.*` *(views only)* | Dev/testing playground | `TESTING.dev_thorsten` |

Bronze schemas are named after their source system. Silver schemas are named after business
domains. Gold schemas are named after their consumer or use case.

---

## Project Structure

```
project_name/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                          # PR validation
│   │   └── post_merge_deploy.yml           # Production deploy
│   └── pull_request_template.md
├── _project_docs/
│   └── style_guide.md
├── analyses/
├── macros/
│   ├── _macros__definitions.yml
│   ├── _macros__docs.md
│   └── generate_custom_schema.sql
├── models/
│   ├── staging/
│   │   └── {source_name}/                  # One folder per source
│   │       ├── _{source}__sources.yml
│   │       ├── _{source}__models.yml
│   │       ├── _{source}__docs.md
│   │       └── {source}__{entity}.sql
│   ├── silver/
│   │   ├── dimensions/
│   │   │   ├── _dimensions__models.yml
│   │   │   ├── _dimensions__docs.md
│   │   │   └── dim_{entity}.sql
│   │   ├── facts/
│   │   │   ├── _facts__models.yml
│   │   │   ├── _facts__docs.md
│   │   │   └── fct_{event}.sql
│   │   └── bridges/
│   │       ├── _bridges__models.yml
│   │       └── bridge_{relationship}.sql
│   └── gold/
│       ├── _gold__models.yml
│       ├── _gold__docs.md
│       └── mrt_{business_entity}.sql
├── seeds/
├── snapshots/
├── tests/
├── dbt_project.yml
├── packages.yml
└── profiles.yml
```

Key rules:

- Every subfolder gets its own YAML file: `_{folder}__models.yml` and `_{folder}__sources.yml` where applicable. Not one YAML per model — one YAML per folder containing all models in that folder.
- Documentation lives in `_{folder}__docs.md` files alongside models.
- Staging folders are organized by source system (one folder per source).
- Silver splits into `dimensions/`, `facts/`, and `bridges/` subdirectories.
- Gold is flat — one folder, no nesting.

---

## Naming Conventions

### Models

| Layer | Prefix | Pattern | Example |
|---|---|---|---|
| Bronze | *(none)* — schema provides context | raw table name | `BRONZE.HUBSPOT.contacts` |
| Staging | `{source}__` | `{source}__{entity}` | `hubspot__contacts` |
| Silver — Dimensions | `dim_` | `dim_{entity}` | `dim_patient` |
| Silver — Facts | `fct_` | `fct_{event}` | `fct_prescription` |
| Silver — Bridges | `bridge_` | `bridge_{relationship}` | `bridge_patient_diagnosis` |
| Gold — Marts | `mrt_` | `mrt_{business_entity}` | `mrt_monthly_prescription_volume` |
| Intermediate | `int_` | `int_{entity}_{verb}` | `int_orders_pivoted` |

**Singular names.** `dim_patient` (one row per patient), not `dim_patients`. Fact tables
describe a single event: `fct_prescription`, `fct_appointment`. The grain tells you what
one row represents — the name should match.

**snake_case everywhere.** No camelCase, no PascalCase.

**No SCD type in the name.** Use `dim_patient`, not `dim_patient_scd2`. Document the SCD
strategy in the dbt YAML description.

**No version numbers.** No `dim_patient_v2`. Replace the model. Use dbt's alias or
database migration patterns if you need a transition period.

### Columns

**Key columns — this distinction is critical:**

| Type | Convention | Example | Meaning |
|---|---|---|---|
| Surrogate key (PK/FK) | `{entity}_key` | `patient_key`, `pharmacy_key` | Generated integer by our pipeline |
| Business key (from source) | `{entity}_id` | `patient_id`, `hubspot_contact_id` | Identifier from a source system |
| Composite business key | `{entity}_{qualifier}_id` | `appointment_external_id` | Qualified business identifier |

`_key` = surrogate integer generated by our pipeline. `_id` = business identifier from
source. These are never interchangeable. If someone asks "should this be `_key` or `_id`?",
the answer depends entirely on who owns the value: us (→ `_key`) or the source system (→ `_id`).

**Data type suffixes:**

| Type | Suffix | Example |
|---|---|---|
| Timestamp (with time) | `_at` | `created_at`, `cancelled_at` |
| Date (no time) | `_date` | `birth_date`, `prescription_date` |
| Boolean | `is_` / `has_` prefix | `is_active`, `has_prescription`, `is_deleted` |
| Monetary (in cents) | `_amount` | `service_amount`, `refund_amount` |
| Count / quantity | `_count` / `_quantity` | `appointment_count`, `prescribed_quantity` |
| Percentage / ratio | `_pct` / `_ratio` | `churn_pct`, `fill_ratio` |
| Duration | `_duration_{unit}` | `call_duration_seconds`, `wait_duration_minutes` |
| Free text / comments | `_text` / `_note` | `cancellation_note`, `diagnosis_text` |
| CET timestamp *(Gold only)* | `_cet` postfix | `service_date_cet`, `shipping_date_cet` |

**General column rules:**

- Full words: `patient_key` not `pat_key`, `prescription_date` not `rx_dt`. Universal abbreviations are OK: `id`, `pct`, `qty`.
- No SQL reserved keywords as bare column names: `appointment_date` not `date`, `appointment_status` not `status`, `appointment_type` not `type`.
- Booleans answer yes/no: `is_active` reads as "is active? yes/no".
- Consistent naming across models: if it's `patient_id` in one model, it's `patient_id` everywhere.
- Business terminology over source terminology: rename `CUST_NM` to `customer_name` in staging.
- Bronze keeps source column names as-is. Renaming happens in staging.

---

## Role-Playing Dimensions

When a single dimension appears multiple times in a fact table (e.g., `dim_date` used for
both order date and delivery date), use descriptive foreign key names:

```
fct_prescription:
  - prescription_date_key  → dim_date.date_key
  - created_date_key       → dim_date.date_key
  - dispensed_date_key     → dim_date.date_key
```

Don't create separate copies of the dimension. The dimension is one table; the foreign
keys in the fact table differentiate the roles.

## Conformed Dimensions

Dimensions shared across multiple fact tables must be identical. `dim_patient` used by
`fct_prescription` and `fct_appointment` is the same table, not two versions.

If a Gold mart needs a subset, it references the Silver dimension or creates a view. It
does not create a `dim_patient_lite` in Gold. This is non-negotiable — conformed
dimensions are what make cross-domain analysis possible.

---

## SQL Style

### CTE Pattern

Every model follows this structure. No exceptions.

```sql
with

source_data as (

    select * from {{ source('source_name', 'table') }}

),

-- Descriptive comment explaining transformation
transformed as (

    select
        column_1,
        column_2,
        ...

    from source_data

),

final as (

    select
        ...

    from transformed

)

select * from final
```

Why CTEs matter:
- All `{{ ref() }}` and `{{ source() }}` calls go in CTEs at the top. This makes the DAG instantly readable.
- Each CTE does one logical unit of work. If a CTE is doing three things, split it.
- The `final` CTE is always the last one before the terminal `select * from final`. This makes debugging trivial — comment out the final select and query any intermediate CTE.
- CTE names should be descriptive: `filtered_active_patients`, not `t1`.
- CTEs duplicated across models should be pulled out into their own models.

### Formatting Rules

```
- Trailing commas in SELECT lists
- 4-space indentation (except predicates align with WHERE)
- Max 80 characters per line
- All lowercase for field names and SQL functions
- Explicit join types: `left join`, `inner join` — never bare `join`
- Table aliases in joins must be readable: `home_teams`, not `ht`
- Prefix columns with table alias when joining 2+ tables; skip prefix for single-table queries
- group by 1, 2 — not column names
- union all over union (union deduplicates at a cost — if you need that, be explicit about why)
- Newlines are cheap, brain time is expensive — don't compress for fewer lines
```

### Staging Model Pattern

Staging models are 1:1 with source tables. Their job: rename, cast, deduplicate, and
nothing more. No business logic. Materialized as views or ephemeral — never as tables
unless there's a documented performance reason.

```sql
with

source_table as (

    select * from {{ source('nba', 'games') }}

),

final as (

    select
        id::int as game_id,
        date::date as game_date,
        date::timestamp as game_at,

        -- Extract nested Snowflake semi-structured data
        teams:away.id::int as away_team_id,
        teams:away.name::string as away_team_name,
        teams:home.id::int as home_team_id,
        teams:home.name::string as home_team_name,

        -- Deduplication flag
        row_number() over (
            partition by id
            order by _airbyte_emitted_at desc
        ) = 1 as is_latest

    from source_table

)

select * from final where is_latest
```

Key patterns:
- Cast everything explicitly. Snowflake's implicit casting is a source of silent bugs.
- Use Snowflake semi-structured access (`column:path::type`) for JSON/VARIANT data.
- Deduplicate with `row_number()` partitioned by the business key, ordered by the ingestion timestamp descending. Filter to `is_latest` in the final select.
- Rename source columns to business-friendly snake_case names.
- Order columns: identifiers first, descriptive attributes middle, timestamps last.

### Dimension Model Pattern

Dimensions combine staging models into entity-centric tables with surrogate keys.

```sql
with

patient as (

    select * from {{ ref('hubspot__contacts') }}

),

address as (

    select * from {{ ref('hubspot__addresses') }}

),

final as (

    select
        -- Surrogate Key (always first)
        {{ dbt_utils.generate_surrogate_key(
            ['patient.patient_id']
        ) }} as patient_key,

        -- Business key
        patient.patient_id,

        -- Descriptive attributes
        patient.patient_name,
        patient.birth_date,
        address.city,
        address.country_name

    from patient

    left join address
        on patient.patient_id = address.patient_id

)

select * from final
```

Key patterns:
- Surrogate key (`_key`) is always the first column, generated via `dbt_utils.generate_surrogate_key`.
- Business key (`_id`) comes second.
- Use `left join` to preserve all records from the primary entity even when enrichment data is missing.
- Filter temporal joins with `is_current` or similar flags rather than date range logic.

### Fact Model Pattern

Facts reference dimensions via surrogate keys and contain numeric measures.

```sql
with

prescription as (

    select * from {{ ref('xpertyme__prescriptions') }}

),

dim_patient as (

    select * from {{ ref('dim_patient') }}

),

dim_doctor as (

    select * from {{ ref('dim_doctor') }}

),

dim_date as (

    select * from {{ ref('dim_date') }}

),

final as (

    select
        -- Surrogate Key
        {{ dbt_utils.generate_surrogate_key(
            ['dim_patient.patient_key',
             'dim_doctor.doctor_key',
             'prescription_date_key.date_key']
        ) }} as prescription_key,

        -- Dimension Keys (foreign keys)
        dim_patient.patient_key,
        dim_doctor.doctor_key,
        prescription_date_key.date_key as prescription_date_key,
        created_date_key.date_key as created_date_key,

        -- Measures
        prescription.prescribed_quantity,
        prescription.service_amount,

        -- Aggregation-friendly booleans (0/1 for SUM)
        case
            when prescription.is_fulfilled then 1
            else 0
        end as fulfilled_count,

        case
            when not prescription.is_fulfilled then 1
            else 0
        end as unfulfilled_count,

        -- Degenerate dimensions
        prescription.prescription_at

    from prescription

    left join dim_patient
        on prescription.patient_id = dim_patient.patient_id

    left join dim_doctor
        on prescription.doctor_id = dim_doctor.doctor_id

    left join dim_date as prescription_date_key
        on prescription.prescription_date = prescription_date_key.date_day

    left join dim_date as created_date_key
        on prescription.created_date = created_date_key.date_day

)

select * from final
```

Key patterns:
- Fact surrogate key (`_key`) is a composite of all dimension keys involved.
- Dimension keys section lists all foreign keys to dimension tables.
- Measures section contains only additive/semi-additive numeric values.
- **Convert booleans to 0/1 integers for aggregation** (`fulfilled_count`, `unfulfilled_count`). This is important because BI tools can SUM integers but can't easily aggregate booleans. Every boolean that will be aggregated downstream should have a corresponding `_count` column.
- Role-playing dimensions: alias the same dimension with descriptive names (`prescription_date_key`, `created_date_key`).
- Pre-calculate derived metrics where they save downstream complexity.

### Mart (Gold) Model Pattern

Marts are wide, denormalized, business-facing tables. They join facts with all relevant
dimensions so the BI consumer needs zero additional joins.

```sql
with

fct_prescription as (

    select * from {{ ref('fct_prescription') }}

),

dim_patient as (

    select * from {{ ref('dim_patient') }}

),

dim_doctor as (

    select * from {{ ref('dim_doctor') }}

),

dim_date as (

    select * from {{ ref('dim_date') }}

),

final as (

    select
        -- Identifiers
        fct_prescription.prescription_key,
        dim_patient.patient_id,
        dim_patient.patient_name,
        dim_doctor.doctor_name,

        -- Calendar attributes
        dim_date.date_day as prescription_date,
        dim_date.short_weekday_name,
        dim_date.short_month_name,

        -- Measures
        fct_prescription.prescribed_quantity,
        fct_prescription.service_amount,
        fct_prescription.fulfilled_count

    from fct_prescription

    left join dim_patient
        on fct_prescription.patient_key = dim_patient.patient_key

    left join dim_doctor
        on fct_prescription.doctor_key = dim_doctor.doctor_key

    left join dim_date
        on fct_prescription.prescription_date_key = dim_date.date_key

    where fct_prescription.is_active

)

select * from final
```

Key patterns:
- Mart names use `mrt_` prefix: `mrt_monthly_prescription_volume`, `mrt_supplier_summary`.
- Join on surrogate keys (`_key`), not business keys.
- Alias dimension tables when joining the same table multiple times.
- Include everything a BI consumer needs without further joins.
- Gold-layer CET timestamps get the `_cet` postfix.

---

## Calendar / Date Dimension

Every project should include a date dimension. Use `dbt_utils.date_spine` to generate it:

```sql
with

date_spine as (

    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('2018-01-01' as date)",
        end_date="cast('2050-12-31' as date)"
    ) }}

),

final as (

    select
        {{ dbt_utils.generate_surrogate_key(['date_day']) }} as date_key,
        date_day,
        dayofweek(date_day) as day_of_week_number,
        day(date_day) as day_of_month_number,
        dayofyear(date_day) as day_of_year_number,
        weekofyear(date_day) as week_of_year_number,
        month(date_day) as month_of_year_number,
        quarter(date_day) as quarter_of_year_number,
        year(date_day) as year_number,
        dayname(date_day) as short_weekday_name,
        monthname(date_day) as short_month_name

    from date_spine

)

select * from final
```

This gives every fact table a foreign key to calendar attributes without date functions in BI tools.

---

## YAML Conventions

### Source Definitions

```yaml
version: 2

sources:
  - name: hubspot
    database: raw
    schema: hubspot
    tables:
      - name: contacts
        identifier: contacts
      - name: deals
        identifier: deals
```

- Use `identifier` when the physical table name differs from the logical name.
- `name` is what you reference in `{{ source('hubspot', 'contacts') }}`.

### Model Definitions — the `_{folder}__models.yml` pattern

All models in a folder go into a single YAML file named `_{folder}__models.yml`. Not one
YAML per model — one YAML per folder.

```yaml
# models/silver/dimensions/_dimensions__models.yml
version: 2

models:
  - name: dim_patient
    description: >
      One row per patient. Grain: one patient entity identified
      by patient_id (business key from HubSpot).
    columns:
      - name: patient_key
        description: "Surrogate key. MD5 hash of patient_id."
        tests:
          - unique
          - not_null

      - name: patient_id
        description: "Business key from HubSpot CRM."
        tests:
          - not_null

      - name: patient_name
        description: "Full name of the patient."

      - name: birth_date
        description: "Patient date of birth."

  - name: dim_doctor
    description: >
      One row per doctor. Grain: one doctor entity identified
      by doctor_id.
    columns:
      - name: doctor_key
        description: "Surrogate key. MD5 hash of doctor_id."
        tests:
          - unique
          - not_null
```

YAML formatting:
- 2-space indentation (not 4 — YAML is not SQL)
- Max 80 characters per line
- Blank line between list items that are dictionaries
- List items indented under their parent

### Documentation Requirements by Layer

| Layer | Model description | Column descriptions |
|---|---|---|
| Bronze | Optional | Optional |
| Staging | Optional | Optional |
| **Silver** | Required — including grain statement | Required — all columns |
| **Gold** | Required — including consumer/use case | Required — all columns |

CI will fail if a Silver or Gold model is missing its description or has undocumented
columns. If you can't clearly state the grain in one sentence, the model probably has a
grain problem — fix the model, not the description.

### Documentation with doc blocks

For longer descriptions, use `{{ doc() }}` references pointing to `_{folder}__docs.md` files:

```yaml
# _gold__models.yml
models:
  - name: mrt_prescription_summary
    description: '{{ doc("mrt_prescription_summary_description") }}'
```

```markdown
<!-- _gold__docs.md -->
{% docs mrt_prescription_summary_description %}

Monthly prescription volumes by doctor and pharmacy. Used by the
Finance team for supplier reconciliation.

Grain: one row per doctor per pharmacy per month.

{% enddocs %}
```

### Persist docs to Snowflake

Add this to `dbt_project.yml` so descriptions materialize as Snowflake column comments:

```yaml
models:
  project_name:
    +persist_docs:
      relation: true
      columns: true
```

---

## Testing

### Minimum Requirements

Every model must have `unique` and `not_null` tests on its primary key. This is non-negotiable.

```yaml
models:
  - name: fct_prescription
    columns:
      - name: prescription_key
        tests:
          - unique
          - not_null
```

### Additional Tests by Layer

| Layer | Required Tests | Recommended Tests |
|---|---|---|
| Staging | Primary key: unique + not_null | — |
| Silver Dimensions | Surrogate key `_key`: unique + not_null | `not_null` on business key `_id` |
| Silver Facts | Surrogate key `_key`: unique + not_null | `relationships` to dimension keys |
| Gold Marts | Business key: unique + not_null | `accepted_values` on status/type columns |

### Snowflake Constraints (metadata-only)

Add `PRIMARY KEY` and `FOREIGN KEY` constraints to all Silver and Gold tables. Snowflake
doesn't enforce them — they serve three purposes: metadata documentation, ER diagram
generation, and Cortex AI join path inference.

```sql
-- In model config or post-hook
ALTER TABLE {{ this }} ADD PRIMARY KEY (prescription_key);
ALTER TABLE {{ this }} ADD FOREIGN KEY (patient_key)
  REFERENCES {{ ref('dim_patient') }} (patient_key);
```

Both the Snowflake constraint AND the dbt test are required. The constraint without the
test is decoration. The test without the constraint misses the metadata benefit.

---

## dbt_project.yml

```yaml
name: 'project_name'
version: '1.0.0'
config-version: 2

profile: 'project_name'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:
  - "target"
  - "dbt_packages"

models:
  project_name:
    +persist_docs:
      relation: true
      columns: true
    staging:
      +materialized: view
      +schema: staging
    silver:
      +materialized: table
      +schema: silver
    gold:
      +materialized: table
      +schema: gold
```

Key decisions:
- Staging as views (cheap, always fresh, no storage cost). Never tables unless documented performance reason.
- Silver and Gold as tables (performance for BI queries and downstream joins).
- Schema routing at the directory level — individual models don't need to declare their schema.
- `persist_docs` enabled project-wide so descriptions flow into Snowflake comments.

---

## Custom Schema Macro

Essential for multi-environment deployments. Without it, dbt concatenates the target schema
with the custom schema (e.g., `dev_alberto_staging`).

```sql
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- set default_schema = target.schema -%}
    {%- if target.name == 'prod' -%}
        {{ custom_schema_name | trim }}
    {%- else -%}
        {{ default_schema }}
    {%- endif -%}
{%- endmacro %}
```

In prod: models go to their declared schema (`staging`, `silver`, `gold`).
In dev/ci: everything goes to a single schema (`dev_alberto`, `ci`).

---

## Profiles (Multi-Environment)

```yaml
project_name:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('DBT_SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('DBT_SNOWFLAKE_USER') }}"
      private_key_path: "{{ env_var('DBT_SNOWFLAKE_PRIVATE_KEY_PATH') }}"
      role: "{{ env_var('DBT_SNOWFLAKE_ROLE') }}"
      warehouse: "{{ env_var('DBT_SNOWFLAKE_WAREHOUSE') }}"
      database: "{{ env_var('DBT_SNOWFLAKE_DATABASE') }}"
      schema: dev_your_name
      threads: 4

    ci:
      type: snowflake
      schema: ci
      threads: 4

    prod:
      type: snowflake
      schema: public
      threads: 4
```

Three environments: `dev` (personal schema), `ci` (PR validation), `prod` (production schemas).
Always use environment variables for credentials — never hardcode.

---

## CI/CD

### Pull Request Validation (ci.yml)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
    paths: ['**/*.sql', '**/*.yml', '**/*.md']

jobs:
  dbt-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install dbt-snowflake
      - run: dbt deps
      - run: dbt build --target ci
```

`dbt build` runs both models and tests in a single command. If any test fails, the PR is blocked.

### Production Deploy (post_merge_deploy.yml)

```yaml
name: Deploy
on:
  pull_request:
    branches: [main]
    types: [closed]

jobs:
  deploy:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install dbt-snowflake
      - run: dbt deps
      - run: dbt build --target prod
```

Only triggers on merged PRs — not closed/rejected ones.

---

## Packages

At minimum, include `dbt_utils`:

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: ">=1.1.0"
```

Run `dbt deps` after adding or updating packages.

---

## Jinja Style

- Spaces inside delimiters: `{{ this }}` not `{{this}}`
- Newlines to separate logical blocks
- Config blocks formatted like this:

```sql
{{
  config(
    materialized = 'table',
    sort = 'id',
    dist = 'id'
  )
}}
```

---

## Anti-Patterns

| Don't | Do instead |
|---|---|
| Select from `source()` outside staging | Only staging models touch sources |
| Business logic in staging | Staging = rename, cast, deduplicate. That's it. |
| Bare `join` without type | Always `left join`, `inner join`, etc. |
| `select *` in final models | Explicitly list every column |
| Abbreviations (`appt_key`, `rx_dt`) | Full words (`appointment_key`, `prescription_date`) |
| Layer name in table name | `dim_patient` not `silver_dim_patient` |
| Version numbers in names | Replace the model, don't add `_v2` |
| SCD type in table name | `dim_patient` not `dim_patient_scd2` |
| Encode data types in names | `patient_name` not `patient_name_varchar` |
| Generic column names | `appointment_status` not `status` |
| `union` without thinking | `union all` unless you explicitly need dedup |
| Timestamps without timezone clarity | Default to UTC, suffix others: `_pt`, `_cet` |
| Hardcoded database/schema | Use `{{ source() }}` and `{{ ref() }}` |
| `_sk` suffix for surrogate keys | Use `_key` suffix (`patient_key` not `patient_sk`) |
| Create dimension copies for marts | Reference the conformed Silver dimension |
| Staging materialized as table | Views or ephemeral only |

---

## Checklist: New Model

When creating any new model, verify:

1. File is in the correct directory (`staging/{source}/`, `silver/dimensions/`, `silver/facts/`, `gold/`)
2. Naming follows the convention for its layer (`{source}__{entity}`, `dim_`, `fct_`, `bridge_`, `mrt_`)
3. YAML entry exists in the folder's `_{folder}__models.yml` (not a separate YAML per model)
4. Primary key has `unique` + `not_null` tests
5. All `ref()` and `source()` calls are in CTEs at the top
6. Final CTE is named `final` and the model ends with `select * from final`
7. SQL follows formatting rules (trailing commas, 4-space indent, explicit joins, readable aliases)
8. Columns use full words, `_key`/`_id` distinction, and appropriate suffixes
9. Silver/Gold models: descriptions with grain statements, all columns documented in YAML
10. Silver/Gold models: PK/FK Snowflake constraints in post-hooks
11. Boolean measures converted to 0/1 `_count` columns in fact tables
12. No hardcoded schema or database references
