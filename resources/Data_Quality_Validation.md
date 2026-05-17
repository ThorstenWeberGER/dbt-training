-----

theme: default
title: dbt Training — Data Quality & Validation
info: |

## dbt Training

## Data Quality & Validation
Covers contracts, tests, post-hooks and the full dbt guardrail strategy.
highlighter: shiki
transition: slide-left
mdc: true
colorSchema: light
fonts:
sans: ‘DM Sans’
mono: ‘Fira Code’

<div class="flex flex-col h-full justify-center">
  <div class="text-xs font-mono tracking-widest text-emerald-500 mb-3 uppercase">dbt Training</div>
  <h1 class="text-5xl font-extrabold text-slate-900 leading-tight mb-4">
    Data Quality<br/>&amp; Validation
  </h1>
  <p class="text-slate-500 text-lg max-w-xl">
    Contracts · Tests · Post-Hooks<br/>
    When to use each — and why they don't replace each other.
  </p>
  <div class="mt-8 flex gap-3">
    <span class="px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">3 Concept slides</span>
    <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">5 Tool slides</span>
  </div>
</div>

<!-- Speaker notes: Welcome. This training covers the three dbt guardrail tools and how they work together. We'll start with the conceptual distinction between data quality and data validation before moving to the practical dbt tooling. -->

-----

## layout: two-cols

# Data Quality vs. Validation

<div class="font-mono text-xs tracking-widest text-sky-500 uppercase mb-4">Concept 1 of 3</div>

### Data Quality

A **continuous property** — how fit the data is for its purpose.

|Dimension       |Question                           |
|----------------|-----------------------------------|
|**Completeness**|Are all records present?           |
|**Accuracy**    |Does the value reflect reality?    |
|**Consistency** |Same fact, same meaning everywhere?|
|**Timeliness**  |Fresh enough to act on?            |
|**Uniqueness**  |No duplication distorting metrics? |

::right::

<div class="pl-6 pt-10">

### Data Validation

A **point-in-time gate** — does this data conform to a rule right now? Binary: pass or fail.

|Check          |Validates                     |
|---------------|------------------------------|
|**Structural** |Column present, right type?   |
|**Null check** |Value not null?               |
|**Uniqueness** |Key not duplicated?           |
|**Referential**|FK exists in referenced table?|
|**Domain**     |Value in allowed set?         |

</div>

<!-- The gap: you can have passing validation and poor data quality. Every row passes not_null but 40% have created_at = 1970-01-01 due to a bad default. The rule passes. The data is useless. Validation is the tool. Quality is the goal. -->

-----

## layout: two-cols

# Two Failure Surfaces

<div class="font-mono text-xs tracking-widest text-sky-500 uppercase mb-4">Concept 2 of 3</div>

### 🟠 Structural Failure

The **shape** of the model is wrong — regardless of values inside it.

- A column disappears from SELECT
- Type changes: `TIMESTAMP_NTZ` → `TIMESTAMP_LTZ`
- A HubSpot field is renamed upstream
- A cast is silently removed in a refactor

<div class="mt-3">
  <span class="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">Caught by: Contracts</span>
</div>

::right::

<div class="pl-6">

### 🟢 Data Quality Failure

The **values** inside the model are wrong — even if structure is correct.

- Duplicate surrogate keys from a merge bug
- FK references a deleted dimension record
- Wrong SLA bucket from bad CASE WHEN logic
- SCD2 has two current rows for the same contact

<div class="mt-3">
  <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Caught by: Tests</span>
</div>

</div>

<div class="absolute bottom-8 left-12 right-12 grid grid-cols-3 gap-4 text-center text-xs">
  <div class="bg-orange-50 border border-orange-100 rounded-lg p-3">
    <div class="text-slate-500 mb-1">Perfect structure</div>
    <div class="font-bold text-orange-600">+ terrible data</div>
    <div class="text-slate-400 mt-1 font-mono">contracts pass, tests fail</div>
  </div>
  <div class="bg-orange-50 border border-orange-100 rounded-lg p-3">
    <div class="text-slate-500 mb-1">Correct data</div>
    <div class="font-bold text-orange-600">+ broken schema</div>
    <div class="text-slate-400 mt-1 font-mono">tests pass, contracts fail</div>
  </div>
  <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
    <div class="text-slate-500 mb-1">Both correct</div>
    <div class="font-bold text-emerald-600">= trustworthy model</div>
    <div class="text-slate-400 mt-1 font-mono">all checks pass ✓</div>
  </div>
