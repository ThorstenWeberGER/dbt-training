---
theme: default
background: '#f9f8f5'
title: 'Module 06 — Testing Data Quality'
highlighter: shiki
lineNumbers: false
transition: slide-left
fonts:
  sans: 'DM Sans'
  mono: 'JetBrains Mono'
---

<div class="h-full flex flex-col justify-center pl-2">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">dbt Training</div>
  <div class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono px-3 py-1 rounded-full w-fit mb-6">
    🟢 Beginner · Module 06 · 90 min
  </div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    Testing<br>Data Quality
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    Not optional. CI rejects Silver and Gold PRs that are missing mandatory tests on key columns.
  </p>
</div>

<!--
Recap prep questions from Module 05 — cold, no notes:
1. What must exist in sources.yml before you can use {{ source('hubspot', 'contacts') }}? → The source + table declaration
2. Name two things you lose by hardcoding vs source() → DAG lineage, freshness checks, environment-awareness, single schema update point
3. What column does dbt query for freshness? → loaded_at_field (e.g., _ingested_at)
4. Why does dbt NOT own the Bronze layer? → Bronze is owned by the ingestion layer (Lambda). dbt starts at Staging.

All four correct before continuing.
-->

---

# Why Tests Are Mandatory

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

**Without tests, transformations break silently**

- A column renamed in Bronze → staging model silently returns NULLs
- Duplicate surrogate keys → Power BI relationships corrupt
- NULL in a required column → propagates downstream undetected
- A Gold mart shows wrong numbers → business discovers it weeks later

<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
  The failure is always silent. The discovery is always late. The cost is always high.
</div>

</div>
<div>

**Tests are a CI requirement**

<div class="space-y-2 mt-2">
  <div class="bg-white border border-slate-200 rounded-lg p-3 text-sm">
    Silver and Gold PRs with missing tests on <code>_key</code> columns → <strong>rejected</strong>
  </div>
  <div class="bg-white border border-slate-200 rounded-lg p-3 text-sm">
    Missing FK tests on fact tables → <strong>rejected</strong>
  </div>
  <div class="bg-white border border-slate-200 rounded-lg p-3 text-sm">
    Zero tests on a new Silver model → <strong>rejected</strong>
  </div>
</div>

<div class="mt-3 text-xs text-slate-400">Reference: <code>dbt-test-strategy</code> skill — full placement guide per layer</div>

</div>
</div>

<!--
Use a real scenario to open this slide: "Imagine fct_prescription.prescription_key has duplicate values. Power BI loads the fact table and joins it to dim_patient on patient_key. The duplicate keys mean some patients appear to have double the prescriptions. A finance report goes out with wrong numbers. Nobody notices for two weeks."

That's not hypothetical — it's the exact failure mode that mandatory unique + not_null tests on _key columns prevent.

Ask: "What's the worst thing that can happen if a transformation breaks silently?" — let them answer.
-->

---

# The Four Build In Generic Tests

**Generic tests — 95% of what you'll write.** Defined in `schema.yml`. Parameterised.

<div class="grid grid-cols-2 gap-3 mt-4">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">unique</div>

```yaml
- name: prescription_key
  data_tests:
    - unique
```

  <div class="text-sm text-slate-600 mt-2">Fails if any value appears more than once. <code>mandatory</code> on all <code>_key</code> columns.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">not_null</div>

```yaml
- name: prescription_key
  data_tests:
    - not_null
```

  <div class="text-sm text-slate-600 mt-2">Fails if any value is NULL. <code>mandatory</code> on all <code>_key</code> columns.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">accepted_values</div>

```yaml
- name: medication_type
  data_tests:
    - accepted_values:
        arguments:
          values: ['tablet','liquid','injection']
```

  <div class="text-sm text-slate-600 mt-2">Fails if any value outside the list appears. Deliberate use for status/type columns <code>when static</code>.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="font-mono text-emerald-600 font-semibold mb-2">relationships</div>

