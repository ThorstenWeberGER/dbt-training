# Review dbt Run Results

Analyze `target/run_results.json` to identify which resources failed and why.

## Quick Shell Commands

```bash
# Summary of all statuses
cat target/run_results.json | jq '.results[] | {node: .unique_id, status: .status, time: .execution_time}'

# Find failures only
cat target/run_results.json | jq '.results[] | select(.status != "success")'

# Get error messages
cat target/run_results.json | jq '.results[] | select(.status == "error") | {node: .unique_id, error: .message}'

# Check run timestamp
cat target/run_results.json | jq '.metadata.generated_at'
```

## Python Script

```python
import json

def review_run_results(path="target/run_results.json"):
    with open(path) as f:
        results = json.load(f)

    all_results = results.get("results", [])
    failures = [r for r in all_results if r["status"] not in ("success", "pass", "warn")]

    print(f"Total: {len(all_results)} | Failed: {len(failures)}")
    print()

    for r in failures:
        uid = r.get("unique_id", "")
        parts = uid.split(".")
        name = parts[-1] if parts else uid
        resource_type = parts[0] if parts else "unknown"

        # First non-empty error line
        message = r.get("message", "") or ""
        first_line = next((line for line in message.splitlines() if line.strip()), message)

        compiled = (r.get("compiled_code") or "")[:200]

        print(f"[{resource_type}] {name}")
        print(f"  Status : {r['status']}")
        print(f"  Error  : {first_line}")
        if compiled:
            print(f"  SQL    : {compiled}...")
        print()

    return failures

if __name__ == "__main__":
    review_run_results()
```

## Key Fields in run_results.json

| Field | Description |
|-------|-------------|
| `metadata.generated_at` | Timestamp of the run |
| `results[].unique_id` | `model.project.model_name` format |
| `results[].status` | `success`, `error`, `fail`, `skipped`, `warn` |
| `results[].execution_time` | Seconds spent executing |
| `results[].compiled_code` | Rendered SQL |
| `results[].message` | Error message if failed |
| `results[].adapter_response` | Rows affected, bytes processed |
