# dbt Training — Data Team
> **Audience:** Data & Analytics team
> **Stack:** dbt Core · Snowflake · Bronze / Silver / Gold medallion architecture · HubSpot pipelines
> **Goal:** Get everyone productive in dbt — able to read, write, test, and maintain models confidently
> **Levels:** 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced

---

## How to Use This Document

The course runs in three tiers. Work through them in order. Each module builds on the previous one. Estimated durations are per session. You can split sessions across separate days.

---

## Tier 1 — Foundations 🟢

### Module 1 — Why dbt? Context and Mental Model
**Estimated time: 1 hour**

- What problem dbt solves: ELT vs. ETL, transformation in the warehouse
- The dbt philosophy: SQL-first, version-controlled, tested, documented
- How dbt fits the project stack (Snowflake + HubSpot + Power BI)
- dbt Core vs. dbt Cloud — what we use and why
- The project structure: `models/`, `macros/`, `seeds/`, `tests/`, `snapshots/`, `dbt_project.yml`

**Key takeaway:** dbt isn't a pipeline runner. It's a transformation framework that brings software engineering practices — tests, docs, version control — to SQL.

---

### Module 2 — Local Setup: `profiles.yml`, Project Init, and Repo Structure
**Estimated time: 2 hours**

#### Part A — Installation and Connection

- Installing dbt Core: Python venv, `pip install dbt-snowflake`
- `dbt init` — what it creates and what you still need to configure manually
- **`profiles.yml` in depth**
  - Location: `~/.dbt/profiles.yml` (outside the repo — never commit it)
  - Structure: profile name → target → connection params
  - Snowflake-specific fields: `account`, `user`, `password` (or `authenticator: externalbrowser`), `role`, `warehouse`, `database`, `schema`
  - Multiple targets in one profile: `dev` vs. `prod`
  - Referencing the active target in models with `{{ target.name }}` and `{{ target.schema }}`
  - `dbt debug` — verifying the connection works before writing any SQL

```yaml
# ~/.dbt/profiles.yml — example for Snowflake
analytics:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: <account_locator>
      user: <your_email>
      authenticator: externalbrowser
      role: analytics_service_role
      warehouse: COMPUTE_WH
      database: SILVER_DEV
      schema: dbt_<your_name>   # personal dev schema, never shared
      threads: 4
    prod:
      type: snowflake
      account: <account_locator>
      user: <service_account>
      password: "{{ env_var('DBT_SNOWFLAKE_PASSWORD') }}"
      role: analytics_service_role
      warehouse: COMPUTE_WH
      database: SILVER
      schema: PUBLIC
      threads: 8
```

#### Part B — Repository Structure

A dbt project is a directory with a specific layout. Every file has a purpose.

```
analytics/                        # repo root
├── dbt_project.yml               # project config: name, version, model paths, vars, defaults
├── packages.yml                  # external packages (dbt_utils, dbt-expectations)
├── package-lock.yml              # pinned package versions — always commit this
├── .gitignore                    # exclude: target/, dbt_packages/, logs/, profiles.yml
│
├── models/                       # all SQL transformation models
│   ├── staging/                  # views on top of Bronze; source renaming + casting only
│   │   └── hubspot/
│   │       ├── hubspot__contacts.sql
│   │       └── schema.yml        # source declarations + staging model docs/tests
│   ├── silver/                   # business entities: dim_*, fct_*, bridge_*
│   │   ├── dim_patient.sql
│   │   ├── fct_prescription.sql
│   │   └── schema.yml            # required: grain statements + all column descriptions
│   └── gold/                     # consumption layer: mrt_* for Power BI
│       ├── mrt_monthly_volume.sql
│       └── schema.yml            # required: use case + all column descriptions
│
├── macros/                       # Jinja macros reused across models
│   ├── scd2_merge.sql            # custom SCD2 merge macro
│   └── utils/
│       └── safe_div.sql
│
├── seeds/                        # version-controlled CSV lookup tables
│   └── status_mapping.csv
│
├── snapshots/                    # native dbt SCD2 snapshots (see Module 11)
│
├── tests/                        # custom singular tests (one-off SQL assertions)
│   └── assert_no_negative_amounts.sql
│
├── analyses/                     # ad-hoc SQL — compiled but not materialized
│
├── docs/                         # .md files for doc() blocks (reusable descriptions)
│   └── column_descriptions.md
│
└── target/                       # compiled SQL + manifest.json — never commit
    ├── compiled/
    ├── run/
    └── manifest.json             # the project graph — used for slim CI
```

**Key files to understand first:**

- `dbt_project.yml` — sets default materializations per folder, model path config, and project-level vars
- `schema.yml` — lives inside `models/`; declares sources, model descriptions, column descriptions, and tests
- `packages.yml` + `package-lock.yml` — external dependencies; run `dbt deps` after editing
- `target/manifest.json` — the compiled DAG; used by CI for `state:modified+` selection

