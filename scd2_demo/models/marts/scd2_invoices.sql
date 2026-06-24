{{ config(
    materialized='incremental',
    unique_key='scd_id',
    incremental_strategy='merge'
) }}

{% if is_incremental() %}

WITH new_source AS (
    SELECT DISTINCT invoice_id, basket_id, is_active, updated_at, loaded_at, batch_id
    FROM {{ ref('stg_bronze_invoices') }}
    WHERE batch_id > (SELECT COALESCE(MAX(batch_id), 0) FROM {{ this }})
),

new_deduped AS (
    SELECT *
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY invoice_id, basket_id, updated_at
                ORDER BY loaded_at
            ) AS rn
        FROM new_source
    ) ranked
    WHERE rn = 1
),

new_scd AS (
    SELECT
        {{ dbt_utils.generate_surrogate_key(['invoice_id', 'basket_id', 'updated_at']) }} AS scd_id,
        invoice_id,
        basket_id,
        is_active,
        updated_at AS valid_from,
        LEAD(updated_at) OVER (
            PARTITION BY invoice_id ORDER BY updated_at, loaded_at
        ) AS valid_to,
        batch_id
    FROM new_deduped
),

rows_to_close AS (
    SELECT
        existing.scd_id,
        existing.invoice_id,
        existing.basket_id,
        existing.is_active,
        existing.valid_from,
        MIN(new_scd.valid_from) AS valid_to,
        existing.batch_id
    FROM {{ this }} existing
    JOIN new_scd ON existing.invoice_id = new_scd.invoice_id
    WHERE existing.valid_to IS NULL
      AND new_scd.valid_from > existing.valid_from
    GROUP BY 1, 2, 3, 4, 5, 7
)

SELECT scd_id, invoice_id, basket_id, is_active, valid_from, valid_to, batch_id
FROM rows_to_close

UNION ALL

SELECT scd_id, invoice_id, basket_id, is_active, valid_from, valid_to, batch_id
FROM new_scd
WHERE scd_id NOT IN (SELECT scd_id FROM rows_to_close)

{% else %}

WITH all_source AS (
    SELECT DISTINCT invoice_id, basket_id, is_active, updated_at, loaded_at, batch_id
    FROM {{ ref('stg_bronze_invoices') }}
),

deduped AS (
    SELECT *
    FROM (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY invoice_id, basket_id, updated_at
                ORDER BY loaded_at
            ) AS rn
        FROM all_source
    ) ranked
    WHERE rn = 1
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['invoice_id', 'basket_id', 'updated_at']) }} AS scd_id,
    invoice_id,
    basket_id,
    is_active,
    updated_at AS valid_from,
    LEAD(updated_at) OVER (
        PARTITION BY invoice_id ORDER BY updated_at, loaded_at
    ) AS valid_to,
    batch_id
FROM deduped

{% endif %}
