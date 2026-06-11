---
name: dbt-test-strategy
description: >
  Design and implement a complete dbt data quality test strategy for Bronze/Silver/Gold
  medallion architecture on Snowflake. Use this skill whenever someone asks about dbt testing,
  data quality checks, test coverage, where to place tests, which test types to use, how to
  configure test severity (error vs warn), or how to set up Snowflake email notifications for
  test failures. Also trigger for questions like "should I test this in silver or gold?",
  "when do I use a unit test vs singular test?", "how do I avoid testing duplication?",
  "how do I test dimension completeness?", or any request to audit, design, or improve
  a dbt test suite. Always use this skill before writing any dbt test YAML or SQL.
---

# dbt Test Strategy — Bronze / Silver / Gold on Snowflake

## Core Philosophy: Test-Smarter, Not Harder

> **Maximum signal at minimum cost.**

Over-testing creates noise and erodes team trust. Under-testing lets silent failures corrupt reports.
The right balance comes from two governing rules:

1. **Test as early as possible** — for data arriving from sources outside your control
2. **Never duplicate tests across layers** — for columns you transformed yourself

---

## 1. Decision Framework: Should I Add This Test?

For every potential test, run through this decision matrix:

| Question | If YES | If NO |
|---|---|---|
| Would failure silently corrupt a KPI? | Test it | Consider skipping |
| Is this from an external source? | Test at Bronze/Silver | Skip in Gold |
| Was this column transformed in this layer? | Test here | Already tested upstream |
| Would a stakeholder call about this? | `error` severity | `warn` or skip |

**The Net-New Principle**: Only test what is new or transformed in the current layer.

```
Silver tests customer_id → not_null, unique ✓
Gold SELECTs customer_id unchanged → SKIP in gold ✗

Silver has no test on customer_segment
Gold derives it via CASE WHEN + JOIN → TEST in gold ✓
```

**Exception**: If Gold introduces a `LEFT JOIN`, `COALESCE`, or surrogate key generation on a
previously-tested column, a new failure surface exists — test again.

---

## 2. Testing by Medallion Layer

| Layer | Role | What to Test | Default Severity | What to Skip |
|---|---|---|---|---|
| **Bronze** | Raw source data | Source freshness, PK `not_null`, row count > 0 | `warn` | Uniqueness (duplicates expected), value ranges |
| **Silver** | Cleaned & conformed | PK `unique` + `not_null`, FK relationships, enum `accepted_values`, cross-column rules | `error` on keys, `warn` on soft rules | Columns passed unchanged from Bronze |
| **Gold** | Business-ready mart | PK integrity, FK joins, all dim columns filled, metric sanity checks | `error` | Anything validated in Silver and unchanged |

### Bronze Checklist
- [ ] Source freshness configured in `sources.yml`
- [ ] `not_null` on primary key column only
- [ ] Row count > 0 via `dbt_utils.expression_is_true`

### Silver Checklist
- [ ] `unique` + `not_null` on every PK
- [ ] `relationships` for every FK to a dim table
- [ ] `accepted_values` for status/type enums (if stable)
- [ ] One singular test if cross-column logic is present

### Gold Checklist
- [ ] `unique` + `not_null` on PK — always, no exceptions
- [ ] `relationships` on all FKs
- [ ] UNION ALL singular test for dimension column completeness
- [ ] Row count sanity check on fact tables
- [ ] Unit test if complex business calculation lives here

---

## 3. Test Types — When to Use Each

| Scenario | Test Type |
|---|---|
| PK/FK integrity, not-null, enum values | Generic (schema.yml) |
| Cross-column business rule | Singular SQL test |
| Complex transformation logic | Unit test |
| Source data arrival | Source freshness |
| All columns not-null in Gold dim | Singular SQL with UNION ALL |

### Generic Tests (schema.yml)
Your baseline. Fast, declarative, easy to maintain. Use for all structural integrity checks.

