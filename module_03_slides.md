---
theme: default
background: '#f9f8f5'
title: 'Module 03 — Jinja Basics for dbt'
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
    🟢 Beginner · Module 03 · 75 min
  </div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    Jinja Basics<br>for dbt
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    The templating layer between your SQL and Snowflake. Just enough to read and write any standard dbt model with confidence.
  </p>
</div>

<!--
Recap prep questions from Module 02 — cold, no notes:
1. Where does profiles.yml live — inside the repo or outside? Why?
2. What does dbt build do that dbt run does not?
3. At which phase does a Jinja syntax error appear?
4. Where can you find the compiled SQL dbt sent to Snowflake?

Phase 1 (Parse) — this connects directly to today's content.
-->

---

# What Jinja Is and How dbt Uses It

<div class="grid grid-cols-2 gap-10 mt-4">
<div>

**dbt models are templates, not plain SQL**

```
your .sql file
      │
      ▼
 Jinja engine    ← dbt processes here
      │
      ▼
 plain SQL       ← what Snowflake receives
      │
      ▼
   Snowflake
```

The Jinja syntax **never reaches Snowflake**. What Snowflake receives is always plain SQL.

</div>
<div class="flex flex-col gap-3 mt-2">

<div class="bg-white border border-slate-200 rounded-lg p-4">
  <div class="font-mono text-xs text-slate-400 mb-2">Your model</div>

```sql
SELECT *
FROM {{ ref('dim_patient') }}
```

</div>

<div class="text-slate-400 text-center text-xl">↓ dbt compiles</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
  <div class="font-mono text-xs text-emerald-600 mb-2">What Snowflake receives</div>

```sql
SELECT *
FROM BLOOMWELL.SILVER.dim_patient
```

</div>

<div class="text-xs text-slate-400 mt-2">View the compiled output anytime at <code>target/compiled/</code></div>

</div>
</div>

<!--
The key mental model shift: dbt models are not SQL files. They are SQL template files. This reframe explains why you can use {{ ref() }} — it's just a template placeholder that gets resolved before Snowflake sees anything.

This also explains why Jinja errors appear at the Parse phase (Module 02) — dbt processes the template before it even tries to talk to Snowflake.
-->

---

# The Three Delimiter Types

<div class="mt-4 space-y-4">

