{{ config(materialized='table') }}

SELECT invoice_id, basket_id, is_active, updated_at, loaded_at
FROM {{ ref('stg_bronze_invoices') }}
WHERE batch_id = {{ var('current_batch', 1) }}
