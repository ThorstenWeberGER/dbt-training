---
theme: default
background: '#f9f8f5'
title: 'Module 09 — Jinja and Macros'
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
    🟡 Working Effectively · Module 09 · 90 min
  </div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    Jinja and Macros
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    Stop copying the same CAST expression into every model. Start writing reusable SQL logic — and know exactly when not to.
  </p>
</div>

<!--
Recap prep questions from Module 08 — cold, no notes:
1. What is the difference between {{ }} and {% %} in Jinja?
2. What does is_incremental() return on the first run of a model?
3. What does {{ ref('stg_hubspot__deals') }} compile to in your dev environment?
4. Which Jinja tag would you use to loop over a list of column names?

Probe question 1 specifically — the delimiter distinction connects directly to today's macro authoring: macro definitions use {% %}, calls use {{ }}. If they can't answer Q1 from the prep, work through the delimiter table on the next slide before moving forward.
-->

---

# Module 08 Was Already Jinja

### You've been using it — now you'll write it

<div class="mt-6 grid grid-cols-2 gap-6">

<div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
  <div class="text-xs font-mono text-amber-600 mb-3">Module 08 — variables in SQL</div>

```sql
WHERE amount > {{ var('min_deal_amount', 0) }}
```

  <div class="mt-3 text-sm text-amber-900">This IS Jinja. <code>{{ var(...) }}</code> is an expression that dbt evaluates at compile time and substitutes into your SQL.</div>
</div>

<div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
  <div class="text-xs font-mono text-slate-500 mb-3">Module 09 — write your own Jinja</div>
  <div class="text-sm text-slate-700 space-y-3">
    <div>Variables let you substitute <strong>constants</strong>.</div>
    <div>Macros let you substitute <strong>SQL patterns</strong> — parameterised templates you define once and call everywhere.</div>
    <div class="font-semibold text-slate-900">Today: build reusable SQL patterns.</div>
  </div>
</div>

</div>

<!--
This is a bridge slide — connect what they already know (var()) to what they're about to learn (macros).

Key point: {{ var('min_deal_amount', 0) }} and {{ safe_cast('amount', 'DOUBLE') }} use exactly the same Jinja expression syntax. The difference is that var() is built in; safe_cast() is something they write.

If anyone asks "why didn't we cover this in Module 08?": var() is a one-liner. Macros have anatomy, parameters, conditional logic, and whitespace control — they need their own module.
-->

---

# The Problem

### You wrote this CAST in 12 different staging models

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="bg-red-50 border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-500 mb-3">stg_hubspot__deals.sql</div>

```sql
SELECT
  deal_id,
  CAST(amount AS DOUBLE)    AS amount,
  CAST(close_date AS DATE)  AS expected_close_date
FROM {{ source('hubspot', 'deals') }}
```

</div>

<div class="bg-red-50 border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-500 mb-3">stg_hubspot__contacts.sql</div>

```sql
SELECT
  contact_id,
  CAST(score AS INTEGER)    AS contact_score,
  CAST(created_at AS DATE)  AS created_date
FROM {{ source('hubspot', 'contacts') }}
```

</div>

</div>

<div class="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-red-700 mb-2">The hidden cost</div>
  <div class="text-red-800">Source data from Bronze is messy. When <code>amount</code> contains <code>'N/A'</code>, <code>CAST</code> throws a runtime error and fails the entire model run. You need <code>TRY_CAST</code> — but now you have to fix it in 12 places. And next time someone adds a 13th model, they'll use <code>CAST</code> again because there's no convention to follow.</div>
</div>

<!--
This is the "why" slide. Don't rush past it.

Make it concrete: the Bronze layer contains raw CSV data loaded by Lambda. Nobody is guaranteeing that the amount column only ever contains numbers. A single bad row in HubSpot causes a CAST error that kills the entire staging run at 3am.

