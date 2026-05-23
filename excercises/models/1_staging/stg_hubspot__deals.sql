{{ config(materialized='view') }}

SELECT
    deal_id,
    deal_name,
    contact_id,
    stage_id                        AS pipeline_stage_id,
    {{ safe_cast('amount', 'DOUBLE') }} AS amount,
    close_date::DATE                AS close_date,
    _loaded_at                      AS loaded_at,
    created_at::TIMESTAMP           AS created_at,
    updated_at::TIMESTAMP           AS updated_at
FROM {{ source('hubspot', 'deals') }}
