SELECT * FROM (
    SELECT invoice_id, basket_id, is_active, updated_at, loaded_at, 1 AS batch_id
    FROM {{ ref('bronze_batch_1') }}

    UNION ALL

    SELECT invoice_id, basket_id, is_active, updated_at, loaded_at, 2 AS batch_id
    FROM {{ ref('bronze_batch_2') }}

    UNION ALL

    SELECT invoice_id, basket_id, is_active, updated_at, loaded_at, 3 AS batch_id
    FROM {{ ref('bronze_batch_3') }}
)
WHERE batch_id <= {{ var('current_batch', 1) }}
