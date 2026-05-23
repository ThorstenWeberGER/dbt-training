{{ config(materialized='table') }}

-- Grain: one row per deal.

WITH source AS (
    SELECT * FROM {{ ref('stg_hubspot__deals') }}
    WHERE amount >= {{ var('min_deal_amount', 0) }}
),

contacts AS (
    SELECT contact_id, contact_key FROM {{ ref('dim_contact') }}
),

stages AS (
    SELECT pipeline_stage_id, pipeline_stage_key FROM {{ ref('dim_pipeline_stage') }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['s.deal_id']) }} AS deal_key,
    s.deal_id,
    s.deal_name,
    c.contact_key,
    st.pipeline_stage_key,
    s.amount,
    s.close_date,
    s.created_at,
    s.updated_at
FROM source AS s
LEFT JOIN contacts AS c  ON s.contact_id          = c.contact_id
LEFT JOIN stages   AS st ON s.pipeline_stage_id    = st.pipeline_stage_id
