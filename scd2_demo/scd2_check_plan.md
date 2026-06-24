# SCD2 Snapshot Edge Case Investigation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal dbt/DuckDB project in `scd2_demo/` that exercises dbt native snapshots and a LEAD()-based incremental SCD2 model against four edge cases from an invoices-baskets source, so the behavioral differences are observable and documented.

**Architecture:** Three CSV seeds simulate three hourly Bronze loads. A `stg_bronze_invoices` model unions all loads. A `stg_snapshot_input` model gates the snapshot source to one batch at a time (via dbt var). Two native dbt snapshots (`snap_invoices_timestamp` with `strategy=timestamp` and `snap_invoices_check` with `strategy=check`) plus a custom incremental SCD2 model (`scd2_invoices`, LEAD()-based, `merge` strategy) all consume the Bronze data. After each simulated run a run-script inspects all three outputs side-by-side.

**Tech Stack:** dbt-core 1.10.15, dbt-duckdb 1.10.1, DuckDB (local file `scd2_demo.duckdb`), dbt_utils 1.3.0

## Global Constraints

- All dbt commands run from inside `scd2_demo/` with the repo-root `.venv` activated: `../.venv/Scripts/dbt`
- DuckDB file path (in `profiles.yml`): `scd2_demo.duckdb` (relative to `scd2_demo/` working dir)
- Target schema: `main`
- dbt version: 1.10.15 (pinned in `requirements.txt`; version check commented out in `dbt_project.yml`)
- `dbt_project.yml` default materialization is `table`; the incremental SCD2 model overrides this in-file
- Seed column types must be declared explicitly in `_seeds.yml` — DuckDB infers `VARCHAR` by default for all CSV columns
- No `dbt_utils.generate_surrogate_key()` for the snapshot (dbt handles its own `dbt_scd_id`); use it only in the custom SCD2 model

---

## File Structure

```
scd2_demo/
├── seeds/
│   ├── _seeds.yml              # Column types for all 3 batch seeds
│   ├── bronze_batch_1.csv      # Baseline: 3 invoices active
│   ├── bronze_batch_2.csv      # EC1: exact per-run duplicate; EC2: two rows same id ±1s; EC4: missing-false
│   └── bronze_batch_3.csv      # EC3: cross-run duplicate + real new change
├── models/
│   ├── staging/
│   │   ├── stg_bronze_invoices.sql    # UNION all 3 seeds + batch_id column
│   │   └── stg_snapshot_input.sql     # Filters to current_batch var; materialized='table'
│   └── marts/
│       ├── _marts.yml                 # Model docs
│       └── scd2_invoices.sql          # Incremental LEAD()-based SCD2
├── snapshots/
│   ├── snap_invoices_ts.sql           # Native snapshot: unique_key=invoice_id, strategy=timestamp
│   └── snap_invoices_check.sql        # Native snapshot: unique_key=invoice_id, strategy=check (basket_id, is_active)
├── analyses/
│   ├── inspect_snap_ts.sql            # Point-in-time query on snap_invoices_ts
│   ├── inspect_snap_check.sql         # Point-in-time query on snap_invoices_check
│   └── inspect_scd2.sql               # Point-in-time query on scd2_invoices
├── run_edge_cases.sh                  # Bash script: 3 runs + dbt show inspection (all 3 models)
└── scd2_check_plan.md                 # Copy of this plan (written during execution)
```

---

## Edge Cases Being Tested