#### Part C — First Model

- Writing your first model: a `.sql` file is a model; the filename becomes the table/view name
- The `{{ ref() }}` function — how dbt tracks dependencies and builds the DAG
- The `{{ source() }}` function — referencing raw Bronze tables without hardcoding database paths
- Materializations overview: `view`, `table`, `incremental`, `ephemeral` (concepts only — detail in Module 8)
- Running models: `dbt run`, `dbt run --select model_name`

**Hands-on exercise:** Write a staging model for a HubSpot source table using `{{ source() }}`. Run it. Confirm the view exists in your personal dev schema in Snowflake. Inspect the DAG with `dbt docs serve`.

---

### Module 3 — The dbt Execution Sequence: What Actually Happens
**Estimated time: 1 hour**

Understanding what dbt does under the hood prevents a whole class of debugging confusion. This module covers the full lifecycle from command to Snowflake object.

#### The Five Phases of `dbt run`

```
1. PARSE          Read all .sql and .yml files → build the in-memory project graph
2. RESOLVE        Resolve ref() and source() calls → determine execution order (DAG)
3. COMPILE        Render Jinja → produce pure SQL in target/compiled/
4. EXECUTE        Send compiled SQL to Snowflake → create views/tables
5. REPORT         Print results: OK / ERROR / WARN per model
```

#### Phase 1 — Parse
- dbt reads every file in `models/`, `macros/`, `seeds/`, `snapshots/`, `tests/`
- YAML files (`schema.yml`, `sources.yml`) are parsed for source declarations, tests, and docs
- Syntax errors in Jinja or YAML fail here, before any SQL runs

#### Phase 2 — Resolve the DAG
- Every `{{ ref('model_name') }}` becomes an edge in a directed acyclic graph
- dbt determines the correct execution order: upstream models always run first
- Circular references (`A → B → A`) fail here with a clear error
- This is why you **never hardcode table names** — `ref()` is what makes the DAG work

#### Phase 3 — Compile
- Jinja templates are rendered: `{{ ref() }}`, `{{ source() }}`, `{{ config() }}`, macros, `{{ var() }}`
- The result is plain SQL saved to `target/compiled/<project>/<model_path>.sql`
- **Debugging tip:** When a model produces unexpected output, read the compiled SQL first — it shows exactly what dbt sent to Snowflake

```bash
# Compile without running — useful for reviewing generated SQL
dbt compile --select fct_prescription

# Then inspect:
cat target/compiled/analytics/models/silver/fct_prescription.sql
```

#### Phase 4 — Execute
- dbt connects to Snowflake using `profiles.yml` (the active target)
- For each model, it runs a DDL statement based on materialization:
  - `view` → `CREATE OR REPLACE VIEW ...`
  - `table` → `CREATE OR REPLACE TABLE ... AS (SELECT ...)`
  - `incremental` → `MERGE INTO ... USING (SELECT ...) ON ...` (on subsequent runs)
  - `ephemeral` → no DDL; inlined as a CTE into the next model
- Models execute in DAG order; independent branches run in parallel (controlled by `threads` in `profiles.yml`)

#### Phase 5 — Report
- dbt prints a summary: model name, status, row count, execution time
- Exit code 0 = success, non-zero = at least one model or test failed

#### The Full Command Lifecycle

| Command | Phases executed | What it skips |
|---|---|---|
| `dbt compile` | Parse → Resolve → Compile | Execute, Report |
| `dbt run` | All 5 phases | Tests |
| `dbt test` | Parse → Resolve → Compile → Execute tests → Report | Model DDL |
| `dbt build` | All phases, models + tests together | Nothing |
| `dbt docs generate` | Parse → Resolve → writes `catalog.json` + `manifest.json` | SQL execution |

#### Key Mental Model: `target/manifest.json`

After any `dbt run` or `dbt build`, dbt writes `target/manifest.json` — a complete snapshot of the project graph including every model, test, source, macro, and their relationships. CI uses this file for `state:modified+` selection (covered in Module 13). Never delete it from CI artifacts.

**Hands-on exercise:** Run `dbt compile --select +fct_prescription` and read the compiled SQL for a Silver model. Find where `ref()` was resolved to a fully-qualified Snowflake path. Find where a macro was expanded.

---

### Module 4 — Sources and the Medallion Architecture
**Estimated time: 1 hour**

- `sources.yml`: declaring raw tables, schemas, and databases
- Source freshness: `loaded_at_field`, `dbt source freshness`
- How our Bronze / Silver / Gold layers map to dbt concepts
  - Bronze: append-only raw ingestion, no dbt transformation
  - Staging (views): light renaming and type casting on top of Bronze
  - Silver: business entities — `dim_*`, `fct_*`, full tests and docs required
  - Gold: consumption-ready marts for Power BI — `mrt_*`
