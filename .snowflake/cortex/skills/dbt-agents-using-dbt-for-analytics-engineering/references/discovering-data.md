# Discovering Data with dbt

Complete all six steps for every table you plan to model on. Shortcuts here create technical debt.

## Six-Step Discovery Process

### Step 1 — Inventory Objects

```bash
dbt ls --select source:source_name --resource-type source
dbt show --inline "select table_name from information_schema.tables where table_schema = 'RAW_SCHEMA'" --limit 50
```

### Step 2 — Sample Raw Data

```bash
dbt show --inline "select * from {{ source('source_name', 'table_name') }}" --limit 20
```

Document: column names, data types, sample values, obvious nulls.

### Step 3 — Exploratory Analysis

```bash
# Row count and grain check
dbt show --inline "select count(*), count(distinct id) from {{ source('src', 'tbl') }}" --limit 5

# Null counts
dbt show --inline "select count(*) - count(col1) as nulls_col1 from {{ source('src', 'tbl') }}" --limit 5

# Value distribution
dbt show --inline "select status, count(*) from {{ source('src', 'tbl') }} group by 1 order by 2 desc" --limit 20
```

### Step 4 — Document Findings

Create `models/<source>/_discovery.md`:

```markdown
## <table_name>
- **Row count:** ~X rows
- **Grain:** One row per <entity>
- **Key columns:** id, created_at, status
- **Nulls:** column_x is 12% null
- **Data quality issues:** status has undocumented values 'legacy_paid'
- **Recommended transformations:** cast created_at to timestamp, normalize status
```

### Step 5 — Validate Relationships

Validate joins on the full dataset, not just samples:

```bash
dbt show --inline "
  select count(*) as orphans
  from {{ source('src', 'orders') }} o
  left join {{ source('src', 'customers') }} c on o.customer_id = c.id
  where c.id is null
" --limit 5
```

### Step 6 — Check for Soft Deletes

```bash
dbt show --inline "
  select is_deleted, count(*) 
  from {{ source('src', 'tbl') }} 
  group by 1
" --limit 5
```

## Handling Large Datasets

Don't do abbreviated discovery on everything. Instead:
1. Ruthlessly scope which tables are in play
2. Run the full 6-step methodology on only those tables

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "I don't have time for full discovery" | Incomplete discovery causes more rework later |
| "I know this table already" | Data changes. Verify assumptions every time |
| "I'll just run it and see what breaks" | Debugging blind is slower than discovery upfront |
