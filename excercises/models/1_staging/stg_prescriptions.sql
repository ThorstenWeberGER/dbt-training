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
    {{ cast_timestamp_tz('created_at') }}   AS created_at,
    {{ cast_timestamp_tz('_loaded_at') }}   AS loaded_at
FROM {{ source('hubspot', 'prescriptions') }}
