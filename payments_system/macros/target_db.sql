{% macro target_db(base_name) -%}
    {%- set env = var('env', 'prod' if (target.name | lower == 'prod') else 'dev') -%}
    {%- if env | lower == 'prod' -%}
        {{ base_name | upper }}
    {%- else -%}
        {{ (base_name ~ '_DEV') | upper }}
    {%- endif -%}
{%- endmacro %}