The problem isn't just the type coercion failure — it's that there's no shared convention. Every model author makes their own choice. Some use CAST, some use TRY_CAST, some use CAST with a TRY_... wrapper. After 6 months, the codebase is inconsistent and nobody knows which models are safe.

Macros solve the convention problem. The implementation is in one place, the calling code is uniform, and if you need to change the pattern, you change it once.
-->

---

# Jinja Syntax — The Three Delimiters

### A macro uses all three. Know which does what.

<div class="mt-4">

| Delimiter | Purpose | Renders output? | Example |
|---|---|---|---|
| `{{ }}` | Expression — evaluates and outputs a value | Yes | `{{ ref('fct_deal') }}` · `{{ my_macro(arg) }}` |
| `{% %}` | Statement — logic, control flow, definitions | No | `{% if is_incremental() %}` · `{% macro name(args) %}` |
| `{# #}` | Comment — ignored entirely | No | `{# TODO: add null guard #}` |

</div>

<div class="mt-6 grid grid-cols-2 gap-4">

<div class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-red-700 mb-2">Wrong — breaks immediately</div>

```sql
{{ macro safe_cast(col, type) }}
    TRY_CAST({{ col }} AS {{ type }})
{{ endmacro }}
```

  <div class="text-red-800 mt-2 text-xs">dbt raises a parse error. <code>{{ }}</code> tries to output the value of <code>macro safe_cast(col, type)</code> — which is nothing. The macro is never defined.</div>
</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-emerald-700 mb-2">Correct</div>

```sql
{% macro safe_cast(col, type) %}
    TRY_CAST({{ col }} AS {{ type }})
{% endmacro %}
```

  <div class="text-emerald-800 mt-2 text-xs"><code>{% %}</code> defines the macro without emitting output. <code>{{ }}</code> inside the body outputs the argument values into SQL.</div>
</div>

</div>

<!--
Brief review of Module 03 delimiter content — intentional, because the Module 08 prep question asked participants to recall the difference. Now apply it in a new context: macro authoring.

The key insight: macro definitions use statement delimiters ({% %}), not expression delimiters. This trips people up because they've been writing {{ ref() }} and {{ config() }} all course and the {{ }} syntax feels natural.

Run the broken version live if time allows — the dbt parse error is immediate and informative. It's a much stronger learning experience than being told it fails.

Checkpoint: "Which delimiter do you use to call a macro in a SELECT?" → {{ }} (expression, outputs the result). "Which do you use to define it?" → {% %} (statement, no output).

Cross-reference: Module 03 covered delimiter semantics in the context of ref() and config(). This slide extends that to macro definition and body syntax — the same rules, a new application.
-->

---

# Built-in dbt Jinja Variables

### Three variables available in every model and macro

<div class="mt-4 space-y-4">

<div v-click class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-2">
    <code class="text-sm font-semibold text-slate-800">{{ this }}</code>
    <span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">current model's relation</span>
  </div>
  <div class="grid grid-cols-2 gap-3 text-sm">
    <div><span class="text-slate-500">Used as:</span> <code>{% if is_incremental() %} WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }}) {% endif %}</code></div>
    <div><span class="text-slate-500">Compiles to:</span> <code>dev_schema.fct_deal</code> (or prod equivalent)</div>
  </div>
</div>

<div v-click class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-2">
    <code class="text-sm font-semibold text-slate-800">{{ target }}</code>
    <span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">active profile target</span>
  </div>
  <div class="grid grid-cols-2 gap-3 text-sm">
    <div><span class="text-slate-500">Used as:</span> <code>{% if target.name == 'prod' %}</code> — full dataset in prod, 90-day filter in dev</div>
    <div><span class="text-slate-500">Properties:</span> <code>target.name</code> · <code>target.schema</code> · <code>target.type</code></div>
  </div>
</div>

