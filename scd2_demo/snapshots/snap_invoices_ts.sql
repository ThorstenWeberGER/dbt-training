{% snapshot snap_invoices_ts %}

{{
    config(
        unique_key='invoice_id',
        strategy='timestamp',
        updated_at='updated_at',
        target_schema='main'
    )
}}

SELECT
    invoice_id,
    basket_id,
    is_active,
    updated_at,
    loaded_at
FROM {{ ref('stg_snapshot_input') }}

{% endsnapshot %}