</div>

<!-- Neither surface replaces the other. A model can be structurally perfect with terrible data inside, or have completely correct data with a broken schema that destroys everything downstream. You need both. -->

-----

## layout: two-cols

# Where Problems Originate

<div class="font-mono text-xs tracking-widest text-sky-500 uppercase mb-4">Concept 3 of 3</div>

**🟠 Origin 1 — Upstream API**
HubSpot renames a field. Bronze Lambda picks up the new name silently. Silver still references the old name.
`column disappears` · `type changes`

**🟣 Origin 2 — Inside dbt**
Developer refactors a CTE, removes a cast, or accidentally drops a column from the final SELECT.
`type cast removed` · `column dropped`

**🟢 Origin 3 — Logic / Data**
SCD2 merge bug, wrong CASE WHEN, orphaned FK after a dim record is deleted.
`bad values` · `duplicates` · `orphaned FKs`

::right::

<div class="pl-6">

### Which Tool Catches What

|Problem                    |Tool                      |
|---------------------------|--------------------------|
|HubSpot field rename       |**Contract**              |
|Bronze Lambda drops column |**Contract**              |
|Column dropped in refactor |**Contract**              |
|Type cast changed          |**Contract**              |
|Duplicate surrogate keys   |**Test: unique**          |
|NULL in required column    |**Test: not_null**        |
|Orphaned FK                |**Test: relationships**   |
|Wrong CASE WHEN            |**Test: singular**        |
|Two current SCD2 rows      |**Test: singular**        |
|Value passes rule but wrong|⚠️ Neither — monitoring gap|

</div>

<!-- The monitoring gap is important. dbt tests are validation, not monitoring. Anomalies, trends, and slowly drifting values are outside what dbt tests catch. That requires separate data observability tooling. -->

-----

## layout: two-cols

# Contracts

<div class="font-mono text-xs tracking-widest text-orange-500 uppercase mb-4">dbt Tools 1 of 5</div>

A **compile-time structural guarantee**. Validates the model’s SELECT output against the declaration in `schema.yml` before a single row is written.

### Execution timing

```
dbt run
  ├─ [compile]   ← CONTRACT fires here
  │               fails before any write
  ├─ [materialize]   model writes to Snowflake
  └─ [post-hook]     side effects
```

### Catches ✓

- Column missing from SELECT
- Wrong type: `TIMESTAMP_LTZ` instead of `TIMESTAMP_NTZ`
- `not_null` column receiving NULLs

### Does NOT catch ✗

Duplicate values · bad data values · FK integrity violations

::right::

<div class="pl-6">

### Example — type problem caught

```yaml
- name: created_at
  data_type: timestamp_ntz
  constraints:
    - type: not_null
    - type: primary_key
      expression: "rely"
```

```
Error: column "created_at"
expected TIMESTAMP_NTZ
but found TIMESTAMP_LTZ
```

### Key Snowflake facts

- `primary_key` contract **generates real DDL** — no post-hook needed for PK
- Add `expression: "rely"` → Snowflake query optimizer + Cortex AI
- `foreign_key` DDL generation **⚠️ unconfirmed** — use post-hook as fallback
- Contracts only work on **table / incremental** materializations

### Toggle

Single-line per model. Safe to disable at any time. Enable only when schema is stable **60+ days**.

</div>

<!-- The key insight: contracts fire at compile time before any write. If a column disappears from your SELECT because HubSpot renamed a field, the contract fails immediately. Nothing reaches Snowflake. Nothing reaches Power BI. You find out in the CI run, not in a leadership standup. -->

-----

# dbt Test Types

<div class="font-mono text-xs tracking-widest text-emerald-500 uppercase mb-6">dbt Tools 2 of 5</div>

