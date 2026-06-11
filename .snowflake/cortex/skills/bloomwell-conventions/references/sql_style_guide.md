# SQL Style Guide — dbt + Snowflake

Migrated from `dbt-standards`. Applies to all Bloomwell dbt models.

---

## CTE Pattern

Every model follows this structure without exception.

```sql
with

source_data as (

    select * from {{ source('source_name', 'table') }}

),

-- Descriptive comment explaining transformation
transformed as (

    select
        column_1,
        column_2

    from source_data

),

final as (

    select
        ...

    from transformed

)

select * from final
```

**Rules:**
- All `{{ ref() }}` and `{{ source() }}` calls go in CTEs at the top
- Each CTE does one logical unit of work — split if doing multiple things
- `final` is always the last CTE; the model ends with `select * from final`
- CTE names are descriptive: `filtered_active_patients`, not `t1`
- CTEs duplicated across models should become their own models

---

## Formatting Rules

```
- Trailing commas in SELECT lists
- 4-space indentation (predicates align with WHERE)
- Max 80 characters per line
- All lowercase for field names and SQL functions
- Explicit join types: left join, inner join — never bare join
- Table aliases must be readable: home_teams, not ht
- Prefix columns with alias when joining 2+ tables
- group by 1, 2 — not column names
- union all over union (union deduplicates at cost — be explicit if you need it)
- Newlines are cheap; don't compress for fewer lines
```

---

## Staging Model Pattern

1:1 with source tables. Rename, cast, deduplicate — no business logic. Views or ephemeral only.

```sql
with

source_table as (

    select * from {{ source('nba', 'games') }}

),

final as (

    select
        id::int as game_id,
        date::date as game_date,
        date::timestamp as game_at,

        -- Snowflake semi-structured access
        teams:away.id::int as away_team_id,
        teams:away.name::string as away_team_name,

        -- Deduplication flag
        row_number() over (
            partition by id
            order by _airbyte_emitted_at desc
        ) = 1 as is_latest

    from source_table

)

select * from final where is_latest
```

- Cast everything explicitly — Snowflake implicit casting causes silent bugs
- Deduplicate with `row_number()` partitioned by business key, ordered by ingestion timestamp desc
- Order columns: identifiers first, descriptive attributes middle, timestamps last
- Bronze keeps source column names as-is; rename in staging

---

## Dimension Model Pattern

```sql
with

patient as (
    select * from {{ ref('hubspot__contacts') }}

),

final as (

    select
        -- Surrogate key (always first)
        {{ dbt_utils.generate_surrogate_key(['patient.patient_id']) }} as patient_key,

        -- Business key
        patient.patient_id,

        -- Descriptive attributes
        patient.patient_name,
        patient.birth_date

    from patient

)

select * from final
```

- Surrogate key (`_key`) is always the first column
- Business key (`_id`) comes second
- Use `left join` when enriching — preserves all records from primary entity

---

## Fact Model Pattern

```sql
with

prescription as (
    select * from {{ ref('xpertyme__prescriptions') }}

),

dim_patient as (
    select * from {{ ref('dim_patient') }}

),

dim_date as (
    select * from {{ ref('dim_date') }}

),

final as (

    select
        -- Surrogate key
        {{ dbt_utils.generate_surrogate_key([
            'dim_patient.patient_key',
            'prescription_date_key.date_key'
        ]) }} as prescription_key,

        -- Dimension keys (foreign keys)
        dim_patient.patient_key,
        prescription_date_key.date_key as prescription_date_key,

        -- Measures
        prescription.prescribed_quantity,
        prescription.service_amount,

        -- Booleans converted to 0/1 for aggregation
        case when prescription.is_fulfilled then 1 else 0 end as fulfilled_count,
        case when not prescription.is_fulfilled then 1 else 0 end as unfulfilled_count

    from prescription

    left join dim_patient
        on prescription.patient_id = dim_patient.patient_id

    left join dim_date as prescription_date_key
        on prescription.prescription_date = prescription_date_key.date_day

)

select * from final
```

- Fact surrogate key is a composite of all dimension keys involved
- **Convert booleans to 0/1 `_count` columns** — BI tools can SUM integers, not booleans
- Role-playing dimensions: alias the same dim with descriptive names

---

## Mart (Gold) Model Pattern

Wide, denormalized, business-facing. Joins facts with all relevant dimensions so BI needs zero additional joins.

```sql
with

fct_prescription as (
    select * from {{ ref('fct_prescription') }}

),

dim_patient as (
    select * from {{ ref('dim_patient') }}

),

final as (

    select
        fct_prescription.prescription_key,
        dim_patient.patient_id,
        dim_patient.patient_name,
        fct_prescription.prescribed_quantity,
        fct_prescription.service_amount

    from fct_prescription

    left join dim_patient
        on fct_prescription.patient_key = dim_patient.patient_key

    where fct_prescription.is_active

)

select * from final
```

- Join on surrogate keys (`_key`), not business keys
- Gold-layer CET timestamps get the `_cet` postfix

---

## Anti-Patterns

| Don't | Do instead |
|---|---|
| `select * from source()` outside staging | Only staging models touch sources |
| Business logic in staging | Staging = rename, cast, deduplicate |
| Bare `join` without type | Always `left join`, `inner join`, etc. |
| `select *` in final models | Explicitly list every column |
| Abbreviations (`appt_key`, `rx_dt`) | Full words (`appointment_key`, `prescription_date`) |
| Layer name in table name | `dim_patient` not `silver_dim_patient` |
| Version numbers in names | Replace the model, don't add `_v2` |
| SCD type in table name | `dim_patient` not `dim_patient_scd2` |
| Generic column names | `appointment_status` not `status` |
| `union` without thinking | `union all` unless you explicitly need dedup |
| Hardcoded database/schema | Use `{{ source() }}` and `{{ ref() }}` |
| `_sk` suffix for surrogate keys | Use `_key` suffix |
| Staging materialized as table | Views or ephemeral only |
| Timestamps without timezone clarity | Default to UTC; suffix others: `_cet` |
