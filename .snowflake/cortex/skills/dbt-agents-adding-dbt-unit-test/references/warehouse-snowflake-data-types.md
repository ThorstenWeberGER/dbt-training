# Snowflake Data Types in Unit Tests

dbt unit tests are designed to test expected values, not data types themselves. dbt casts provided values to the data types inferred from the model.

## Supported Types and Format Examples

```yaml
unit_tests:
  - name: test_snowflake_data_types
    model: my_snowflake_model
    given:
      - input: ref('source_model')
        rows:
          - int_field: 42
            float_field: 3.14
            number_field: 99.99
            str_field: "hello world"
            str_escaped_field: "it's a test"
            date_field: "2024-01-15"
            timestamp_field: "2024-01-15 10:30:00"
            timestamptz_field: "2024-01-15 10:30:00+02:00"
            object_field: '{"key": "value"}'
            variant_field: '{"nested": {"a": 1}}'
            binary_field: "48656C6C6F"    # hex-encoded
    expect:
      rows:
        - int_field: 42
          str_field: "hello world"
```

## Type Handling Notes

| Type | Format to Use |
|------|--------------|
| `DATE` | `"YYYY-MM-DD"` string |
| `TIMESTAMP` / `TIMESTAMP_NTZ` | `"YYYY-MM-DD HH:MM:SS"` string |
| `TIMESTAMP_TZ` | `"YYYY-MM-DD HH:MM:SS+HH:MM"` string |
| `OBJECT` | JSON string `'{"key": "value"}'` |
| `VARIANT` | JSON string |
| `ARRAY` | JSON array string `'["a", "b"]'` |
| `BINARY` | Hex-encoded string |
| `GEOMETRY` / `GEOGRAPHY` | WKT string e.g. `"POINT(0 0)"` |

## Limitations

- Unit tests verify values, not exact type precision (e.g. `FLOAT` vs `NUMBER(10,2)`)
- `GEOGRAPHY` and `GEOMETRY` fields may behave differently across Snowflake editions
- Use `sql` format if `dict` format fails to cast a complex type correctly
