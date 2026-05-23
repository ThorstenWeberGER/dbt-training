{% snapshot snap_contacts %}

{{ config(
    target_schema='snapshots',
    unique_key='contact_id',
    strategy='timestamp',
    updated_at='updated_at'
) }}

-- Tracks historical changes to contact records.
-- Run: dbt snapshot

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
