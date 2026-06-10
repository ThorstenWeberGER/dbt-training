# Unit Test Examples

## Example: Email Validation (dict format)

Model `dim_customers` includes a calculated `is_valid_email_address` field:

```yaml
unit_tests:
  - name: test_is_valid_email_address
    model: dim_customers
    given:
      - input: ref('stg_customers')
        rows:
          - {customer_id: 1, email: 'valid@example.com'}
          - {customer_id: 2, email: 'no-at-sign.com'}
          - {customer_id: 3, email: 'no-dot@example'}
          - {customer_id: 4, email: 'invalid@baddomain.xyz'}
    expect:
      rows:
        - {customer_id: 1, is_valid_email_address: true}
        - {customer_id: 2, is_valid_email_address: false}
        - {customer_id: 3, is_valid_email_address: false}
        - {customer_id: 4, is_valid_email_address: false}
```

## Example: CSV Format (inline)

```yaml
unit_tests:
  - name: test_order_totals_csv
    model: fct_orders
    given:
      - input: ref('stg_order_items')
        format: csv
        rows: |
          order_id,item_price,quantity
          1,10.00,2
          1,5.00,1
          2,20.00,1
    expect:
      format: csv
      rows: |
        order_id,total_amount
        1,25.00
        2,20.00
```

## Example: CSV Format (fixture file)

```yaml
unit_tests:
  - name: test_with_fixture
    model: fct_orders
    given:
      - input: ref('stg_orders')
        format: csv
        fixture: stg_orders_fixture    # reads from tests/fixtures/stg_orders_fixture.csv
    expect:
      format: csv
      fixture: fct_orders_expected    # reads from tests/fixtures/fct_orders_expected.csv
```

## Example: SQL Format (for ephemeral dependencies)

When upstream is an ephemeral model, you must use `sql` format and supply ALL columns:

```yaml
unit_tests:
  - name: test_ephemeral_dependency
    model: my_model
    given:
      - input: ref('my_ephemeral_model')
        format: sql
        rows: |
          select
            1 as id,
            'value' as col1,
            current_timestamp as created_at,
            null as optional_col
    expect:
      rows:
        - {id: 1, result: 'processed_value'}
```

> **Note:** `sql` format requires specifying ALL columns. Jinja is not supported in SQL fixtures.

## Example: Minimal Test

```yaml
unit_tests:
  - name: test_hello_world
    model: hello_world
    given: []
    expect:
      rows:
        - {hello: world}
```
