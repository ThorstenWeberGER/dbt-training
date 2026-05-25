{% macro cast_timestamp_tz(col) %}
    {%- if target.type == 'snowflake' -%}
        {{ col }}::TIMESTAMP_TZ
    {%- else -%}
        {{ col }}::TIMESTAMPTZ
    {%- endif -%}
{% endmacro %}
