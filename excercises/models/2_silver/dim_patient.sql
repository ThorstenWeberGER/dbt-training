{{ config(materialized='table') }}

-- Grain: one row per patient (HubSpot contact). SCD1 — full rebuild each run.
-- In Module 10, participants create snap_patients.sql and build dim_patient_scd2 on top.

SELECT
    {{ dbt_utils.generate_surrogate_key(['contact_id']) }}  AS patient_key,
    contact_id,
    first_name,
    last_name,
    email,
    country_code,
    pipeline_stage_id,
    created_at,
    updated_at
FROM {{ ref('stg_hubspot__contacts') }}
