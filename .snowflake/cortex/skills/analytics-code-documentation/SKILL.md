---
name: analytics-code-documentation
description: >
  Use this skill whenever Thorsten asks to document code, a project, a script, a dbt model, 
  a data pipeline, or any part of the analytics codebase. Triggers include: "document my code", 
  "create documentation", "write a doc for this", "explain this project", "document this model/script/pipeline". 
  This skill is specifically designed for analytics engineering work in Snowflake, dbt (SQL + YAML), 
  standalone SQL scripts, and Python API scripts. It produces lean, focused documentation that captures 
  what matters most — architecture decisions, data flows, and non-obvious logic — without bloating docs 
  with things the code already says. Always use this skill when documentation is the goal, even if the 
  user phrases it casually like "can you write something up about this?"
---

# Analytics Code Documentation Skill

A lean documentation approach for analytics engineering projects: dbt models, Python API scripts, standalone SQL scripts, and Snowflake-based data work.

## Core Philosophy: Document the Why, Not the What

Code shows **what** happens. Documentation explains **why** decisions were made, **how** pieces connect, and **what** would be non-obvious to someone new.

**Document this:**
- Architecture decisions and the reasoning behind them
- Data flow: where data comes from → how it's transformed → where it goes
- Non-obvious business logic or edge cases
- Gotchas, limitations, known tradeoffs
- External dependencies and their purpose

**Skip this:**
- What the code already clearly states
- Step-by-step re-narration of SQL/Python logic
- Generic boilerplate descriptions

---

## Step 1: Understand the Codebase

Before writing anything, read the code and identify gaps. Use `view` and `bash` tools to explore the project structure.

```bash
# Get a project overview
find . -type f \( -name "*.sql" -o -name "*.py" -o -name "*.yml" -o -name "*.yaml" \) | head -60
find . -name "dbt_project.yml" -o -name "profiles.yml" | xargs cat 2>/dev/null
```

For dbt projects, also check:
- `dbt_project.yml` — project config, model materializations, vars
- `sources.yml` / `schema.yml` — source definitions, tests
- `models/` folder structure — staging / intermediate / marts layers
- `macros/` — reusable logic

For Python scripts:
- Entry points (main functions, CLI args)
- External API calls and auth patterns
- Data output (what gets written where)

For standalone SQL scripts:
- Script purpose and who runs it (manual, scheduled, ad hoc)
- Input tables/views and output targets
- Any temp tables, CTEs with complex logic, or session-level settings (e.g. `USE WAREHOUSE`)

---

## Step 2: Ask Thorsten the Right Questions

After reviewing the code, identify what **cannot be deduced** from code alone. Ask these targeted questions — do NOT ask everything at once. Pick the 3-5 most important gaps.

### Question Bank (select what's relevant)

**Purpose & Context**
- What is the business problem this solves?
- Who consumes this data / output? (BI tool, downstream team, API consumer)
- How often does this run? (scheduled, triggered, ad hoc)

**Data Sources**
- What are the upstream source systems? (ERP, CRM, flat files, APIs)
- Are there SLAs or freshness expectations on source data?
- Any known data quality issues to call out?

**Key Decisions**
- Why was [specific approach] chosen over alternatives? (e.g. incremental vs full refresh, specific join logic)
- Are there business rules that aren't obvious from the code?
- What edge cases does this handle — or intentionally ignore?

**Snowflake-specific**
- Which database/schema naming conventions are used?
- Any specific warehouse sizing decisions worth noting?
- Role/permission model relevant to understand access?

**Maintenance**
- What breaks first if something goes wrong?
- Any known tech debt or planned changes?

---

## Step 3: Choose the Right Documentation Type

| Project Type | Documentation Format |
|---|---|
| Single dbt model | Inline YAML description + column descriptions in `schema.yml` |
| dbt project (multiple models) | `PROJECT_OVERVIEW.md` + inline YAML |
| Python API script | `README.md` with purpose, usage, data flow |
| Standalone SQL script | Header block comment in the `.sql` file |
| Multi-script SQL pipeline | `PIPELINE_OVERVIEW.md` + header blocks per script |
| Multi-script Python pipeline | `ARCHITECTURE.md` with flow diagram |
| Full analytics project | Full structure (see below) |