Use `data_tests:` (dbt v1.8+). Arguments to parametrized tests go under `arguments:`;
severity and other options go under `config:`. Simple tests (`unique`, `not_null`) need
no sub-keys.

```yaml
columns:
  - name: ticket_id
    data_tests:
      - unique
      - not_null
  - name: status
    data_tests:
      - accepted_values:
          arguments:
            values: ['open', 'closed', 'pending']
  - name: customer_id
    data_tests:
      - relationships:
          arguments:
            to: ref('dim_customer')
            field: customer_id
```

### Singular Tests (tests/*.sql)
Custom SQL returning failing rows. Use sparingly — only for business rules generics can't express.
**Limit: 2–5 per critical fact table.**

```sql
-- tests/assert_resolved_after_created.sql
select * from {{ ref('fct_tickets') }}
where resolved_at < created_at
```

Use for: cross-column logic, date ordering rules, outlier thresholds.

### Unit Tests (dbt 1.8+)
Test SQL logic in isolation with fixed input/output pairs.

```yaml
unit_tests:
  - name: test_sla_bucket_assignment
    model: fct_tickets
    given:
      - input: ref('silver_tickets')
        rows:
          - {ticket_id: 1, response_hours: 2}
    expect:
      rows:
        - {ticket_id: 1, sla_bucket: 'within_sla'}
```

Use for: complex CASE/WHEN chains, window functions, SLA bucketing, aggregation formulas.
**Do NOT use for**: simple column renames, casts, or pass-through selects.

### Source Freshness
Always enable — cheapest high-value signal in the stack.

```yaml
sources:
  - name: hubspot
    freshness:
      warn_after: {count: 6, period: hour}
      error_after: {count: 24, period: hour}
    loaded_at_field: _loaded_at
```

---

## 4. Gold Dimension Completeness — UNION ALL Pattern

**Problem**: Writing individual `not_null` per column = 10–20 test entries, schema.yml noise, slow runtime.

**Solution**: One singular test returning which column is null and which row is affected.

```sql
-- tests/assert_dim_customer_no_nulls.sql
{% set cols = [] %}
{% if execute %}
  {% set cols = adapter.get_columns_in_relation(ref('dim_customer')) %}
{% endif %}

{% for col in cols %}
select
    customer_id,
    '{{ col.name }}' as failing_column
from {{ ref('dim_customer') }}
where {{ col.name }} is null
{% if not loop.last %} union all {% endif %}
{% endfor %}
```

> **Always include the `{% if execute %}` guard.** Without it, `dbt parse` and `dbt compile`
> fail when the model doesn't yet exist in target.

**Column priority in Gold dimensions:**

| Column Type | Test? | Severity |
|---|---|---|
| Surrogate / natural key | Yes — individually | `error` |
| Core business attributes (name, type, status) | Yes — grouped UNION ALL | `error` |
| Descriptive attributes (phone, address) | Optional — grouped | `warn` |
| Audit columns (loaded_at, source_system) | Skip or grouped | `warn` |

---

## 5. JOIN Strategy — LEFT JOIN by Default

**Risk of INNER JOIN**: Unmatched rows are silently dropped. A fact table with 50,000 rows
silently becomes 49,950 — no error, no warning, no trace.

**Use LEFT JOIN in production**: NULLs are detectable and testable; row count is preserved.

```sql
-- gold/fct_tickets.sql
select
    t.ticket_id,
    d.customer_name,  -- NULL if join fails → detectable
    d.segment
from silver_tickets t
left join dim_customer d on t.customer_id = d.customer_id
```

```yaml
# schema.yml
- name: customer_name
  tests:
    - not_null:
        config:
          severity: error  # catches failed LEFT JOIN explicitly
```

**Add a row count sanity check on critical fact tables:**

```sql
-- tests/assert_fct_tickets_row_count.sql
select count(*) as actual
from {{ ref('fct_tickets') }}
having count(*) < (select count(*) * 0.95 from {{ ref('silver_tickets') }})
```

