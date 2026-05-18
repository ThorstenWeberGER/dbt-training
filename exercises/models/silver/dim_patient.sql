{{ config(materialized='table') }}

-- One row per contact. Contacts map to patients in our domain.
-- patient_key = contact_id (training simplification — real projects use generate_surrogate_key)

WITH source AS (
    SELECT * FROM {{ ref('stg_hubspot__contacts') }}
)

SELECT
    contact_id  AS patient_key,
    contact_id  AS patient_id,
    email,
    pipeline_id,
    ingested_at
FROM source
