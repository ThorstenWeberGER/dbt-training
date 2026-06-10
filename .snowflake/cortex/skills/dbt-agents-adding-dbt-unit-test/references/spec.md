# Unit Tests YAML Spec

Full schema for defining unit tests in `models/schema.yml` (or any YAML in `model-paths`).

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique test identifier within the project |
| `model` | string | Target model name |
| `given` | list | Input data specification(s) |
| `expect` | object | Expected output data |

## Input Configuration (`given`)

Each input entry:

```yaml
given:
  - input: ref('upstream_model')       # or source('schema', 'table')
    format: dict                        # dict (default), csv, or sql
    rows:                               # inline data
      - {col1: val1, col2: val2}
    # OR for csv/sql fixture files:
    fixture: my_fixture_name
```

## Expected Output (`expect`)

Same format options as `given`:

```yaml
expect:
  format: dict
  rows:
    - {output_col: expected_value}
```

## Optional Fields

```yaml
unit_tests:
  - name: test_name
    model: model_name
    description: "What this test verifies"
    given: [...]
    expect: {...}
    versions:
      include: [1, 2]     # Only test these versions
      exclude: [3]        # Skip these versions
    config:
      tags: ['unit_test']
      enabled: true       # Set false to disable
    overrides:
      macros:
        is_incremental: false
      vars:
        my_var: test_value
      env_vars:
        MY_ENV: test_value
```

## Full Example

```yaml
unit_tests:
  - name: test_order_status_mapping
    model: fct_orders
    description: "Verifies that status codes map to correct labels"
    given:
      - input: ref('stg_orders')
        rows:
          - {order_id: 1, status_code: 1, amount: 100}
          - {order_id: 2, status_code: 2, amount: 200}
      - input: ref('stg_customers')
        rows:
          - {customer_id: 1, name: 'Alice'}
    expect:
      rows:
        - {order_id: 1, status: 'pending'}
        - {order_id: 2, status: 'shipped'}
    config:
      tags: ['unit_test', 'fct_orders']
```
