---
theme: default
background: '#f9f8f5'
title: 'Module 05 — Sources and the Medallion Architecture'
highlighter: shiki
lineNumbers: false
transition: slide-left
fonts:
  sans: 'DM Sans'
  mono: 'JetBrains Mono'
---

<div class="h-full flex flex-col justify-center pl-2">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">Bloomwell Data & Analytics · dbt Training</div>
  <div class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono px-3 py-1 rounded-full w-fit mb-6">
    🟢 Beginner · Module 05 · 90 min
  </div>
  <h1 class="text-5xl font-bold text-slate-900 leading-[1.1] mb-6">
    Sources and the<br>Medallion Architecture
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    How dbt knows about Bronze tables, why layer boundaries matter, and how source freshness protects your pipelines.
  </p>
</div>

<!--
Recap prep questions from Module 04 — cold, no notes:
1. What SQL statement does a table materialization generate? → DROP + CREATE TABLE AS SELECT
2. What does is_incremental() return on the first run? → False
3. Mandatory on_schema_change setting at Bloomwell? → sync_all_columns
4. Why never use table for a staging model? → No business logic, no storage needed, view is cheaper and sufficient

All four correct before continuing.
-->

---

# The Bloomwell Medallion Architecture

<div class="mt-4 space-y-2">

<div class="bg-slate-800 text-white rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-1">SOURCE SYSTEMS</div>
  <div class="text-sm">HubSpot · Shopify · External APIs</div>
</div>

<div class="text-center text-slate-400 text-sm">↓ AWS Lambda (ingestion)</div>

<div class="bg-slate-100 border-2 border-slate-300 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-500 mb-1">BRONZE — <code>BRONZE.{source}.{table}</code></div>
  <div class="text-sm text-slate-600">Raw data. Append-only. Never modified. <strong>Lambda owns this. dbt does NOT touch Bronze.</strong></div>
</div>

<div class="text-center text-emerald-600 text-sm font-semibold">↓ dbt takes over here</div>

<div class="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
  <div class="text-xs font-mono text-emerald-600 mb-1">STAGING → SILVER → GOLD</div>
  <div class="text-sm text-emerald-700">Staging: views, rename/cast · Silver: dim_*, fct_* · Gold: mrt_* → Power BI</div>
</div>

</div>

<div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
  dbt references Bronze as a <strong>source</strong>, not via <code>ref()</code>. Bronze tables are never built by dbt.
</div>

<!--
Draw this on the whiteboard — don't just show the slide. The physical act of drawing the layers helps people remember the ownership boundaries.

The critical point: dbt starts at Staging. It references Bronze as a source (declared in sources.yml). The line "dbt takes over here" is not just organizational — it determines which Jinja function you use (source() vs ref()).

This architecture is also why we have freshness checks: if Lambda stops running, Bronze goes stale. dbt can detect this via source freshness before wasting compute building Silver on outdated data.

Ask: "Who writes to the Bronze layer?" → Lambda / ingestion layer. Not dbt. Never dbt.
-->

---

# Layer Ownership Rules

<div class="mt-4">

| Layer | Written by | Read by | dbt owns? |
|---|---|---|---|
| Bronze | Lambda / ingestion | dbt Staging | ❌ No |
| Staging | dbt | dbt Silver | ✅ Yes |
| Silver | dbt | dbt Gold, ad hoc analysis | ✅ Yes |
| Gold | dbt | Power BI, business users | ✅ Yes |

</div>

<div class="mt-6 grid grid-cols-2 gap-4">
<div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-mono text-slate-400 text-xs mb-2">When referencing Bronze in a staging model</div>
  <code class="text-emerald-600">{{ source('hubspot', 'contacts') }}</code>
  <div class="text-slate-500 text-xs mt-1">Declares a dependency on the source → DAG tracks it</div>
</div>
<div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-mono text-slate-400 text-xs mb-2">When referencing any other dbt model</div>
  <code class="text-emerald-600">{{ ref('dim_patient') }}</code>
  <div class="text-slate-500 text-xs mt-1">Resolves to correct schema per target environment</div>
</div>
</div>

<!--
The source() vs ref() distinction is not just syntax — it's semantic. source() says "this data comes from outside dbt." ref() says "this data was built by dbt." The DAG reflects this distinction.

If someone hardcodes BLOOMWELL.BRONZE.HUBSPOT.contacts instead of using source(), dbt has no idea that model depends on that Bronze table. The lineage graph is incomplete. Source freshness won't work for that model.
-->

---

# Declaring Sources in `sources.yml`

```yaml {all|1-7|9-16|18-20|all}
version: 2

sources:
  - name: hubspot                         # alias used in {{ source() }}
    database: BLOOMWELL
    schema: BRONZE.HUBSPOT
    description: "HubSpot CRM data ingested via AWS Lambda."

    tables:
      - name: contacts
        description: "One row per HubSpot contact. Append-only."
        loaded_at_field: _ingested_at     # column dbt uses for freshness

      - name: deals
        description: "HubSpot deal records including pipeline stage history."
        loaded_at_field: _ingested_at

      - name: pipeline_stages
        description: "Static lookup: pipeline stage definitions."
        # no loaded_at_field — static table, skip freshness
```

<!--
Use line highlights: first show the source-level config (name, database, schema), then the table declarations, then the pipeline_stages table without a loaded_at_field.

Without this file, {{ source('hubspot', 'contacts') }} fails at the Parse phase — dbt can't resolve the source.

