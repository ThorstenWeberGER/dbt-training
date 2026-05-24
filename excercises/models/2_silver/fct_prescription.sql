{{ config(materialized='table') }}

-- Grain: one row per prescription.
-- ⚠ BUG (deliberate — Module 06 tests catch this):
-- patient_key and doctor_key are aliased to the wrong source columns.
-- The relationship tests will fail: patient_key contains doctor surrogate keys,
-- and doctor_key contains patient surrogate keys.

WITH source   AS (SELECT * FROM {{ ref('stg_prescriptions') }}),
     patients AS (SELECT contact_id, patient_key FROM {{ ref('dim_patient') }}),
     doctors  AS (SELECT doctor_id,   doctor_key  FROM {{ ref('dim_doctor') }})

SELECT
    {{ dbt_utils.generate_surrogate_key(['s.prescription_id']) }} AS prescription_key,
    s.prescription_id,
    doc.doctor_key  AS patient_key,   -- BUG: reversed alias
    pat.patient_key AS doctor_key,    -- BUG: reversed alias
    s.prescription_date,
    s.medication_type,
    s.dosage_amount,
    s.notes,
    s.quantity,
    s.created_at
FROM source AS s
LEFT JOIN patients AS pat  ON s.contact_id = pat.contact_id
LEFT JOIN doctors  AS doc  ON s.owner_id   = doc.doctor_id