<div v-click class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-2">
    <code class="text-sm font-semibold text-slate-800">{{ model }}</code>
    <span class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">current model metadata</span>
  </div>
  <div class="grid grid-cols-2 gap-3 text-sm">
    <div><span class="text-slate-500">Used as:</span> <code>{{ model.name }}</code> — useful in generic macros that need to know their caller</div>
    <div><span class="text-slate-500">Compiles to:</span> <code>fct_deal</code> (the file name, no extension)</div>
  </div>
</div>

</div>

<!--
These three variables are the full set you'll use in most macros. Don't go deep on model — it's rarely needed. Focus on this and target.

Ask: "What does {{ this.schema }} return in your dev environment?" → the dev schema string (e.g. TESTING__dev_jane). Then ask: "Why would you need this.schema in a macro rather than just this?" → when you need to build a qualified table reference manually, e.g. for an INSERT INTO a sibling table.

The target.type property is worth noting briefly: it lets you write adapter-aware macros. Your safe_cast macro uses TRY_CAST, which works in both DuckDB and Snowflake. If you needed a Snowflake-only vs DuckDB-only implementation, you'd branch on target.type.
-->

---

# Your First Macro: `safe_cast`

<div class="grid grid-cols-3 gap-4 mt-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">macros/safe_cast.sql — definition</div>

```sql
{% macro safe_cast(
    column_name,
    target_type,
    fallback=None
) %}
{%- if fallback is not none -%}
  COALESCE(
    TRY_CAST({{ column_name }}
             AS {{ target_type }}),
    {{ fallback }}
  )
{%- else -%}
  TRY_CAST({{ column_name }}
           AS {{ target_type }})
{%- endif -%}
{% endmacro %}
```

</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">stg_hubspot__deals.sql — call</div>

```sql
SELECT
  deal_id,
  {{ safe_cast(
       'amount',
       'DOUBLE'
     ) }}              AS amount,
  {{ safe_cast(
       'close_date',
       'DATE'
     ) }}              AS expected_close_date,
  {{ safe_cast(
       'deal_score',
       'INTEGER',
       '0'
     ) }}              AS deal_score
FROM {{ source('hubspot', 'deals') }}
```

</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
  <div class="text-xs font-mono text-emerald-600 mb-2">target/compiled/... — SQL sent to DuckDB</div>

```sql
SELECT
  deal_id,
  TRY_CAST(amount AS DOUBLE)
    AS amount,
  TRY_CAST(close_date AS DATE)
    AS expected_close_date,
  COALESCE(
    TRY_CAST(deal_score AS INTEGER),
    0
  )                    AS deal_score
FROM main.raw_deals
```

  <div class="mt-3 text-xs text-emerald-700">No Jinja in the output. DuckDB receives plain SQL.</div>
</div>

</div>

<!--
This is the "aha" slide. Three columns: definition → call → compiled output.

Walk through all three columns in sequence. The key point is the last column: the compiled SQL has no Jinja in it at all. dbt is a transpiler — Jinja is an authoring tool, not a runtime feature.

Ask: "What SQL does {{ safe_cast('amount', 'DOUBLE') }} compile to?" → TRY_CAST(amount AS DOUBLE). Make them say it out loud before you show it. Then "what about {{ safe_cast('deal_score', 'INTEGER', '0') }}?" → COALESCE(TRY_CAST(deal_score AS INTEGER), 0).

If time allows: deliberately break the macro by using {{ macro ... }} instead of {% macro ... %} and show the parse error. Then fix it. The hands-on error is worth 5 minutes.
-->

---

# Macro Anatomy

### Every macro follows the same pattern

<div class="mt-4 bg-white border border-slate-200 rounded-xl p-5">

```sql {all|1|2-3|4-8|9|all}
{% macro macro_name(parameter_1, parameter_2='default_value') %}

    {# Optional Jinja comment explaining what this outputs #}

    -- SQL text that uses the parameters
    -- Use {{ parameter_1 }} to output a parameter's value into SQL
    -- Use {% if %} / {% else %} / {% endif %} for conditional output
    {{ parameter_1 }} AND {{ parameter_2 }}

{% endmacro %}
```

</div>