<div class="bg-white border border-slate-200 rounded-xl p-5">
  <div class="flex items-center gap-3 mb-2">
    <code class="bg-slate-100 px-2 py-1 rounded font-mono text-sm">{{ }}</code>
    <span class="font-semibold text-slate-700">Expression — outputs a value</span>
  </div>
  <div class="font-mono text-sm text-slate-600">{{ ref('dim_patient') }} → resolves to the table name</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-5">
  <div class="flex items-center gap-3 mb-2">
    <code class="bg-slate-100 px-2 py-1 rounded font-mono text-sm">{% %}</code>
    <span class="font-semibold text-slate-700">Statement — logic, produces no output</span>
  </div>
  <div class="font-mono text-sm text-slate-600">{% if is_incremental() %} ... {% endif %}</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-5">
  <div class="flex items-center gap-3 mb-2">
    <code class="bg-slate-100 px-2 py-1 rounded font-mono text-sm">{# #}</code>
    <span class="font-semibold text-slate-700">Comment — ignored entirely</span>
  </div>
  <div class="font-mono text-sm text-slate-600">{# TODO: add grain doc #}</div>
</div>

</div>

<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
  <strong>Most common beginner mistake:</strong> using <code>{{ if ... }}</code> instead of <code>{% if ... %}</code>. The <code>{{ }}</code> version outputs text — it does not execute logic.
</div>

<!--
Write each example live in VS Code. Then deliberately use {{ if }} instead of {% if %} and show what dbt does — it will either error or output the literal text of the condition into the SQL.

Ask: "When would you use {% %} instead of {{ }}?" → When you want logic (if/for/set) without output. {{ }} is for values you want to appear in the SQL.

This distinction trips up almost everyone once. Better to make the mistake in class than in a PR.
-->

---

# The Four dbt Jinja Functions You Need

<div class="grid grid-cols-2 gap-6 mt-4">
<div class="space-y-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">ref()</div>

```sql
-- References another dbt model
FROM {{ ref('dim_patient') }}

-- Dev compiles to:
-- BLOOMWELL_DEV.TESTING__dev_thorsten.dim_patient

-- Prod compiles to:
-- BLOOMWELL.SILVER.dim_patient
```

<div class="text-xs text-slate-500 mt-2">Adds dependency to DAG. Never hardcode table names.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">source()</div>

```sql
-- References a Bronze source table
FROM {{ source('hubspot', 'contacts') }}

-- Compiles to:
-- BLOOMWELL.BRONZE.HUBSPOT.contacts
```

<div class="text-xs text-slate-500 mt-2">Requires declaration in sources.yml. Covered in Module 05.</div>
</div>

</div>
<div class="space-y-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">config()</div>

```sql
{{ config(
    materialized = 'incremental',
    unique_key   = 'contact_key',
    on_schema_change = 'sync_all_columns'
) }}
```

<div class="text-xs text-slate-500 mt-2">Overrides dbt_project.yml for this model only.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">var()</div>

```sql
WHERE created_at >= '{{ var("start_date") }}'
```

```bash
# Pass at runtime:
dbt run --vars '{"start_date": "2024-01-01"}'
```

<div class="text-xs text-slate-500 mt-2">For runtime values and feature flags.</div>
</div>

</div>
</div>

<!--
These are the only four they need to get through the entire Beginner tier. Macros come in Intermediate.

Emphasise ref() most heavily — it's used in every single model. The environment-awareness (dev vs prod schema) is the reason it exists. A hardcoded table name always points to prod — ref() respects your target.

Checkpoint: "What does {{ ref('dim_patient') }} compile to in your dev environment?" → BLOOMWELL_DEV.TESTING__dev_thorsten.dim_patient
-->

---

# `{{ this }}` and `{% if is_incremental() %}`

<div class="mt-4">

```sql {all|5-7|all}
{{ config(
    materialized = 'incremental',
    unique_key   = 'contact_key'
) }}

SELECT contact_key, email, updated_at
FROM {{ ref('stg_hubspot__contacts') }}

{% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

</div>

<div class="grid grid-cols-2 gap-6 mt-4">
<div class="bg-white border border-slate-200 rounded-lg p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-2">First run</div>
  <div class="text-slate-500"><code>is_incremental()</code> returns <code>False</code>. The <code>WHERE</code> clause is skipped. Full table load.</div>
</div>
<div class="bg-white border border-slate-200 rounded-lg p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-2">Subsequent runs</div>
  <div class="text-slate-500"><code>is_incremental()</code> returns <code>True</code>. Only rows newer than <code>MAX(updated_at)</code> are selected.</div>
</div>
</div>

<div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
  <code>{{ this }}</code> refers to the table this model materialises to. Used almost exclusively inside <code>{% if is_incremental() %}</code> blocks.
</div>

<!--
Use the line highlight to draw attention to the WHERE clause — specifically the combination of {% if %} (statement) and {{ this }} (expression) working together.

This is the first time they see is_incremental() — don't go deep into incremental strategy here. That's Module 04. The goal here is: recognize the Jinja pattern and understand why {% %} is used for the if block and {{ }} is used for this.

After the slide, ask: "What does {{ this }} refer to?" → The table this model materialises to.
-->

---

# Exercise: Read and Write (20 min)

<div class="grid grid-cols-2 gap-6 mt-4">
<div>

**Task 1 — Predict compiled output (prod target)**

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

What SQL does Snowflake receive?

</div>
<div>

**Task 2 — Write from scratch**

Write `stg_hubspot__deals.sql` that:

- References `hubspot` source, `deals` table
- Selects: `deal_id`, `deal_name`, `pipeline_id`, `close_date`
- Renames `close_date` → `expected_close_date`
- Materialised as a `view`

<div class="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
  After writing: run <code>dbt compile --select stg_hubspot__deals</code> and verify the output in <code>target/compiled/</code>
</div>

</div>
</div>

<!--
Task 1 expected answer:
CREATE OR REPLACE TABLE BLOOMWELL.SILVER.your_model AS
SELECT c.contact_id, c.email, p.pipeline_name
FROM BLOOMWELL.BRONZE.HUBSPOT.contacts c
LEFT JOIN BLOOMWELL.SILVER.dim_pipeline p ON c.pipeline_id = p.hubspot_pipeline_id

Most common errors to watch for:
- Using {{ }} for if blocks
- Forgetting to add {{ config(materialized='view') }} for Task 2
- Using a hardcoded table name instead of source() or ref()

Running dbt compile is the verification step — participants can self-check without needing the trainer.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 03 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 04</h2>
  <p class="text-slate-500 mb-8">Materializations</p>
  <div class="space-y-2 text-left max-w-md mx-auto">
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q1: What does {{ ref('dim_patient') }} compile to in dev?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q2: Difference between {{ }} and {% %}?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: When use {{ config() }} over dbt_project.yml?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q4: What does {{ this }} refer to?</div>
  </div>
</div>
