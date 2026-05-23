# dbt Training — Exercise Project

## Prerequisites
- Python 3.9–3.12 (Python 3.13+ is not yet supported by dbt-core)
- pip

## Setup

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
.venv\Scripts\activate           # Windows

# Install dbt with DuckDB adapter
pip install dbt-duckdb

# Install dbt packages (dbt_utils)
dbt deps

# Load seed data
dbt seed

# Build all models and run tests
dbt build
```

## Viewing results

```bash
# Open DuckDB CLI and query the local database
duckdb dbt_training.duckdb
SELECT * FROM dev.mrt_deals_funnel ORDER BY sort_order;
SELECT * FROM dev.mrt_country_summary ORDER BY contact_count DESC;
.quit
```