<div class="mt-4 grid grid-cols-3 gap-3 text-sm">
  <div v-click class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">Name and parameters</div>
    <div class="text-slate-600">Parameters can have default values. Callers can omit optional parameters.</div>
  </div>
  <div v-click class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">The body</div>
    <div class="text-slate-600">Everything between <code>{% macro %}</code> and <code>{% endmacro %}</code> is the output template. Use <code>{{ }}</code> to insert parameter values.</div>
  </div>
  <div v-click class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">Calling the macro</div>
    <div class="text-slate-600"><code>{{ macro_name(arg1, arg2) }}</code> — expression delimiter. The compiled SQL replaces the call site.</div>
  </div>
</div>

<!--
This slide makes the anatomy explicit and self-contained. Use the line highlights to walk through the code block step by step.

Line 1: {% macro %} — statement, defines the name and parameter list.
Lines 2-3: default values — callers can omit the parameter and the default applies.
Lines 4-8: the body — this is what gets output when the macro is called. Mix of SQL and Jinja expressions.
Line 9: {% endmacro %} — statement, closes the definition.

Key takeaway: macros are just named Jinja templates. When you call {{ safe_cast('amount', 'DOUBLE') }}, dbt substitutes the arguments into the template and outputs the resulting SQL string. Nothing more.

Checkpoint: "If you call {{ safe_cast('score', 'INTEGER') }} and fallback is not provided, what does it output?" → TRY_CAST(score AS INTEGER). The else branch of the macro.
-->

---

# `dbt_utils.generate_surrogate_key`

### Why surrogate keys? Where to generate them?

<div class="mt-4 grid grid-cols-2 gap-6">

<div class="space-y-3">
  <div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
    <div class="font-semibold text-slate-700 mb-2">Why a surrogate key?</div>
    <div class="text-slate-600 space-y-1">
      <div v-click>Natural keys (HubSpot IDs) are strings that can change, merge, or be reused.</div>
      <div v-click>A hash key is stable, join-safe across systems, and works as a consistent dimension key in Power BI.</div>
      <div v-click>Every Silver model needs one. Without it, joins to fact tables are fragile.</div>
    </div>
  </div>

  <div v-click class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
    <div class="font-semibold text-amber-800 mb-2">Where to call it</div>
    <div class="text-amber-900">In the <strong>source CTE</strong> of each model — not in a shared macro. Surrogate key generation is part of the row's identity. Put it where the row is first selected.</div>
  </div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">models/silver/fct_deal.sql</div>

```sql
WITH source AS (
    SELECT
        {{ dbt_utils.generate_surrogate_key(
               ['deal_id']
           ) }}         AS deal_key,
        deal_id,
        deal_name,
        pipeline_id,
        amount,
        expected_close_date,
        ingested_at
    FROM {{ ref('stg_hubspot__deals') }}
)

SELECT * FROM source
```

  <div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
    Compiles to: <code>MD5(CAST(deal_id AS TEXT)) AS deal_key</code>
  </div>
</div>

</div>

<!--
Two messages here: what surrogate keys are for, and where to put the call.

On why: the HubSpot contact_id is just a string assigned by HubSpot. If Bloomwell ever migrates CRM systems or merges duplicate contacts, those IDs change. A surrogate key based on the ID is stable for joins but doesn't carry CRM-system dependency. For Power BI, the surrogate key is the dimension's primary key — it's what the relationship manager sees.

On where: the question "should generate_surrogate_key be a shared macro?" comes up. The answer is no — it's already a macro (from dbt_utils). Wrapping it in another macro adds a layer of indirection for no benefit. Put the call in the source CTE. That's the canonical location in this project.

For multi-column keys: show the array syntax. {{ dbt_utils.generate_surrogate_key(['prescription_id', 'doctor_id']) }} — both columns are hashed together. Order matters: ['a', 'b'] and ['b', 'a'] produce different hashes.

