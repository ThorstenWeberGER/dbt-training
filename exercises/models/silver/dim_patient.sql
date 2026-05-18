{{ config(materialized='table') }}

-- One row per contact. Contacts map to patients in our domain.

WITH source AS (
    SELECT * FROM {{ ref('stg_hubspot__contacts') }}
)

SELECT
    contact_id  AS patient_key,
    email,
    pipeline_id,
    loaded_at
FROM source
