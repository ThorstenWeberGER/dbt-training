{{ config(materialized='view') }}

SELECT
    product_id,
    product_name,
    UPPER(TRIM(category_code))      AS category_code,
    CAST(price AS DOUBLE)           AS price,
    created_at::TIMESTAMP           AS created_at
FROM {{ ref('raw_products') }}
