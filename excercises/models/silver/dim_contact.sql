{{ config(materialized='table') }}

-- Grain: one row per contact. Surrogate key: MD5 of contact_id.

SELECT
    {{ dbt_utils.generate_surrogate_key(['contact_id']) }}  AS contact_key,
    contact_id,
    first_name,
    last_name,
    email,
    country_code,
    pipeline_stage_id,
    created_at,
    updated_at
FROM {{ ref('stg_hubspot__contacts') }}
