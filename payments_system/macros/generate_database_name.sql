-- macros/generate_database_name.sql
-- Overrides dbt's default database-naming behaviour.
--
-- Delegates to target_db() so every database reference is env-aware:
--   dev  target → appends _DEV  (e.g. SILVER → SILVER_DEV)
--   prod target → uses name as-is (e.g. SILVER → SILVER)
-- none fallback: models with no +database config land in STAGING
--   (STAGING_DEV in dev, STAGING in prod).
-- else branch:   +database value from dbt_project.yml is passed through
--   target_db(), so BRONZE/SILVER/GOLD/BLOOMWELL_REFERENCE all resolve correctly.

{% macro generate_database_name(custom_database_name, node) -%}
    {%- if custom_database_name is none -%}
        {{ target_db('STAGING') }}
    {%- else -%}
        {{ target_db(custom_database_name | trim) }}
    {%- endif -%}
{%- endmacro %}
