---
name: dbt-project-checklist
description: >
  Use when starting a new dbt project on the Bloomwell Snowflake stack, adding a new
  dim/fact/bronze model, or checking what has been missed mid-build. Auto-triggers on:
  "new dbt project", "scaffold", "set up dbt", "add a dim", "add a fact", "add a bronze",
  "missing from my project", "what am I forgetting", "project setup", "env routing",
  "sentinel row", "ghost row", "coalesce_fk_str", "audit macro", "on-run-end",
  "store_failures", "transient", "target_db", "generate_database_name",
  "generate_schema_name". Also invoke explicitly as /dbt-project-checklist.
user-invocable: true
---

# dbt Project Checklist — Bloomwell Snowflake Stack

Single entry point for all dbt work on Bloomwell projects. Use the Skill Map below to
find the right skill for the situation, then use the phase checklists to avoid missing
non-obvious Bloomwell-specific wiring.

> **Deep-dive reference:** `references/bloomwell-infra.md` — full macro code, YAML
> snippets, and per-item configuration for all 25 checklist items.

---

## Skill Map

| Situation | Skill to invoke |
|---|---|
| Starting a new dbt project | This skill — Setup phase below |
| Adding a new dim, fact, or bronze model | This skill — Per-model phase below |
| Pre-PR check before merging | `dbt-sql-reviewer` |
| Naming a table, column, or schema | `bloomwell-conventions` |
| SQL style, CTE structure, model patterns | `bloomwell-conventions` → `references/sql_style_guide.md` |
| Where and how many tests to add | `dbt-test-strategy` |
| Designing dims, facts, SCDs, grain | `dimensional-modeling` |
| Running dbt commands (build, test, compile) | `dbt-agents-running-dbt-commands` |
| Building or modifying models interactively | `dbt-agents-using-dbt-for-analytics-engineering` |
| dbt Cloud job failed | `dbt-agents-troubleshooting-dbt-job-errors` |
| Documenting a model or pipeline | `analytics-code-documentation` |

---

## 🏗️ Setup Phase — Run once at project init

Wire infrastructure before writing a single model. Missing any of these causes silent
environment routing failures or broken audit trails.

| # | Item | What it does | Done? |
|---|---|---|---|
| 1 | `target_db()` macro | Central env resolver — `SILVER` vs `SILVER_DEV` | ☐ |
| 2 | `generate_database_name` macro | Routes models to correct Snowflake DB per target | ☐ |
| 3 | `generate_schema_name` macro | Uses custom schema verbatim — no `target.schema` prefix | ☐ |
| 4 | `dbt_project.yml` layer routing | `+database` / `+schema` per layer folder | ☐ |
| 5 | `persist_docs` | Pushes descriptions into Snowflake object comments | ☐ |
| 6 | `store_failures` + failures schema | Persists test failure rows to `REFERENCE` schema | ☐ |
| 7 | `+severity: warn` global | Test failures log but don't abort runs | ☐ |
| 9 | `on-run-end` audit macro | Appends pipeline health snapshot to 5 audit tables | ☐ |
| 10 | `vars` block | Centralises SLA hours, sentinel keys, threshold dates | ☐ |
| 14 | `packages.yml` — pinned | `dbt_utils` + `dbt_expectations` pinned to exact versions | ☐ |
| 15 | `transient: false` | Permanent tables with full Time Travel on Bronze/Silver/Gold | ☐ |
| 20 | `profiles.yml` dev/prod | `target: dev` default, prod has 8 threads | ☐ |
| 21 | `+tags` per layer | Enables `--select tag:prod` / `--exclude tag:dev` | ☐ |

**Critical gotchas:**
- Items 1+2+3 must all exist — missing any one breaks env routing silently
- Item 15 (`transient: false`) is easy to forget and loses Snowflake Time Travel
- Item 6 failures schema name must match what the audit macro (item 9) expects

---

## 🔁 Per-model Phase — Run for every new dim, fact, or bronze model

Check these items each time you add a model. Most PR review findings trace back to
something on this list.

| # | Item | Applies to | Done? |
|---|---|---|---|
| 8 | PK/FK `post_hook` constraints | Every Silver/Gold dim + fact | ☐ |
| 10 | `vars` — add new sentinel key | Every new surrogate-key dim | ☐ |
| 17 | Grain statement + all column docs | Every Silver + Gold model (CI gate) | ☐ |
| 22 | Sentinel row (`-1` / `'n.a.'`) | Every `dim_` table | ☐ |
| 23 | Ghost row pattern (`int_dim_*`) | Every `dim_` with deleted source rows in facts | ☐ |
| 24 | `coalesce_fk_str` macro | Every bronze model with VARCHAR FK columns | ☐ |
| 25 | `relationships` test + `where` filter | Every FK column in schema YAML | ☐ |

**For naming, prefixes, and column conventions → `bloomwell-conventions`**
**For test placement and severity decisions → `dbt-test-strategy`**

---

## 📈 As-you-go Phase — Add progressively as the project matures

Don't front-load these. Add when the project is stable enough for each to be useful.

| # | Item | When to add |
|---|---|---|
| 11 | Seeds in `REFERENCE.config` | When Lambda needs a config table |
| 12 | Source freshness checks | When ingestion is stable enough to alert on |
| 13 | dbt native unit tests | When you have complex transformation logic to pin |
| 18 | Generic custom tests | After writing the same ad-hoc test 3+ times |
| 19 | Singular assertion tests | When cross-model sanity checks are needed |

---

## Cross-references

- `bloomwell-conventions` — naming charter, schema rules, `_key` vs `_id`, column suffixes, SQL style
- `dbt-test-strategy` — test types, severity matrix, net-new principle, Bronze/Silver/Gold test checklist
- `dbt-sql-reviewer` — full PR review checklist with severity ratings
- `dimensional-modeling` — Kimball rules, fact types, SCD patterns, grain decisions
- `dbt-agents-using-dbt-for-analytics-engineering` — how to build/validate models interactively
- `dbt-agents-running-dbt-commands` — dbt CLI command formatting and executable selection