---

## Step 4: Write the Documentation

### Standard Document Structure

Use only the sections that are relevant. Remove empty sections.

```markdown
# [Project / Model Name]

## What This Does
One paragraph. Business purpose + who uses it. Not technical — explain it to a smart non-engineer.

## Data Flow
[Source] → [Transformation] → [Output/Consumer]

Use a simple ASCII diagram or bullet list. For dbt, note the layer (staging / intermediate / mart).

Example:
  Salesforce API → stg_salesforce__opportunities → int_pipeline_enriched → mart_revenue

## Key Design Decisions
The most important section. Each decision should answer: "Why this and not something else?"

- **Incremental materialization**: Chosen over full refresh because the source table has 50M+ rows 
  and only appends new records. Deduplication is handled on `opportunity_id`.
- **Exclusion of draft records**: Business rule from Revenue team — draft opps inflate pipeline metrics.
- **Currency conversion at staging layer**: Done early so all downstream models work in USD.

## Data Sources
| Source | System | Refresh cadence | Notes |
|---|---|---|---|
| raw.salesforce.opportunity | Salesforce via Fivetran | hourly | excludes deleted records |

## Gotchas & Limitations
- Known issue: late-arriving data from EU region can cause records to appear with next day's timestamp
- Not designed for historical backfills — use the backfill script in `/scripts/backfill.py`

## Column Reference (for mart/final models only)
Only document columns that are non-obvious. Skip `id`, `created_at` etc.

| Column | Description |
|---|---|
| arr_adjusted | Annual Recurring Revenue after manual override adjustments from finance team |
```

---

## Step 5: dbt-Specific Documentation

For dbt projects, documentation lives in two places:

### In `schema.yml` (already exists — read and update, don't recreate)
`schema.yml` will already exist in the project. Read it as a source of truth. Your job is to:
- Fill in **missing** model and column descriptions
- Improve **weak or generic** descriptions that don't explain the why
- Leave descriptions that are already clear and accurate as-is

Only touch descriptions — never modify tests, sources, or other config in this file.

Good description (update to this standard):
```yaml
description: >
  Final revenue mart consumed by the Finance dashboard.
  Includes all closed-won opportunities converted to USD.
  Rebuilt nightly. Source of truth for ARR reporting.
```

Weak description (flag and improve):
```yaml
description: "Revenue data"  # too vague — what revenue? who uses it? when is it rebuilt?
```

### Macros
Read all files in `macros/`. For each macro, document in a table:

| Macro | Purpose | Key Parameters | Used In |
|---|---|---|---|
| `generate_surrogate_key(fields)` | Creates a hashed surrogate key from a list of columns | `fields` — list of column names to hash | All staging models |
| `cents_to_dollars(column)` | Converts integer cent values to decimal dollar amounts | `column` — source column name | `stg_payments`, `mart_revenue` |
| `is_incremental_safe()` | Wraps incremental filter with a fallback for full refresh runs | — | All incremental models |

Include this table in `PROJECT_OVERVIEW.md`.

### In `PROJECT_OVERVIEW.md` (human-readable, for onboarding)
Covers: layer structure, naming conventions, macros table (see above), data sources, and non-obvious project-wide decisions.

---

## Step 6: Python Script Documentation

### Header block (at top of every script)
```python
"""
Script: load_hubspot_contacts.py
Purpose: Fetches new/updated HubSpot contacts via API and loads them into Snowflake raw layer.

Data flow:
  HubSpot Contacts API (v3) → normalized JSON → Snowflake.RAW.HUBSPOT.CONTACTS

Runs: Daily at 02:00 UTC via Airflow DAG `hubspot_daily`
Auth: Uses HUBSPOT_API_KEY from env var (set in Airflow connection)

Key decisions:
- Incremental by `lastModifiedDate` to avoid full API scan (60k+ contacts)
- Upsert on `hs_object_id` to handle updates without duplicates
- Rate limiting: 10 req/sec enforced via RateLimiter to stay within HubSpot free tier

Known limitations:
- Deleted contacts are NOT synced (HubSpot API requires separate endpoint)
- Max lookback window: 90 days (API limitation)
"""
```

