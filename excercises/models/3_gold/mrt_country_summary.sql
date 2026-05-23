{{ config(materialized='table') }}

-- Grain: one row per country. Module 08 exercise — demonstrates seed joins.
-- ⚠ BUG (deliberate — Module 08 fix task):
-- The patient dimension join uses the wrong column: c.patient_key instead of c.country_code.
-- This compiles and runs, but returns 0 contacts and 0 deals for every country.
-- Participants discover this when they verify the output in Module 08.

SELECT
    cc.country_code,
    cc.country_name,
    cc.region,
    COUNT(DISTINCT p.contact_id)    AS contact_count,
    COUNT(d.deal_key)               AS deal_count,
    COALESCE(SUM(d.amount), 0)      AS total_deal_amount
FROM {{ ref('country_codes') }}    AS cc
LEFT JOIN {{ ref('dim_patient') }} AS p  ON cc.country_code = p.patient_key  -- BUG: should be p.country_code
LEFT JOIN {{ ref('fct_deal') }}    AS d  ON p.patient_key   = d.patient_key
GROUP BY cc.country_code, cc.country_name, cc.region
ORDER BY contact_count DESC
