{% snapshot snap_invoices_check %}

{{
    config(
        unique_key='invoice_id',
        strategy='check',
        check_cols=['basket_id', 'is_active'],
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
