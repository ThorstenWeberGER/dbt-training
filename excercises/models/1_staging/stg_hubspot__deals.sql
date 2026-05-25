{{ config(materialized='view') }}

SELECT
    deal_id,
    deal_name,
    contact_id,
    stage_id                        AS pipeline_stage_id,
    amount::DOUBLE                  AS amount,
    close_date::DATE                AS close_date,
    {{ cast_timestamp_tz('_loaded_at') }}   AS loaded_at,
    {{ cast_timestamp_tz('created_at') }}   AS created_at,
    {{ cast_timestamp_tz('updated_at') }}   AS updated_at
FROM {{ source('hubspot', 'deals') }}