| # | Name | Batch | Description | Timestamp snapshot | Check snapshot | LEAD() model |
|---|------|-------|-------------|-------------------|----------------|--------------|
| EC1 | Per-run exact duplicate | 2 | INV-001 row appears twice (identical `updated_at`, same basket/is_active) | Ignores duplicate: `updated_at = dbt_updated_at` → `row_changed=false`. Safe. | Ignores duplicate: basket_id/is_active unchanged → `row_changed=false`. Safe. | `DISTINCT` + `ROW_NUMBER` removes duplicate before LEAD(). Safe. |
| EC2 | Per-run two rows, same id, ±1s, different basket | 2 | INV-002: BKT-B false at 10:30:00 + BKT-D true at 10:30:01 in same batch | **Data loss**: both trigger `row_changed=true`; non-deterministic merge on `invoice_id`; only one state survives | **Data loss**: both trigger `row_changed=true` (is_active + basket_id changed); same non-determinism. `dbt_updated_at` will be run-time, not application time. | **Correct**: both rows in Bronze; LEAD() closes BKT-B at 10:30:01; BKT-D opens. Full transition preserved. |
| EC3 | Cross-run duplicate | 3 | INV-001's batch-1 row re-appears in batch 3 (same `updated_at`) | Idempotent: `source.updated_at > dbt_updated_at` is FALSE; silently ignored. | Idempotent: basket_id/is_active unchanged → `row_changed=false`; silently ignored. | Deduplicated by ROW_NUMBER; no new SCD row inserted. |
| EC4 | Missing "false" row | 2 | INV-003 gets new basket (BKT-E) without a preceding `is_active=false` for BKT-C | Works: `updated_at` increases → new row; BKT-C closed. | Works: `basket_id` changed → `row_changed=true`; new row; BKT-C closed. `dbt_updated_at` = run timestamp (not app time). | Works: LEAD() closes BKT-C at BKT-E's `updated_at`. |

**Key strategy difference — `dbt_updated_at` semantics:**
- `strategy=timestamp`: `dbt_updated_at` = the source `updated_at` column (application time). Meaningful for point-in-time queries.
- `strategy=check`: `dbt_updated_at` = `current_timestamp()` at run time (system time). Only tells you when dbt ran, not when the source changed. Makes point-in-time queries unreliable.

---

### Task 1: Seeds and seed YAML

**Files:**
- Create: `seeds/_seeds.yml`
- Create: `seeds/bronze_batch_1.csv`
- Create: `seeds/bronze_batch_2.csv`
- Create: `seeds/bronze_batch_3.csv`

- [ ] **Step 1.1 — Create `seeds/_seeds.yml`**

```yaml
version: 2

seeds:
  - name: bronze_batch_1
    config:
      column_types:
        invoice_id: varchar
        basket_id: varchar
        is_active: boolean
        updated_at: timestamp
        loaded_at: timestamp
  - name: bronze_batch_2
    config:
      column_types:
        invoice_id: varchar
        basket_id: varchar
        is_active: boolean
        updated_at: timestamp
        loaded_at: timestamp
  - name: bronze_batch_3
    config:
      column_types:
        invoice_id: varchar
        basket_id: varchar
        is_active: boolean
        updated_at: timestamp
        loaded_at: timestamp
```

- [ ] **Step 1.2 — Create `seeds/bronze_batch_1.csv`** (baseline: 3 invoices, each active with one basket)

```csv
invoice_id,basket_id,is_active,updated_at,loaded_at
INV-001,BKT-A,true,2024-01-15 09:00:00,2024-01-15 09:05:00
INV-002,BKT-B,true,2024-01-15 09:00:00,2024-01-15 09:05:00
INV-003,BKT-C,true,2024-01-15 09:00:00,2024-01-15 09:05:00
```

- [ ] **Step 1.3 — Create `seeds/bronze_batch_2.csv`** (EC1: INV-001 exact duplicate; EC2: INV-002 two rows ±1s; EC4: INV-003 missing-false)

```csv
invoice_id,basket_id,is_active,updated_at,loaded_at
INV-001,BKT-A,true,2024-01-15 09:00:00,2024-01-15 11:00:00
INV-001,BKT-A,true,2024-01-15 09:00:00,2024-01-15 11:00:00
INV-002,BKT-B,false,2024-01-15 10:30:00,2024-01-15 11:00:00
INV-002,BKT-D,true,2024-01-15 10:30:01,2024-01-15 11:00:00
INV-003,BKT-E,true,2024-01-15 10:45:00,2024-01-15 11:00:00
```

- [ ] **Step 1.4 — Create `seeds/bronze_batch_3.csv`** (EC3: INV-001 cross-run duplicate + real new change)

```csv
invoice_id,basket_id,is_active,updated_at,loaded_at
INV-001,BKT-A,true,2024-01-15 09:00:00,2024-01-15 13:00:00
INV-001,BKT-F,true,2024-01-15 12:30:00,2024-01-15 13:00:00
```

