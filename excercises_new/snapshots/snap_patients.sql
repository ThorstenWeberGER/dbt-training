{% snapshot snap_patients %}

{{ config(
    target_schema='snapshots',
    unique_key='contact_id',
    strategy='timestamp',
    updated_at='updated_at'
) }}

-- Module 10 exercise: participants create this snapshot to track patient changes over time.
-- Demonstrates SCD Type 2: dbt adds dbt_valid_from, dbt_valid_to, dbt_scd_id columns.
-- Run: dbt snapshot
-- Verify: SELECT * FROM snapshots.snap_patients ORDER BY contact_id, dbt_valid_from;

SELECT
    contact_id,
    first_name,
    last_name,
    email,
    country_code,
    pipeline_stage_id,
    created_at,
    updated_at
FROM {{ ref('stg_hubspot__contacts') }}

{% endsnapshot %}
