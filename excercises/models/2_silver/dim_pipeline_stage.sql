{{ config(materialized='table') }}

-- Grain: one row per pipeline stage.

SELECT
    {{ dbt_utils.generate_surrogate_key(['pipeline_stage_id']) }} AS pipeline_stage_key,
    pipeline_stage_id,
    stage_name,
    pipeline_id,
    sort_order,
    probability,
    is_closed
FROM {{ ref('stg_hubspot__pipeline_stages') }}