The loaded_at_field is the column dbt queries to check freshness: SELECT MAX(_ingested_at) FROM BLOOMWELL.BRONZE.HUBSPOT.contacts. If the MAX is older than your error threshold, the freshness check fails.

Static tables like pipeline_stages don't need freshness — they change infrequently and deliberately. Opting out with freshness: null prevents false alerts.
-->

---

# `{{ source() }}` vs Hardcoding

<div class="grid grid-cols-2 gap-6 mt-4">
<div>

**❌ Hardcoded — never do this**

```sql
SELECT *
FROM BLOOMWELL.BRONZE.HUBSPOT.contacts
```

<div class="mt-3 space-y-2 text-sm">
  <div class="flex gap-2 text-red-600"><span>✗</span> Does not appear in the DAG</div>
  <div class="flex gap-2 text-red-600"><span>✗</span> Freshness check doesn't work</div>
  <div class="flex gap-2 text-red-600"><span>✗</span> Always points to prod — ignores your dev target</div>
  <div class="flex gap-2 text-red-600"><span>✗</span> Schema change requires updating every model</div>
</div>

</div>
<div>

**✅ With `source()` — always do this**

```sql
SELECT *
FROM {{ source('hubspot', 'contacts') }}
```

<div class="mt-3 space-y-2 text-sm">
  <div class="flex gap-2 text-emerald-600"><span>✓</span> Appears in DAG with lineage</div>
  <div class="flex gap-2 text-emerald-600"><span>✓</span> Freshness check works</div>
  <div class="flex gap-2 text-emerald-600"><span>✓</span> Resolves to correct schema per target</div>
  <div class="flex gap-2 text-emerald-600"><span>✓</span> Schema change: update sources.yml once</div>
</div>

</div>
</div>

<div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
  Both produce the same compiled SQL in practice — but they're not equivalent. You lose DAG visibility, freshness, and environment-awareness with hardcoding.
</div>

<!--
The "both produce the same SQL" point is important to acknowledge — participants may notice the compiled output looks identical. The difference is metadata and tooling, not the SQL that runs.

Checkpoint: "Name two things you lose by hardcoding instead of using source()." → Any two of: DAG lineage, freshness checks, environment-awareness, single-point schema update.
-->

---

# Source Freshness

```yaml
sources:
  - name: hubspot
    freshness:
      warn_after:  {count: 6,  period: hour}
      error_after: {count: 24, period: hour}

    tables:
      - name: contacts
        loaded_at_field: _ingested_at

      - name: pipeline_stages
        freshness: null          # static table — opt out
```

```bash
dbt source freshness
```

```
Found 1 source, 2 tables.
contacts: 3 hours 42 minutes ago — PASS
deals:    26 hours 15 minutes ago — ERROR
```

<div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
  <strong>In Airflow:</strong> Freshness check runs before any dbt models. If a source errors, the pipeline stops — preventing Silver and Gold from being built on stale Bronze data.
</div>

<!--
Run dbt source freshness live. Show the output. The timestamp comparison is simple: dbt queries MAX(_ingested_at) and compares it to now(). If the age exceeds the threshold, it warns or errors.

The Airflow integration is important context: freshness checks are not just informational. They gate the pipeline. If HubSpot stops sending data and freshness is set correctly, the pipeline stops before building bad downstream models.

Ask: "What does dbt do if a source is stale and freshness is set to error?" → The dbt source freshness command exits with a non-zero code, which Airflow treats as a failure, and downstream tasks don't run.
-->

---

# Exercise: Add a New Source (25 min)

**Scenario:** Adding the HubSpot `owners` table — `BLOOMWELL.BRONZE.HUBSPOT.owners`. Updated every 12 hours. Has a `_ingested_at` column.

<div class="space-y-4 mt-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">Step 1 — Add to sources.yml</div>
  <div class="text-sm text-slate-600">Add the <code>owners</code> table with freshness thresholds: warn at 14h, error at 25h.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">Step 2 — Write the staging model</div>
  <div class="text-sm text-slate-600">Create <code>stg_hubspot__owners.sql</code>: reference source correctly, select <code>owner_id</code>, <code>first_name</code>, <code>last_name</code>, <code>email</code>, rename <code>_ingested_at</code> → <code>ingested_at</code>, materialise as view.</div>
</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
  <div class="text-xs font-mono text-emerald-600 mb-2">Step 3 — Verify</div>
  <div class="text-sm text-emerald-700">Run <code>dbt compile --select stg_hubspot__owners</code>. Verify the compiled output references <code>BLOOMWELL.BRONZE.HUBSPOT.owners</code>.</div>
</div>

</div>

<!--
Circulate. Most common mistakes:
- Missing sources.yml declaration (dbt will error: source not found)
- Hardcoded table name instead of source()
- Wrong Jinja delimiter on if blocks (less likely here since no if blocks, but watch for {{ source }} instead of {{ source() }})
- Forgetting {{ config(materialized='view') }} — will inherit from dbt_project.yml but good practice to be explicit in staging models

dbt compile is the verification step — they can self-check. If compile succeeds, the source reference is correct.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 05 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 06</h2>
  <p class="text-slate-500 mb-8">Testing Data Quality</p>
  <div class="space-y-2 text-left max-w-md mx-auto">
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q1: What must exist before using {{ source('hubspot', 'contacts') }}?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q2: Two things lost by hardcoding vs source()?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: What column does dbt query for freshness?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q4: Why does dbt NOT own the Bronze layer?</div>
  </div>
</div>
