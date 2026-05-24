-- TODO: Module 03 — Write stg_hubspot__contacts
-- This model should:
--   - Materialise as a view
--   - Reference {{ source('hubspot', 'contacts') }}
--   - Select: id AS contact_id, first_name, last_name, email, UPPER(TRIM(country_code)) AS country_code, pipeline_stage_id, _loaded_at AS loaded_at, created_at::TIMESTAMP AS created_at, updated_at::TIMESTAMP AS updated_at
--
-- Remove this comment and the placeholder SELECT, then write the model.
{{ config(materialized='view') }}
SELECT
    NULL::INTEGER   AS contact_id,
    NULL::VARCHAR   AS first_name,
    NULL::VARCHAR   AS last_name,
    NULL::VARCHAR   AS email,
    NULL::VARCHAR   AS country_code,
    NULL::INTEGER   AS pipeline_stage_id,
    NULL::TIMESTAMP AS loaded_at,
    NULL::TIMESTAMP AS created_at,
    NULL::TIMESTAMP AS updated_at
WHERE 1 = 0