```yaml
- name: patient_key
  data_tests:
    - relationships:
        arguments:
          to: ref('dim_patient')
          field: patient_key
```

  <div class="text-sm text-slate-600 mt-2">FK integrity check. Required on all FK columns in Silver facts and Gold marts.</div>
</div>

</div>

<!--
Write each one live. Then run dbt test --select fct_prescription and show the output for a passing run.

Then deliberately break a not_null test: UPDATE fct_prescription SET prescription_key = NULL WHERE ... in the dev schema. Run dbt test again. Show the failure output. Make them read it and explain what it says.

The failure message format is: "Got X results, configured to fail if != 0." This maps back to: the test SELECT returned rows, meaning failures were found.

Checkpoint: "Write the YAML for a unique + not_null test on prescription_key." — ask someone to answer before advancing.
-->

---

# Test Severity and `dbt build`

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

**Severity: `error` vs `warn`**

Global default — `dbt_project.yml`:

```yaml
data_tests:
  analytics:
    +severity: warn    # project-wide default
    silver:
      +severity: error # Silver always errors
    gold:
      +severity: error # Gold always errors
```

`dbt build` runs models and tests **in DAG order**.
- If `dim_patient` fails a test, `fct_prescription` (which depends on it) is **never built**.
- All independent models continue to **build**.

</div>
<div>

**Per individual test — `schema.yml`:**

```yaml
- name: prescription_key
  data_tests:
    - unique:
        config:
          severity: error  # ← CI stops, pipeline halts
- name: dosage_amount
  data_tests:
    - not_null:
        config:
          severity: warn   # ← logged, continues
```

Per-test config overrides the global setting.

</div>
</div>

<!--
Two points to land on severity before moving to dbt build:

1. Global vs per-test: dbt_project.yml sets the default for entire layers. schema.yml config: block overrides per individual test. Per-test always wins.
   Our pattern: warn globally, error locked in for silver + gold. A staging test that's informational can stay warn; a Silver _key test must be error.

2. The config: wrapper is the modern explicit syntax. The flat "severity: warn" directly under the test name also works in current dbt versions — both are valid.

The dbt build vs dbt run distinction is the most important practical takeaway from this module.

Concrete scenario: dim_patient has a not_null test on patient_key. A bad Lambda run loaded 500 NULL patient_keys. dbt run builds dim_patient (NULL keys included), then builds fct_prescription with those bad keys joined in. Then dbt test fails. By this point, corrupt data is already in fct_prescription.

With dbt build: dim_patient model runs, not_null test runs immediately after, fails with error severity, pipeline stops. fct_prescription is never built. No corrupt data.

Ask: "What does dbt build do that dbt run && dbt test does not?" → Runs tests in DAG order, immediately after each model, and stops downstream builds on failure.
-->

---

# Self-Written Tests

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

**Singular tests — specific business rules**

Plain `.sql` files in `tests/`. 

**Positive Values: `SUM > 0`**
```sql
-- tests/assert_fct_revenue_no_negative_amounts.sql
SELECT customer_key, SUM(amount_net) AS total
FROM {{ ref('fct_revenue') }}
GROUP BY 1
HAVING total < 0
```

**Orphan FK check: `not null`:**
```sql
-- tests/assert_no_orphan_prescriptions.sql
SELECT p.prescription_key
FROM {{ ref('fct_prescription') }} p
LEFT JOIN {{ ref('dim_patient') }} d
       ON p.patient_key = d.patient_key
WHERE d.patient_key IS NULL
```

</div>
<div>

**Custom generic tests — reusable + parameterised**

Macros in `tests/generic/`. 

```sql
-- tests/generic/assert_within_range.sql
{% test assert_within_range(model, column_name,
                            min_val, max_val) %}
   SELECT {{ column_name }} FROM {{ model }}
   WHERE {{ column_name }} < {{ min_val }}
      OR {{ column_name }} > {{ max_val }}
{% endtest %}
```

**Usage in `schema.yml`:**
```yaml
- name: dosage_mg
  data_tests:
    - assert_within_range:
        arguments:
          min_val: 0
          max_val: 1000
```

</div>
</div>

