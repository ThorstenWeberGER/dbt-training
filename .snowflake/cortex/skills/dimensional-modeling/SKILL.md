---
name: dimensional-modeling
description: >
  Apply this skill whenever the user asks about data warehouse design, dimensional modeling,
  star schemas, snowflake schemas, fact tables, dimension tables, slowly changing dimensions (SCDs),
  data marts, OLAP, Kimball methodology, or data vault. Also trigger when users ask about
  "how to model X in a data warehouse", "what kind of fact table should I use", "how do I
  handle history in a dimension", or any question about structuring analytical data for BI tools
  or reporting. Use this skill proactively — if someone mentions building a data warehouse,
  analytics layer, or dimensional model of any kind, consult this skill first.
---

# Dimensional Modeling Skill

A practical guide to dimensional modeling — covering core rules, fact table patterns, dimension
design, and simplicity-first guidelines. Based on Kimball Group methodology.

---

## Core Philosophy

> **"The data warehouse exists to help business users make decisions."**

Design for query simplicity and understandability over normalization. A model that business
users can understand and BI tools can query efficiently beats a theoretically "correct" model
that's hard to use.

---

## The Four-Step Design Process

Always follow this sequence before writing any DDL:

1. **Select the business process** — What business activity are you modeling? (e.g., orders, payments, web clicks)
2. **Declare the grain** — What does one row in the fact table represent? Be precise. Never mix grains.
3. **Identify the dimensions** — Who, what, where, when, why, how surrounding the fact
4. **Identify the facts/measures** — What numeric measurements occur at this grain?

**Grain is everything.** An ambiguous grain is the #1 cause of broken dimensional models.

### Grain Documentation Format (dbt)
Every fact table must declare its grain in dbt YAML. One sentence. If you can't write it in one sentence, fix the model.

```yaml
models:
  - name: fct_prescription
    description: >
      One row per prescription issued. Grain: one prescription event
      per patient per doctor per prescription_date.
    columns:
      - name: prescription_key
        tests: [unique, not_null]
```

---

## Snowflake Constraints & dbt Tests

Add `PRIMARY KEY` and `FOREIGN KEY` constraints to all Silver and Gold tables. Snowflake does not enforce them — they are metadata for ER diagrams and Cortex AI join path resolution. Both the constraint AND the corresponding dbt test are required.

Constraints are applied via **dbt post-hooks** in the model config:

```sql
-- In dbt model config (post-hook)
{{ config(
    post_hook=[
        "ALTER TABLE {{ this }} ADD PRIMARY KEY (prescription_key)",
        "ALTER TABLE {{ this }} ADD FOREIGN KEY (patient_key) REFERENCES {{ ref('dim_patient') }} (patient_key)"
    ]
) }}
```

| Validate | dbt test |
|---|---|
| PK uniqueness | `unique` + `not_null` on `_key` |
| FK validity | `relationships` referencing parent dim |
| Required fields | `not_null` on non-nullable columns |

---

## Key Rules of Dimensional Modeling

### Rule 1: Conformed Dimensions
Dimensions shared across fact tables must be identical (same keys, same attributes).
- `dim_customer`, `dim_product`, `dim_store` should be reusable across the warehouse
- Enables drill-across queries between fact tables without joins

### Rule 2: Surrogate Keys vs. Business Keys — Choose Pragmatically
Surrogate keys are the **default** for dimension PKs, but they are not always mandatory.

**Use surrogate keys when:**
- The dimension needs SCD Type 2 (history tracking) — surrogate keys allow multiple rows per entity
- The source system key is unstable, reused, or could change
- You are integrating multiple source systems into one dimension (key conflicts likely)
- The natural key is a string, UUID, or composite — integer surrogates join faster

**Business keys as PKs are acceptable when:**
- The key is provably stable (e.g., ISO country codes, currency codes, static reference data)
- The dimension is Type 0 or Type 1 only — no history needed
- The team is small and operational overhead of surrogate key generation outweighs the benefit
- You explicitly document the assumption of stability

**Rule of thumb:** If a business user would recognize and use the key (e.g., `US`, `EUR`, `2024-03-07`), and it won't change, using it directly is fine and simpler. If in doubt, add a surrogate.