<div class="grid grid-cols-5 gap-3 text-xs">

<div class="bg-sky-50 border-t-2 border-sky-400 rounded-lg p-3">
<div class="font-bold text-sky-600 mb-2 font-mono">Built-in</div>
<div class="text-slate-600 font-semibold mb-1">unique</div>
<div class="text-slate-400 mb-2">Every PK. Always error. A duplicate PK double-counts in every downstream aggregation.</div>
<div class="text-slate-600 font-semibold mb-1">not_null</div>
<div class="text-slate-400 mb-2">Every PK, every FK, every critical column. NULLs in PKs break joins silently.</div>
<div class="text-slate-600 font-semibold mb-1">accepted_values</div>
<div class="text-slate-400 mb-2">Stable enums. error if frozen, warn if evolving.</div>
<div class="text-slate-600 font-semibold mb-1">relationships</div>
<div class="text-slate-400">Every FK. Orphaned FKs produce invisible NULLs in star schema joins.</div>
<div class="mt-2 text-emerald-600 font-semibold font-mono">→ Prod</div>
</div>

<div class="bg-violet-50 border-t-2 border-violet-400 rounded-lg p-3">
<div class="font-bold text-violet-600 mb-2 font-mono">Packages</div>
<div class="text-slate-600 font-semibold mb-1">expression_is_true</div>
<div class="text-slate-400 mb-2">Cross-column rules. resolved_at > created_at. Built-in can't compare two columns.</div>
<div class="text-slate-600 font-semibold mb-1">unique_combination_of_columns</div>
<div class="text-slate-400 mb-2">Composite PKs. Built-in unique only handles single columns.</div>
<div class="text-slate-600 font-semibold mb-1">expect_column_between</div>
<div class="text-slate-400 mb-2">SLA days 0–730. Catches date arithmetic overflows.</div>
<div class="text-slate-600 font-semibold mb-1">expect_row_count_between</div>
<div class="text-slate-400">Fact table floor. Merge bug emptying table caught here before Power BI loads.</div>
<div class="mt-2 text-emerald-600 font-semibold font-mono">→ Prod</div>
</div>

<div class="bg-emerald-50 border-t-2 border-emerald-400 rounded-lg p-3">
<div class="font-bold text-emerald-600 mb-2 font-mono">Singular</div>
<div class="text-slate-400 mb-1 text-slate-500 italic">SQL in /tests — rows returned = failure</div>
<div class="text-slate-600 font-semibold mb-1">One current SCD2 row</div>
<div class="text-slate-400 mb-2">Merge bug creates two is_current = true rows for same HubSpot ID. Downstream always picks wrong one.</div>
<div class="text-slate-600 font-semibold mb-1">No future timestamps</div>
<div class="text-slate-400 mb-2">HubSpot parsing bugs produce 2099. Breaks Power BI time intelligence.</div>
<div class="text-slate-600 font-semibold mb-1">Referential with tolerance</div>
<div class="text-slate-400">Flexible FK check with WHERE filters or percentage threshold.</div>
<div class="mt-2 text-emerald-600 font-semibold font-mono">→ Prod</div>
</div>

<div class="bg-emerald-50 border-t-2 border-emerald-400 rounded-lg p-3">
<div class="font-bold text-emerald-600 mb-2 font-mono">Generic (macro)</div>
<div class="text-slate-400 mb-1 text-slate-500 italic">Reusable logic in /macros — called from YAML like built-ins</div>
<div class="text-slate-600 font-semibold mb-1">not_null_where</div>
<div class="text-slate-400 mb-2">not_null only for current SCD2 rows. Historical rows may legitimately be NULL.</div>
<div class="text-slate-600 font-semibold mb-1">at_least_n_rows</div>
<div class="text-slate-400 mb-2">Row count floor reused across all fact tables. No copy-paste SQL.</div>
<div class="text-slate-600 font-semibold mb-1">no_nulls_in_columns</div>
<div class="text-slate-400">Bulk not_null across 10+ columns. One line in YAML.</div>
<div class="mt-2 text-emerald-600 font-semibold font-mono">→ Prod</div>
</div>

