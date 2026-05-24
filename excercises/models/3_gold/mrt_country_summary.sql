{{ config(materialized='table') }}

-- Grain: one row per country. Module 08 exercise — demonstrates seed joins.

SELECT
    cc.country_code,
    cc.country_name,
    cc.region,
    COUNT(DISTINCT p.contact_id)    AS contact_count,
    COUNT(d.deal_id)                AS deal_count,
    COALESCE(SUM(d.amount), 0)      AS total_deal_amount
FROM {{ ref('country_codes') }}    AS cc
LEFT JOIN {{ ref('dim_patient') }} AS p  ON cc.country_code = p.country_code
LEFT JOIN {{ ref('fct_deal') }}    AS d  ON p.patient_key   = d.patient_key
GROUP BY cc.country_code, cc.country_name, cc.region
ORDER BY contact_count DESC