**INNER JOIN is still correct when**: The relationship is guaranteed and validated upstream, OR
row exclusion is intentional by design.

---

## 6. Severity Configuration — error vs. warn

**The single deciding question**: "Should the pipeline stop if this test fails?"
- If yes → `error`
- If the failure is worth knowing but pipeline can continue → `warn`

**Severity decision matrix:**

| | Failure is silent | Failure is obvious |
|---|---|---|
| **High business impact** | `error` — block immediately | `error` — block immediately |
| **Low business impact** | `warn` — alert but continue | skip or `warn` |

**Classification questions for each test:**
1. Who consumes this model? Dashboard/KPI → higher severity. Internal intermediate → lower.
2. Is the failure silent or obvious? Wrong aggregation is silent. A broken chart is obvious.
3. Can your team act on it? If source system owns the fix → `warn` (can't block what you can't fix).
4. Is it a key or a value? Keys always error. Values depend on business meaning.
5. Does it compound downstream? One bad row → 1,000 bad report rows → `error`.

**Severity by test type:**

| Test | Layer | Severity |
|---|---|---|
| PK `unique` + `not_null` | All | `error` |
| FK relationships | Silver, Gold | `error` |
| `not_null` on business-critical columns | Gold | `error` |
| `accepted_values` on stable enums | Silver, Gold | `error` |
| `accepted_values` on evolving enums | Any | `warn` |
| `not_null` on optional/descriptive columns | Any | `warn` |
| Source freshness — critical source | Bronze | `error` |
| Source freshness — non-critical source | Bronze | `warn` |
| Row count anomaly | Gold | `warn_if` → `error_if` |

**Threshold-based severity** (ideal for migrations / new source onboarding):
```yaml
- not_null:
    config:
      warn_if: ">0"    # immediate visibility
      error_if: ">10"  # blocks pipeline above threshold
```

**Environment-conditional severity** (dev: warn, prod: error):
```yaml
- not_null:
    config:
      severity: "{{ 'error' if target.name == 'prod' else 'warn' }}"
```

---

## 7. Anti-Patterns — What Not to Do

| Anti-Pattern | Why Harmful | What to Do Instead |
|---|---|---|
| `not_null` on every column individually | Schema noise, slow runtime | Use grouped UNION ALL singular test |
| Repeating Silver tests in Gold for unchanged columns | Zero signal, double runtime | Apply the net-new principle |
| `error` on soft business rules | Frequent false blocks, erodes team trust | Use `warn` or `warn_if` thresholds |
| Unit tests for simple renames/casts | Maintenance burden for zero risk | Reserve unit tests for complex logic only |
| `accepted_values` on frequently-changing lists | Constant false failures | Use `warn`, or drop the test |
| No test on Gold PK | Silent corruption of all downstream reports | Always test PK `unique` + `not_null` in Gold |
| INNER JOIN without row count check | Silent row loss | LEFT JOIN + `not_null` or row count test |

---

## 8. Snowflake Email Notifications

Architecture: entirely dbt + Snowflake native. No external orchestrator needed.

```
dbt test runs
→ store_failures: true → AUDIT schema tables
→ on-run-end hook → macro queries results object
→ SYSTEM$SEND_EMAIL fires once with all failures
```

### Step 1 — Snowflake Email Integration (one-time, ACCOUNTADMIN)
```sql
CREATE OR REPLACE NOTIFICATION INTEGRATION dbt_email_integration
  TYPE = EMAIL
  ENABLED = TRUE
  ALLOWED_RECIPIENTS = ('you@company.com', 'team@company.com');
```
> **Requires ACCOUNTADMIN**. After creation, each recipient receives a confirmation email from
> Snowflake — they must click the link to activate. Validation is asynchronous (allow a few minutes).
> Emails to unvalidated recipients are silently blocked — test the integration before going live
> by calling `CALL SYSTEM$SEND_EMAIL(...)` manually in a Snowflake worksheet.