<div class="bg-orange-50 border-t-2 border-orange-400 rounded-lg p-3">
<div class="font-bold text-orange-600 mb-2 font-mono">Unit Tests</div>
<div class="text-slate-400 mb-1 text-slate-500 italic">dbt Core 1.8+ — mock input → expected output</div>
<div class="text-slate-600 font-semibold mb-1">What they are</div>
<div class="text-slate-400 mb-2">Mock input rows + expected output. dbt runs model SQL against mocks and compares. No real data needed.</div>
<div class="text-slate-600 font-semibold mb-1">When to write</div>
<div class="text-slate-400 mb-2">Complex CASE/WHEN, SLA buckets, date spine logic. Only after a bug has already bitten you.</div>
<div class="text-slate-600 font-semibold mb-1">Prod vs Dev</div>
<div class="text-slate-400">Dev/CI only. Mock data, not prod data. Tests logic at build time, not runtime.</div>
<div class="mt-2 text-orange-600 font-semibold font-mono">→ Dev / CI only</div>
</div>

</div>

<!-- Walk through left to right. Built-in are zero effort — just YAML. Packages are one packages.yml line. Singular tests are the most flexible but require writing SQL. Generic macros are for when you find yourself repeating the same singular test pattern. Unit tests are the most powerful but also the most expensive to write — only write them when a specific bug has already appeared. -->

-----

## layout: two-cols

# Tests in Practice

<div class="font-mono text-xs tracking-widest text-emerald-500 uppercase mb-4">dbt Tools 3 of 5</div>

### By Layer

**Bronze**

- Source freshness: warn 6h, error 24h
- `not_null` on PK only
- No uniqueness — duplicates expected in raw

**Silver** *(Kimball source of truth)*

- `unique` + `not_null` on every surrogate key → **error**
- `relationships` on every FK → **error**
- `accepted_values` on stable enums
- SCD2 singular: one current row per business key

**Gold**

- `unique` + `not_null` on PK → **error**
- `not_null` on business-critical measure columns
- Row count lower bound on fact tables
- **Net-new only** — don’t repeat Silver tests

::right::

<div class="pl-6">

### Severity Guide

|Test                             |Severity |
|---------------------------------|---------|
|PK `unique` + `not_null`         |🔴 error  |
|FK `relationships`               |🔴 error  |
|Business-critical `not_null` Gold|🔴 error  |
|`accepted_values` frozen enums   |🔴 error  |
|`accepted_values` evolving enums |🟡 warn   |
|Optional columns                 |🟡 warn   |
|Row count anomaly                |🟡 warn_if|
|Source freshness                 |🔴 / 🟡    |

### Net-New Principle

```
Silver tests contact_key → unique, not_null
Gold SELECTs it unchanged  → SKIP in Gold

Gold derives sla_bucket via CASE WHEN
→ new surface → TEST in Gold

Gold adds LEFT JOIN / COALESCE
→ new failure surface → RE-TEST
```

</div>

<!-- The net-new principle is important for keeping your test suite lean. Don't test the same column twice unless a new transformation has been applied to it. If Silver already validated contact_key is unique and not_null, Gold doesn't need to repeat it unless Gold changes it. -->

-----

## layout: two-cols

# Post-Hooks

<div class="font-mono text-xs tracking-widest text-violet-500 uppercase mb-4">dbt Tools 4 of 5</div>

SQL that executes against Snowflake **after** a model materializes. Every run. No knowledge of schema or data content.

### Execution timing

```
dbt run
  ├─ [compile]       Contract fires (if enforced)
  ├─ [materialize]   Model writes to Snowflake
  └─ [post-hook] ←   Fires here — every run
```

### ⚠️ Important

Post-hooks have **no knowledge** of schema or data. They cannot validate, check, or block anything. They execute arbitrary SQL.

### NOT for

- Schema validation
- Data quality checks
- Role grants → manage in **Snowflake RBAC**

::right::

<div class="pl-6">

### Use cases

**PK constraint** *(if no contract)*

