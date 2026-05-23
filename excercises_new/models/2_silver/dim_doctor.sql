{{ config(materialized='table') }}

-- Grain: one row per doctor (HubSpot owner). SCD1 — full rebuild each run.
-- Depends on stg_hubspot__owners, which participants write in Module 05.

SELECT
    {{ dbt_utils.generate_surrogate_key(['owner_id']) }}    AS doctor_key,
    owner_id,
    first_name,
    last_name,
    email,
    loaded_at
FROM {{ ref('stg_hubspot__owners') }}
