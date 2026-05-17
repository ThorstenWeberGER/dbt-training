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
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">Bloomwell Data & Analytics · dbt Training</div>
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

**At Bloomwell, tests are a CI requirement**

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

# Two Types of dbt Tests

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

**Generic tests — 95% of what you'll write**

Defined in `schema.yml`. Reusable. Parameterised.

```yaml
models:
  - name: fct_prescription
    columns:
      - name: prescription_key
        tests:
          - unique
          - not_null
      - name: patient_key
        tests:
          - relationships:
              to: ref('dim_patient')
              field: patient_key
```

</div>
<div>

**Singular tests — for complex business rules**

Standalone `.sql` files in `tests/`. Return rows on failure.

```sql
-- tests/assert_no_orphan_prescriptions.sql
-- Returns rows if any prescription has no patient

SELECT p.prescription_key
FROM {{ ref('fct_prescription') }} p
LEFT JOIN {{ ref('dim_patient') }} d
    ON p.patient_key = d.patient_key
WHERE d.patient_key IS NULL
```

<div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
  Use singular tests only when the rule can't be expressed in YAML. Harder to read — prefer generic.
</div>

</div>
</div>

<!--
The no-rows-means-pass convention for singular tests is counterintuitive — worth saying explicitly. The SQL should be written to SELECT the *failing* rows. If the SELECT returns nothing, there are no failures, and the test passes.

Generic tests cover almost everything at Bloomwell. The only common singular test pattern is orphan FK checks that require a LEFT JOIN — which the relationships generic test handles more elegantly in most cases.
-->

---

# The Four Generic Tests

<div class="mt-4 space-y-3">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="grid grid-cols-2 gap-4">
  <div>
    <div class="font-mono text-emerald-600 font-semibold mb-1">unique</div>

```yaml
- name: prescription_key
  tests:
    - unique
```

  </div>
  <div class="text-sm text-slate-600 flex items-center">Fails if any value appears more than once. Required on all <code>_key</code> columns.</div>
  </div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="grid grid-cols-2 gap-4">
  <div>
    <div class="font-mono text-emerald-600 font-semibold mb-1">not_null</div>

```yaml
- name: prescription_key
  tests:
    - not_null
```

  </div>
  <div class="text-sm text-slate-600 flex items-center">Fails if any value is NULL. Required on all <code>_key</code> columns.</div>
  </div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="grid grid-cols-2 gap-4">
  <div>
    <div class="font-mono text-emerald-600 font-semibold mb-1">accepted_values</div>

```yaml
- name: medication_type
  tests:
    - accepted_values:
        values: ['tablet','liquid','injection']
```

  </div>
  <div class="text-sm text-slate-600 flex items-center">Fails if any value outside the list appears. Use for status/type columns.</div>
  </div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="grid grid-cols-2 gap-4">
  <div>
    <div class="font-mono text-emerald-600 font-semibold mb-1">relationships</div>

```yaml
- name: patient_key
  tests:
    - relationships:
        to: ref('dim_patient')
        field: patient_key
```

  </div>
  <div class="text-sm text-slate-600 flex items-center">FK integrity check. Required on all FK columns in Silver facts and Gold marts.</div>
  </div>
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

```yaml
- name: prescription_key
  tests:
    - unique:
        severity: error   # ← CI stops, pipeline halts
    - not_null:
        severity: error

- name: dosage_amount
  tests:
    - not_null:
        severity: warn    # ← logged, pipeline continues
```

**Rule at Bloomwell:**
- `error` → all `_key` columns, all FK relationships
- `warn` → soft checks, optional columns

</div>
<div>

**`dbt build` — the only correct command**

```bash
# ❌ WRONG
dbt run && dbt test

# ✅ CORRECT — always
dbt build
```

`dbt build` runs models and tests **in DAG order**. If `dim_patient` fails a test, `fct_prescription` (which depends on it) is **never built**.

`dbt run && dbt test` runs all models first — loading bad data into `fct_prescription` before the tests even run.

<div class="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
  Never use <code>dbt run && dbt test</code> in CI. Always <code>dbt build</code>.
</div>

</div>
</div>

<!--
The dbt build vs dbt run distinction is the most important practical takeaway from this module.

Concrete scenario: dim_patient has a not_null test on patient_key. A bad Lambda run loaded 500 NULL patient_keys. dbt run builds dim_patient (NULL keys included), then builds fct_prescription with those bad keys joined in. Then dbt test fails. By this point, corrupt data is already in fct_prescription.

With dbt build: dim_patient model runs, not_null test runs immediately after, fails with error severity, pipeline stops. fct_prescription is never built. No corrupt data.

Ask: "What does dbt build do that dbt run && dbt test does not?" → Runs tests in DAG order, immediately after each model, and stops downstream builds on failure.
-->

---

# Bloomwell Mandatory Test Requirements

<div class="mt-4">

| Column type | Required tests |
|---|---|
| `_key` columns (surrogate PKs) | `unique` + `not_null` (both, always) |
| FK columns (referencing another model) | `relationships` |
| Status / type columns | `accepted_values` (if finite value set exists) |
| Business-critical measures | `not_null` |

</div>

<div class="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
  <strong>CI check:</strong> Silver and Gold models must have at least one test per <code>_key</code> column. A PR with zero tests on a new Silver model will not pass review. This is checked manually via the <code>dbt-test-strategy</code> skill until CI automation is complete.
</div>

<div class="mt-3 text-xs text-slate-400">Full test placement guide (when to test in Bronze vs Silver vs Gold, store_failures config, dbt-expectations) → <code>dbt-test-strategy</code> skill</div>

<!--
Read this table aloud together. Treat it like a checklist — because that's exactly how it's used in the pre-merge review.

Ask: "Name the two tests mandatory on every Silver _key column." → unique + not_null. Both. Always. Not one or the other.

Don't use warn as a workaround. warn means "this test failing is acceptable." If it's acceptable for prescription_key to be null, the model design is wrong, not the test severity.
-->

---

# Exercise: Write Tests for `fct_prescription` (30 min)

**The model has no tests. Add the complete test suite to `schema.yml`.**

<div class="mt-4">

| Column | Type | Notes |
|---|---|---|
| `prescription_key` | Surrogate PK | MD5 hash |
| `patient_key` | FK → `dim_patient` | — |
| `doctor_key` | FK → `dim_doctor` | — |
| `prescription_date` | Date | Required |
| `medication_type` | String | `tablet`, `liquid`, `injection`, `topical` |
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
- prescription_key: unique + not_null
- patient_key: not_null + relationships to dim_patient
- doctor_key: not_null + relationships to dim_doctor
- prescription_date: not_null
- medication_type: accepted_values for ['tablet','liquid','injection','topical']
- dosage_amount: not_null with severity: warn
- notes: no test required (optional free text)

Circulate. If anyone finishes early, ask them to also write a singular test that checks for any prescription with a prescription_date in the future.
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
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: What does dbt build do differently from dbt run && dbt test?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q4: Two mandatory tests on every _key column in Silver?</div>
  </div>
</div>
