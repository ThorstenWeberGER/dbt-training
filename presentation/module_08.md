---
theme: default
background: '#f9f8f5'
title: 'Module 08 — Seeds and Variables'
highlighter: shiki
lineNumbers: false
transition: slide-left
fonts:
  sans: 'DM Sans'
  mono: 'JetBrains Mono'
---

<div class="h-full flex flex-col justify-center pl-2">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">dbt Training</div>
  <div class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono px-3 py-1 rounded-full w-fit mb-6">
    🟡 Working Effectively · Module 08 · 45 min
  </div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    Seeds and Variables
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    Version-controlled lookup tables and runtime-configurable constants — two tools that remove hardcoded values from your SQL.
  </p>
</div>

<!--
Recap prep questions from Module 07 — cold, no notes:
1. How do you add a column description in schema.yml?
2. What does `dbt docs generate` produce and where does it live?
3. What is a `sources.yml` file used for, and what does the `freshness` block do?
4. What command do you run to serve the docs site locally?

Probe question 3 specifically — freshness thresholds connect directly to today's variables content (controlling date ranges in SQL).
-->

---

# The Problem: Hardcoded Lookups in SQL

<div class="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-semibold">
  Three models. Same lookup. Three places to update when a label changes.
</div>

<div class="grid grid-cols-3 gap-4">

<div class="bg-white border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-400 mb-2">mrt_deals_funnel.sql</div>

```sql
SELECT
  deal_id,
  CASE country_code
    WHEN 'DE' THEN 'Germany'
    WHEN 'AT' THEN 'Austria'
    WHEN 'CH' THEN 'Switzerland'
    ELSE 'Other'
  END AS country_name
FROM fct_deal
```

</div>

<div class="bg-white border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-400 mb-2">mrt_contact_prescriptions.sql</div>

```sql
SELECT
  contact_key,
  CASE country_code
    WHEN 'DE' THEN 'Germany'
    WHEN 'AT' THEN 'Austria'
    WHEN 'CH' THEN 'Switzerland'
    ELSE 'Other'
  END AS country_name
FROM dim_contact
```

</div>

<div class="bg-white border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-400 mb-2">mrt_country_summary.sql</div>

```sql
SELECT
  CASE country_code
    WHEN 'DE' THEN 'Germany'
    WHEN 'AT' THEN 'Austria'
    WHEN 'CH' THEN 'Switzerland'
    ELSE 'Other'
  END AS country_name,
  COUNT(*) AS contacts
FROM dim_contact
GROUP BY 1
```

</div>

</div>

<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
  Switzerland expands DACH coverage to include Liechtenstein. <strong>You need to add 'LI' to all three CASE statements.</strong> Miss one → inconsistent country labels in Power BI.
</div>

<!--
This is a maintenance trap that every data team falls into. The first two or three CASE statements seem fine. The fourth and fifth are where things go wrong.

Ask the group: "Has anyone ever fixed a data label in one place and had it still be wrong in a report?" — they almost certainly have.

The seed pattern fixes this entirely: one CSV, one place to update, Git history showing who changed it and when.
-->

---

# Seeds: What They Are

<div class="grid grid-cols-2 gap-8 mt-4">

<div>

**A seed is a CSV file in your `seeds/` folder**

```
dbt_project/
├── seeds/
│   ├── country_codes.csv
│   └── product_categories.csv
├── models/
│   └── ...
```

<div class="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">

`country_codes.csv`:

```
country_code,country_name,region
DE,Germany,DACH
AT,Austria,DACH
CH,Switzerland,DACH
FR,France,Western Europe
```

</div>

</div>

<div class="space-y-3">

<div v-click class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-1">How to load it</div>

```bash
dbt seed
```

  Creates a table in your warehouse from the CSV. Every model can reference it with <code v-pre>{{ ref('country_codes') }}</code>.
</div>

<div v-click class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-1">Why it works</div>
  The CSV lives in Git. Changes go through code review. You can <code>git diff</code> a label change. You can <code>git revert</code> a bad update.
