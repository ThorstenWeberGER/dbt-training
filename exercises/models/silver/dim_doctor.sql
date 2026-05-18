{{ config(materialized='table') }}

-- One row per HubSpot owner. Owners map to doctors in our domain.
-- doctor_key = owner_id (training simplification — real projects use generate_surrogate_key)

WITH source AS (
    SELECT * FROM {{ ref('stg_hubspot__owners') }}
)

SELECT
    owner_id    AS doctor_key,
    owner_id    AS doctor_id,
    first_name,
    last_name,
    email,
    ingested_at
FROM source
