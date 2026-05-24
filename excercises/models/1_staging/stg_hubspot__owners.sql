-- TODO: Module 05 — Write stg_hubspot__owners
-- This model should:
--   - Materialise as a view
--   - Reference {{ source('hubspot', 'owners') }} (you must add 'owners' to sources.yml first)
--   - Select: owner_id, first_name, last_name, email, _loaded_at AS loaded_at
--
-- Remove this comment and the placeholder SELECT, then write the model.
{{ config(materialized='view') }}
SELECT
    NULL::INTEGER   AS owner_id,
    NULL::VARCHAR   AS first_name,
    NULL::VARCHAR   AS last_name,
    NULL::VARCHAR   AS email,
    NULL::TIMESTAMP AS loaded_at
WHERE 1 = 0
