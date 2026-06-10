# dbt Workshop — Payments Source Modeling

## Pre-work (before the day, Thorsten — 1–2 hours)

- Profile the 6 source tables in Snowflake: row counts, null rates, distinct values on key columns, date ranges
- Prepare a one-pager per table: grain, PK candidate, 5–10 most important columns with sample values
- Prepare a list of open questions for the payments developers
- Invite one payments developer to join for the developer Q&A phase — or schedule a call
- Print or share the `go_live_checklist.md` as a handout for all participants

---

## Phase 0 — Data Discovery (60 min, whole team)

Thorsten walks the team through the 6 tables using the pre-work one-pagers.

For each table the team answers together:
- What is this table? What business event does a row represent?
- What is the grain? Is it reliable?
- What columns matter, which are unclear?
- How does this table relate to the others?

Running list of open questions collected throughout — anything the data alone cannot answer feeds directly into Phase 2.

**Output:** shared mental model of the source domain, whiteboard sketch of table relationships and grain, open question list for the developer Q&A.

---

## Phase 1 — Process Overview & Scope Decision (45 min, whole team)

### Part 1 — Bloomwell medallion architecture (15 min)

Walk through Bronze / Silver / Gold:
- **Bronze:** raw landing, append-only, no transformation, one model per source table, all columns preserved
- **Silver:** cleaned, deduplicated, typed, renamed, selective columns, one model per business entity
- **Gold:** semantic layer, joins, metrics, Power BI-facing

Key point to emphasise: **Bronze is permanent and complete.** Silver can always be rebuilt from Bronze via `dbt build --full-refresh`. This is what makes selective Silver safe — it is the architecturally correct choice, not a shortcut. When a new column is needed later: add it to the Silver model and `full-refresh`. No safety net needed because Bronze is the safety net.

### Part 2 — How dbt connects the layers (15 min)

Show a real example from the existing codebase:
- A `ref()` chain from Bronze → Silver → Gold
- What a `schema.yml` with descriptions looks like
- What `dbt build` does and why
- How a failed test surfaces

Show the dbt DAG if possible — five minutes in the docs UI is worth more than ten minutes of explanation.

### Part 3 — Scope decision (15 min)

| Option | What it means | Verdict |
|---|---|---|
| **A — Selective Silver** | Only well-understood, requirements-backed columns | ✅ Correct for our stack |
| **B — Full Silver** | All columns promoted, renamed, cast | ❌ Too much work, too many guesses |
| **C — Essential + `_raw` passthrough** | Core columns + `object_construct` fallback | ❌ Redundant — Bronze is the fallback |

**Output:** team aligned on selective Silver as the strategy.

---

## Phase 2 — Developer Q&A (45 min, whole team + payments developer)

Team presents the open questions collected from Phase 0. Typical questions for a payments domain:

- What does each status code mean in the payment flow?
- When a basket changes, does the source create a new row or update in place?
- Which payment identifier is the canonical one if multiple exist?
- Are cancelled or failed transactions included in the tables?
- What does NULL in `settled_at` mean — pending, or a data quality issue?
- What is the expected volume and frequency of each table?

Structure:
1. Team presents open questions
2. Developer answers and clarifies
3. Team updates the whiteboard sketch
4. Agree on which columns are now understood well enough to model

Any remaining unknowns after Q&A are explicitly flagged — they become blocked columns that stay out of Silver until resolved.

**Output:** resolved ambiguities, confirmed column meanings, updated relationship sketch, blocked column list.

---

## Phase 3 — Requirements Discovery & Gold Target Definition (90 min, whole team)

This phase has two jobs: understand what the business needs, then translate that into a concrete Gold model sketch. Facts are defined before dimensions — this is deliberate.

### Part 1 — Business requirements (30 min)

**Technique 1 — Work backwards from reports**
Sketch the ideal Power BI report on a whiteboard — axes, filters, metrics. Ask: what data do we need to build that?

**Technique 2 — Question storming**
Everyone writes down business questions this data should answer (5 min silent). Collect and group by theme. Themes become Gold model candidates.

**Output:** 3–5 core business questions Gold must answer.

---

### Part 2 — Define fact tables (30 min, whole team)

Facts come first. A fact table represents something that **happened** — a business event with a measurable outcome. Dimensions only exist to describe the context of that event. Starting with dimensions produces descriptive tables with no clear purpose.

#### Step 1 — Event storming (5 min, silent)
Everyone writes down business events they think happen in the payments system. One per sticky note or line. No filtering yet. Examples: a payment is initiated, a transaction is processed, a basket is modified, a refund is issued.

