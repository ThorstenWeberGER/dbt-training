-- TODO: Module 04 — Write stg_hubspot__deals
-- This model should:
--   - Materialise as a view
--   - Reference {{ source('hubspot', 'deals') }}
--   - Select: deal_id, deal_name, contact_id, stage_id AS pipeline_stage_id, amount::DOUBLE AS amount, close_date::DATE AS close_date, _loaded_at AS loaded_at, created_at::TIMESTAMP AS created_at, updated_at::TIMESTAMP AS updated_at
--
-- Remove this comment and the placeholder SELECT, then write the model.
{{ config(materialized='view') }}
SELECT
    NULL::INTEGER   AS deal_id,
    NULL::VARCHAR   AS deal_name,
    NULL::INTEGER   AS contact_id,
    NULL::INTEGER   AS pipeline_stage_id,
    NULL::DOUBLE    AS amount,
    NULL::DATE      AS close_date,
    NULL::TIMESTAMP AS loaded_at,
    NULL::TIMESTAMP AS created_at,
    NULL::TIMESTAMP AS updated_at
WHERE 1 = 0