### Step 2 — Enable store_failures

```yaml
# dbt_project.yml — enable globally
tests:
  +store_failures: true
  +schema: audit
```

Or per test with readable alias:
```yaml
- name: customer_id
  tests:
    - not_null:
        config:
          store_failures: true
          schema: audit
          alias: fct_tickets_customer_id_nulls
```

### Step 3 — Notification Macro

```sql
-- macros/notify_on_failure.sql
{% macro notify_on_failure() %}
{% set error_tests = [] %}
{% set warn_tests = [] %}

{% for result in results %}
  {% if result.status == 'fail' %}
    {% do error_tests.append(result.node.name) %}
  {% elif result.status == 'warn' %}
    {% do warn_tests.append(result.node.name) %}
  {% endif %}
{% endfor %}

{% if error_tests | length > 0 or warn_tests | length > 0 %}
{% set body %}
dbt Test Failures — {{ run_started_at.strftime('%Y-%m-%d %H:%M') }} UTC

ERRORS ({{ error_tests | length }}) — pipeline blocked:
{% for t in error_tests %} - {{ t }}{% endfor %}

WARNINGS ({{ warn_tests | length }}) — pipeline continued:
{% for t in warn_tests %} - {{ t }}{% endfor %}

Investigate: SELECT * FROM AUDIT.<test_name> LIMIT 50;
Pipeline: {{ target.name }}
{% endset %}

{% set subject %}
{% if error_tests | length > 0 %}dbt ERRORS: {{ error_tests | length }} failed
{% else %}dbt WARNINGS: {{ warn_tests | length }} flagged{% endif %} — {{ run_started_at.strftime('%Y-%m-%d') }}
{% endset %}

{% do run_query("CALL SYSTEM$SEND_EMAIL('dbt_email_integration', 'team@company.com', '" ~ subject ~ "', '" ~ body | replace("'", "\\'") ~ "');") %}
{% endif %}
{% endmacro %}
```

### Step 4 — Attach to dbt Lifecycle Hook

```yaml
# dbt_project.yml
on-run-end:
  - "{{ notify_on_failure() }}"
```

One summary email per pipeline run — not one per test.

### Optional: Snowflake Alert Fallback

For pipeline crashes mid-run:
```sql
CREATE OR REPLACE ALERT dbt_audit_watcher
  WAREHOUSE = compute_wh
  SCHEDULE = 'USING CRON 0 6 * * * Europe/Berlin'
  IF (EXISTS (
    SELECT * FROM audit.fct_tickets_customer_id_nulls
    WHERE _dbt_inserted_at >= DATEADD(hour, -24, current_timestamp)
  ))
  THEN CALL SYSTEM$SEND_EMAIL(
    'dbt_email_integration', 'team@company.com',
    'Snowflake Alert: Unresolved dbt failures detected',
    'Failing rows still present in AUDIT schema. Check audit tables.'
  );
```

---

## 9. Adding Tests to a New Model — Priority Order

Stop when marginal value drops:

1. `unique` + `not_null` on PK → **always**
2. `relationships` on FKs → **always if FK exists**
3. `accepted_values` on stable enums → if 3+ values expected to be stable
4. Singular test → only if a cross-column business rule matters
5. Unit test → only if SQL logic involves non-trivial computation

**Target: 3–6 tests per model** — the sweet spot for medium-risk projects.

---

## 10. Maintenance Red Flags

Signs the test suite needs adjustment:
- Tests blocking pipeline >3× per week on non-critical issues
- AUDIT tables growing unbounded (implement cleanup job)
- Team bypassing or ignoring test failures
- Email alerts ignored (alert fatigue → recalibrate severity)
- Tests taking >10% of total pipeline runtime
- New models consistently deployed without tests

**Quarterly review:** Check false positive rates, remove tests that never fire and aren't critical,
update `accepted_values` for evolved enums, review AUDIT schema table sizes.
