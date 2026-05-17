# Module 06 — Testing Data Quality

**Tier:** 🟢 Beginner · **Duration:** 90 min · **Prerequisites:** Module 05

> **Framing:** Testing is not an optional quality-of-life improvement. CI rejects any Silver or Gold PR that is missing mandatory tests on key columns. This module establishes that expectation from the start and treats `dbt build` as the only acceptable command for running models + tests together.

---

## Agenda

| Time | Duration | Topic | Learning Goal | Mode | Participant Activity | Materials | Trainer Notes | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| 00:00 | 10 min | Recap Module 05 | Confirm sources mental model | Q&A | Answer from memory | — | Ask all 4 prep questions. Probe: "what column does dbt query for freshness?" — `loaded_at_field` | All 4 correct |
| 00:10 | 10 min | Why tests exist — and why they're mandatory | Understand what tests protect and what happens without them | Present | Listen | This doc | Use a real scenario: a column rename in Bronze breaks a staging model silently — no test catches it until a dashboard is wrong two weeks later. | "What's the worst thing that can happen if a transformation breaks silently?" |
| 00:20 | 15 min | Two test types | Know generic vs. singular and when to use each | Present + live code | Annotate examples | This doc | Emphasise: generic tests cover 95% of cases. Singular tests are for complex business rules. Write one of each live. | "Give an example of something a generic test can't express" |
| 00:35 | 20 min | The four generic tests | Write correct test YAML for all four | Present + live code | Follow along in editor | This doc | Write tests live, run `dbt test --select dim_patient`, show pass and fail output. Deliberately break a `not_null` test to see the failure message. | "Write the YAML for a `unique` + `not_null` test on `prescription_key`" |
| 00:55 | 5 min | Test severity: `warn` vs. `error` | Know when to use each | Present | Annotate | This doc | One rule: `error` on key columns and FK relationships. `warn` on soft checks like data completeness ratios. | "What happens in CI if a test is set to `warn`?" |
| 01:00 | 5 min | `dbt build` — the only correct command | Understand why `dbt build` is mandatory in CI | Present | — | This doc | State this clearly: `dbt run && dbt test` is wrong because a model can fail after `run` completes and tests still run. `dbt build` stops at first failure. | "What does `dbt build` do that `dbt run && dbt test` does not?" |
| 01:05 | 5 min | Mandatory test requirements | Know exactly what CI enforces | Present | Write down requirements | This doc | Read these aloud together. These are not suggestions — CI will reject PRs missing them. | "Name the two mandatory tests on every Silver `_key` column" |
| 01:10 | 30 min | Exercise: add tests, break them, read the output | Write tests, run them, interpret failure messages | Practice | Solo exercise | Exercise below | Circulate. Key outcome: participants can write test YAML independently and read failure output without trainer help. | Tests written, failure output correctly interpreted |
| 01:40 | 10 min | Debrief + prep questions | Consolidate | Debrief | Verbal | — | Ask: "what would happen to our dashboards if `fct_prescription.prescription_key` had duplicates and no test caught it?" — ground the stakes. | — |

---

## Content

### Part A — Why Tests Are Mandatory

A dbt model is only trustworthy if it is tested. Without tests:

- A column rename in Bronze breaks a staging model — silently
- Duplicate surrogate keys corrupt Power BI relationships — silently
- A NULL value in a required column propagates downstream — silently
- A Gold mart shows wrong numbers — and nobody knows until the business reports it

**Tests are a CI requirement for Silver and Gold models.** A PR without mandatory tests on key columns will not be merged.

---

### Part B — Two Types of dbt Tests

#### 1. Generic tests — 95% of your tests

Defined in `schema.yml`. Reusable. Apply to columns with minimal YAML.

```yaml
models:
  - name: fct_prescription
    columns:
      - name: prescription_key
        tests:
          - unique
          - not_null
```

#### 2. Singular tests — for complex business rules

Standalone `.sql` files in the `tests/` folder. Return rows on failure (no rows = test passes).

The most common pattern is a `GROUP BY ... HAVING` query that returns rows violating a business rule:

```sql
-- tests/assert_fct_revenue_no_negative_amounts.sql
-- Fails if any combination of keys produces a negative net revenue

SELECT
    customer_key,
    product_key,
    SUM(amount_net) AS total_amount_net
FROM {{ ref('fct_revenue') }}
GROUP BY 1, 2
HAVING total_amount_net < 0
```

Use this pattern for rules that operate on aggregations — things `not_null` and `unique` cannot express. The second common pattern uses `LEFT JOIN ... WHERE IS NULL` for referential checks that cross multiple models:

```sql
-- tests/assert_no_orphan_prescriptions.sql
-- Fails if any prescription has no matching patient

SELECT p.prescription_key
FROM {{ ref('fct_prescription') }} p
LEFT JOIN {{ ref('dim_patient') }} d
    ON p.patient_key = d.patient_key
WHERE d.patient_key IS NULL
```