```sql
ALTER TABLE {{ this }}
  ADD PRIMARY KEY (contact_key) RELY;
```

Snowflake metadata only — not enforced. `RELY` enables query optimizer + Cortex AI.

**FK constraint**

```sql
ALTER TABLE {{ this }}
  ADD FOREIGN KEY (owner_key)
  REFERENCES {{ ref('dim_owner') }}(owner_key) RELY;
```

⚠️ Required until contract FK DDL is confirmed.

**PII tagging**

```sql
ALTER TABLE {{ this }}
  SET TAG governance.pii = 'true';
```

**Clustering key**

```sql
ALTER TABLE {{ this }}
  CLUSTER BY (created_date);
```

</div>

<!-- Role grants deliberately removed from post-hooks. Grants are access control infrastructure, not pipeline logic. Coupling them to dbt run creates a dependency between your pipeline and your permission layer. Use Snowflake future grants on the schema level instead. -->

-----

## layout: two-cols

# All Three Together

<div class="font-mono text-xs tracking-widest text-sky-500 uppercase mb-4">dbt Tools 5 of 5</div>

### Execution Timeline

```
dbt run
  │
  ├─ [compile]      🟠 CONTRACT
  │                 Shape + types validated
  │                 Fails before any write
  │
  ├─ [materialize]  Model writes to Snowflake
  │
  └─ [post-hook]    🟣 POST-HOOK
                    PK/FK DDL, tags, clustering

dbt test  (separate command)
  └─ [test]         🟢 TESTS
                    Data values inspected
                    Bad data may already be in table
```

### The non-negotiable rule

Snowflake **does not enforce** PK, FK, or UNIQUE constraints. Ever.
You can insert duplicate PKs and broken FKs — Snowflake accepts all of it silently.

::right::

<div class="pl-6">

### Summary

|Tool         |Role              |When        |Catches     |
|-------------|------------------|------------|------------|
|**Contract** |Structural guard  |Compile     |Schema drift|
|**Post-Hook**|Snowflake metadata|After write |Nothing     |
|**Tests**    |Data validation   |Separate run|Bad values  |

<br/>

### The core equation

```
Snowflake constraints
  → describe what data SHOULD be
  → power optimizer + Cortex AI
  → not enforced

dbt tests
  → verify what data ACTUALLY is
  → the only real enforcement
```

<div class="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
  <span class="font-bold text-orange-700">Tests are non-negotiable</span>
  <span class="text-slate-600"> regardless of which scenario you use — contracts or not.</span>
</div>

</div>

<!-- This is the punchline: constraints describe, tests verify. You need both, but they are not substitutes. A contract without tests has no enforcement. Tests without contracts have no structural protection. Post-hooks give Snowflake the metadata it needs to reason about your schema intelligently. All three have a role. -->

-----

## layout: center

# Questions?

<div class="mt-6 grid grid-cols-3 gap-6 text-center text-sm max-w-2xl mx-auto">
  <div class="bg-orange-50 border border-orange-100 rounded-xl p-4">
    <div class="text-2xl mb-2">🟠</div>
    <div class="font-bold text-orange-700">Contracts</div>
    <div class="text-slate-500 text-xs mt-1">Structural guard at compile time</div>
  </div>
  <div class="bg-violet-50 border border-violet-100 rounded-xl p-4">
    <div class="text-2xl mb-2">🟣</div>
    <div class="font-bold text-violet-700">Post-Hooks</div>
    <div class="text-slate-500 text-xs mt-1">Snowflake metadata after write</div>
  </div>
  <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
    <div class="text-2xl mb-2">🟢</div>
    <div class="font-bold text-emerald-700">Tests</div>
    <div class="text-slate-500 text-xs mt-1">Data validation after materialization</div>
  </div>
</div>

<div class="mt-8 text-slate-400 text-sm">
  Reference: <code>dbt_quality_guardrails.md</code> — full decision matrix, three-step governance plan, model scoring
</div>

<!-- Thank the team. Point to the guideline document for the full decision framework including the five criteria scoring matrix and the per-model governance steps. -->