</div>

<div v-click class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
  <div class="font-semibold mb-1">The fix for slide 2</div>
  One row in <code>country_codes.csv</code>. All three models join it. Update once, correct everywhere.
</div>

</div>
</div>

<!--
Seeds feel almost too simple — "it's just a CSV". But the power is in the combination of version control + ref().

Key point: dbt seed creates a REAL TABLE in your warehouse. It's not a view, not an external table, not a CTE. It's a physical table you can query and join.

After the demo they'll see this is a 30-second operation that eliminates hours of hunting down duplicate CASE statements.
-->

---

# Seeds: Two Patterns

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
  <div class="font-semibold text-emerald-800 mb-3">Lookup seeds — production use</div>
  <ul class="text-sm text-slate-700 space-y-2 list-disc list-inside">
    <li>Static reference tables: <code>country_codes</code>, <code>product_categories</code></li>
    <li>Version-controlled in Git, curated by a human</li>
    <li>Available in all medallion layers via <code v-pre>{{ ref() }}</code></li>
    <li>This is what the module teaches</li>
  </ul>
</div>

<div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
  <div class="font-semibold text-slate-700 mb-3">Development seeds — local DuckDB only</div>
  <ul class="text-sm text-slate-600 space-y-2 list-disc list-inside">
    <li>Files like <code>raw_contacts.csv</code>, <code>raw_deals.csv</code></li>
    <li>Simulate the Bronze layer so exercises work without Snowflake</li>
    <li>In production, these are Lambda-ingested Bronze tables — not seeds</li>
    <li>Scaffolding only — this pattern does not go to production</li>
  </ul>
</div>

</div>

<!--
This distinction trips up trainees in the exercise project. They see raw_contacts.csv and assume all CSVs in seeds/ are the same thing. They are not.

The development seeds exist purely so the exercise compiles locally in DuckDB. The lookup seeds (country_codes, product_categories) are the actual pattern worth learning and replicating in production.

Point out: "When you join country_codes in your Gold mart, that's a lookup seed. When dbt seed loads raw_deals.csv, that's just us faking a Lambda pipeline locally."
-->

---

# Seeds: When to Use Them

<div class="mt-4">

| Situation | Use... | Because... |
|---|---|---|
| Static lookup data you curate manually (country codes, status labels, category mappings) | **seed** | Version-controlled, small, changes only when you decide |
| Raw data loaded by an external pipeline (HubSpot contacts, deals, prescriptions) | **source** | A pipeline owns it — you observe it, you don't manage it |
| A dimension that derives from source data with transformation logic | **dim table** | dbt builds it from raw source data, not from a spreadsheet |
| Large reference data produced by a pipeline (e.g. product catalogue from ERP API) | **source → staging → dim** | Even "reference data" is a source if a pipeline populates it |

</div>

<div class="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
  <div class="font-semibold text-amber-800 mb-2">The key question</div>
  <div class="grid grid-cols-2 gap-4 text-sm">
    <div class="bg-white rounded-lg p-3 border border-amber-200">
      <div class="font-semibold text-emerald-700 mb-1">Human curated?</div>
      <div class="text-slate-600">A person maintains a spreadsheet or decides the values → <strong>seed</strong></div>
    </div>
    <div class="bg-white rounded-lg p-3 border border-amber-200">
      <div class="font-semibold text-red-600 mb-1">Pipeline produced?</div>
      <div class="text-slate-600">A system or API populates it → <strong>source</strong>, not a seed</div>
    </div>
  </div>
</div>

<!--
This decision table is the one they'll actually use in their day-to-day work. The human-vs-pipeline distinction is the reliable heuristic.

Common confusion: "but our product categories come from the ERP, they're pretty stable..." → Stable doesn't mean seed. If a pipeline updates it, it's a source. Seeds are for data where a human decides when it changes and commits the CSV.

Ask: "Would you make `raw_deals` a seed?" → No — HubSpot Lambda populates it. It's a source (or in our DuckDB training setup, a Bronze-equivalent data seed used only for local dev).

