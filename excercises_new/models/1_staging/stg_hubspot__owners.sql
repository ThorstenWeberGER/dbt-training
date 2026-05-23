{{ config(materialized='view') }}

-- Module 05 exercise: participants write this model after adding 'owners' to sources.yml.
-- Grain: one row per HubSpot owner (mapped to doctor in the healthcare domain).

SELECT
    owner_id,
    first_name,
    last_name,
    email,
    _loaded_at                      AS loaded_at
FROM {{ source('hubspot', 'owners') }}
