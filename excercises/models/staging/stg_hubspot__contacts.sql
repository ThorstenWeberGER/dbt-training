{{ config(materialized='view') }}

-- In production (Snowflake): FROM {# source('hubspot', 'contacts') #}
-- In this exercise: raw_contacts seed simulates the Lambda-ingested Bronze table

SELECT
    id                              AS contact_id,
    first_name,
    last_name,
    email,
    UPPER(TRIM(country_code))       AS country_code,
    pipeline_stage_id,
    created_at::TIMESTAMP           AS created_at,
    updated_at::TIMESTAMP           AS updated_at
FROM {{ ref('raw_contacts') }}
