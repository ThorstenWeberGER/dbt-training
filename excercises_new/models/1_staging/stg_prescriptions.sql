{{ config(materialized='view') }}

SELECT
    prescription_id,
    contact_id,
    owner_id,
    product_id,
    quantity,
    created_at::TIMESTAMP           AS created_at
FROM {{ source('hubspot', 'prescriptions') }}
