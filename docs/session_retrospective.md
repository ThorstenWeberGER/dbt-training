# Session Retrospective — dbt Training Curriculum Build

*What went well, what was painful, and how to do this better next time.*

---

## What We Built

A complete dbt training curriculum: 12 Slidev decks, 3 participant/trainer guides, 8 standalone exercise branches (one per module group), and a runnable dbt project verified against both Snowflake and DuckDB. All four artefact types — presentations, participant guide, trainer guide, exercise project — are aligned.

---

## What Went Well

**Parallel agents for read-only audits.** Launching 4 agents simultaneously — one per artefact type — surfaced 20+ real misalignments without any coordination overhead. Each agent returned structured, specific findings (file + line + issue). This only works because the agents didn't share state or write anything; they read and reported.

**Independent exercise branches.** Designing 8 branches as complete standalone snapshots — not chains — gave students a clean, repeatable starting state. Any branch can be handed out without requiring students to have completed earlier branches. Every branch built cleanly against DuckDB.

**Incremental verification loops.** `dbt seed → dbt run → dbt test` after each fix caught cascading errors early. The loop was: fix one thing → test → find the next issue → fix. This prevented accumulating a large batch of untested changes.

---

## What Went Wrong

### 1. Silent git checkout failures (PowerShell)

**What happened:** A PowerShell script committed all 8 module changes to `main` instead of to their intended branches.

**Root cause:** `git checkout $branch 2>&1 | Out-Null` — `2>&1` merges stderr into stdout; `| Out-Null` discards everything. When a checkout fails (e.g. uncommitted changes in working tree), the error message is silently swallowed. PowerShell continues and commits to whatever branch is currently active. There's no signal of failure at any point.

**Better approach (reason — exit immediately, no silent failures):**
```bash
git checkout "$branch" || { echo "FAIL: $branch"; exit 1; }
git branch --show-current  # confirm before proceeding
```
Use Bash with `set -e`. Never suppress stderr on git commands. Verify the active branch after every checkout.

---

### 2. DuckDB state persisting across branch checkouts

**What happened:** Verification of `module-03-04` (Tier 1, should have 10 models, 0 tests) reported 15 models and 53 tests — numbers from a Tier 2 branch.

**Root cause:** The single `dbt_training.duckdb` file is shared across all branch checkouts. Tables created on a Tier 2 branch persist when you switch to a Tier 1 branch. This only matters when you're doing branch-to-branch verification — not in normal day-to-day development.

**Better approach (reason — eliminate stale state entirely before each branch test):**
```bash
rm -f dbt_training.duckdb
dbt seed --target test --full-refresh
dbt run  --target test
dbt test --target test
```
Or use a branch-specific path in `profiles.yml`:
```yaml
path: "dbt_training_{{ env_var('BRANCH_NAME', 'main') }}.duckdb"
```

---

### 3. ANSI color codes breaking grep patterns

**What happened:** A verification script piped dbt output through `grep "Done\."`. Every branch showed `?` — no matches — even though the runs succeeded.

**Root cause:** dbt outputs ANSI escape sequences before every line. The `Done.` text was present but wrapped in color codes that grep didn't match.

