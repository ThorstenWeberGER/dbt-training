#!/usr/bin/env bash
set -e

DBT="../.venv/Scripts/dbt"
Q_TS="SELECT invoice_id, basket_id, is_active, dbt_valid_from, dbt_valid_to, dbt_updated_at FROM main.snap_invoices_ts ORDER BY invoice_id, dbt_valid_from"
Q_CHECK="SELECT invoice_id, basket_id, is_active, dbt_valid_from, dbt_valid_to, dbt_updated_at FROM main.snap_invoices_check ORDER BY invoice_id, dbt_valid_from"
Q_SCD2="SELECT invoice_id, basket_id, is_active, valid_from, valid_to, batch_id FROM main.scd2_invoices ORDER BY invoice_id, valid_from"

echo "=== Reset database ==="
rm -f scd2_demo.duckdb

echo "=== Load seeds (run 'dbt deps' manually before first run if packages missing) ==="
$DBT seed

echo ""
echo "========================================"
echo "  RUN 1: Batch 1 — Baseline load"
echo "========================================"
$DBT run --select stg_bronze_invoices --vars '{"current_batch": 1}'
$DBT run --select stg_snapshot_input --vars '{"current_batch": 1}'
$DBT snapshot
$DBT run --select scd2_invoices

echo "--- snap_invoices_ts after Run 1 ---"
$DBT show --inline "$Q_TS" --limit 20
echo "--- snap_invoices_check after Run 1 (note dbt_updated_at = system time) ---"
$DBT show --inline "$Q_CHECK" --limit 20
echo "--- scd2_invoices after Run 1 ---"
$DBT show --inline "$Q_SCD2" --limit 20

echo ""
echo "========================================"
echo "  RUN 2: Batch 2 — EC1 (exact dup), EC2 (two rows +-1s), EC4 (missing-false)"
echo "========================================"
$DBT run --select stg_bronze_invoices --vars '{"current_batch": 2}'
$DBT run --select stg_snapshot_input --vars '{"current_batch": 2}'
$DBT snapshot
$DBT run --select scd2_invoices

echo "--- snap_invoices_ts after Run 2 ---"
$DBT show --inline "$Q_TS" --limit 20
echo "--- snap_invoices_check after Run 2 ---"
$DBT show --inline "$Q_CHECK" --limit 20
echo "--- scd2_invoices after Run 2 ---"
$DBT show --inline "$Q_SCD2" --limit 20

echo ""
echo "========================================"
echo "  RUN 3: Batch 3 — EC3 (cross-run dup) + real change INV-001 to BKT-F"
echo "========================================"
$DBT run --select stg_bronze_invoices --vars '{"current_batch": 3}'
$DBT run --select stg_snapshot_input --vars '{"current_batch": 3}'
$DBT snapshot
$DBT run --select scd2_invoices

echo "--- snap_invoices_ts after Run 3 (final) ---"
$DBT show --inline "$Q_TS" --limit 20
echo "--- snap_invoices_check after Run 3 (final) ---"
$DBT show --inline "$Q_CHECK" --limit 20
echo "--- scd2_invoices after Run 3 (final) ---"
$DBT show --inline "$Q_SCD2" --limit 20

echo ""
echo "========================================"
echo "  FINAL: Side-by-side row count comparison"
echo "========================================"
$DBT show --inline "SELECT model, invoice_id, COUNT(*) AS rows FROM (SELECT 'snap_ts' AS model, invoice_id FROM main.snap_invoices_ts UNION ALL SELECT 'snap_check', invoice_id FROM main.snap_invoices_check UNION ALL SELECT 'scd2', invoice_id FROM main.scd2_invoices) GROUP BY 1, 2 ORDER BY 2, 1" --limit 30