<!--
Singular tests: the no-rows-means-pass convention is counterintuitive — say it explicitly. The SQL selects the *failing* rows. No rows = no failures = test passes.

GROUP BY + HAVING covers business rules that operate on aggregated values ("no negative revenue", "no zero dosage"). Generic tests can't express these.

Custom generic tests: the key insight is that the macro receives `model` (the ref) and `column_name` as positional arguments, then any extra named params you define. dbt compiles it the same way as built-in tests — the test appears in `dbt test` output with a generated name.

Good use case to mention: any validation you find yourself writing as a singular test in more than one model should become a custom generic test instead.

Ask: "When would you write a singular test instead of a custom generic test?" → When the rule is genuinely one-off and specific to one model's business logic.
-->

---

# Exercise: Write Tests for `fct_prescription`

**The model has no tests. Add the complete test suite to `schema.yml`.**

<div class="mt-4">

| Column | Type | Notes |
|---|---|---|
| `prescription_id` | Business key| - |
| `patient_key` | FK → `dim_patient` | - |
| `doctor_key` | FK → `dim_doctor` | - |
| `prescription_date` | Date | Required |
| `medication_type` | String | Only `tablet`, `liquid`, `injection`, `topical` allowed|
| `dosage_amount` | Number | Can be null — not yet confirmed |
| `notes` | String | Optional free text |

</div>

<div class="mt-4 grid grid-cols-3 gap-3">
  <div class="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600"><strong>Step 1</strong><br>Write full schema.yml block with all required tests</div>
  <div class="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600"><strong>Step 2</strong><br>Add warn-severity not_null test on dosage_amount</div>
  <div class="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600"><strong>Step 3</strong><br>Introduce a duplicate prescription_key in dev. Run dbt test. Document the failure output.</div>
</div>

<!--
Step 3 is essential — reading failure output is a skill. They need to do it at least once in a controlled environment.

Expected mandatory tests:
- prescription_id: unique + not_null
- patient_key: not_null + relationships to dim_patient
- doctor_key: not_null + relationships to dim_doctor
- prescription_date: not_null
- medication_type: accepted_values for ['tablet','liquid','injection','topical']
- dosage_amount: not_null with severity: warn
- notes: no test required (optional free text)

Circulate. If anyone finishes early, ask them to also write a singular test that checks for any prescription with a prescription_date in the future.
-->

---

# Storing Test Failures with `store_failures`

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

**What gets stored — and what doesn't**

Failing tests get written into a separate table. The rows that failed are still present in the model itself — `store_failures` does not remove or quarantine them. 

Failures land in a dedicated audit schema for inspection:

```
<target_schema>_dbt_test__audit
```

The table is **replaced on every run.** Store results immediately for observability tools.

</div>
<div>

**Configuration**

Globally in `dbt_project.yml`:

```yaml
data_tests:
  analytics:
    silver:
      +store_failures: true
```

**What matters for you**

- Enable on Silver/Gold `_key` columns where root-cause investigation matters
- Pair with `severity: warn` for ongoing monitoring: pipeline continues, failures accumulate for inspection
</div>
</div>

<!--
Concrete scenario: prescription_key has 12 duplicate rows after a bad Lambda run. dbt test fails with "Got 12 results." Without store_failures you know there are 12 duplicates but not which ones. With store_failures you query the audit table and see exactly which prescription_keys are affected — and can trace them back to the source.

Key point: the model itself is unchanged. The duplicates are in fct_prescription AND in the failures table. store_failures is for observability, not data correction.

Ask: "What would you do after finding the bad rows in the failures table?" → Fix the upstream issue (Lambda dedup, staging dedup logic), re-run dbt build, confirm the failures table is empty.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 06 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 07</h2>
  <p class="text-slate-500 mb-8">Documentation — the final Beginner module</p>
  <div class="space-y-2 text-left max-w-md mx-auto">
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q1: Generic test vs singular test — difference?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q2: Name the four built-in generic tests</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: Why should be push tests to the left?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Read: dbt blog "Test smarter not harder"</div>
  </div>
</div>
