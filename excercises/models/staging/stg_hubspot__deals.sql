{{ config(materialized='view') }}

SELECT
    deal_id,
    deal_name,
    contact_id,
    stage_id                        AS pipeline_stage_id,
    {{ safe_cast('amount', 'DOUBLE', 0.0) }} AS amount,
    close_date::DATE                AS close_date,
    created_at::TIMESTAMP           AS created_at,
    updated_at::TIMESTAMP           AS updated_at
FROM {{ ref('raw_deals') }}