Ask: "If two models both call generate_surrogate_key(['deal_id']), will they produce the same deal_key for the same deal?" → Yes — it's a deterministic hash. That's the point.
-->

---

# The Macro Antipattern

### What happens when business logic moves into Jinja

<div class="mt-4 grid grid-cols-2 gap-5">

<div class="bg-red-50 border border-red-200 rounded-xl p-4">
  <div class="text-xs font-mono text-red-500 mb-3">macros/classify_deal.sql — do not write this</div>

```sql
{% macro classify_deal(amount_col, stage_col) %}
  CASE
    WHEN {{ stage_col }} = 'closed-won'
         AND {{ amount_col }} > 50000
      THEN 'enterprise-closed'
    WHEN {{ stage_col }} = 'closed-won'
         AND {{ amount_col }} > 10000
      THEN 'mid-market-closed'
    WHEN {{ stage_col }} IN ('proposal','demo')
         AND {{ amount_col }} > 50000
      THEN 'enterprise-pipeline'
    -- ... 20 more lines of business rules
  END
{% endmacro %}
```

  <div class="mt-2 text-xs text-red-700 space-y-1">
    <div>❌ Business rules are invisible to SQL analysts</div>
    <div>❌ Cannot write an <code>accepted_values</code> test targeting this logic</div>
    <div>❌ A BI developer reading <code>fct_deal</code> cannot understand what <code>deal_segment</code> means without reading the macro file</div>
  </div>
</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
  <div class="text-xs font-mono text-emerald-600 mb-3">models/silver/fct_deal.sql — write this instead</div>

```sql
WITH classified AS (
    SELECT
        deal_id,
        amount,
        pipeline_stage,
        CASE
          WHEN pipeline_stage = 'closed-won'
               AND amount > 50000
            THEN 'enterprise-closed'
          WHEN pipeline_stage = 'closed-won'
               AND amount > 10000
            THEN 'mid-market-closed'
          WHEN pipeline_stage IN ('proposal','demo')
               AND amount > 50000
            THEN 'enterprise-pipeline'
          ELSE 'other'
        END AS deal_segment
    FROM {{ ref('stg_hubspot__deals') }}
)
```

  <div class="mt-2 text-xs text-emerald-700 space-y-1">
    <div>✓ Business rules visible in lineage and PR review</div>
    <div>✓ <code>accepted_values</code> test targets <code>fct_deal.deal_segment</code> directly</div>
    <div>✓ Any SQL analyst can read the model and understand the segmentation</div>
  </div>
</div>

</div>

<!--
This is the most important conceptual slide in the module. Don't rush it.

The red example is real. Teams build macros like this thinking they're DRY-ing up the code. But what they're actually doing is hiding business logic in a place that SQL analysts can't find, that dbt tests can't target directly, and that makes the lineage graph misleading.

Key question: "If you're reviewing a PR for fct_deal.sql and it contains {{ classify_deal('amount', 'pipeline_stage') }}, what do you know about what deal_segment contains?" → Nothing, without reading the macro. That's the problem.

The SQL CTE version is three times longer but infinitely more readable. Business logic should be in SQL where it belongs.

Signal for a good macro vs. bad macro: "Can a SQL analyst understand what this column contains by reading the model SQL alone?" If yes, keep it in SQL. If no, the macro is hurting discoverability.

The one exception: if the same CASE WHEN appears in 15 models and the business rule genuinely changes together. In that case, a macro is acceptable — but document the business rule in the macro's docstring and include the accepted values in the macro's documentation.
-->

---

# When to Use What

### Decision table: macro vs. CTE vs. ephemeral

<div class="mt-4">