- Naming conventions in practice (`_key` vs. `_id`, `_at` vs. `_date`, grain statements)

**Key takeaway:** Never write directly to Bronze from dbt. Bronze is owned by the ingestion layer (Lambda / HubSpot API). dbt starts at staging.

---

### Module 5 — Testing Data Quality
**Estimated time: 1.5 hours**

- Built-in generic tests: `unique`, `not_null`, `accepted_values`, `relationships`
- Writing tests in `schema.yml` — the YAML structure
- Running tests: `dbt test`, `dbt build` (run + test in one command)
- Test severity: `warn` vs. `error` — when to use each
- Source tests: freshness checks, not-null on raw columns
- Where to place tests: Bronze (optional) → Staging (optional) → **Silver (required)** → **Gold (required)**

**Mandatory:** Silver and Gold models **must** have `unique` + `not_null` on all `_key` columns, and `relationships` tests for all foreign keys. CI fails without them.

**Hands-on exercise:** Add tests to a staging and a Silver model. Intentionally break a `not_null` test and inspect the failure output.

---

### Module 6 — Documentation
**Estimated time: 45 minutes**

- `description` fields in `schema.yml` — model and column level
- Grain statements: what they are and how to write them
- `dbt docs generate` + `dbt docs serve` — the documentation site
- `persist_docs` in `dbt_project.yml` — pushing descriptions to Snowflake column comments
- `doc()` blocks in `.md` files — reusable descriptions

**Mandatory:** Silver and Gold models require a grain statement in the model description and descriptions on every column. CI will fail without them.

---

## Tier 2 — Working Effectively 🟡

### Module 7 — Materializations in Depth
**Estimated time: 1.5 hours**

- `view`: when to use (staging, low-volume)
- `table`: when to use (complex Silver models, dimensions)
- `ephemeral`: CTEs compiled inline — pros and cons
- `incremental`: the core pattern
  - `is_incremental()` macro
  - `unique_key` — why it matters
  - Incremental strategies: `merge` (our standard), `append`, `delete+insert`
  - `incremental_predicates` for large Snowflake tables
  - When to use `--full-refresh` and why it's dangerous in production
- Config blocks in models vs. `dbt_project.yml`

**In practice:** Bronze uses append-only (no dbt). Silver fact tables like `fct_prescription` typically use `merge` incremental. Silver dimensions are usually `table` materialization with SCD2 handled via our custom `scd2_merge` macro (covered in Module 12).

---

### Module 8 — Seeds and Variables
**Estimated time: 45 minutes**

- Seeds: version-controlled CSV lookup tables (`dbt seed`)
- When to use seeds vs. a source vs. a dim table (mapping tables, static configs)
- Variables: `{{ var() }}` in models and configs
- Passing variables at runtime: `dbt run --vars '{"start_date": "2024-01-01"}'`
- Variables in `dbt_project.yml` for defaults

---

### Module 9 — Jinja and Macros (Practical Introduction)
**Estimated time: 1.5 hours**

- What Jinja is: templating language inside SQL
- Core Jinja syntax: `{{ }}` (expressions), `{% %}` (statements), `{# #}` (comments)
- Common built-in variables: `{{ this }}`, `{{ target }}`, `{{ model }}`
- Writing a simple macro: parameterized SQL logic, `{{ macro_name(args) }}`
- When to use macros vs. CTEs vs. ephemeral models — the right tool matters
  - Good use: small repeated transformations (e.g., `generate_surrogate_key`, `safe_div`)
  - Avoid: encoding full business logic in Jinja — it hurts readability and testability
- Hooks: `pre-hook` and `post-hook` (e.g., `ALTER TABLE ... ADD PRIMARY KEY`)
- Packages: `dbt_utils`, `dbt-expectations` — install via `packages.yml`

**In practice:** We use `dbt_utils.generate_surrogate_key` for hash keys. Surrogate key computation happens in the source CTE of each model, not inside a shared macro — this keeps surrogate keys stable across full refreshes.

---

### Module 10 — Slowly Changing Dimensions and Snapshots
**Estimated time: 1.5 hours**

- What SCD Type 2 is and why it matters for HubSpot pipeline data
- dbt native snapshots: `check` strategy vs. `timestamp` strategy
- Snapshot metadata columns: `dbt_valid_from`, `dbt_valid_to`, `dbt_scd_id`
- **Why we use a custom `scd2_merge` macro instead of snapshots**
  - Surrogate key stability during full refreshes — snapshots regenerate `dbt_scd_id`
  - More control over hash key computation
  - Hash keys computed in the source CTE of each model for reuse across `dim_pipelines` and `dim_pipeline_stages`
