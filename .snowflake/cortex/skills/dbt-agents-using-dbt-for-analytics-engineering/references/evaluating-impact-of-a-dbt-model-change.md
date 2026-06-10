# Evaluating Impact of a dbt Model Change

Assess downstream dependencies before modifying any existing model.

## When to Use

- Before changing SQL logic in an existing model
- Before renaming, removing, or changing column types
- Before changing model materialization

**Not for:** New models (no downstream dependencies yet)

## Getting Downstream Dependencies

### If dbt MCP Server Available

| Tool | Use For |
|------|---------|
| `get_model_lineage_dev` | Model-level downstream dependencies |
| `get_column_lineage` | Which downstream models reference specific columns |

### CLI Fallback

```bash
# List all downstream models
dbt ls --select model_name+ --output name

# Count downstream models
dbt ls --select model_name+ --output name | wc -l

# View as JSON with details
dbt ls --select model_name+ --output json
```

## Column-Level Impact

When changing or removing a column, find which downstream models reference it:

```bash
# Get downstream model list
dbt ls --select model_name+ --output name > /tmp/downstream.txt

# Search for column usage
grep -r "column_name" models/ --include="*.sql"
```

## Impact Classification

| Level | Downstream Model Count | Action |
|-------|------------------------|--------|
| **Low** | 1–5 | Proceed with `state:modified+` |
| **Medium** | 6–15 | Consider limiting depth |
| **High** | 16+ | Ask user about depth limit |

## Recommended Build Commands

```bash
# Standard — build all downstream
dbt build --select state:modified+

# Limited depth
dbt build --select state:modified+1   # 1 level downstream
dbt build --select state:modified+2   # 2 levels downstream
dbt build --select state:modified+3   # 3 levels downstream
```

When impact is high, ask the user:
> "This change affects N downstream models. Do you want to build all downstream (`state:modified+`) or limit to a specific depth?"

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not checking before changing | Always run impact assessment first, even for "small" changes |
| Ignoring column-level impact | Removing a column breaks downstream models that reference it |
| Running `dbt build` without selectors | Always use `--select` on large projects |