| Situation | Right tool | Reason |
|---|---|---|
| Same `TRY_CAST` pattern in 8+ staging models | Macro | Structural — purely mechanical, no business meaning |
| Surrogate key hash over a column | `dbt_utils.generate_surrogate_key` | Already a package macro — call it directly |
| `CASE WHEN` mapping pipeline stages to categories | SQL CTE in the model | Business logic — visible, reviewable, testable |
| Intermediate join used by exactly one model | SQL CTE or ephemeral | Single use — abstraction adds complexity, no benefit |
| `CASE WHEN` that classifies deal size across 15 models | Macro (with docstring) | Repeated business rule — document it thoroughly |
| 50-line Jinja template encoding revenue allocation rules | Never | Jinja is not a good language for business logic |

</div>

<div class="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
  <div class="font-semibold text-amber-800 mb-2">4-question checklist before writing a macro</div>
  <div class="text-amber-900 space-y-1">
    <div v-click>1. Is this pattern <strong>structural</strong> (not business logic)? If no — use a CTE.</div>
    <div v-click>2. Does it repeat across <strong>3+ models</strong>? If no — use a CTE.</div>
    <div v-click>3. Would a <strong>CTE work instead</strong>? If yes — prefer the CTE.</div>
    <div v-click>4. Is it <strong>testable on its own</strong>? If no — reconsider whether Jinja is the right tool.</div>
  </div>
</div>

<!--
This slide operationalises Part D. Walk through the table row by row — some rows will prompt questions.

The "50-line Jinja" row is intentionally extreme. It makes the anti-pattern memorable. If someone asks "what's wrong with that?", the answer is: Jinja is a templating language, not a business logic language. It has no built-in test framework, no SQL lineage, and no IDE support for debugging complex branching. SQL does.

The v-click items on the self-check are meant to be revealed one at a time during discussion. Ask them to answer each before you click.

Closing question: "Which of the following should be a macro? (a) casting contact_id to VARCHAR in every staging model, (b) the CASE WHEN that maps deal stage names to funnel positions, (c) generating a surrogate key from deal_id." Answer: (a) is a macro candidate. (b) stays in SQL unless it genuinely repeats across 10+ models. (c) use generate_surrogate_key — don't write your own.
-->

---

# Hooks

### Run SQL before or after a model executes

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">dbt_project.yml — project-level hooks</div>

```yaml
models:
  analytics:
    silver:
      facts:
        +post-hook:
          - >
            ALTER TABLE {{ this }}
            ADD PRIMARY KEY (deal_key)
            NOT ENFORCED
```

</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">model config — inline hook</div>

```sql
{{ config(
    materialized = 'table',
    post_hook    = [
      "GRANT SELECT ON {{ this }}
       TO ROLE REPORTER"
    ]
) }}
```

</div>

</div>

<div class="mt-4 grid grid-cols-2 gap-4 text-sm">
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">pre-hook</div>
    <div class="text-slate-600">Runs before the model SQL. Use for: drop temp tables, set session variables, write an audit log entry.</div>
  </div>
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">post-hook</div>
    <div class="text-slate-600">Runs after the model SQL. Use for: add constraints, grant permissions, write a completion audit log entry.</div>
  </div>
</div>

<div class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
  Hooks are powerful and hard to debug. Prefer solving the problem in dbt config before reaching for hooks.
</div>

<!--
Keep this to 5 minutes — it's an awareness slide, not a deep dive.

The main things to know: hooks exist, there are two kinds (pre and post), and they run arbitrary SQL around a model. The most common use in this project is adding NOT ENFORCED primary keys to Silver models in Snowflake — useful for query optimizer hints without enforced constraint overhead.

Note that NOT ENFORCED is Snowflake syntax. In DuckDB (the exercise environment), primary key constraints are supported but the syntax differs slightly. For the exercise, participants don't need to write hooks.

If someone asks "when would I actually use a pre-hook?": common case is setting a Snowflake session parameter (e.g. QUERY_TAG) for cost attribution. Another case is truncating a temp table before loading into it.
-->

---

# Packages

### Install pre-built macro libraries with `packages.yml`

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-2">packages.yml (project root)</div>

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.3.0
  - package: calogica/dbt_expectations
    version: 0.10.4
