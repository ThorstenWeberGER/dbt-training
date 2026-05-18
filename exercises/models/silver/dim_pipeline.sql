{{ config(materialized='table') }}

-- One row per pipeline per validity period (SCD2).
-- Training note: full SCD2 logic uses the scd2_merge macro, covered in Module 10.
-- This simplified version shows the SCD2 column structure without the merge logic.

WITH pipeline_stages AS (
    SELECT * FROM {{ ref('stg_hubspot__pipeline_stages') }}
),

distinct_pipelines AS (
    SELECT DISTINCT
        pipeline_id,
        MIN(ingested_at) OVER (PARTITION BY pipeline_id) AS first_seen_at
    FROM pipeline_stages
)

SELECT
    ROW_NUMBER() OVER (ORDER BY pipeline_id)  AS pipeline_key,
    pipeline_id                                AS hubspot_pipeline_id,
    pipeline_id                                AS pipeline_name,
    TRUE                                       AS is_active,
    first_seen_at                              AS dbt_valid_from,
    NULL::TIMESTAMP_NTZ                        AS dbt_valid_to,
    TRUE                                       AS is_current
FROM distinct_pipelines