#### Step 2 — Cluster and name (10 min, whole team)
Group similar events. Name each cluster. Each cluster is a fact table candidate.

#### Step 3 — Grain test (10 min, whole team)
For each candidate, complete the sentence:
> *"One row in this table represents one ___ at one point in time."*

If you cannot complete it with a single clear noun, the grain is wrong. Either two fact tables are mixed together, or a dimension is masquerading as a fact. Split or drop.

#### Step 4 — Measures test (5 min, whole team)
For each candidate, list the numeric values that would be aggregated — sum, count, average.

| If it has measures | If it has no measures |
|---|---|
| Strong fact signal | Strong dimension signal |
| Examples: amount, duration, retry count | Examples: method name, status label |

---

#### The basket problem — fact or dimension?

Baskets blur the line and need a deliberate decision. A basket has a value (fact signal), can change over time (SCD2 signal), and is referenced by payments as context (dimension signal).

Leading question to resolve it:
> *"When an analyst looks at a payment, do they want to know the basket value at the time of payment — or do they want to analyse basket behaviour independently?"*

- If basket is only ever context for a payment → `dim_basket` with SCD2 if history matters
- If basket changes and abandonment or conversion matter → `fct_basket_events` where each change is a row
- If both → build `dim_basket` first (latest state), add `fct_basket_events` when there is a concrete requirement

---

**Output:** confirmed fact table list with grain statements.

---

### Part 3 — Define dimension tables (20 min, whole team)

Once facts are defined, dimensions fall out naturally. For each confirmed fact table ask:
> *"When an analyst filters, groups, or drills into this fact — what do they use?"*

Walk through the filters and group-bys on the Gold sketch:
- Filter by payment status → dimension candidate
- Group by payment method → dimension candidate
- Group by date → `dim_date` (always)
- Filter by basket channel → dimension candidate
- Group by customer → dimension candidate if it exists

**Role-playing test:**
> *"Does the same dimension appear more than once in a fact table under different roles?"*

Example: `fct_payment` may have `created_at` and `settled_at` — both are dates, both reference the date dimension under different roles. This means two foreign keys to the same `dim_date` or two role-playing date dimension views.

**Dimension vs. inline attribute decision:**
For each dimension candidate ask:
> *"Does this need its own table, or is it a simple inline attribute on the fact?"*

- Payment status with 5 values and no additional attributes → inline attribute, not a separate table
- Payment method with name, category, provider → separate dimension table

**Output:** confirmed dimension table list with justification for each.

---

#### Quick reference card — fact vs. dimension signals

| Signal | Likely fact | Likely dimension |
|---|---|---|
| Represents a business event | ✅ | |
| Has numeric measures | ✅ | |
| Rows appear because something happened | ✅ | |
| Rows appear because something was described | | ✅ |
| Referenced as context by other tables | | ✅ |
| Queried for grouping and filtering | | ✅ |
| Changes slowly and rarely | | ✅ SCD2 candidate |
| Changes frequently with business meaning | ✅ new event rows | |

---

**Full output of Phase 3:** Gold target sketch — confirmed fact tables with grain statements, confirmed dimension tables with justification. Boxes and labels on a whiteboard, not SQL.

---

## Phase 4 — Deriving Silver Models from Gold (60 min, whole team)

Silver is not designed independently. Silver exists purely to serve Gold. If a column is not needed by any Gold model, it has no business being in Silver yet. The derivation is mechanical, not creative:

```
Gold requirements
    → Gold column list
        → Bronze source per column
            → Grouping by entity
                → Silver model list
                    → Grain + column filter
                        → Build contract
```

### Step 1 — List the Gold models (10 min, whole team)

Take the Gold sketch from Phase 3 and make it explicit. Write each Gold model on the whiteboard as a box with:
- Model name
- Grain (one row per what?)
- Key measures or attributes it exposes

Example:
```
fct_payment          — one row per payment
                     measures: amount, status, duration_to_settlement

dim_basket           — one row per basket (latest state)
                     attributes: basket_value, item_count, channel

dim_payment_method   — one row per payment method type
                     attributes: method_name, method_category
```

### Step 2 — Column sourcing per Gold model (20 min, split into groups)

Split the team by Gold model — one small group per Gold model.

Each group answers for their Gold model:
> *"For every column this Gold model needs — which Bronze table does it come from?"*

Use the Bronze one-pagers from pre-work and the whiteboard sketch from Phase 0. Fill in a simple table:

| Gold column | Source Bronze table | Source column name | Transform needed? |
|---|---|---|---|
| `payment_id` | `bronze_payments` | `pmnt_id` | rename only |
| `payment_status` | `bronze_payments` | `status_cd` | rename + decode |
| `basket_value` | `bronze_baskets` | `ttl_val` | rename + cast to numeric |
| `settlement_duration` | `bronze_payments` | `created_at`, `settled_at` | derived — datediff |

Groups work in parallel for 15 minutes, then present back to the room for 5 minutes.

**Output:** every Gold column traced back to a Bronze source.

### Step 3 — Group Bronze columns into Silver models (10 min, whole team)

Look at the sourcing table from Step 2. Columns coming from the same Bronze table and representing the same business entity belong in the same Silver model.

Leading questions:
- Do all columns from a single Bronze table serve one entity, or are two distinct entities mixed in one table?
- Are there columns from two different Bronze tables that always join 1:1? If so, consider merging them into one Silver model.
- Are there Bronze tables that contribute no columns to any Gold model? Those do not need a Silver model yet — document why.

**Output:** Silver model list with a clear justification for each model's existence.

Example:
```
silver_payments      — from bronze_payments
                     exists because: fct_payment needs it

silver_baskets       — from bronze_baskets
                     exists because: dim_basket needs it

silver_transactions  — from bronze_transactions
                     exists because: fct_payment needs transaction aggregates

bronze_payment_methods → no Silver needed yet
                     reason: small lookup, used directly in Gold via ref()
```

### Step 4 — Define grain and column list per Silver model (15 min, whole team)

For each Silver model, answer three questions in sequence:

**1 — What is the grain?**
> *"This Silver model contains one row per ___."*

If you cannot complete this sentence cleanly, the model boundary is wrong. Split or merge.

**2 — Which columns are included?**

| Question | Action |
|---|---|
| Needed by a Gold model defined in Step 1? | Keep |
| Technical join key needed to connect Silver models? | Keep, rename cleanly |
| Meaning confirmed in developer Q&A? | Keep if needed |
| Meaning still unclear after Q&A? | Exclude, flag as blocked |
| Duplicate of another column? | Drop one, document why |
| Always null in practice? | Drop, document |

**3 — What transformations are needed?**
For each kept column: rename only, cast only, decode/map, or derived calculation. This becomes the build instruction for the Silver build phase.

**Output:** for each Silver model — grain statement, column list with rename map, transformation notes.

### Step 5 — Identify dependencies and risks (5 min, whole team)

- Do any Silver models depend on each other?
- Are there FK relationships that need validation tests? (e.g. every `payment_id` in `silver_transactions` must exist in `silver_payments`)
- Are there any columns still blocked from the developer Q&A that affect Silver decisions? Flag explicitly.

**Output:** dependency sketch and blocked column list carried forward to the split decision phase.

---

## Phase 5 — Naming Conventions (15 min, whole team)

Bloomwell naming conventions are already defined in the project. This phase is a confirmation, not a discussion.

Thorsten presents the relevant rules for the payments domain:

- **Schema pattern:** `BRONZE.PAYMENTS`, `SILVER.PAYMENTS`, `GOLD.PAYMENTS` — schema communicates the layer, table names never repeat it
- **Model prefixes:** Bronze has none, Silver uses `dim_` / `fct_` / `bridge_`, Gold uses `mrt_`
- **Column keys:** `_key` for surrogate keys, `_id` for source business keys — never interchangeable
- **Timestamps:** `_at` suffix in UTC; CET display columns in Gold only with `_cet` postfix
- **Booleans:** `is_` or `has_` prefix
- **Full words only:** `payment_id` not `pmnt_id`, `transaction_key` not `tx_key`

If a naming question arises during the build that conventions do not cover, Thorsten makes the call and it gets added to the conventions document after the workshop.

**Output:** team confirms naming rules — no open questions before the build starts.

---

## — Lunch — (30 min)

---

## Phase 6 — Bronze Build (75 min, individual)

Each person takes one source table. Six people, six tables, everyone builds independently.

Tasks per person:
- `sources.yml` with table-level and column-level descriptions for every column — use the developer Q&A notes and the pre-work one-pagers
- Bronze model (`select *`, append-only, typed per Bloomwell conventions)
- Basic source tests: `not_null` on PK, source freshness
- Open PR before the review phase starts

**Descriptions are not optional.** A Bronze model without descriptions is incomplete. Use this template:
> *"This table contains one row per [grain]. It is produced by [system] when [event]. The primary key is [column]."*

