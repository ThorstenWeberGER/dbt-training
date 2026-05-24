-- TODO: Module 09 — Implement the safe_cast macro
-- This macro should:
--   - Accept: column_name (string), target_type (string)
--   - Return: TRY_CAST({{ column_name }} AS {{ target_type }}) for Snowflake
--   - For DuckDB (target.type == 'duckdb'): use a plain CAST instead
--
-- Remove this comment and write the macro body.
{% macro safe_cast(column_name, target_type) %}
    {{ column_name }}
{% endmacro %}