Use singular tests when the rule cannot be expressed in YAML. They're harder to read — prefer generic tests whenever possible.

---

### Part C — The Four Generic Tests

#### `unique`

```yaml
- name: prescription_key
  tests:
    - unique
```

Fails if any value appears more than once. Required on all `_key` columns in Silver and Gold.

#### `not_null`

```yaml
- name: prescription_key
  tests:
    - not_null
```

Fails if any value is `NULL`. Required on all `_key` columns.

#### `accepted_values`

```yaml
- name: appointment_status
  tests:
    - accepted_values:
        values: ['scheduled', 'completed', 'cancelled', 'no_show']
```

Fails if any value outside the list appears. Use for status columns, type columns, flag columns.

#### `relationships`

```yaml
- name: patient_key
  tests:
    - relationships:
        to: ref('dim_patient')
        field: patient_key
```

Fails if any `patient_key` in this model doesn't exist in `dim_patient`. This is a foreign key integrity check. Required on all FK columns in Silver facts and Gold marts.

---

### Part D — Test Severity

```yaml
- name: prescription_key
  tests:
    - unique:
        severity: error    # CI fails, pipeline stops ← default for key columns
    - not_null:
        severity: error

- name: cancellation_note
  tests:
    - not_null:
        severity: warn     # CI logs a warning but does NOT stop the pipeline
```

**Rule:**
- `error` — all `_key` columns, all FK relationships, all required business columns
- `warn` — soft checks where some nulls are expected (free text fields, optional columns)

CI does not stop on `warn`. It does stop on `error`. Never use `warn` as a workaround for a test you don't want to fix.

---

### Part E — `dbt build` Is the Only Correct Command

```bash
# ❌ WRONG — tests run even if a model failed; run and test are decoupled
dbt run && dbt test

# ✅ CORRECT — stops at the first failure; models and tests run in DAG order
dbt build
```

**What `dbt build` does:**
1. For each node in the DAG, in dependency order:
   - Run the model (or seed/snapshot)
   - Run its tests immediately after
   - If any test fails with `error` severity, stop — do not run downstream models

**Why this matters:** If `dim_patient` has a duplicate `patient_key` test failure, `dbt build` stops before running `fct_prescription` (which depends on `dim_patient`). `dbt run && dbt test` would run all models first, then all tests — by which time you've already loaded bad data into `fct_prescription`.

In CI: always `dbt build`. Locally: prefer `dbt build`. Only use `dbt test --select <model>` when debugging a specific failing test.

---

### Part F — Mandatory Test Requirements

These are checked on every Silver and Gold PR:

| Column type | Required tests |
|---|---|
| `_key` columns (surrogate PKs) | `unique` + `not_null` (both, always) |
| FK columns (referencing another model) | `relationships` |
| Status / type columns | `accepted_values` (if finite value set exists) |
| Business-critical measures | `not_null` |

**What CI checks automatically:**
- Silver and Gold models must have at least one test per `_key` column
- A PR with zero tests on a new Silver model will not pass review

**Reference:** `dbt-test-strategy` skill — full test placement guide across Bronze/Silver/Gold.

---

## Exercise (30 min)

### Task

You are reviewing `fct_prescription.sql`. It has no tests. Add the correct tests to `schema.yml`.

The model has these columns:

| Column | Type | Description |
|---|---|---|
| `prescription_key` | Surrogate PK | MD5 hash |
| `patient_key` | FK → `dim_patient` | — |
| `doctor_key` | FK → `dim_doctor` | — |
| `prescription_date` | Date | — |
| `medication_type` | String | One of: `tablet`, `liquid`, `injection`, `topical` |
| `dosage_amount` | Number | Can be null if not yet confirmed |
| `notes` | String | Optional free text |

**Step 1:** Write the full `schema.yml` block for `fct_prescription` with all required tests.

**Step 2:** Add one `warn`-severity test for `dosage_amount` (not_null with warn).

**Step 3:** Run `dbt test --select fct_prescription`. Then deliberately introduce a duplicate `prescription_key` in your dev environment and run again. Document what the failure output says.

**Step 4 (singular test):** Write a singular test file `tests/assert_fct_prescription_no_zero_dosage.sql` that fails if any `prescription_key` has a `dosage_amount` of exactly `0` (zero is different from null — a zero dosage is a data error). Use the `GROUP BY ... HAVING` pattern. Run it with `dbt test --select test_type:singular`.

---

## Reference Material

- [dbt testing docs](https://docs.getdbt.com/docs/build/data-tests)
- [dbt generic tests](https://docs.getdbt.com/docs/build/data-tests#generic-data-tests)
- [dbt test severity](https://docs.getdbt.com/reference/resource-configs/severity)
- Internal: `dbt-test-strategy` skill — when and where to test per layer

---

## Prep Questions for Module 07

1. What is the difference between a generic test and a singular test?
2. Name the four built-in generic tests.
3. What does `dbt build` do differently from `dbt run && dbt test`?
4. Which two tests are mandatory on every `_key` column in Silver?
