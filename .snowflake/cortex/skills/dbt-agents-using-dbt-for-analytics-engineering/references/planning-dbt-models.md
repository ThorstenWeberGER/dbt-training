# Planning dbt Models

Use a backwards-engineering approach: start with the desired output and work toward the necessary inputs. This prevents premature coding and multiple refactors.

## Core Process

**Step 1 — Mock the final output**
Define the target table structure with sample rows. What columns, what grain, what values?

**Step 2 — Write pseudocode SQL**
Draft the transformation logic before touching real data.

**Step 3 — Identify gaps**
Ask clarifying questions about business logic. Document unknowns.

**Step 4 — Mock upstream models**
Define what input data you need. What does `ref('stg_orders')` need to contain?

**Step 5 — Refine the SQL**
Iterate on the query using your mocked upstream data.

**Step 6 — Match against available resources**
- **Exact match** — use the upstream model directly
- **Partial match** — extend an existing model
- **No match** — create a new model (last resort)

**Step 7 — Design unit tests first**
Write failing unit tests for edge cases before writing the implementation.

**Step 8 — Build using existing resources**
Implement using what exists. Extend, don't duplicate.

## Key Principles

- Start with the desired output and work backwards to identify the necessary inputs
- Use placeholder columns during incremental development
- Document planning decisions in a markdown file alongside the model
- Consider edge cases: duplicates, nulls, multiple transactions per day

## Common Edge Cases to Check

- What happens when a join produces more rows than expected?
- Are there soft deletes in source data?
- What's the grain — is it truly unique?
- Can a status field have values not yet seen in development data?
