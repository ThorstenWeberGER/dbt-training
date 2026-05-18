{{ config(materialized='table') }}

-- Grain: one row per prescription record.
-- prescription_key = prescription_id (training simplification — real projects use generate_surrogate_key)
-- patient_key and doctor_key join to dim_patient and dim_doctor respectively.

WITH prescriptions AS (
    SELECT * FROM {{ source('hubspot', 'prescriptions') }}
),

patients AS (
    SELECT patient_key FROM {{ ref('dim_patient') }}
),

doctors AS (
    SELECT doctor_key FROM {{ ref('dim_doctor') }}
)

SELECT
    p.prescription_id   AS prescription_key,
    p.contact_id        AS doctor_key,
    p.owner_id          AS patient_key,
    p.prescription_date,
    p.medication_type,
    p.dosage_amount,
    p.notes
FROM prescriptions       p
INNER JOIN patients      pat ON p.contact_id = pat.patient_key
INNER JOIN doctors       doc ON p.owner_id   = doc.doctor_key
