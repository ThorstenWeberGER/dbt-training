{{ config(materialized='table') }}

-- Grain: one row per deal.

WITH source AS (
    SELECT * FROM {{ ref('stg_hubspot__deals') }}
    WHERE amount >= {{ var('min_deal_amount', 0) }}
),

patients AS (
    SELECT contact_id, patient_key FROM {{ ref('dim_patient') }}
),

stages AS (
    SELECT pipeline_stage_id, pipeline_stage_key FROM {{ ref('dim_pipeline_stage') }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['deal_id']) }} AS deal_key,
    s.deal_id,
    s.deal_name,
    p.patient_key,
    st.pipeline_stage_key,
    s.amount,
    s.close_date,
    s.created_at,
    s.updated_at
FROM source AS s
LEFT JOIN patients AS p  ON s.contact_id         = p.contact_id
LEFT JOIN stages   AS st ON s.pipeline_stage_id   = st.pipeline_stage_id
