{{ config(materialized='view') }}

SELECT
    id                              AS contact_id,
    first_name,
    last_name,
    email,
    UPPER(TRIM(country_code))       AS country_code,
    pipeline_stage_id,
    {{ cast_timestamp_tz('_loaded_at') }}   AS loaded_at,
    {{ cast_timestamp_tz('created_at') }}   AS created_at,
    {{ cast_timestamp_tz('updated_at') }}   AS updated_at
FROM {{ source('hubspot', 'contacts') }}