Medallion architecture note: Seeds are NOT a medallion layer. They sit alongside Bronze/Silver/Gold — any layer can join to them. They live in their own schema (configured via `+schema: seeds` in dbt_project.yml) and are separate from the medallion tables. A Gold mart that joins country_codes is still a Gold mart; the seed is reference data it uses, not a layer it belongs to.
-->

---

# Seeds Config in `dbt_project.yml`

<div class="grid grid-cols-2 gap-8 mt-4">

<div>

**Basic config**

```yaml
# dbt_project.yml
seeds:
  your_project:
    +schema: seeds
    +tags: ['reference']
    country_codes:
      +column_types:
        country_code: varchar(2)
        country_name: varchar(100)
        region: varchar(100)
```

<div class="mt-4 text-sm text-slate-600 space-y-2">
  <div><code>+schema: seeds</code> — loads to <code>&lt;target&gt;_seeds</code> schema instead of default</div>
  <div><code>+column_types</code> — prevents type inference errors (e.g. code <code>01</code> read as integer <code>1</code>)</div>
</div>

</div>

<div class="space-y-3">

<div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-2">Useful commands</div>

```bash
# Load all seeds
dbt seed

# Load one seed
dbt seed --select country_codes

# Force full reload
dbt seed --full-refresh
```

</div>

<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
  <div class="font-semibold mb-1">Column types matter</div>
  DuckDB and Snowflake infer types from CSV content. A country code of <code>01</code> becomes integer <code>1</code> without an explicit type override. Always define types for code columns.
</div>

</div>
</div>

<!--
The +schema config is worth pointing out — in production, it's common to separate seed tables into their own schema so they don't clutter the staging or silver schemas. In the DuckDB exercise project this isn't strictly necessary but the pattern is worth knowing.

Column types: this is a practical gotcha. Codes that look like numbers (postal codes, product IDs with leading zeros) will be silently cast to integers unless you explicitly override. Lost leading zeros cause silent join failures downstream.

dbt seed --full-refresh: seeds are special — by default dbt seed does a TRUNCATE + INSERT, not an incremental merge. --full-refresh drops and recreates the table entirely. For small lookup tables this is almost always what you want.
-->

---

# Variables: The Problem They Solve

<div class="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-semibold">
  The same date constant in three models. Change the reporting window — edit three files.
</div>

<div class="grid grid-cols-3 gap-4">

<div class="bg-white border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-400 mb-2">fct_deal.sql</div>

```sql
WHERE close_date
    >= '2024-01-01'
```

</div>

<div class="bg-white border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-400 mb-2">fct_prescription.sql</div>

```sql
WHERE prescribed_at
    >= '2024-01-01'
```

</div>

<div class="bg-white border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-400 mb-2">mrt_deals_funnel.sql</div>

```sql
WHERE deal_created_at
    >= '2024-01-01'
```

</div>

</div>

<div class="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
  <div class="font-semibold mb-2">The fix: one variable, one place to override</div>

```sql
WHERE close_date >= '{{ var("start_date", "2024-01-01") }}'
```

  Change the date across all models at runtime: <code>dbt run --vars '{"start_date": "2023-01-01"}'</code>
</div>

<!--
The parallel with seeds is intentional. Seeds = lookup data extracted from SQL. Variables = constants extracted from SQL. Both solve the same underlying problem: hardcoded values that need to change but are scattered across multiple files.

The runtime override is what makes variables powerful for incremental rebuilds. "We need to reprocess all of 2023" becomes a one-line command instead of a code change + deployment.
-->

---

# `{{ var() }}` Syntax

<div class="grid grid-cols-2 gap-8 mt-4">

<div>

**Basic syntax**

```sql
-- No default — fails if var not set
WHERE close_date >= '{{ var("start_date") }}'

-- With default — safe without --vars
WHERE close_date >= '{{ var("start_date", "2024-01-01") }}'
```

<div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
  <strong>Always provide a default</strong> for variables used in production models. A missing <code>--vars</code> flag on a scheduled run breaks your pipeline silently.
