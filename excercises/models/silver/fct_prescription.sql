{{ config(materialized='table') }}

-- Grain: one row per prescription.

WITH source AS (
    SELECT * FROM {{ ref('stg_prescriptions') }}
),

contacts AS (
    SELECT contact_id, contact_key FROM {{ ref('dim_contact') }}
),

products AS (
    SELECT product_id, product_key FROM {{ ref('dim_product') }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['s.prescription_id']) }} AS prescription_key,
    s.prescription_id,
    c.contact_key,
    p.product_key,
    s.doctor_id,
    s.quantity,
    s.created_at
FROM source AS s
LEFT JOIN contacts AS c  ON s.contact_id  = c.contact_id
LEFT JOIN products AS p  ON s.product_id  = p.product_id
