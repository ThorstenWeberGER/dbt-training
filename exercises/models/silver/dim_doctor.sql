{{ config(materialized='table') }}

-- One row per HubSpot owner. Owners map to doctors in our domain.

WITH source AS (
    SELECT * FROM {{ ref('stg_hubspot__owners') }}
)

SELECT
    owner_id    AS doctor_key,
    first_name,
    last_name,
    email,
    ingested_at
FROM source
