# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory

### Coding Guidelines (Karpathy Guidelines)

**IMPORTANT: These four principles apply to EVERY coding task in this repository without exception. They override any default behavior.**

The full skill is installed at `.claude/skills/karpathy-guidelines/SKILL.md`. Read it before doing anything.

### Human writing

**IMPORTANT** The rules apply to all documents which are for participants and trainer to read, to present, to guide through exercises. It does NOT apply to code.

The full skill is installed at `.claude/skills/humanize/SKILL.md`. Read it before doing anything.

## Repository Purpose

This is a **dbt training curriculum** for the data team — not an actual dbt project. It teaches dbt Core + Snowflake from foundations to production patterns, using the project's data stack as the running example throughout.

## Repository Structure

The repo has two distinct parts:

**Curriculum content** (root): Markdown lesson plans, Slidev presentation decks, participant/trainer guides. No build system — nothing to compile.

**Exercise project** (`excercises/`): A fully runnable dbt project (Snowflake primary / DuckDB local test). It has real commands. Always run from inside `excercises/`:

```bash
# Standard verification sequence — always in this order
NO_COLOR=1 dbt seed --target test --full-refresh
NO_COLOR=1 dbt run  --target test
NO_COLOR=1 dbt test --target test
```

**Critical rules for the exercise project:**
- **Never use `dbt build` with the DuckDB `--target test`**. DuckDB validates table existence at view creation time — `dbt build` parallelises seeds and models, causing staging views to fail because seed tables don't exist yet. Always sequence manually.
- **Delete `dbt_training.duckdb` before branch-switching verification**. The single file persists across branch checkouts; Tier 2 tables pollute Tier 1 test results.
- **Use Bash, not PowerShell, for git operations**. PowerShell's `2>&1 | Out-Null` suppresses stderr silently; checkout failures go undetected.
- **`NO_COLOR=1`** before any dbt command used in a script. dbt outputs ANSI escape codes that break `grep`.

**Exercise branches** (8 total, all off `main`):

| Branch | Starting state for |
|---|---|
| `dbt-project-module-01---04` | M01 orientation through M04 fix & extend |
| `dbt-project-module-05` | M05 sources + owners |
| `dbt-project-module-06-07` | M06 testing + M07 documentation |
| `dbt-project-module-08` | M08 seeds & variables (full Tier 1 result) |
| `dbt-project-module-09` | M09 Jinja & macros |
| `dbt-project-module-10` | M10 SCD2 & snapshots |
| `dbt-project-module-11` | M11 selectors & tags |
| `dbt-project-module-12` | M12 CI/CD |

Each branch is a standalone complete snapshot — no dependency on prior branches.

## Key Files

| File / Path | Purpose |
|------|---------|
| `dbt_training_agenda_bloomwell.md` | Curriculum outline with durations and learning goals |
| `dbt_training_methodology.md` | How to structure and deliver sessions; pedagogical framework |
| `presentation/module_XX.md` | Slidev decks — `module_01.md` through `module_12.md` |
| `excercises/guide_participants_tier1.md` | Participant handout for Tier 1 (M01–07) |
| `excercises/guide_participants_tier2.md` | Participant handout for Tier 2 (M08–12) |
| `excercises/guide_trainer_all.md` | Trainer guide with answers and facilitation notes for all modules |
| `excercises/` | Runnable dbt project — seeds, models, macros, snapshots, tests |
| `docs/session_retrospective.md` | Session retrospective with operational lessons learned |
| `reference.md` | Book-to-module mapping for *Analytics Engineering with SQL and dbt* (O'Reilly) |
| `dbt_mindmap.jsx` | React mind map visualizing the full curriculum |

## Curriculum Architecture

Two tiers, 12 modules total:

- **Tier 1 — Foundations** (Modules 1–7, ~7.5h): Why dbt, project setup, materializations, sources, testing, documentation. Full lesson content + exercise project branches exist.
- **Tier 2 — Working Effectively** (Modules 8–12, ~7h): Seeds/variables, Jinja/macros, SCD2/snapshots, selectors, CI/CD. Full lesson content + exercise project branches exist.

Tier 3 (Production & Advanced, Modules 13–16) is planned but not yet implemented — no content or branches exist yet.

When adding or editing module content, use Modules 1–7 as the style and depth reference.

## Module Content Structure

Every detailed lesson (`module_0X_[topic].md`) follows this structure:

1. **Opening Recap** — retrieval practice from the previous module
2. **Theory Block** — concept explanation with examples
3. **Live Demo** — real code walkthrough (often with deliberate mistakes to find)
4. **Hands-on Exercise** — participants write code independently
5. **Debrief** — 3-bullet summary + stress-testing understanding
6. **Homework** (optional) — async reading or practice

Slides files (`module_0X_slides.md`) mirror the same content in Slidev format: YAML frontmatter, slides separated by `---`, Tailwind utility classes for layout, and speaker notes in `<!-- -->` HTML comments after each slide's content.

## Data Stack

All examples and exercises reference the project's architecture:

```
HubSpot / Source Systems
    → AWS Lambda (ingestion)
    → Snowflake BRONZE (raw, append-only, no dbt)
    → dbt Staging (views — light rename/cast only)
    → dbt SILVER (dim_*, fct_*, bridge_* — full tests & docs required)
    → dbt GOLD (mrt_* — Power BI consumption layer)
```

**Naming conventions used throughout:** `dim_*` (dimensions), `fct_*` (facts), `bridge_*` (bridge tables), `mrt_*` (marts/gold). Silver and Gold models require mandatory grain statements, column-level docs, and tests on `_key` columns (`unique` + `not_null`).

**dbt profile target:** `SILVER_DEV` database, schema pattern `TESTING__dev_{yourname}`, role `analytics_service_role`, Snowflake external browser auth.

**Layer routing:** `+database` and `+schema` in `dbt_project.yml` enforce which Snowflake database each layer lands in (e.g., Gold models routed to `GOLD`). Environment-aware switching (dev vs prod databases) requires a `generate_database_name` macro — covered in Intermediate tier. Never hardcode database names in model config without this macro.

## Content Style Rules

- No company-specific names, email addresses, or branding anywhere in lesson content or slides. Use generic placeholders (`jane@company.com`, `analytics` as the profile/project name, etc.).
- The filename `dbt_training_agenda_bloomwell.md` is the only intentional exception — do not rename it.
- All database/schema references use the project stack conventions above, not any client-specific names.

## Writing Voice (Humanized Style)

All lesson content, exercises, and trainer notes use a human, conversational voice. When writing or rewriting any document in this repo, follow these rules:

- **Second person throughout.** Write "you'll learn" and "you can" — not "participants will learn" or "the user can".
- **Short sentences.** If a sentence needs two commas or a semicolon, split it.
- **Contractions are fine.** It's, you'll, don't, here's — these are normal English, not sloppy writing.
- **Active voice.** "dbt compiles your SQL" not "your SQL is compiled by dbt".
- **Why before how.** Before explaining a concept or command, say in one sentence why it matters.
- **Honest about difficulty.** Say "this trips people up" or "this looks weird at first" when something genuinely is hard.
- **No filler.** Delete "it is important to note that", "please be aware", "in order to", "utilize". Say the thing directly.
- **Concrete over abstract.** Show an example before or alongside the rule, not after.
- **Preserve all technical accuracy.** Tone changes; facts don't. Every command, column name, file path, and concept stays exactly right.
