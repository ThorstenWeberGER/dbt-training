{{ config(materialized='table') }}

-- Grain: one row per prescription.

WITH source   AS (SELECT * FROM {{ ref('stg_prescriptions') }}),
     patients AS (SELECT contact_id, patient_key FROM {{ ref('dim_patient') }}),
     doctors  AS (SELECT doctor_id,  doctor_key  FROM {{ ref('dim_doctor') }})

SELECT
    {{ dbt_utils.generate_surrogate_key(['s.prescription_id']) }} AS prescription_key,
    s.prescription_id,
    pat.patient_key AS patient_key,
    doc.doctor_key  AS doctor_key,
    s.prescription_date,
    s.medication_type,
    s.dosage_amount,
    s.notes,
    s.quantity,
    s.created_at
FROM source AS s
LEFT JOIN patients AS pat  ON s.contact_id = pat.contact_id
LEFT JOIN doctors  AS doc  ON s.owner_id   = doc.doctor_id