### Inline comments: only for non-obvious logic
```python
# HubSpot returns timestamps in milliseconds — convert to seconds for Python datetime
created_at = datetime.fromtimestamp(contact['createdAt'] / 1000)

# Retry on 429 (rate limit) up to 3 times with exponential backoff
# HubSpot free tier: 100 req/10sec burst, 40k req/day
```

---

## Step 7: Standalone SQL Script Documentation

SQL scripts (ad hoc queries, maintenance scripts, load procedures) get a header block comment at the top. No separate README needed unless it's a multi-script pipeline.

### Header block (at top of every `.sql` file)
```sql
/*
Script:  load_ticket_summary.sql
Purpose: Aggregates open support tickets by category and priority for the weekly ops review.
         Run manually by the ops team every Monday before the 9am standup.

Data flow:
  RAW.ZENDESK.TICKETS + RAW.ZENDESK.USERS → ANALYTICS.OPS.TICKET_SUMMARY (TRUNCATE + INSERT)

Runs: Manual — no scheduler. Ad hoc on demand.
Warehouse: COMPUTE_WH (M) — runtime ~2 min on full dataset

Key decisions:
- TRUNCATE + INSERT instead of MERGE: ticket statuses change frequently, full reload is simpler
  and the table is small enough (<50k rows) that cost is negligible.
- Excludes ticket type 'internal' — these are engineering tasks, not customer issues.
- Priority 'urgent' is hardcoded as rank 1 — business definition agreed with ops team, not in source.

Known limitations:
- Does not handle ticket re-opens — a ticket closed and reopened counts as closed.
- Source data has ~3% of tickets with NULL category; these are grouped under 'uncategorized'.
*/
```

### Inline comments: only for non-obvious SQL logic
```sql
-- Tickets created before 2022 use legacy status codes ('open_v1') — normalize to 'open'
CASE WHEN status IN ('open', 'open_v1') THEN 'open' ELSE status END AS normalized_status,

-- Window over ticket_id to get latest update per ticket (source has one row per event)
ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY updated_at DESC) AS rn
```

### For multi-script SQL pipelines: add a `PIPELINE_OVERVIEW.md`
Document the execution order, dependencies between scripts, and what to do when one fails.

```markdown
# Pipeline: Weekly Ticket Summary

## Execution Order
1. `01_extract_raw_tickets.sql` — pulls from Zendesk source, loads to staging
2. `02_enrich_with_users.sql`   — joins user/agent data
3. `03_load_ticket_summary.sql` — final aggregation to reporting table

## Dependencies
- Must run after Zendesk Fivetran sync completes (~01:00 UTC)
- Step 3 depends on Step 2 completing successfully — check row count before proceeding

## When Things Break
- Step 1 fails: check Fivetran sync status in Snowflake task history
- Step 3 produces 0 rows: Step 2 likely failed silently — rerun from Step 2
```

---

## Output Quality Checklist

Before finishing, verify:
- [ ] A new team member could understand the purpose in 2 minutes
- [ ] Every major design decision has a "why"
- [ ] Data lineage is clear: source → transform → consumer
- [ ] Gotchas and known limitations are called out
- [ ] No section just restates what the code already shows

---

## What NOT to Write

❌ "This model selects from the staging table and joins to the accounts table"  
✅ "Joined to accounts to enrich with segment data — segment drives pricing tier logic downstream"

❌ "The script authenticates using an API key"  
✅ "Uses OAuth2 client credentials flow — token expires every 3600s, refresh handled automatically"

❌ "This SQL selects tickets and groups by category"  
✅ "Groups by category to feed the Monday ops review — 'internal' tickets excluded per ops team agreement"

❌ Long column-by-column descriptions for obvious fields  
✅ Only document columns with non-obvious business meaning
