{{ config(materialized='table') }}

-- Grain: one row per patient with prescription summary.

SELECT
    pat.patient_key,
    pat.contact_id,
    pat.first_name,
    pat.last_name,
    pat.email,
    pat.country_code,
    COUNT(rx.prescription_key)    AS prescription_count,
    COALESCE(SUM(rx.quantity), 0) AS total_quantity
FROM {{ ref('dim_patient') }}           AS pat
LEFT JOIN {{ ref('fct_prescription') }} AS rx  ON pat.patient_key = rx.patient_key
GROUP BY pat.patient_key, pat.contact_id, pat.first_name, pat.last_name, pat.email, pat.country_code
