# Job Failure Investigation Template

Use this template when a root cause cannot be immediately identified. Save as `docs/investigations/job-failure-YYYY-MM-DD.md`.

---

# Job Failure Investigation: <Job Name>

**Date:** YYYY-MM-DD  
**Job ID:** <job_id>  
**Run ID:** <run_id>  
**Investigator:** <name>

## Symptoms

_Describe what failed and how it manifested. Include error messages._

## Investigation Checklist

- [ ] Retrieved run history via `list_jobs_runs`
- [ ] Retrieved error details via `get_job_run_error`
- [ ] Reviewed git history for recent changes (`git log --oneline -20`)
- [ ] Checked for infrastructure issues (warehouse, connections, timeouts)
- [ ] Queried failing data with `dbt show`
- [ ] Compiled failing model to inspect SQL

## Hypothesis Testing

| Hypothesis | Evidence Checked | Outcome |
|-----------|-----------------|---------|
| Recent code change caused failure | `git diff HEAD~5..HEAD` | Confirmed / Ruled out |
| Source data changed | Queried source table | Confirmed / Ruled out |
| Infrastructure issue | Checked warehouse status | Confirmed / Ruled out |
| Flaky test / timing issue | Checked run history | Confirmed / Ruled out |

## Observed Patterns

_Note any patterns: does this fail at a specific time? Only on certain days? After a specific upstream job?_

## Root Cause

_State the root cause if found. If not found, state "Unknown."_

## Resolution

_Describe the fix applied, or why no fix was applied._

## Follow-Up Actions

- [ ] Action 1
- [ ] Action 2

## Resources

- Job run logs: <link>
- Relevant PR/commit: <link>
- Related issues: <link>