</div>

**Runtime override**

```bash
# Single variable
dbt run --select fct_deal \
  --vars '{"start_date": "2023-01-01"}'

# Multiple variables
dbt run --vars \
  '{"start_date": "2023-01-01", "min_deal_amount": 500}'
```

</div>

<div>

**What the compiled SQL looks like**

```bash
dbt compile --select fct_deal \
  --vars '{"start_date": "2023-06-01"}'
```

```sql
-- target/compiled/.../fct_deal.sql
SELECT deal_key, deal_id, amount, close_date
FROM dev.stg_hubspot__deals
WHERE close_date >= '2023-06-01'
--                   ↑ substituted
```

<div class="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
  <div class="font-semibold text-slate-700 mb-1">How dbt resolves the value</div>
  <ol class="list-decimal list-inside space-y-1">
    <li><code>--vars</code> flag (highest priority)</li>
    <li><code>dbt_project.yml vars</code> block</li>
    <li>Default in <code>var("name", "default")</code></li>
  </ol>
</div>

</div>
</div>

<!--
The priority order is the most important thing on this slide. Write it on the whiteboard:
1. --vars (runtime) — wins always
2. dbt_project.yml vars block — project default
3. Second argument to var() — fallback of last resort

Use dbt compile to make the substitution visible. This is the key demo moment — trainees should see that the Jinja {{ var() }} call disappears and the literal value appears in the compiled SQL.
-->

---

# Variables in `dbt_project.yml`

<div class="grid grid-cols-2 gap-8 mt-4">

<div>

**Defining project-wide defaults**

```yaml
# dbt_project.yml
name: 'dbt_training'
version: '1.0.0'

vars:
  start_date: '2024-01-01'
  min_deal_amount: 0
  env: 'dev'

models:
  dbt_training:
    +materialized: view
    silver:
      +materialized: table
```

<div class="mt-4 text-sm text-slate-600">
  All models in this project can call <code v-pre>{{ var("start_date") }}</code> without a default — the <code>dbt_project.yml</code> value is the fallback.
</div>

</div>

<div class="space-y-3">

<div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-2">Pattern: environment guard</div>

```sql
-- fct_deal.sql
SELECT deal_key, deal_id, amount
FROM {{ ref('stg_hubspot__deals') }}
{% if var('env', 'dev') == 'dev' %}
LIMIT 1000
{% endif %}
```

  Speeds up dev runs. Production sets <code>env: prod</code> via CI.
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-slate-700 mb-2">Pattern: amount threshold</div>

```sql
-- fct_deal.sql
WHERE amount >= {{ var('min_deal_amount', 0) }}
```

  Zero in production (keep everything). Override in analysis:
  <code>--vars '{"min_deal_amount": 500}'</code>
</div>

</div>
</div>

<!--
dbt_project.yml vars are the "normal" defaults — what runs in production on a scheduled pipeline. The --vars flag is for intentional overrides: historical rebuilds, analysis runs, CI test runs with limited data.

The env pattern is practical — show them the `if var('env', 'dev') == 'dev'` guard. It's how the exercise project limits data volume locally without modifying model logic.

Ask: "Where would you NOT put a variable?" → Directly in the SQL as a hardcoded string. The whole point is to extract it to one place.
-->

---
layout: default
background: '#f9f8f5'
---

# Exercise — Seeds and Variables (10 min)

<div class="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
  <strong>Scenario:</strong> You're extending the exercise project with a country-level Gold mart and making the deal amount filter configurable. The <code>seeds/country_codes.csv</code> file is already in the repo.
</div>

