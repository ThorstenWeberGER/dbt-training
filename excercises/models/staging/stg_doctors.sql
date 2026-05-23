{{ config(materialized='view') }}

SELECT
    doctor_id,
    first_name,
    last_name,
    specialty,
    created_at::TIMESTAMP           AS created_at
FROM {{ ref('raw_doctors') }}
