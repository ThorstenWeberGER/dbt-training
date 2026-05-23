{{ config(materialized='view') }}

SELECT
    id                              AS contact_id,
    first_name,
    last_name,
    email,
    UPPER(TRIM(country_code))       AS country_code,
    pipeline_stage_id,
    _loaded_at                      AS loaded_at,
    created_at::TIMESTAMP           AS created_at,
    updated_at::TIMESTAMP           AS updated_at
FROM {{ source('hubspot', 'contacts') }}