The descriptions written here become the foundation for Silver and Gold documentation. Getting them right now is cheaper than retrofitting later.

Refer to `go_live_checklist.md` before opening the PR.

---

## Phase 7 — Bronze PR Review (60 min, Thorsten + whole team)

Each person has opened a PR. Review is a mix of async and live:

| Time | Activity |
|---|---|
| 0–15 min | Thorsten reviews all 6 PRs independently using `go_live_checklist.md` |
| 15–50 min | Each person gets ~5 min to present their PR, Thorsten gives live feedback |
| 50–60 min | Critical feedback addressed, PRs updated |

What to check per PR (from checklist):
- Model name follows Bloomwell conventions?
- Grain correct and documented in table description?
- Descriptions present on table and all key columns?
- Source tests covering PK (`not_null`) and freshness?
- Any transformation logic crept into Bronze? (should be none)

**Output:** all 6 Bronze PRs reviewed, approved or with clear actionable feedback.

---

## Phase 8 — Silver & Gold Discussion (45 min, whole team)

Now that everyone has built a Bronze model and reviewed each other's work, the team has real hands-on context. Use this to revisit the Silver and Gold design with fresh eyes.

Discussion points:
- Did building Bronze surface anything that changes the Silver column decisions from Phase 4?
- Were there surprises in the data that affect the Gold design sketch?
- Are the FK relationships between tables as clean as assumed — or are there nulls or mismatches?
- Does the SCD2 decision for baskets still hold?
- Revisit the Gold target sketch — does it still make sense given what the team now knows?

Adjust the Silver model list and column decisions if needed. This is the right moment — before Silver is built, after Bronze is real.

**Output:** confirmed or revised Silver model list and Gold design sketch.

---

## Phase 9 — Silver & Gold Split Decision (30 min, whole team)

With the revised Silver model list agreed, decide how to split the remaining work. This cannot be pre-planned concretely — it depends on what came out of Phase 8.

Questions to answer:
- How many Silver models are there — does it split evenly across the team?
- Does any Silver model depend on another? If so, which gets built first or who coordinates?
- Are there people better suited to certain models based on what they learned building Bronze?
- Does anyone start on a Gold model today, or is everything Silver for the rest of the workshop?
- If time is short: what is the minimum viable Silver needed to unblock Gold?

Assign ownership. Each person or pair knows exactly what they are building before they open their IDE again.

**Output:** explicit assignment list — who owns which Silver model and which Gold model if applicable.

---

## Phase 10 — Test Strategy (30 min, whole team)

Before building Silver and Gold, agree on the test strategy as a team. Tests written during the build are better than tests bolted on afterwards — this phase defines what to write and where.

### The core principle — push tests left

Test as early as possible. A data quality problem caught in Bronze costs nothing. The same problem caught in a Power BI dashboard costs trust.

> **Never duplicate tests across layers.** Only test what is new or transformed in the current layer.

```
Silver tests payment_id → unique, not_null   ✓
Gold selects payment_id unchanged             → skip in Gold ✗

Silver has no test on payment_status_label
Gold derives it via CASE WHEN                 → test in Gold ✓
```

**Exception:** if Gold introduces a `LEFT JOIN`, `COALESCE`, or surrogate key on a previously-tested column, a new failure surface exists — test again.

---

### Testing by layer

| Layer | What to test | Default severity | What to skip |
|---|---|---|---|
| **Bronze** | Source freshness, `not_null` on PK, row count > 0 | `warn` | Uniqueness (duplicates expected), value ranges |
| **Silver** | PK `unique` + `not_null`, FK relationships, `accepted_values` on stable enums | `error` on keys, `warn` on soft rules | Columns passed unchanged from Bronze |
| **Gold** | PK integrity, FK joins, dim column completeness, metric sanity checks | `error` | Anything validated in Silver and unchanged |

---

### Test type decision

| Scenario | Test type |
|---|---|
| PK/FK integrity, not-null, enum values | Generic (`schema.yml`) |
| Cross-column business rule (e.g. `settled_at > created_at`) | Singular SQL test |
| Complex CASE/WHEN or SLA calculation | Unit test (dbt 1.8+) |
| Source data arrival | Source freshness |
| All columns not-null in Gold dim | Singular SQL with UNION ALL |

**Target: 3–6 tests per model.** More than that is noise.

---

### Severity decision

The single deciding question: *"Should the pipeline stop if this test fails?"*
- Yes → `error`
- Worth knowing but pipeline can continue → `warn`