- [ ] **Step 1.5 — Load seeds and verify**

Run from `scd2_demo/`:
```bash
../.venv/Scripts/dbt deps
../.venv/Scripts/dbt seed
```

Expected output:
```
3 of 3 PASS seed scd2_demo.main.bronze_batch_1 ...
3 of 3 PASS seed scd2_demo.main.bronze_batch_2 ...
2 of 2 PASS seed scd2_demo.main.bronze_batch_3 ...
```

---

### Task 2: Staging models

**Files:**
- Create: `models/staging/stg_bronze_invoices.sql`
- Create: `models/staging/stg_snapshot_input.sql`

- [ ] **Step 2.1 — Create `models/staging/stg_bronze_invoices.sql`**

This model unions all three batch seeds and adds `batch_id` as an explicit column. It represents the append-only Bronze log.

```sql
SELECT invoice_id, basket_id, is_active, updated_at, loaded_at, 1 AS batch_id
FROM {{ ref('bronze_batch_1') }}

UNION ALL

SELECT invoice_id, basket_id, is_active, updated_at, loaded_at, 2 AS batch_id
FROM {{ ref('bronze_batch_2') }}

UNION ALL

SELECT invoice_id, basket_id, is_active, updated_at, loaded_at, 3 AS batch_id
FROM {{ ref('bronze_batch_3') }}
```

- [ ] **Step 2.2 — Create `models/staging/stg_snapshot_input.sql`**

This model returns only the rows for the current batch. The snapshot reads from this model so we can simulate feeding it one batch at a time.

```sql
{{ config(materialized='table') }}

SELECT invoice_id, basket_id, is_active, updated_at, loaded_at
FROM {{ ref('stg_bronze_invoices') }}
WHERE batch_id = {{ var('current_batch', 1) }}
```

- [ ] **Step 2.3 — Verify staging models**

```bash
../.venv/Scripts/dbt run --select stg_bronze_invoices stg_snapshot_input --vars '{"current_batch": 1}'
../.venv/Scripts/dbt show --select stg_bronze_invoices --limit 20
../.venv/Scripts/dbt show --select stg_snapshot_input --limit 20
```

Expected: `stg_bronze_invoices` has 8 rows total; `stg_snapshot_input` has 3 rows (batch 1 only).

---

### Task 3: dbt native snapshots (timestamp + check)

**Files:**
- Create: `snapshots/snap_invoices_ts.sql`
- Create: `snapshots/snap_invoices_check.sql`

- [ ] **Step 3.1 — Create `snapshots/snap_invoices_ts.sql`** (timestamp strategy)

```sql
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
```

- [ ] **Step 3.2 — Create `snapshots/snap_invoices_check.sql`** (check strategy — tracks basket_id and is_active changes)

```sql
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
```

- [ ] **Step 3.3 — First snapshot run (batch 1)**

```bash
../.venv/Scripts/dbt snapshot
```

Expected: both `snap_invoices_ts` and `snap_invoices_check` each get 3 rows inserted, all with `dbt_valid_to = NULL`.

```bash
../.venv/Scripts/dbt show --inline "SELECT invoice_id, basket_id, is_active, dbt_valid_from, dbt_valid_to, dbt_updated_at FROM main.snap_invoices_ts ORDER BY invoice_id" --limit 20
../.venv/Scripts/dbt show --inline "SELECT invoice_id, basket_id, is_active, dbt_valid_from, dbt_valid_to, dbt_updated_at FROM main.snap_invoices_check ORDER BY invoice_id" --limit 20
```

**Observe:** In `snap_invoices_ts`, `dbt_updated_at` = `2024-01-15 09:00:00` (source application time). In `snap_invoices_check`, `dbt_updated_at` = the current system timestamp when dbt ran. This difference compounds across runs.

---

### Task 4: Incremental SCD2 model (LEAD()-based)

**Files:**
- Create: `models/marts/scd2_invoices.sql`
- Create: `models/marts/_marts.yml`

- [ ] **Step 4.1 — Create `models/marts/_marts.yml`**

