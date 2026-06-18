-- Gold-layer views expose data to Power BI in Central European Time. 
-- Raw Snowflake timestamps are always stored in UTC, so without conversion 
-- Power BI users see the wrong time.
-- USAGE in the gold layer model:
--   select gold_berlin_view(ref('my_model'))
--   from {{ ref('my_model') }}


{% macro gold_berlin_view(relation) %}
{%- if execute -%}
    {%- set cols_query %}
        SELECT COLUMN_NAME, DATA_TYPE
        FROM {{ relation.database }}.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '{{ relation.schema | upper }}'
          AND TABLE_NAME   = '{{ relation.identifier | upper }}'
        ORDER BY ORDINAL_POSITION
    {%- endset %}
    {%- set rows = run_query(cols_query) -%}
    {%- for row in rows.rows -%}
        {%- if 'TIMESTAMP_TZ' in (row[1] | upper) or 'TIMESTAMP_NTZ' in (row[1] | upper) %}
    convert_timezone('Europe/Berlin', {{ row[0] }})::timestamp_tz AS {{ row[0] }}{{ "," if not loop.last }}
        {%- else %}
    {{ row[0] }}{{ "," if not loop.last }}
        {%- endif -%}
    {%- endfor %}
{%- else -%}
    *
{%- endif -%}
{% endmacro %}
