{{ config(materialized='table') }}

-- ÃƒÂ¢Ã…Â¡Ã‚Â  BUG (deliberate ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Module 04 fix task):
-- Staging models are always views. Change materialized='table' ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ materialized='view'.

SELECT
    stage_id                        AS pipeline_stage_id,
    stage_name,
    pipeline_id,
    sort_order,
    CAST(probability AS DOUBLE)     AS probability,
    is_closed::BOOLEAN              AS is_closed,
    {{ cast_timestamp_tz('_loaded_at') }}   AS loaded_at
FROM {{ source('hubspot', 'pipeline_stages') }}
