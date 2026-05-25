{{ config(materialized='view') }}

SELECT
    product_id,
    product_name,
    UPPER(TRIM(category_code))      AS category_code,
    CAST(price AS DOUBLE)           AS price,
    {{ cast_timestamp_tz('created_at') }}   AS created_at
FROM {{ source('hubspot', 'products') }}
