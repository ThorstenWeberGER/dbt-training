{{ config(materialized='view') }}

SELECT
    prescription_id,
    contact_id,
    doctor_id,
    product_id,
    quantity,
    created_at::TIMESTAMP           AS created_at
FROM {{ ref('raw_prescriptions') }}
