---
name: dbt-agents-adding-dbt-unit-test
description: Creates unit test YAML definitions that mock upstream model inputs and validate expected outputs. Use when adding unit tests for a dbt model or practicing test-driven development (TDD) in dbt.
user-invocable: false
metadata:
  author: dbt-labs
---

# Add Unit Test for a dbt Model

dbt unit tests validate SQL modeling logic on static inputs before materializing in production. If any unit test fails, dbt will not materialize that model.

## When to Use

Unit test a model when:
- Adding Model-Input-Output scenarios for intended functionality and edge cases to prevent regressions
- Verifying that a bug fix solves a bug report for an existing model
- Complex SQL: regex, date math, window functions, case statements, complex joins
- Custom logic similar to functions
- Logic with prior bugs reported
- High-criticality models (public, contracted, or upstream of exposures)

**Do NOT unit test:**
- Built-in functions extensively tested by warehouse providers (e.g. `min()`, `max()`)
- Simple passthrough transformations

## General Format

dbt unit test uses a Model-Inputs-Outputs trio:

```yaml
unit_tests:
  - name: test_name
    model: target_model
    given:
      - input: ref('upstream_model')
        rows:
          - {column: value}
    expect:
      rows:
        - {expected_output_column: expected_value}
```

## Workflow

### 1. Choose the model to test

### 2. Mock the inputs
- Create an input for each node the model depends on
- Only include columns relevant to the test case
- Specify `format` if different from default (`dict`)

```bash
dbt show --select upstream_model --limit 5
```

### 3. Mock the output
- Specify expected data given inputs
- Only include columns relevant to the test case

### 4. Ensure upstream models exist before running

Unit tests require direct parent models to exist in the warehouse:

```bash
dbt list --select +my_model --exclude my_model --resource-type model
dbt run --select +my_model --exclude my_model --empty
```

> **Warning:** `--empty` overwrites existing models with schema-only (zero-row) versions.

## Data Formats

| Format | When to Use |
|--------|-------------|
| `dict` (default) | Everything — most readable, only requires relevant columns |
| `csv` | External fixture files with simple data types |
| `sql` | Ephemeral model dependencies (must specify ALL columns) |

**Critical:** `sql` format requires specifying ALL columns. `dict` and `csv` only require columns relevant to the test — much more concise.

## Executing Unit Tests

```bash
# Recommended: builds model first, then runs all tests including unit tests
dbt build --select my_model

# Target a specific unit test by name
dbt test --select "my_model,test_type:unit"
dbt test --select test_my_unit_test_name

# Exclude from production builds (recommended)
dbt build --select my_model --exclude-resource-type unit_test
```

## Realistic Example

```yaml
unit_tests:
  - name: test_status_mapping
    model: orders
    given:
      - input: ref('stg_orders')
        rows:
          - {status_code: 1}
          - {status_code: 2}
    expect:
      rows:
        - {status: 'pending'}
        - {status: 'shipped'}
```

## Supported and Unsupported

**Supported:** SQL models, incremental models (merged/inserted outputs), models in current project

**Unsupported:** Python models, cross-project models, materialized views, recursive SQL, introspective queries

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Testing simple SQL with built-in functions | Only unit test complex logic: regex, date math, window functions |
| Mocking all columns in input data | Only include columns relevant to the test case |
| Using `sql` format when `dict` works | Prefer `dict`; fall back to `sql` only for ephemeral deps or unsupported types |
| Missing `input` for a `ref` or `source` | Include all model dependencies to avoid "node not found" errors |
| Testing Python models | Unit tests only support SQL models |
| Forgetting upstream models don't exist | Run `dbt run --select +my_model --exclude my_model --empty` first |