```yaml
version: 2

models:
  - name: scd2_invoices
    description: >
      SCD Type 2 history of invoice-basket associations, built from the Bronze
      append-only log using LEAD() window functions. Handles per-run duplicates
      and same-run multi-row scenarios that dbt native snapshots cannot.
    columns:
      - name: scd_id
        description: Surrogate key — hash of invoice_id + basket_id + updated_at. Stable across full refreshes.
      - name: invoice_id
      - name: basket_id
      - name: is_active
        description: Source is_active flag at the time this row was loaded.
      - name: valid_from
        description: Timestamp when this (invoice, basket) state became active.
      - name: valid_to
        description: Timestamp when this state was superseded. NULL = current row.
      - name: batch_id
        description: Which Bronze batch introduced this row.
```

- [ ] **Step 4.2 — Create `models/marts/scd2_invoices.sql`**

```sql
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
    GROUP BY 1, 2, 3, 4, 5, 7
)

SELECT scd_id, invoice_id, basket_id, is_active, valid_from, valid_to, batch_id
FROM rows_to_close

UNION ALL

SELECT scd_id, invoice_id, basket_id, is_active, valid_from, valid_to, batch_id
FROM new_scd

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
```

- [ ] **Step 4.3 — First run of SCD2 model (batch 1)**

```bash
../.venv/Scripts/dbt run --select scd2_invoices
```

Expected: 3 rows, all `valid_to = NULL` (no subsequent events yet).

```bash
../.venv/Scripts/dbt show --select scd2_invoices --limit 20
```

---

### Task 5: Multi-run test script

**Files:**
- Create: `run_edge_cases.sh`

This script resets the DuckDB database, loads seeds, then drives three simulated hourly runs, printing the snapshot and SCD2 model state after each run.

- [ ] **Step 5.1 — Create `run_edge_cases.sh`**

```bash
#!/usr/bin/env bash
set -e

DBT="../.venv/Scripts/dbt"
Q_TS="SELECT invoice_id, basket_id, is_active, dbt_valid_from, dbt_valid_to, dbt_updated_at FROM main.snap_invoices_ts ORDER BY invoice_id, dbt_valid_from"
Q_CHECK="SELECT invoice_id, basket_id, is_active, dbt_valid_from, dbt_valid_to, dbt_updated_at FROM main.snap_invoices_check ORDER BY invoice_id, dbt_valid_from"
Q_SCD2="SELECT invoice_id, basket_id, is_active, valid_from, valid_to, batch_id FROM main.scd2_invoices ORDER BY invoice_id, valid_from"

echo "=== Reset database ==="
rm -f scd2_demo.duckdb

echo "=== Install packages + load seeds ==="
$DBT deps
$DBT seed

echo ""
echo "========================================"
echo "  RUN 1: Batch 1 — Baseline load"
echo "========================================"
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
echo "  RUN 2: Batch 2 — EC1 (exact dup), EC2 (two rows ±1s), EC4 (missing-false)"
echo "========================================"
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
echo "  RUN 3: Batch 3 — EC3 (cross-run dup) + real change INV-001→BKT-F"
echo "========================================"
$DBT run --select stg_snapshot_input --vars '{"current_batch": 3}'
$DBT snapshot
$DBT run --select scd2_invoices

echo "--- snap_invoices_ts after Run 3 (final) ---"
$DBT show --inline "$Q_TS" --limit 20
echo "--- snap_invoices_check after Run 3 (final) ---"
$DBT show --inline "$Q_CHECK" --limit 20
echo "--- scd2_invoices after Run 3 (final) ---"
$DBT show --inline "$Q_SCD2" --limit 20
```

- [ ] **Step 5.2 — Run the script and capture output**

```bash
bash run_edge_cases.sh 2>&1 | tee run_output.txt
```

Expected terminal output shows dbt completing each run without errors, followed by table results. The key observations to look for are listed in Task 6.

---

### Task 6: Expected behaviors (document observations)

After running the script, verify these specific outcomes to confirm the edge cases behaved as theorized:

