{{ config(materialized='view') }}

SELECT
    prescription_id,
    contact_id,
    owner_id,
    product_id,
    quantity,
    prescription_date,
    medication_type,
    dosage_amount::DOUBLE            AS dosage_amount,
    notes,
    created_at::TIMESTAMP            AS created_at,
    _loaded_at::TIMESTAMP            AS loaded_at
FROM {{ source('hubspot', 'prescriptions') }}
