{{ config(materialized='table') }}

-- Grain: one row per country. Module 08 exercise result.
-- Demonstrates joining the country_codes seed to a Silver dimension.

SELECT
    cc.country_code,
    cc.country_name,
    cc.region,
    COUNT(DISTINCT c.contact_id)    AS contact_count,
    COUNT(d.deal_key)               AS deal_count,
    COALESCE(SUM(d.amount), 0)      AS total_deal_amount
FROM {{ ref('country_codes') }}    AS cc
LEFT JOIN {{ ref('dim_contact') }} AS c  ON cc.country_code = c.country_code
LEFT JOIN {{ ref('fct_deal') }}    AS d  ON c.contact_key   = d.contact_key
GROUP BY cc.country_code, cc.country_name, cc.region
ORDER BY contact_count DESC
