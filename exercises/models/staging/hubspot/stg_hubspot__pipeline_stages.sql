{{ config(materialized='table') }}

SELECT
    pipeline_stage_id,
    stage_name,
    is_closed
FROM {{ source('hubspot', 'pipeline_stages') }}
