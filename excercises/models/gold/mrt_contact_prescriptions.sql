{{ config(materialized='table') }}

-- Grain: one row per contact with prescription summary.

SELECT
    c.contact_key,
    c.contact_id,
    c.first_name,
    c.last_name,
    c.email,
    c.country_code,
    COUNT(p.prescription_key)    AS prescription_count,
    COALESCE(SUM(p.quantity), 0) AS total_quantity
FROM {{ ref('dim_contact') }}           AS c
LEFT JOIN {{ ref('fct_prescription') }} AS p  ON c.contact_key = p.contact_key
GROUP BY c.contact_key, c.contact_id, c.first_name, c.last_name, c.email, c.country_code
