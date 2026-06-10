# Writing Data Tests in dbt

Write high-value tests that catch real data issues — not tests that burn warehouse credits on low-signal checks.

## Test Tiers

### Tier 1 — Always Add
Protect structural integrity:
```yaml
- name: orders
  columns:
    - name: order_id
      tests:
        - unique
        - not_null
    - name: customer_id
      tests:
        - not_null
        - relationships:
            to: ref('dim_customers')
            field: customer_id
```

### Tier 2 — Add When Justified by Discovery
Column-level tests based on what you found during data discovery:
```yaml
- name: status
  tests:
    - accepted_values:
        values: ['pending', 'shipped', 'returned', 'cancelled']
```

Only add `accepted_values` for values you verified actually exist — never assume.

### Tier 3 — Selective Business Logic Tests
Multi-column logic or constrained value sets:
```yaml
- name: orders
  tests:
    - dbt_utils.expression_is_true:
        expression: "total_amount = subtotal + tax + shipping"
```

### Tier 4 — Avoid (Low Signal, High Cost)
- Excessive `not_null` on every column
- Multiple `expression_is_true` tests per model
- `unique` on non-key columns
- Tests that just verify "SQL ran" rather than test actual assumptions

## Strategic Placement by Layer

| Layer | What to Test |
|-------|-------------|
| **Staging** | Data hygiene, basic nulls, format validation |
| **Intermediate** | Grain changes, join-induced fan-outs |
| **Marts** | Business expectations, calculated field correctness |

## Cost Optimization

For large tables, scope tests to recent data:
```yaml
- name: order_id
  tests:
    - unique:
        config:
          where: "created_at >= dateadd(day, -30, current_date)"
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `accepted_values` based on assumptions | Run discovery first, base values on actual data |
| Testing that SQL ran correctly | Test invariants and business assumptions instead |
| `not_null` on every column | Only where nulls would break downstream logic |
| No tests on intermediate models | Grain changes and joins deserve tests |
