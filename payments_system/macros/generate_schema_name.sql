-- macros/generate_schema_name.sql
-- Overrides dbt's default schema-naming behaviour.
--
-- dbt default: prefixes every custom schema with the target schema
--   e.g. target.schema='dev' + custom_schema='bloomwell_staging' → 'dev_bloomwell_staging'
--
-- This override: uses the custom schema name exactly as written in dbt_project.yml,
--   so models land in the schema you specified without any environment prefix.
--   If no custom schema is set, falls back to target.schema from profiles.yml.

{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}           {#-- no +schema config → use profile target schema as-is --#}
    {%- else -%}
        {{ custom_schema_name | trim }}  {#-- +schema set → use it verbatim, strip whitespace --#}
    {%- endif -%}
{%- endmacro %}