```sql
-- Acceptable: stable reference dimension using business key as PK
CREATE TABLE dim_country (
    country_id    CHAR(2) PRIMARY KEY,   -- ISO 3166-1 alpha-2 — stable by definition (_id suffix: business key)
    country_name  VARCHAR(100),
    region        VARCHAR(50)
);

-- Required: customer dimension with SCD Type 2 needs surrogate
CREATE TABLE dim_customer (
    customer_key  INT PRIMARY KEY,        -- surrogate (_key suffix)
    customer_id   VARCHAR(20),            -- source/business key (_id suffix)
    ...
);
```

### Rule 3: Denormalize Dimensions
Flatten hierarchies into the dimension table. Do **not** snowflake unless forced to.
- `dim_product` should contain `product_name`, `category`, `subcategory`, `brand` — not separate tables
- BI tools and users navigate flat attributes much more easily

### Rule 4: Never Put Text in Fact Tables
All descriptive text belongs in dimensions. Facts contain:
- Numeric measures (additive, semi-additive, or non-additive)
- Foreign keys to dimension tables
- Degenerate dimensions (IDs that have no associated dimension table — e.g., order_number)

### Rule 5: Declare Additivity for Every Measure
- **Additive**: Can SUM across all dimensions (e.g., sales_amount, quantity)
- **Semi-additive**: Can SUM across some dimensions, not others (e.g., account_balance — don't sum across time)
- **Non-additive**: Can never SUM (e.g., ratios, percentages — store numerator/denominator instead)

### Rule 6: Handle NULL Carefully
- Dimension FKs in fact tables should never be NULL — use a "Not Applicable" surrogate key (e.g., -1)
- Measure NULLs are acceptable but document their meaning explicitly

### Rule 7: Date Dimension — Optional in Modern Warehouses
Traditional Kimball mandates `dim_date` on every fact table. In modern cloud warehouses this rule is relaxed:

- **Modern BI tools** (Looker, Power BI, Tableau) have native date intelligence — they extract year, quarter, month, week, day-of-week directly from a `DATE` column without a dimension join
- **Modern warehouses** (Snowflake, BigQuery, Databricks) handle date filtering on raw columns with negligible performance impact
- Storing a raw `order_date DATE` in the fact table is simpler and sufficient in most cases

**Build `dim_date` when:**
- You need a **fiscal calendar** (fiscal year/quarter that doesn't align to ISO)
- You need a **date spine** — a scaffold of all dates to detect gaps or ensure every date appears in reports even with no fact data
- You have custom date attributes not derivable from the date itself (trading days, company holidays)

**Default today:** Store a `DATE` column in the fact. Build `dim_date` only when fiscal calendar or date spine is explicitly required.

---

## Fact Table Types & When to Use Them

### 1. Transaction Fact Table
**One row per transaction event.**

| Use When | Examples |
|----------|----------|
| Each business event is discrete | Sales orders, payments, clicks, calls |
| Events are at a point in time | Insurance claims, ticket purchases |
| You need full history of events | ATM withdrawals, log entries |

```sql
-- Example: Sales transaction fact
CREATE TABLE fct_sales (
    order_date      DATE,                         -- raw date, no dim_date needed
    customer_key    INT REFERENCES dim_customer(customer_key),
    product_key     INT REFERENCES dim_product(product_key),
    store_key       INT REFERENCES dim_store(store_key),
    order_number    VARCHAR(20),                  -- degenerate dimension
    quantity        INT,
    unit_price      DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    sales_amount    DECIMAL(10,2)                 -- additive
);
```

**Pros:** Dense, flexible, complete history  
**Watch out for:** Very high row counts; pre-aggregation may be needed at scale

---

### 2. Periodic Snapshot Fact Table
**One row per entity per time period (day, week, month).**

| Use When | Examples |
|----------|----------|
| You need status at regular intervals | Account balances, inventory levels |
| Point-in-time reporting is required | Headcount by month, pipeline by week |
| Slow-moving measures need tracking | Subscription status, patient vitals |

```sql
-- Example: Monthly account snapshot
CREATE TABLE fct_account_monthly_snapshot (
    snapshot_date       DATE,                     -- last day of month, raw date
    account_key         INT REFERENCES dim_account(account_key),
    customer_key        INT REFERENCES dim_customer(customer_key),
    balance             DECIMAL(12,2),            -- semi-additive (sum across accounts, not months)
    overdraft_amount    DECIMAL(12,2),            -- semi-additive
    transaction_count   INT                       -- additive
);
```

**Pros:** Fast period-over-period queries, predictable row counts  
**Watch out for:** Rows must be inserted even when nothing changes (use previous snapshot values)

---

### 3. Accumulating Snapshot Fact Table
**One row per business process instance, updated as it progresses through stages.**

| Use When | Examples |
|----------|----------|
| Processes have defined stages/milestones | Order fulfillment, loan origination |
| You need lag/duration between stages | Claims processing, hiring pipeline |
| Workflow completion analysis is needed | Support ticket lifecycle |

```sql
-- Example: Order fulfillment accumulating snapshot
CREATE TABLE fct_order_fulfillment (
    order_key               INT,
    order_placed_date       DATE,
    order_picked_date       DATE,
    order_shipped_date      DATE,
    order_delivered_date    DATE,
    customer_key            INT REFERENCES dim_customer(customer_key),
    product_key             INT REFERENCES dim_product(product_key),
    order_amount            DECIMAL(10,2),
    days_to_ship            INT,                  -- lag measure
    days_to_deliver         INT                   -- lag measure
);
```

**Pros:** Excellent for funnel and pipeline analysis  
**Watch out for:** Rows are **updated** (not inserted) as milestones complete — ETL is more complex; downstream caching must handle updates

---

### 4. Factless Fact Table
**Records that an event occurred — no numeric measures.**

| Use When | Examples |
|----------|----------|
| You need to track coverage/eligibility | Student enrollment, product promotions |
| Events have no inherent measure | Page views (before adding metrics), attendance |
| Absence of event is meaningful | "Did customer X see promotion Y?" |

```sql
CREATE TABLE fct_enrollment (
    enrollment_date DATE,
    student_key     INT REFERENCES dim_student(student_key),
    course_key      INT REFERENCES dim_course(course_key),
    instructor_key  INT REFERENCES dim_instructor(instructor_key)
    -- No measures; COUNT(*) is the measure
);
```

**Watch out for:** Requires a "coverage table" technique to answer "what didn't happen"

---

### 5. Junk Dimension
**A single dimension grouping low-cardinality flags, indicators, and codes that don't belong to any natural dimension.**

| Use When | Examples |
|----------|----------|
| Many small boolean/flag columns exist in the source | `is_rush_order`, `is_gift_wrap`, `is_promotional` |
| Codes and indicators clutter the fact table | Payment method type, shipping method code |
| Attributes don't belong to any existing dimension | Order channel flags, contact type codes |

Instead of one dimension per flag (wasteful) or flags directly in the fact table (wrong), combine into one junk dimension containing every combination of values that actually occurs.

```sql
CREATE TABLE dim_order_flags (
    order_flags_key   INT PRIMARY KEY,
    is_rush_order     BOOLEAN,
    is_gift_wrap      BOOLEAN,
    is_promotional    BOOLEAN,
    payment_channel   VARCHAR(20),   -- 'online', 'in-store', 'phone'
    shipping_method   VARCHAR(20)
);
-- Fact table gets one FK: order_flags_key INT REFERENCES dim_order_flags
```

**Watch out for:** Pre-populate only combinations that exist in data, not the full Cartesian product.

---

## Bridge Tables (Many-to-Many Dimensions)

When a fact row relates to **multiple members of a dimension** simultaneously (an order with multiple promotions, a patient with multiple diagnoses, an account with multiple owners), a bridge table resolves the many-to-many without duplicating fact rows.

```sql
CREATE TABLE bridge_sales_promotion (
    sales_key         INT REFERENCES fct_sales(sales_key),
    promotion_key     INT REFERENCES dim_promotion(promotion_key),
    weighting_factor  DECIMAL(5,4)   -- all rows for one sale must sum to 1.0
);
```

Always multiply by `weighting_factor` when aggregating to avoid double-counting:

```sql
SELECT p.promotion_name,
       SUM(f.sales_amount * b.weighting_factor) AS attributed_sales
FROM fct_sales f
JOIN bridge_sales_promotion b ON f.sales_key = b.sales_key
JOIN dim_promotion p          ON b.promotion_key = p.promotion_key
GROUP BY p.promotion_name;
```

If attribution is unknown, distribute equally (1/n per member). Don't expose bridge tables directly in BI tools — always join through the fact.

---

## Slowly Changing Dimensions (SCD) — Quick Reference

| Type | Behavior | Use When |
|------|----------|----------|
| **Type 0** | Never change (fixed) | Birth date, original contract date |
| **Type 1** | Overwrite — no history | Typo corrections, non-analytical attributes |
| **Type 2** | Add new row — full history | Customer address, product category changes |
| **Type 3** | Add new column — limited history | "Current" vs "Previous" value only |
| **Type 4** | Mini-dimension — fast-changing attrs | Demographics split from core dimension |
| **Type 6** | Hybrid (1+2+3) | Current + historical flags + previous value |

**Default to Type 2** when in doubt and history matters. Add `effective_date`, `expiry_date`, and `is_current` flag.

---

## Simplicity Guidelines

### Design Heuristics
- **Start with one business process.** Don't try to model the entire enterprise at once.
- **Resist snowflaking.** A snowflaked schema saves storage but costs query complexity. Storage is cheap; developer and user time is not.
- **Avoid over-engineering SCDs.** Use Type 1 unless you have a clear reporting need for history. Each SCD type adds ETL complexity.
- **Build the bus matrix first.** Map business processes (rows) to conformed dimensions (columns) before writing any SQL. Align on this with stakeholders.
- **One fact table per grain.** If you find yourself mixing grains, split into two fact tables.
- **Limit dimensions per fact table.** More than 12–15 dimensions is a signal the grain is unclear.

### Naming Conventions

#### Table Prefixes
| Prefix | Layer | Purpose |
|--------|-------|---------|
| (none) | Bronze | Schema provides context — `BRONZE.{source}.table` |
| `{source}__{entity}` | Staging | Double underscore separates source from entity: `hubspot__contacts` |
| `dim_` | Silver | Dimension tables |
| `fct_` | Silver | Fact tables |
| `bridge_` | Silver | Bridge tables for many-to-many |
| `mrt_` | Gold | Aggregated marts and data products |

**Don'ts:**
- Don't prefix Bronze tables with `raw_` or `brz_` — the schema name already communicates the layer
- Don't encode the layer in the table name when the schema already does it
- Don't add version numbers (`dim_patient_v2`) — replace the model, use dbt alias if needed
- Don't encode SCD type in the table name (`dim_patient_scd2`) — document SCD strategy in dbt model metadata instead

**Singular vs. plural:** Use singular for both dimensions and facts. `dim_patient` (one row per patient), `fct_prescription` (one prescription event per row). Never `dim_patients`.

#### Column Suffixes — Use Consistently
| Suffix | Type | Example |
|--------|------|---------|
| `_key` | Surrogate integer PK or FK | `patient_key`, `product_key` |
| `_id` | Business/natural key from source system | `patient_id`, `hubspot_contact_id` |
| `_at` | Timestamp with time (UTC) | `created_at`, `cancelled_at` |
| `_date` | Calendar date, no time | `prescription_date`, `birth_date` |
| `_date_cet` | Date or timestamp converted to CET — Gold layer only | `service_date_cet`, `shipping_date_cet` |
| `is_` / `has_` | Boolean — must be answerable yes/no | `is_active`, `has_prescription`, `is_deleted` |
| `_amount` | Monetary value **in cents** | `service_amount`, `refund_amount` |
| `_count` / `_quantity` | Integer count or quantity | `appointment_count`, `prescribed_quantity` |
| `_pct` / `_ratio` | Percentage or ratio — never SUM these | `churn_pct`, `fill_ratio` |
| `_duration_{unit}` | Duration with explicit unit | `call_duration_seconds`, `wait_duration_minutes` |
| `_text` / `_note` | Free text or comments | `cancellation_note`, `diagnosis_text` |
| `_name` | Human-readable label | `product_name`, `doctor_name` |
| `_type` | Never standalone — always qualify | `appointment_type`, `service_type` |

> **Note:** Short codes that identify a business entity (e.g., ISO country codes, currency codes) are business keys — use `_id`, not `_code`. `country_id`, `currency_id`.

#### General Rules
- Use `snake_case` everywhere — no camelCase, no PascalCase, no spaces
- Use full words — `patient_key` not `pat_key`, `prescription_date` not `rx_dt`
- Abbreviations allowed: `id`, `pct`, `qty` — Abbreviations NOT allowed: `appt`, `rx`, `pharm`
- Never use reserved SQL keywords as column names (`date`, `order`, `status`) — always qualify: `appointment_date`, `service_order`, `patient_status`
- Never encode data types in names — no `patient_name_varchar` or `amount_decimal`
- Never use `type` as standalone column name — always qualify: `appointment_type`, `service_type`
- Boolean columns must be answerable yes/no: `is_active` reads as "is active? yes/no"
- Source system column names are kept as-is in Bronze — renaming happens in Staging

---

## Layer Architecture & Materialization Patterns

A well-structured warehouse has four layers. Staging is optional — you can load directly into Bronze. Each layer has a clear contract: what goes in, what comes out, and how it's materialized.

```
[Staging] → Bronze → Silver → Gold
(optional)  (raw)    (clean)  (dimensional)
```

### Staging — Raw File Landing (Optional)

**Purpose:** Landing zone for raw files (CSV, Excel, API exports) before they are loaded into Bronze. Staging is optional — if your source system connects directly to the warehouse, load straight into Bronze.

**What belongs here:**
- Raw CSV, Excel, or flat file uploads as-is
- No transformations, no renaming, no type casting — that happens in Bronze or later
- Named `{source}__{entity}`: `hubspot__contacts`, `xpertyme__appointments`

**Materialization:** **Views or ephemeral** in dbt. Never persisted as tables unless there is a specific, documented performance reason.

---

### Bronze — Raw / Ingested Layer

**Purpose:** Exact copy of source data as ingested from Staging or directly from source systems. Minimal changes during import.

**What belongs here:**
- One table per source object, named after the source system — schema provides context (`BRONZE.HUBSPOT.contacts`, `BRONZE.SHOPIFY.orders`)
- All source columns preserved, even if unused
- Light type casting to compatible warehouse types (e.g., VARCHAR for ambiguous fields)
- Light renaming only if source names are illegal SQL identifiers

**What does NOT belong here:**
- Joins between sources
- Business rules or derived columns
- Deduplication

**Materialization:** **Append-only tables** (or external tables over raw files). Never update or delete Bronze rows — treat as immutable audit trail. Add metadata columns: `_loaded_at TIMESTAMP`, `_source_file VARCHAR`, and optionally `_row_hash VARCHAR` for change detection.

---

### Silver — Cleaned / Conformed Layer

**Purpose:** Single source of truth per entity. Clean, typed, deduplicated, and renamed. Business logic starts here but stays entity-level — no cross-domain joins yet.

**What belongs here:**
- Proper data types (`TIMESTAMP`, `DATE`, `DECIMAL`, `BOOLEAN` — not everything as VARCHAR)
- Renamed columns following naming conventions (`_at`, `_id`, `_date` suffixes)
- Deduplication and NULL handling
- Basic derived columns that are universally true (e.g., `full_name = first_name || ' ' || last_name`)
- SCD Type 2 history tables live here if tracking changes per source entity
- One table per business entity — named per domain: `SILVER.APPOINTMENTS`, `SILVER.MEDICATIONS`

**What does NOT belong here:**
- Cross-domain business metrics (revenue calculations, KPIs)
- Fact or dimension table structure (that's Gold)
- Aggregations

**Materialization:** **Full refresh or incremental tables** with `updated_at` watermarks. Silver can always be rebuilt from Bronze.

### Gold — Presentation / Data Mart Layer (Kimball)

**Purpose:** Business-ready dimensional models. Optimized for BI tools, dashboards, and analytical queries. This is where Kimball rules fully apply.

**What belongs here:**
- `dim_*` tables (conformed dimensions, SCDs, junk dimensions)
- `fct_*` tables (all four fact table types)
- `bridge_*` tables
- `mart_*` pre-aggregated tables for high-frequency BI queries

**What does NOT belong here:**
- Raw or semi-processed data
- Source system keys as PKs (unless stable reference data — see Rule 2)
- Business logic that hasn't been validated in Silver first

**Materialization:** **Tables** (not views) for all fact and dimension tables. Use **incremental** loads for large fact tables; **full refresh** for dimensions unless very large. BI tools need predictable, fast query performance — views re-execute on every hit.

**Key rule:** Each layer is independently queryable and trustworthy. Gold broken → Silver still correct. Silver broken → Bronze still has raw truth.

```
[Staging] → Bronze (append-only) → Silver (full/incr tables) → Gold (incr fct / full-refresh dim)
(optional)
```

---

### Anti-Patterns to Avoid
| Anti-Pattern | Problem | Fix |
|---|---|---|
| Putting text/flags in fact table | Breaks BI filtering; wastes space | Move to dimension or junk dimension |
| Mixed grain in one fact table | Incorrect aggregations | Split into two facts at consistent grains |
| Pre-aggregated data only — no atomic grain | Can't drill down; queries hit walls | Always load at lowest atomic grain first |
| YTD / running totals stored as facts | Non-additive; causes double-counting across dates | Compute in BI layer; store only base measures |
| Using source system keys as dimension PK | Breaks SCD handling; multi-source conflicts | Add surrogate key |
| Snowflaking every hierarchy | Complex queries, poor BI performance | Flatten into single dimension table |
| Hierarchy split across fact table FKs | Fact table joins 20+ dims; unmanageable | Collapse brand/category/department into `dim_product` |
| Codes without descriptive decodes in dimensions | Users can't filter without lookup sheets | Always pair `status_id` with `status_name` in the dimension |
| Dimension table growing at same rate as fact table | Signals a degenerate dimension masquerading as a full dim | Move operational control numbers (order_number, invoice_number) to degenerate dimension on fact table |
| NULL foreign keys in fact table | Broken joins, incorrect counts | Use -1 "Not Applicable" surrogate key |
| Semi-additive measure summed over time | Wrong totals (e.g., double-counting balances) | Document additivity; use AVG or LAST for time |
| SCD strategy undeclared for dimension attributes | ETL built wrong; history lost or duplicated | Declare SCD type for every attribute before development starts |

---

## Quick-Reference: Which Fact Table Do I Need?

```
Does each row represent a discrete event?
  YES → Transaction Fact Table

Does each row represent the state at a point in time (e.g., end of day/month)?
  YES → Periodic Snapshot Fact Table

Does each row track a process that moves through stages over time?
  YES → Accumulating Snapshot Fact Table

Do you just need to record that something happened, with no measures?
  YES → Factless Fact Table
```

---

### ETL/Load Order (within Gold)
Always load in this order to avoid FK violations:
1. All dimension tables
2. Bridge tables
3. Fact tables

If `dim_date` is used (fiscal calendar / date spine), load it first before other dimensions.

---

## Checklist Before Finalizing Any Model

**Design**
- [ ] Grain is declared in one precise sentence
- [ ] All dimensions are conformed (or documented as local)
- [ ] Every measure has additivity documented
- [ ] No NULLs in dimension foreign keys
- [ ] Date handling decided: raw DATE column (default) or dim_date (fiscal calendar / date spine needed)
- [ ] Many-to-many relationships resolved with bridge tables (with weighting factor)
- [ ] Low-cardinality flags grouped into junk dimensions

**Keys & Naming**
- [ ] Surrogate keys used where SCD or multi-source integration is needed
- [ ] Business keys used as PK only where stability is explicitly confirmed and documented
- [ ] Column suffixes applied consistently (`_key`, `_id`, `_at`, `_date`, `is_`, `has_`, `_amount`, `_pct`, `_duration_{unit}`)
- [ ] Table prefixes applied consistently — Bronze: no prefix; Staging: `{source}__{entity}`; Silver: `dim_`/`fct_`/`bridge_`; Gold: `mrt_`
- [ ] Boolean columns start with `is_` or `has_` and are answerable yes/no
- [ ] SCD type declared in dbt metadata — not encoded in table name
- [ ] Singular table names used throughout (`dim_patient` not `dim_patients`)
- [ ] No reserved SQL keywords used as column names
- [ ] Monetary amounts stored in cents with `_amount` suffix

**dbt & Constraints**
- [ ] Grain documented in dbt YAML model description in one sentence
- [ ] `PRIMARY KEY` and `FOREIGN KEY` constraints added to Silver and Gold tables
- [ ] dbt `unique` + `not_null` tests on all `_key` columns
- [ ] dbt `relationships` test for all foreign keys
- [ ] Silver and Gold models have column descriptions (CI will fail without them)

**Layer Contract**
- [ ] Staging used only for raw file landing (CSV/Excel) — optional, skip if source connects directly
- [ ] Bronze tables are append-only with `_loaded_at` metadata; no prefix, schema provides context
- [ ] Silver tables are typed, deduplicated, named per domain convention
- [ ] Gold tables follow Kimball rules; fact tables materialized as tables (not views)
- [ ] Bus matrix updated to include new fact/dimensions