**After Run 2 — EC1 (exact per-run duplicate):**
- `snap_invoices_ts`: INV-001 stays at 1 row, `dbt_valid_to = NULL`. `updated_at` unchanged → `row_changed=false`. Safe.
- `snap_invoices_check`: INV-001 stays at 1 row. basket_id/is_active unchanged → `row_changed=false`. Safe.
- `scd2_invoices`: INV-001 stays at 1 row. Duplicate removed by `ROW_NUMBER`. Safe.

**After Run 2 — EC2 (two rows same id, ±1s):**
- `snap_invoices_ts`: INV-002 has **2 rows**, but only one intermediate state survived. Either BKT-B-false or BKT-D-true was silently dropped by the non-deterministic merge. The full BKT-B→BKT-D transition is lost.
- `snap_invoices_check`: Same outcome — 2 rows, one intermediate state lost. Additionally, `dbt_updated_at` on the new open row is the run timestamp, not `10:30:01`.
- `scd2_invoices`: INV-002 has **3 rows** — original BKT-B (batch 1, now closed), BKT-B false (batch 2, closed at 10:30:01), BKT-D true (batch 2, open). Full transition preserved.

**After Run 2 — EC4 (missing-false for INV-003):**
- `snap_invoices_ts`: INV-003 has 2 rows — BKT-C closed at `dbt_valid_to=10:45`, BKT-E open. Correct.
- `snap_invoices_check`: Same row structure, but `dbt_updated_at` on BKT-E row = run timestamp (not `10:45`).
- `scd2_invoices`: INV-003 has 2 rows — BKT-C `valid_to=10:45`, BKT-E `valid_to=NULL`. Correct, and timestamps are application-sourced throughout.

**After Run 3 — EC3 (cross-run duplicate):**
- `snap_invoices_ts`: INV-001 gains 1 new row (BKT-F, open). Cross-run duplicate for BKT-A silently ignored (`updated_at` not newer).
- `snap_invoices_check`: Same — BKT-F added, duplicate ignored (basket_id/is_active unchanged for BKT-A duplicate).
- `scd2_invoices`: INV-001 gains BKT-F row. BKT-A duplicate removed by deduplication. BKT-A `valid_to = 12:30`.

---

## Verification

Full end-to-end check:

```bash
# From inside scd2_demo/ with venv activated
bash run_edge_cases.sh 2>&1 | tee run_output.txt

# Verify no dbt errors in output
grep "ERROR" run_output.txt || echo "No errors found"

# Spot-check final state — all three models side-by-side
../.venv/Scripts/dbt show --inline \
  "SELECT model, invoice_id, COUNT(*) AS rows FROM (
     SELECT 'snap_ts'    AS model, invoice_id FROM main.snap_invoices_ts
     UNION ALL
     SELECT 'snap_check' AS model, invoice_id FROM main.snap_invoices_check
     UNION ALL
     SELECT 'scd2'       AS model, invoice_id FROM main.scd2_invoices
   ) GROUP BY 1, 2 ORDER BY 2, 1" --limit 30
```

Final expected row counts:

| Model | invoice_id | Expected rows | Notes |
|-------|-----------|---------------|-------|
| snap_ts | INV-001 | 2 | BKT-A closed + BKT-F open |
| snap_ts | INV-002 | 2 | EC2 non-determinism: one intermediate state lost |
| snap_ts | INV-003 | 2 | BKT-C closed + BKT-E open |
| snap_check | INV-001 | 2 | Same structure; `dbt_updated_at` = run time |
| snap_check | INV-002 | 2 | Same non-determinism issue as timestamp strategy |
| snap_check | INV-003 | 2 | Same result; `dbt_updated_at` = run time |
| scd2 | INV-001 | 2 | BKT-A closed + BKT-F open |
| scd2 | INV-002 | **3** | Full transition: BKT-B(orig) + BKT-B(false) + BKT-D(true) |
| scd2 | INV-003 | 2 | BKT-C closed + BKT-E open |

The divergence on INV-002 is the key demonstration. Both snapshot strategies lose the intermediate BKT-B→BKT-D transition. The LEAD()-based model preserves it because it reads from an append-only Bronze log that captured both rows.

---

## Save plan to project

As the first step of execution, copy this plan to `scd2_demo/scd2_check_plan.md` so it lives alongside the project it describes.
