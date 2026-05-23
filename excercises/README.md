# dbt Training — Exercise Project

## Prerequisites
- Python 3.9–3.12 (Python 3.13+ is not yet supported by dbt-core)
- pip
- Snowflake account with training credentials (for training sessions)

## Two Modes

### Training mode (Snowflake)

Set the following environment variables before running:

```bash
export DBT_SNOWFLAKE_ACCOUNT=<your_account>
export DBT_SNOWFLAKE_USER=<your_user>
export DBT_SNOWFLAKE_PASSWORD=<your_password>
export DBT_USER_NAME=<yourname>          # determines your dev schema: DEV_<yourname>
export DBT_SOURCE_DATABASE=DBT_TRAINING  # Snowflake database with pre-loaded source tables
```

The trainer pre-loads all source tables into `DBT_TRAINING.HUBSPOT_RAW` before training starts.
Participants only seed the lookup tables:

```bash
# Install all dependencies (both adapters)
pip install -r requirements.txt

# Install dbt packages (dbt_utils)
dbt deps

# Load lookup seeds only
dbt seed --select country_codes product_categories

# Build all models and run tests
dbt build
```

### Local testing mode (DuckDB — no credentials needed)

```bash
# Create and activate virtual environment
py -3.12 -m venv .venv
.venv\Scripts\activate              # Windows
# source .venv/bin/activate         # macOS/Linux

# Install all dependencies
pip install -r requirements.txt

# Install dbt packages (dbt_utils)
dbt deps

# Step 1: Load ALL seeds (simulates Snowflake pre-loaded Bronze + lookup tables)
# Must run BEFORE models — DuckDB validates table existence when creating views
dbt seed --target test

# Step 2: Build all models
dbt run --target test

# Step 3: Run tests (expect 1 intentional failure: fct_prescription relationship bug)
dbt test --target test
```

> **Why two steps?** DuckDB validates that referenced tables exist at view-creation time.
> Running `dbt build` tries to create models in parallel with seeds, which fails because
> the source tables don't exist yet. Always run `dbt seed` first.

## Viewing results (DuckDB)

```bash
# Open DuckDB CLI and query the local database
duckdb dbt_training.duckdb
SELECT * FROM dev.mrt_deals_funnel ORDER BY sort_order;
SELECT * FROM dev.mrt_country_summary ORDER BY contact_count DESC;
SELECT * FROM dev.mrt_patient_prescriptions ORDER BY prescription_count DESC;
.quit
```

## Project structure

```
models/
  1_staging/    Views over HubSpot source tables — rename columns, cast types
  2_silver/     Dimensions (dim_*) and facts (fct_*) — business logic
  3_gold/       Aggregated marts (mrt_*) — reporting layer
macros/
  safe_cast.sql               Safe type casting with optional fallback
  generate_schema_name.sql    Schema routing override (for DuckDB compatibility)
snapshots/
  snap_patients.sql           SCD2 snapshot of patient changes (Module 10)
seeds/
  country_codes.csv           Lookup: country code → name + region
  product_categories.csv      Lookup: category code → label + prescription flag
  raw_*.csv                   Bronze simulation data (DuckDB testing only)
```

## Known deliberate bugs (teaching exercises)

| File | Bug | Fixed in |
|------|-----|----------|
| `1_staging/stg_hubspot__pipeline_stages.sql` | `materialized='table'` instead of `'view'` | Module 04 |
| `2_silver/fct_prescription.sql` | `patient_key` and `doctor_key` aliases reversed | Module 06 |
| `3_gold/mrt_country_summary.sql` | Wrong join column (`p.patient_key` instead of `p.country_code`) | Module 08 |
