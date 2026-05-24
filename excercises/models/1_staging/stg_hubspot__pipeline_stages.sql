{{ config(materialized='view') }}

SELECT
    stage_id                        AS pipeline_stage_id,
    stage_name,
    pipeline_id,
    sort_order,
    CAST(probability AS DOUBLE)     AS probability,
    is_closed::BOOLEAN              AS is_closed,
    _loaded_at                      AS loaded_at
FROM {{ source('hubspot', 'pipeline_stages') }}