```

  <div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
    After adding or updating <code>packages.yml</code>, run:
    <code class="block mt-1 text-slate-800">dbt deps</code>
    Downloads to <code>dbt_packages/</code> — gitignored. Run <code>dbt deps</code> after every clone.
  </div>
</div>

<div class="space-y-3">
  <div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
    <div class="font-semibold text-slate-700 mb-2">dbt_utils macros used in this project</div>
    <div class="space-y-1 text-slate-600 text-xs">
      <div><code>generate_surrogate_key([cols])</code> — MD5 hash surrogate key</div>
      <div><code>star(from=ref('model'), except=[...])</code> — SELECT * except columns</div>
      <div><code>pivot(col, values, ...)</code> — pivot a column into boolean columns</div>
    </div>
  </div>
  <div class="bg-white border border-slate-200 rounded-xl p-4 text-sm">
    <div class="font-semibold text-slate-700 mb-2">dbt_expectations tests used in this project</div>
    <div class="space-y-1 text-slate-600 text-xs">
      <div><code>expect_column_values_to_be_between</code> — numeric range check</div>
      <div><code>expect_column_pair_values_to_be_equal</code> — assert two columns match</div>
    </div>
  </div>
</div>

</div>

<!--
Keep this brief — 3 minutes.

The main things to know: packages.yml is how you add third-party macro libraries. dbt deps is the install command. dbt_packages/ is gitignored — you must run dbt deps after every fresh clone. This is a common source of "why doesn't my generate_surrogate_key work?" errors.

Version pinning is important. Unpinned packages pick up breaking changes automatically. Always pin to a specific version in packages.yml.

If someone asks about other packages: dbt-audit-helper (for comparing models between environments) and dbt-codegen (for generating YAML from live tables) are both useful. But don't go into detail — they're not used in this exercise.
-->

---
layout: default
background: '#f9f8f5'
---

# Exercise — 25 min

<div class="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
  <strong>Scenario:</strong> You are adding a safe type coercion convention and surrogate key generation to the exercise project. All three tasks must pass <code>dbt build</code>.
</div>

<div class="space-y-3">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-2">
    <div class="text-xs font-mono text-slate-500">Task 1 — Write the macro</div>
    <div class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">macros/safe_cast.sql</div>
  </div>
  <div class="text-sm text-slate-700">Create <code>macros/safe_cast.sql</code>. Parameters: <code>column_name</code>, <code>target_type</code>, <code>fallback=None</code>. Without fallback: <code>TRY_CAST(column_name AS target_type)</code>. With fallback: <code>COALESCE(TRY_CAST(...), fallback)</code>. Verify with <code>dbt compile --select stg_hubspot__deals</code>.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-2">
    <div class="text-xs font-mono text-slate-500">Task 2 — Use the macro</div>
    <div class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">stg_hubspot__deals.sql</div>
  </div>
  <div class="text-sm text-slate-700">Replace the raw <code>amount</code> column with <code>{{ safe_cast('amount', 'DOUBLE') }} AS amount</code>. Run <code>dbt build --select stg_hubspot__deals</code>. Check compiled output confirms <code>TRY_CAST(amount AS DOUBLE)</code>.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-2">
    <div class="text-xs font-mono text-slate-500">Task 3 — Surrogate key</div>
    <div class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">fct_deal.sql</div>
  </div>
  <div class="text-sm text-slate-700">Add <code>{{ dbt_utils.generate_surrogate_key(['deal_id']) }} AS deal_key</code> as the first column in the source CTE of <code>fct_deal.sql</code>. Run <code>dbt build --select fct_deal</code>. Confirm <code>deal_key</code> compiles to an MD5 expression.</div>
</div>

<div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-400 mb-1">Bonus</div>
  <div class="text-sm text-slate-600">Open any two Silver models. Find one expression that repeats across them. Is it a good macro candidate? Write the macro signature if yes. Explain why not if no. Use the decision table from the previous slide.</div>
</div>

</div>

<!--
SETUP NOTE: participants need dbt_utils installed. If packages.yml doesn't have it yet, they should add it and run dbt deps as part of Task 3 setup. This is intentional — running dbt deps on a fresh project is a real workflow step.

Task 1 is the foundation. If they get the macro wrong, Tasks 2 and 3 will still "work" because DuckDB may not error on a bad TRY_CAST — but the compiled SQL won't match the expected output. Encourage them to check the compiled file, not just the build output.

Task 3: the most common mistake is putting generate_surrogate_key in a final CTE rather than the source CTE. It works either way technically, but the project convention is source CTE. This is a good PR review checkpoint.

Bonus: there's no right answer. The point is to force a judgment call. Most things in Silver models are business logic (CASE WHEN, join conditions, date calculations) and should stay as SQL. The one thing that repeats structurally across all Silver models is the surrogate key generation — which is already covered by dbt_utils. That's the correct answer to "what should be a macro?" — and the answer to "is there anything else?" is usually "no, and that's fine."

Circulate during the exercise. Watch for: (1) people using {{ macro ... }} instead of {% macro ... %}, (2) people not running dbt compile to verify, (3) people placing generate_surrogate_key outside the source CTE.
-->

---
layout: center
---

<div class="text-center max-w-lg mx-auto">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">Key Takeaways</div>

  <div class="space-y-4 text-left mb-8">
    <div v-click class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800">
      <strong>Macros compile to plain SQL.</strong> Jinja is an authoring tool — DuckDB and Snowflake never see it. When in doubt, run <code>dbt compile</code> and read the output.
    </div>
    <div v-click class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800">
      <strong>Use macros for structural patterns, not business logic.</strong> Type coercion and key generation belong in macros. CASE WHEN logic that classifies deals belongs in SQL — where it's visible, testable, and reviewable.
    </div>
    <div v-click class="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800">
      <strong>Call <code>dbt deps</code> after every clone.</strong> <code>dbt_packages/</code> is gitignored. If <code>generate_surrogate_key</code> isn't found, you haven't run <code>dbt deps</code>.
    </div>
  </div>
</div>

<!--
Three takeaways only. These are the ones that come up in real project work.

Takeaway 1 is foundational — if they remember nothing else, "macros compile to SQL" is the mental model that prevents all the confusion.

Takeaway 2 is the hard-won lesson. You'll see this violated in real projects all the time. The tell: if you need to read the macro file to understand what a column contains, the macro is hurting discoverability.

Takeaway 3 is operational. The "generate_surrogate_key not found" error in CI is the single most common onboarding failure in dbt projects. Make this memorable.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 09 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 10</h2>
  <p class="text-slate-500 mb-8">Snapshots and Slowly Changing Dimensions (SCD2)</p>
  <div class="space-y-2 text-left max-w-lg mx-auto">
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q1: What is a slowly changing dimension? What type does dbt snapshots implement by default?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q2: If a contact's email changes in HubSpot, how would you preserve both the old and new value with history?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: What columns does a dbt snapshot add to track row history?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q4: In dim_contact, contact_key is a hash of hubspot_contact_id. If a contact's email changes, does contact_key change? Why does that matter for snapshot strategy?</div>
  </div>
</div>

<!--
Prep question 4 is intentionally hard — it tests whether they understand the relationship between surrogate key design (today's module) and SCD2 snapshot strategy (next module).

The answer: contact_key does NOT change when the email changes, because it's a hash of hubspot_contact_id only. That means the surrogate key is stable — which is exactly what you want for SCD2 tracking. The snapshot can add new rows (with dbt_valid_from / dbt_valid_to) while keeping the same contact_key across all versions of the contact. If the surrogate key were a hash of email, it would change on every email update and the dimension would break.

This sets up Module 10's central design question: what columns should be in the unique_key for a snapshot? Only the natural identifier — not attributes that change.

Give participants a moment to write down the prep questions before dismissing. The cold recall in Module 10 reinforces retention far more than rereading notes.
-->