- Reading the `scd2_merge` macro: understanding what it generates

**Key takeaway:** Know how native snapshots work so you can evaluate the tradeoff. The custom macro exists because native snapshots didn't meet our surrogate key stability requirements.

---

### Module 11 — Selectors, Tags, and Running Subsets
**Estimated time: 45 minutes**

- The node selection syntax: `--select`, `--exclude`
- Selecting by model name, directory, tag, source, result state
- Graph operators: `+model` (upstream), `model+` (downstream), `+model+` (both)
- Tags in `dbt_project.yml` and model config blocks
- `dbt build` vs. `dbt run` vs. `dbt test` — when to use which
- `result:error` — rerunning only failed models

**Practical use:** Running only the Silver layer: `dbt run --select silver.*`. Running a model and all its dependencies: `dbt run --select +fct_prescription`.

---

## Tier 3 — Production and Advanced Patterns 🔴

### Module 12 — CI/CD and Slim CI
**Estimated time: 1.5 hours**

- What CI/CD means in a dbt context
- Your CI/CD pipeline: what runs on PR vs. on merge to main
- Slim CI: running only changed models and their downstream dependencies
  - `dbt build --select state:modified+`
  - Requires a `manifest.json` from the previous production run
- Automated dbt docs deployment to S3 on merge
- Environment variables in CI: Snowflake credentials, target environments
- Failing a PR if tests fail — protecting production

**In practice:** CI fails if Silver/Gold models are missing descriptions, grain statements, or column-level docs. dbt's built-in compile validation combined with our schema YAML requirements enforces this.

---

### Module 13 — Advanced Testing Patterns
**Estimated time: 1 hour**

- `store_failures: true` — persist failed rows to Snowflake for debugging
- Custom singular tests: one-off SQL test files in `tests/`
- Custom generic tests: reusable parameterized tests as macros
- `dbt-expectations` package: row count comparisons, column type assertions, regex checks
- Unit testing (dbt 1.8+): mocking upstream models for isolated model testing
- Monitoring test results in Snowsight dashboards

---

### Module 14 — Incremental Patterns for Large Tables
**Estimated time: 1 hour**

- Incremental predicates: adding extra WHERE conditions to limit merge scan on large Snowflake tables
- Handling late-arriving data: lookback windows in `is_incremental()` filters
- The `--full-refresh` flag: when it's safe, when it's dangerous, and how to protect against accidental runs
- Debugging incremental models: the compiled SQL approach
- `daily_metrics_raw` case study: the reopened-ticket bug and the fix (replacing `first_closed_date` logic with a direct join to `dim_pipeline_stage` on `stage_is_closed = false`)

---

### Module 15 — Custom Macros and the `scd2_merge` Deep Dive
**Estimated time: 1.5 hours**

- Advanced Jinja: loops, conditionals, `set`, `do`, `namespace`
- Writing a generic utility macro: dispatch, adapter-specific overrides
- Operations: `dbt run-operation` for one-off scripts
- Analysing the `scd2_merge` macro: how it generates the MERGE statement, where hash keys are injected, why the source CTE pattern was chosen
- When to build a custom macro vs. using a package vs. restructuring into a model

---

### Module 16 — Governance, Contracts, and Access
**Estimated time: 1 hour**

- Model contracts (dbt 1.5+): enforcing column names and data types at compile time
- Model access levels: `public`, `protected`, `private` — controlling cross-project references
- Model versions: managing breaking changes to shared models
- Snowflake PK/FK constraints as metadata (not enforced, but used by Power BI and Cortex AI)
- The go-live checklist: what must be in place before a model hits production

---

## Recommended Learning Path

| Role | Recommended modules |
|---|---|
| New to dbt | 1 → 2 → 3 → 4 → 5 → 6 |
| Can write SQL, new to dbt patterns | 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 |
| Building production models | All Tier 1 + Tier 2 |
| Maintaining pipelines, CI, macros | All modules |

---

## What Is Deliberately Excluded

These topics were considered and cut to keep the course focused:

| Topic | Reason excluded |
|---|---|
| dbt Cloud IDE | We use dbt Core, not Cloud |
| dbt Semantic Layer / MetricFlow | Cloud-only; not in our stack |
| Python models | Not in our stack |
| Dagster orchestration | We use a separate orchestrator |
| Deep adapter internals | Snowflake-specific — handle in separate Snowflake training |

---

## Reference Resources

- [dbt official docs](https://docs.getdbt.com)
- [dbt Labs free courses](https://www.getdbt.com/dbt-learn)
- Internal: `conventions` skill — naming rules, layer responsibilities
- Internal: `dbt-sql-reviewer` skill — pre-merge checklist
- Internal: `dbt-test-strategy` skill — when and where to test
- Internal: `references/go_live_checklist.md` — required before every PR to production