<div class="space-y-3">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center gap-3 mb-3">
    <span class="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded-full">Task 1</span>
    <span class="text-sm font-semibold text-slate-700">Load the seeds and inspect</span>
  </div>
  <div class="text-sm text-slate-600">Run <code>dbt seed</code>. Then run <code>dbt show --select country_codes --limit 10</code>. Verify the table has <code>country_code</code>, <code>country_name</code>, and <code>region</code> columns. Answer: why is this a seed and not a source?</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center gap-3 mb-3">
    <span class="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded-full">Task 2</span>
    <span class="text-sm font-semibold text-slate-700">Write <code>mrt_country_summary.sql</code></span>
  </div>
  <div class="text-sm text-slate-600">Create <code>models/gold/mrt_country_summary.sql</code>. Join <code>dim_contact</code> with <code>{{ ref('country_codes') }}</code> on <code>country_code</code>. Group by <code>country_name</code> and <code>region</code>. Count distinct contacts as <code>contact_count</code>. Use <code>materialized='table'</code>.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center gap-3 mb-3">
    <span class="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded-full">Task 3</span>
    <span class="text-sm font-semibold text-slate-700">Add <code>min_deal_amount</code> variable to <code>fct_deal.sql</code></span>
  </div>
  <div class="text-sm text-slate-600">Add <code>min_deal_amount: 0</code> to <code>vars</code> in <code>dbt_project.yml</code>. Add <code>WHERE amount >= {{ var('min_deal_amount', 0) }}</code> to <code>fct_deal.sql</code>. Run normally, then override with <code>--vars '{"min_deal_amount": 500}'</code>. Use <code>dbt compile</code> to verify the substitution in <code>target/compiled/</code>.</div>
</div>

</div>

<!--
SETUP NOTE: seeds/country_codes.csv must exist in the exercise project before this session. Participants run dbt seed — they do not create the CSV themselves. The exercise tests their ability to USE seeds, not to understand CSV formatting.

Task 2 is the core concept test: ref() a seed exactly like a model. If they try to hardcode a schema path instead of using ref(), the concept hasn't landed.

Task 3: The most common failure is adding the WHERE clause to the SQL but forgetting the vars block in dbt_project.yml. That's fine — dbt will error with "variable not defined" and they'll understand immediately why the vars block matters.

Bonus: Find a CASE WHEN in existing models that would be better as a seed. stg_hubspot__deals.sql or fct_deal.sql may have status labels or pipeline stage names hardcoded — good candidates.
-->

---
layout: center
---

<div class="text-center max-w-xl mx-auto">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">Key Takeaways</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-8">Module 08 Summary</h2>

  <div class="space-y-3 text-left">

  <div v-click class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-800">
    <div class="font-semibold mb-1">Seeds = version-controlled lookup tables</div>
    Put human-curated CSVs in <code>seeds/</code>, run <code>dbt seed</code>, reference with <code v-pre>{{ ref() }}</code>. One place to update, consistent everywhere.
  </div>

  <div v-click class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-800">
    <div class="font-semibold mb-1">Variables = runtime-configurable constants</div>
    Replace hardcoded dates and thresholds with <code v-pre>{{ var("name", "default") }}</code>. Override at runtime with <code>--vars</code> without touching model files.
  </div>

  <div v-click class="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
    <div class="font-semibold mb-1">Both solve the same underlying problem</div>
    Hardcoded values scattered across multiple models are a maintenance trap. Seeds extract lookup data. Variables extract constants. Same principle, different mechanism.
  </div>

  </div>
</div>

<!--
The three takeaways should be recitable from memory after this module. They're the entire module in three sentences.

If time allows, ask the group: "What's the difference between a seed and a dbt variable?" — they solve different problems. Seed = lookup DATA (rows and columns, joined to models). Variable = a CONSTANT (a scalar value, substituted inline in SQL). Easy to mix up conceptually until you've used both.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 08 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 09</h2>
  <p class="text-slate-500 mb-8">Jinja and Macros — writing reusable SQL logic</p>
  <div class="space-y-2 text-left max-w-md mx-auto">
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q1: What is the difference between {{ }} and {% %} in Jinja?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q2: What does is_incremental() return on the first run of a model?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: What does {{ ref('stg_hubspot__deals') }} compile to in your dev environment?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q4: Which Jinja tag would you use to loop over a list of column names?</div>
  </div>
</div>
