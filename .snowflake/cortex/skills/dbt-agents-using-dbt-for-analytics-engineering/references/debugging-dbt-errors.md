# Debugging dbt Errors

## Phase 1: Review Logs and Artifacts

Start by examining artifacts from the most recent dbt run:

| File | Contents |
|------|----------|
| `logs/dbt.log` | All queries and logging information |
| `target/run_results.json` | Which models succeeded or failed |
| `target/compiled/` | Rendered model code (post-Jinja) |
| `target/run/` | Code within DDL statements |

```bash
# Quick failure summary
cat target/run_results.json | jq '.results[] | select(.status != "success") | {node: .unique_id, status: .status, error: .message}'
```

## Phase 2: Classify the Error

### Project Configuration Issues
- YAML or parsing errors in config files
- Fix: correct the file structure, then `dbt parse`

### Model Code Problems
- Compilation errors, SQL syntax issues, failing unit tests
- Fix: correct the code, then `dbt compile --select model_name`

### Invalid Data (Runtime Failures)
- Failures during `dbt build`, `dbt test`, or `dbt run`
- Fix: investigate the data, then fix the transformation

> **Do not remove a test, or modify a test to pass, without explicit permission.** A failing test is a signal — investigate the root cause first.

## Phase 3: Validate the Fix

Choose the appropriate command based on efficiency:

```bash
dbt parse                          # Fastest — config issues only
dbt compile --select model_name    # SQL errors — no warehouse needed
dbt build --select model_name      # Full validation — resource intensive
```

**ALWAYS use `--select`** to avoid processing the entire project.

## Common Error Patterns

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Compilation error ... does not exist` | Wrong `ref()` or `source()` name | Check spelling, check if model exists |
| `Database error ... column not found` | Column renamed or missing upstream | Check upstream model YAML |
| `Test failed: X rows returned` | Data quality issue | Query the data with `dbt show` |
| `Parsing error in schema.yml` | YAML indentation or key error | Lint the YAML file |
| `Undefined macro` | Missing package or macro | Run `dbt deps`, check package installed |
