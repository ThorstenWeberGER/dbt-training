# Review Checklists — Bloomwell dbt & Python

Full per-type checklists for code reviews. Use these for complete PR reviews.
For quick spot-checks, the SKILL.md quick patterns are sufficient.

---

## Checklist 1: dbt SQL Model

> Also run: **[Checklist 6: Documentation](#checklist-6-documentation)**

### Config Block
- [ ] `{{ config(...) }}` is at the top of the file — never inside a macro
- [ ] `materialized` matches layer default or has documented reason to differ
  - Bronze: `table` (transient) or `view` for intermediate steps
  - Silver: `table` (non-transient — needs time travel)
  - Gold: `table` (transient)
  - Staging: `view` or `ephemeral` — **never `table`**
- [ ] For incremental models: `unique_key` matches the surrogate key used in the model body
- [ ] For SCD2 models: `merge_update_columns` includes `valid_to`, `is_active`, `loaded_at` at minimum
- [ ] For SCD2 models: `incremental_strategy='merge'` is set explicitly
- [ ] Silver and Gold models: `PRIMARY KEY` and `FOREIGN KEY` constraints applied via `post_hook` in the model `{{ config() }}` block — not in `dbt_project.yml`, not as standalone SQL:
  ```sql
  {{ config(
      materialized='incremental',
      post_hook=[
          "ALTER TABLE {{ this }} ADD PRIMARY KEY (patient_key)",
          "ALTER TABLE {{ this }} ADD FOREIGN KEY (pharmacy_key) REFERENCES {{ ref('dim_pharmacy') }} (pharmacy_key)"
      ]
  ) }}
  ```
- [ ] Silver and Gold models: `persist_docs` active — verify `+persist_docs: {relation: true, columns: true}` is set at layer level in `dbt_project.yml`; individual models only need to set it if the project-level default is missing

### Naming
- [ ] Table name follows layer prefix convention (`dim_`, `fct_`, `mrt_`, `bridge_`, or none for Bronze)
- [ ] No layer name embedded in table name (`brz_`, `silver_`, etc.)
- [ ] No SCD type in table name (`_scd2`, `_type2`)
- [ ] No version numbers (`_v2`, `_new`)
- [ ] File extension is `.sql` — not `.md`, `.txt`, or anything else
- [ ] Filename matches model name in YAML

### References
- [ ] All upstream models use `{{ ref('model_name') }}` — no hardcoded schema.table
- [ ] All source tables use `{{ source('source_name', 'table_name') }}` — not hardcoded
- [ ] No `SELECT *` in Silver or Gold (columns must be explicit)
- [ ] `SELECT *` in Bronze is acceptable only for intermediate/dedupe steps

### SCD2 Models (scd2_merge macro)
- [ ] `unique_key` in `{{ config() }}` exactly matches `surrogate_key` parameter in `{{ scd2_merge() }}`
- [ ] `loaded_at_col` exists in the source model
- [ ] `tracked_cols` list matches what is documented in YAML description
- [ ] `invalidate_hard_deletes` is explicitly set (not left to default)
- [ ] `valid_from_col` is set when the source has a meaningful created_at timestamp
- [ ] `include_cols` used for columns needed in output but not tracked for changes (e.g. `pipeline_id` in stages)

### Macros Inside Models
- [ ] Any `run_query()` calls are guarded with `{% if execute %}...{% endif %}`
- [ ] Macros that call `INFORMATION_SCHEMA` queries are guarded with `{% if execute %}`
- [ ] `{% else %} select * from ... where 1=0 {% endif %}` fallback present for parse-time safety
- [ ] No Jinja logic that would fail at parse time (before dbt graph is resolved)

### Layer Placement & Responsibility

**Identify the model's layer from its folder path before reviewing anything else.**

| Folder | Layer | Allowed prefixes | Materialization | Schema responsibility |
|---|---|---|---|---|
| `0_staging/` | Sources only | — (sources.yml only, no model files) | — | Raw Snowflake landing tables from ingestion |
| `1_bronze/` | Bronze | `brz_*` (project-specific; Bloomwell convention = no prefix, schema provides context) | `table` (transient) | JSON parsing, type casting, dedup — no business logic |
| `2_silver/` | Silver intermediates | `int_*` | `table` or `ephemeral` | Prep/cleaning intermediates feeding Gold — not yet conformed entities |
| `3_gold/` | Gold — dimensional model | `dim_*`, `fct_*`, `bridge_*` | `table` | Kimball-compliant dims and facts; conformed, tested, BI-ready |

**Layer boundary checks:**
- [ ] Bronze (`1_bronze/`): no JOINs between source objects, no business logic, no derived KPIs
- [ ] Silver (`2_silver/`): only `int_*` prep intermediates — no `dim_*` or `fct_*` models here
- [ ] Gold (`3_gold/`): only `dim_*`, `fct_*`, `bridge_*` — no raw Bronze columns referenced directly
- [ ] Staging (`0_staging/`): only `sources:` declarations — no SQL model files

**Content that is in the wrong layer:**
- Business logic (CASE statements, KPI formulas) in `1_bronze/` → move to `2_silver/` or `3_gold/`
- `dim_*` or `fct_*` models inside `2_silver/` → move to `3_gold/`
- Display/label mappings (e.g. channel name CASE blocks) in `2_silver/` intermediates → move to the corresponding `dim_*` table in `3_gold/` as a `_display_name` column

### Bronze Layer Specifics
- [ ] Uses `TRY_TO_*` functions for all type casts (never bare `CAST` or `::type` on raw JSON)
- [ ] `LATERAL FLATTEN` includes `outer => true` where nulls should be preserved
- [ ] `loaded_at` column preserved and cast to `TIMESTAMP_LTZ`
- [ ] `CONVERT_TIMEZONE('UTC', loaded_at)` applied before timezone-aware cast
- [ ] Deduplication uses `dbt_utils.deduplicate` or explicit `ROW_NUMBER()` with documented logic
- [ ] No business logic — only structural transformation and type casting

### Silver Layer Specifics
- [ ] All models are `int_*` prefix — no dimension or fact tables
- [ ] All dimension FKs in fact tables use `_key` suffix (not `_id`)
- [ ] No NULL FK values — sentinel strategy documented in YAML
- [ ] `is_active`, `valid_from`, `valid_to` present on all SCD2 dimensions
- [ ] Column rename from source uses consistent suffix conventions

### Gold Layer Specifics
- [ ] No raw Bronze columns referenced directly — always via Silver
- [ ] `_cet` suffix applied to any timezone-converted timestamps
- [ ] Additive measures documented — non-additive ratios/percentages noted in YAML description
- [ ] `dim_*` tables have sentinel rows for all NULL FK resolution (id = -1 or 'n.a.')
- [ ] `bridge_*` tables have `unique_key` defined on the composite natural key
- [ ] Display/label logic lives here in dimension columns — not in upstream Silver intermediates

---

## Checklist 2: dbt Macro

> Also run: **[Checklist 6: Documentation](#checklist-6-documentation)**

- [ ] Macro has a docstring comment explaining purpose, args, and usage example
- [ ] All `run_query()` calls are inside `{% if execute %}` guard
- [ ] Returns `{{ return([]) }}` or similar safe value in the `{% else %}` branch
- [ ] No hardcoded database/schema names — uses `target.database`, `target.schema`, or `ref()`
- [ ] Parameters have clear names — no single-letter variables
- [ ] Macro is placed in the correct file (e.g. timedelta logic in `macros_timedelta.sql`)
- [ ] `config()` block is NOT inside the macro — it belongs in the calling model
- [ ] Jinja loops use `loop.last` check for trailing comma handling
- [ ] For column-generating macros: output tested manually before use in a model

---

## Checklist 3: dbt YAML (schema.yml / config.yml / sources.yml)

> Also run: **[Checklist 6: Documentation](#checklist-6-documentation)**
> For test *design decisions* (which tests to add, severity, net-new principle): use the **`dbt-test-strategy`** skill — this checklist only verifies that required tests are present.

### Model Descriptions
- [ ] Silver and Gold models have `description` field — CI fails without it
- [ ] Silver and Gold descriptions contain grain statement in one sentence
- [ ] Bronze and Staging descriptions are optional but recommended
- [ ] Grain statement format: `"Grain: one row per [entity] per [qualifier]"`

### Column Descriptions
- [ ] All Silver and Gold columns have `description` — CI fails without it
- [ ] Descriptions include data type in parentheses: `"HubSpot ticket identifier (VARCHAR)"`
- [ ] Timestamp columns note timezone: `"(TIMESTAMP_LTZ)"` or `"(TIMESTAMP_TZ)"`
- [ ] `_key` columns describe the hash/generation logic
- [ ] `_id` columns note the source system

### Test Coverage
- [ ] `unique` + `not_null` on every `_key` column (Silver + Gold)
- [ ] `not_null` on every business-critical column
- [ ] `relationships` test on every FK column (Silver + Gold)
- [ ] `accepted_values` on boolean columns (values: [true, false])
- [ ] `not_in_future` on all timestamp columns (custom generic test present in repo)
- [ ] `dbt_expectations.expect_column_pair_values_A_to_be_greater_than_B` for date ordering (e.g. `updated_at > created_at`)
- [ ] Syntax: use `data_tests:` (not `tests:`) consistently across all files

### Source Definitions
- [ ] Each source table has `description`
- [ ] `loaded_at` column has `not_null` test on every source table
- [ ] Primary keys have `unique` + `not_null`
- [ ] `dbt_expectations.expect_column_values_to_be_between` on `loaded_at` with reasonable min date

### SCD2 Dimensions
- [ ] `valid_from`, `valid_to`, `is_active` all have `not_null` test
- [ ] `is_active` has `accepted_values: [true, false]`
- [ ] `_key` (surrogate) has `unique` + `not_null`
- [ ] Business key (`_id`) has `not_null`
- [ ] Description documents which columns are tracked for SCD2 changes

---

## Checklist 4: Python Lambda (app_tickets.py / app_metadata.py pattern)

> Also run: **[Checklist 6: Documentation](#checklist-6-documentation)**

### Security
- [ ] No f-string SQL — all cursor.execute() use parameterized queries with `%s`
- [ ] No secrets in code or config files — all via AWS Secrets Manager
- [ ] No hardcoded credentials, tokens, or account identifiers
- [ ] API tokens retrieved fresh per invocation (not cached between cold starts)

### Configuration
- [ ] `pipeline_id` and `data_object` read from Lambda `event` parameter, not hardcoded
- [ ] All target database/schema/table values come from Snowflake config table, not hardcoded
- [ ] Log level is set dynamically from config, not hardcoded

### HubSpot API
- [ ] `@hubspot_retry()` decorator applied to all HubSpot API calls
- [ ] Raw HTTP calls (Conversations API) have equivalent retry/error handling
- [ ] SDK objects use `.to_dict()` before serialization; raw HTTP responses are already dicts
- [ ] `time.sleep(CONFIG["throttle_delay"])` applied after each API call
- [ ] Pagination loop has explicit break condition (checks `paging.next`)

### Snowflake
- [ ] RSA key loaded from AWS Secrets Manager — never from file or env var
- [ ] `conn.rollback()` called in `except` blocks before re-raising
- [ ] `conn.commit()` called explicitly after `executemany()` inserts
- [ ] Fully qualified table names used: `database.schema.table` — not just `table`
- [ ] `cursor.close()` and `conn.close()` in `finally` block
- [ ] `write_pandas` uses `use_logical_type=True` and explicit `database`/`schema` params

### Error Handling
- [ ] All functions have `try/except` with `logger.error(..., exc_info=True)`
- [ ] `lambda_handler` returns structured JSON with `statusCode` for both success and failure
- [ ] `load_successful` flag used to guard post-load operations (e.g., GRANT statements)
- [ ] Rate limit (429) handling uses exponential backoff, not fixed sleep

### Code Quality
- [ ] `pytz` in `requirements.txt` if used (not assumed transitive)
- [ ] `os.chdir(os.path.dirname(...))` at script entry for relative path safety
- [ ] No commented-out production code blocks left in — use TODO comments instead
- [ ] `logger` passed as parameter to functions (not module-level global where avoidable)
- [ ] Functions have single responsibility — no function doing fetch + transform + load

---

## Checklist 5: Python Backfill (main.py / FileProcessor / SnowflakeLoader pattern)

> Also run: **[Checklist 6: Documentation](#checklist-6-documentation)**

- [ ] `validate_row_count()` uses fully qualified table name including database + schema
- [ ] `write_pandas` with `overwrite=True` and `auto_create_table=True` — confirm intentional full overwrite
- [ ] Post-commit verification: `SELECT COUNT(*)` run after `conn.commit()` to confirm persistence
- [ ] `GRANT SELECT TO ROLE` executed after load — confirm target role is correct
- [ ] `cleanup_on_success` flag respected — temp files not left behind in production runs
- [ ] `FileProcessor.combine_csvs()` validates columns before returning DataFrame
- [ ] ZIP extraction handles nested directories (uses `os.walk`, not `namelist()`)
- [ ] Source type (`hubspot` vs `csv`) read from config, not hardcoded

---

## Known Issues in the Codebase (Track These)

These are existing issues found during review. Do not reintroduce them.

| File | Issue | Severity |
|---|---|---|
| `dim_pipeline_stages_scd2.sql` | `unique_key='stages_key'` ≠ `surrogate_key='stage_key'` | 🔴 Blocking |
| `int_tickets_cleaned.md` | Wrong file extension — ignored by dbt | 🔴 Blocking |
| `int_tickets_cleaned.md` | Hardcoded `bloomwell_bronze.hubspot_tickets_stg_tickets` | 🔴 Blocking |
| `app_tickets.py` | f-string SQL in `get_pipeline_config()`, `get_properties()` | 🔴 Blocking |
| `app_metadata.py` | f-string SQL in `get_pipeline_config()` | 🔴 Blocking |
| `app_tickets.py` | `pipeline_id` and `data_object` hardcoded in `lambda_handler` | 🟡 Warning |
| `app_metadata.py` | Same hardcoding issue | 🟡 Warning |
| `snowflake_loader.py` | `validate_row_count()` uses unqualified table name | 🟡 Warning |
| `hs-tickets-tickets/requirements.txt` | `pytz` missing | 🔴 Blocking |
| Various YAML files | Mixed `tests:` and `data_tests:` syntax | 🟡 Warning |
| `brz_pipelines.sql` | Unnecessary `LATERAL FLATTEN` — pipeline data doesn't need it | 🟡 Warning |

---

## Checklist 6: Documentation

Applies to **all code types**. Run this alongside every other checklist.
> This checklist flags documentation gaps during review. To **write or improve** documentation based on these findings, load the **`analytics-code-documentation`** skill — it contains the full templates, question bank, and output standards.

### dbt SQL Models

- [ ] Every model file has a corresponding entry in a `config.yml` or `schema.yml`
- [ ] Silver and Gold models: `description` is present — CI fails without it
- [ ] Silver and Gold models: description contains a grain statement in one sentence
  - Format: `"Grain: one row per [entity] per [qualifier]."`
- [ ] Bronze and Staging models: description is optional but present if the model is non-trivial
- [ ] Intermediate models (`int_*`): purpose is documented — what problem does this model solve?
- [ ] SCD strategy documented in description: which columns are tracked (Type 2), which overwrite (Type 1), which never change (Type 0)
- [ ] `invalidate_hard_deletes` behavior documented: what happens when source records disappear?
- [ ] Non-obvious SQL logic has an inline comment explaining the why, not the what
- [ ] `-- depends_on: {{ ref('...') }}` comment present when a macro creates an implicit dependency not visible in the DAG (as seen in `brz_tickets_typed.sql` and `brz_tickets_staged.sql`)

### dbt Macros

- [ ] Every macro has a docstring block comment with:
  - What the macro does (one sentence)
  - All parameters with type and description
  - At least one usage example in SQL
- [ ] Return value documented if macro returns data (not just renders SQL)
- [ ] Known limitations or edge cases noted (e.g. "use in Gold layer only for display")
- [ ] Deprecated macros marked with `-- DEPRECATED:` and a reason (see `assert_brz_tickets_typed_non_negative_ms.sql` as example)

### dbt YAML

- [ ] All Silver and Gold columns have `description` — CI fails without it
- [ ] Column descriptions follow the format: `"Human-readable explanation (DATA_TYPE)."`
  - Example: `"Surrogate key for the prescription fact (VARCHAR(32))."`
- [ ] Timestamp columns note timezone context: `"(TIMESTAMP_LTZ)"` or `"(TIMESTAMP_TZ)"`
- [ ] `_key` columns document the hash/generation logic
  - Example: `"MD5 hash of pipeline_id and pipeline_name — stable across full refreshes."`
- [ ] `_id` columns reference the source system
  - Example: `"HubSpot pipeline identifier (VARCHAR). Business key from source."`
- [ ] Boolean columns include valid values: `"Whether the ticket is closed (BOOLEAN). True = closed, False = open."`
- [ ] Source table descriptions explain what the table contains AND where it comes from
- [ ] Test descriptions added for non-obvious custom tests

### Python Lambda / Backfill

- [ ] Every function has a docstring with: purpose, all args with types, return value
- [ ] Docstring format consistent — Google style preferred:
  ```python
  def my_func(arg1: str, arg2: int) -> dict:
      """
      One-sentence description of what this does.

      Args:
          arg1: Description of arg1.
          arg2: Description of arg2.

      Returns:
          Description of return value.
      """
  ```
- [ ] `lambda_handler` docstring documents the expected event payload structure
- [ ] Known limitations or future improvements noted as `# TODO:` with a description
  - Example found in `app_tickets.py` README: SQL injection, hardcoded config_id, date parsing complexity — these should be `# TODO:` in the code, not only in the README
- [ ] `config.yaml` has inline comments explaining non-obvious settings
  - Example: `throttle_delay`, `max_backoff` should note units (seconds)
- [ ] `requirements.txt` has pinned versions for all direct dependencies
- [ ] `README.md` present and up to date — covers: purpose, architecture, setup, config, error handling
- [ ] Commented-out code blocks either removed or annotated with a `# TODO:` reason
  - Example: the GRANT statement block in `app_tickets.py` `finally` — should have a dated TODO, not silent comments

### `dbt_project.yml`

- [ ] Each layer's materialization strategy has a comment explaining the choice
- [ ] Tags are documented (what do `hourly`, `bronze`, etc. mean for orchestration?)
- [ ] `+persist_docs` enabled at Silver and Gold layer level — ensures descriptions flow to Snowflake comments:
  ```yaml
  2_silver:
    +persist_docs:
      relation: true
      columns: true
  3_gold:
    +persist_docs:
      relation: true
      columns: true
  ```
  If set here, individual models do not need to repeat it in their `{{ config() }}` block
- [ ] `+persist_docs` is **not** set on Bronze or Staging — descriptions are optional there
- [ ] Constraints (`PRIMARY KEY`, `FOREIGN KEY`) are **not** configured globally in `dbt_project.yml` — they must be defined per model via `post_hook` in the model's `{{ config() }}` block:
  ```sql
  {{ config(
      post_hook=[
          "ALTER TABLE {{ this }} ADD PRIMARY KEY (patient_key)",
          "ALTER TABLE {{ this }} ADD FOREIGN KEY (pharmacy_key) REFERENCES {{ ref('dim_pharmacy') }} (pharmacy_key)"
      ]
  ) }}
  ```
  This ensures each model explicitly owns its constraint definitions and they run reliably after each build
- [ ] `vars` entries have inline comments explaining valid values and usage
  - Example: `threshold_date` should note which test uses it

---

## Known Issues in the Codebase (Track These)

Use this format for every review:

```
## Code Review: [filename]
**Type:** [dbt model / macro / YAML / Python Lambda / Python Backfill]
**Layer:** [Bronze / Silver / Gold / Staging / n.a.]

### 🔴 Blocking (must fix before merge)
1. [Issue] — [File:Line if known] — Fix: [concrete fix]

### 🟡 Warnings (should fix)
1. [Issue] — Fix: [concrete fix]

### 🔵 Suggestions (nice to have)
1. [Issue] — Fix: [concrete fix]

**Summary:** X blocking · Y warnings · Z suggestions
```
