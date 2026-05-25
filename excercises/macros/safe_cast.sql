-- TODO: Module 09 — Implement the safe_cast macro
-- This macro should:
--   - Accept: column_name (string), target_type (string), fallback (optional, default None)
--   - Without fallback: return TRY_CAST({{ column_name }} AS {{ target_type }})
--   - With fallback: return COALESCE(TRY_CAST({{ column_name }} AS {{ target_type }}), {{ fallback }})
--
-- Remove this comment and write the macro body.
{% macro safe_cast(column_name, target_type, fallback=None) %}
    {{ column_name }}
{% endmacro %}