**Better approach (reason — `NO_COLOR=1` is simpler and more reliable; dbt explicitly respects this flag):**
```bash
NO_COLOR=1 dbt run --target test 2>&1 | grep "Done\."
```
If you can't control the environment, strip codes with `sed 's/\x1b\[[0-9;]*m//g'` as a fallback.

---

### 4. Parallel agents on a shared git repository

**What happened:** Two agents launched simultaneously both attempted `git checkout` on the same repository and crashed with conflict errors immediately.

**Root cause:** git doesn't support concurrent checkout operations on one working tree. This isn't a bug to fix — it's a constraint of how git works.

**Better approach (reason — each worktree has independent checkout state, so concurrent checkouts are safe):**
```bash
git worktree add ../branch-tier1 dbt-project-module-03-04
git worktree add ../branch-tier2 dbt-project-module-08
# now launch agents pointing to different worktree paths
```
For read-only operations (grep, file reads): parallel agents are always safe. For stateful operations (checkout, commit, dbt run against a shared file): use `git worktree` or run sequentially.

---

### 5. Re-reading files too many times

**What happened:** Files were read 3–5× across the session — initial audit, pre-edit read, context for a fix, post-edit verification.

**Root cause:** Edits were scattered across files rather than batched per file. Each time work returned to a file, a re-read felt necessary to confirm current state. The issue isn't trust in the Edit tool — it's workflow: plan all edits for a file, make them in one pass, move on.

**Better approach (reason — one pass per file eliminates re-reads entirely):**
1. At the start of a task, identify all files likely to be touched and read them in a single parallel batch.
2. Plan all edits for a file before opening it. Make them. Don't reopen it.
3. Use `Grep` to locate relevant sections in large files rather than reading the whole file.
4. Trust Edit: it errors on failure. Re-reading to confirm is wasted context.

---

## Structural Insights

### Parallel agents: read-only vs. stateful

The pattern that consistently worked: read-only audit tasks run in parallel; stateful tasks (checkout, commit, run) run sequentially or in isolated worktrees. Mixing these is the source of most agent coordination failures.

| Operation type | Safe to parallelize? | Mechanism |
|---|---|---|
| File reads, greps, audits | ✅ Yes | No shared state |
| git checkout + dbt run | ❌ No (shared working tree) | Use `git worktree` |
| git checkout + dbt run | ✅ Yes (separate worktrees) | `git worktree add` |

### Four-artefact alignment requires a designed review phase

This project has four artefact types that must stay in sync: presentations, participant guide, trainer guide, exercise project. Without a dedicated alignment pass, drift accumulates silently. The fix isn't a co-commit checklist — it's a scheduled audit phase (the same multi-agent read-only pattern from "What Went Well") run after any batch of changes.

**When to run the audit:** After completing a module group's changes. Before creating exercise branches. The checklist for each change:
- [ ] Presentation: does any slide reference the changed model/column/path?
- [ ] Participant guide: does the exercise still work?
- [ ] Trainer guide: are expected outcomes still correct?

### Encode lessons in the skill

These retrospective findings belong in the `dbt-training` skill (`~/.claude/skills/dbt-training/SKILL.md`), not just in this document. Skills persist across sessions; docs don't get read automatically. The verification sequence, branch strategy, DuckDB workarounds, and the `NO_COLOR=1` pattern should all be in the skill.

---

## Summary

| Issue | Root Cause | Fix |
|---|---|---|
| Commits on wrong branch | `2>&1 \| Out-Null` suppresses checkout errors; script continues on wrong branch | Bash + `set -e`; `git branch --show-current` after every checkout |
| DuckDB stale state | Single `.duckdb` file shared across branch checkouts | Delete and recreate `.duckdb` before each branch test run |
| grep silently failing | dbt ANSI color codes in output | `NO_COLOR=1` before dbt commands in scripts |
| Parallel agents crash | Concurrent `git checkout` on shared working tree | `git worktree add` for parallel branch work; read-only audits are always safe to parallelize |
| Files re-read 3–5× | Scattered edits force re-reads for context | Batch all edits for a file in one pass; read at start, not on demand |
| Four-artefact drift | No structured review phase | Scheduled multi-agent audit after each change batch |

---

## Checklist for Next Session

**Once at the start:**
```bash
git branch --show-current          # confirm starting branch
# Read all relevant files in one parallel batch before making any edits
```

**Before each branch operation:**
```bash
git checkout "$branch" || exit 1
git branch --show-current          # verify
rm -f excercises/dbt_training.duckdb
cd excercises && NO_COLOR=1 dbt seed --target test --full-refresh
NO_COLOR=1 dbt run  --target test
NO_COLOR=1 dbt test --target test
# Confirm: seed count, model count, test results match expected for this branch
```

**Before marking work complete:**
- [ ] Run the 4-agent alignment audit (presentations, participant guide, trainer guide, exercise code)
- [ ] At least one Tier 1 branch: 6 seeds, 10 models, no tests
- [ ] At least one Tier 2 branch: 8 seeds, 15 models, PASS+WARN expected
- [ ] Update the `dbt-training` skill with any new lessons learned
