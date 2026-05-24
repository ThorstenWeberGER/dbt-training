{{ config(materialized='table') }}

-- Grain: one row per pipeline stage showing deal funnel metrics.

SELECT
    ps.stage_name,
    ps.sort_order,
    ps.probability,
    ps.is_closed,
    COUNT(d.deal_id)            AS deal_count,
    COALESCE(SUM(d.amount), 0)  AS total_amount,
    COALESCE(AVG(d.amount), 0)  AS avg_amount
FROM {{ ref('dim_pipeline_stage') }} AS ps
LEFT JOIN {{ ref('fct_deal') }}       AS d  ON ps.pipeline_stage_key = d.pipeline_stage_key
GROUP BY ps.stage_name, ps.sort_order, ps.probability, ps.is_closed
ORDER BY ps.sort_order