| Test | Severity |
|---|---|
| PK `unique` + `not_null` | `error` — always |
| FK `relationships` | `error` |
| `not_null` on business-critical columns in Gold | `error` |
| `accepted_values` on stable enums | `error` |
| `accepted_values` on evolving enums | `warn` |
| Source freshness — critical source | `error` |
| Source freshness — non-critical | `warn` |
| Row count anomaly on fact tables | `warn_if` → `error_if` |

---

### Payments-specific test decisions (agree as a team)

- Which status codes are stable enough for `accepted_values`? Or are they evolving → `warn`?
- Is the FK from `silver_transactions` to `silver_payments` guaranteed clean, or does it need a `relationships` test with `warn` while the source is new?
- Does `fct_payment` need a row count sanity check against `silver_payments`?
- Where does `settled_at > created_at` need a singular test?

**Output:** agreed test checklist per layer — each person knows exactly what tests to write during the build.

---

## Phase 11 — Silver & Gold Build (open, assigned pairs or individuals)

Build based on the assignments from Phase 9. Use the `go_live_checklist.md` throughout — not just at the end.

Each Silver model needs:
- Dedup via `ROW_NUMBER()` where needed
- Type casting and renaming per agreed column list from Phase 4
- Incremental merge strategy
- Table description with grain statement (CI fails without it)
- Column descriptions on all columns (CI fails without it)
- Snowflake PK/FK constraints as post-hooks
- Tests per the agreed strategy from Phase 10

Each Gold model needs:
- Table description including consumer and use case
- Column descriptions on all columns
- PK `unique` + `not_null` — always, no exceptions
- FK `relationships` on all foreign keys
- UNION ALL singular test for dimension column completeness where applicable
- Row count sanity check on fact tables

---

## Phase 12 — Silver & Gold PR Review (45 min, Thorsten + whole team)

Same structure as Bronze PR review, but reviewed against a higher bar.

Each PR is checked against `go_live_checklist.md`:

**Blocking (must fix before merge):**
- [ ] Grain statement present in model description?
- [ ] All columns documented in `schema.yml`?
- [ ] PK has `unique` + `not_null` tests?
- [ ] FK columns have `relationships` tests?
- [ ] Snowflake PK/FK constraints added as post-hooks?
- [ ] No layer name or SCD type encoded in model name?
- [ ] No hardcoded database/schema references — only `ref()` and `source()`?
- [ ] `data_tests` keyword used (not legacy `tests`)?

**Warning (should fix):**
- [ ] `accepted_values` on stable enum columns?
- [ ] Singular test for cross-column business rules?
- [ ] LEFT JOIN used instead of INNER JOIN where row loss is a risk?
- [ ] Row count sanity check on fact tables?

**Output:** Silver and Gold PRs reviewed, approved or actioned.

---

## Phase 13 — Gold Design (30 min, whole team)

If Gold was not built during Phase 11, design it properly as a team.

- Define `fct_payment`: grain, measures, FK list
- Define dimension tables needed
- Assign Gold models as Jira tickets for the next sprint
- Decide who owns the first Gold PR

**Output:** Jira tickets for Gold layer, ready for next sprint.

---

## Phase 14 — Retro (20 min)

- What did we learn about the data that surprised us?
- What questions are still unresolved — needs follow-up with the payments team?
- What decisions should go into Bloomwell conventions?
- What would we do differently next time?

---

## Full Timeline

| Phase | Duration | Mode |
|---|---|---|
| Pre-work | 1–2h before | Thorsten solo |
| 0 — Data Discovery | 60 min | Whole team |
| 1 — Process Overview & Scope Decision | 45 min | Thorsten presents + discussion |
| 2 — Developer Q&A | 45 min | Whole team + payments dev |
| 3 — Requirements Discovery & Gold Target | 90 min | Whole team |
| 4 — Deriving Silver Models from Gold | 60 min | Whole team + groups |
| 5 — Naming Conventions | 15 min | Thorsten presents |
| — Lunch — | 30 min | |
| 6 — Bronze Build | 75 min | Individual |
| 7 — Bronze PR Review | 60 min | Thorsten + whole team |
| 8 — Silver & Gold Discussion | 45 min | Whole team |
| 9 — Silver & Gold Split Decision | 30 min | Whole team |
| 10 — Test Strategy | 30 min | Whole team |
| 11 — Silver & Gold Build | open | Assigned |
| 12 — Silver & Gold PR Review | 45 min | Thorsten + whole team |
| 13 — Gold Design | 30 min | Whole team |
| 14 — Retro | 20 min | Whole team |
| **Total** | **~9.5h + build** | |
