{{ config(materialized='table') }}

-- Grain: one row per product. Joins product_categories seed for enrichment.

SELECT
    {{ dbt_utils.generate_surrogate_key(['p.product_id']) }}  AS product_key,
    p.product_id,
    p.product_name,
    p.category_code,
    pc.category_label,
    pc.is_prescription_required,
    p.price
FROM {{ ref('stg_products') }} AS p
LEFT JOIN {{ ref('product_categories') }} AS pc
    ON p.category_code = pc.category_code
