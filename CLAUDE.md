# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **dbt training curriculum** for the Bloomwell Health data team — not an actual dbt project. It teaches dbt Core + Snowflake from foundations to production patterns, using Bloomwell's real data stack as the running example throughout.

## No Build System

There are no build, test, or lint commands. The repository contains only markdown lesson files and two standalone React visualization components. Nothing needs to be compiled or installed.

## Key Files

| File | Purpose |
|------|---------|
| `dbt_training_agenda_bloomwell.md` | Full 16-module curriculum outline with durations and learning goals |
| `dbt_training_methodology.md` | How to structure and deliver sessions; the pedagogical framework |
| `module_0X_what_is_*.md` | Detailed lesson plans (Modules 1–7 are complete) |
| `module_0X_slides.md` | Presentation deck versions of lessons |
| `Data_Quality_Validation.md` | Data quality validation framework and patterns |
| `dbt_mindmap.jsx` | React mind map visualizing the full curriculum |
| `dbt_quality_validation.tsx` | React UI component for demonstrating validation patterns |

## Curriculum Architecture

Three tiers across 16 planned modules:

- **Tier 1 — Foundations** (Modules 1–7, ~7.5h): Why dbt, project setup, Jinja basics, materializations, sources, testing, documentation. **Full lesson content exists.**
- **Tier 2 — Working Effectively** (Modules 8–12, ~7h): Advanced materializations, seeds/variables, macros, SCD2/snapshots, selectors. Slides only or planned.
- **Tier 3 — Production & Advanced** (Modules 13–16): CI/CD, advanced testing, custom macros, governance. Planned only.

When adding or editing module content, use Modules 1–7 as the style and depth reference.

## Module Content Structure

Every detailed lesson (`module_0X_what_is_*.md`) follows this structure:

1. **Opening Recap** — retrieval practice from the previous module
2. **Theory Block** — concept explanation with Bloomwell-specific examples
3. **Live Demo** — real code walkthrough (often with deliberate mistakes to find)
4. **Hands-on Exercise** — participants write code independently
5. **Debrief** — 3-bullet summary + stress-testing understanding
6. **Homework** (optional) — async reading or practice

Slides files (`module_0X_slides.md`) mirror the same content in deck/speaker-notes format.

## Bloomwell Data Stack

All examples and exercises reference Bloomwell's actual architecture:

```
HubSpot / Source Systems
    → AWS Lambda (ingestion)
    → Snowflake BRONZE (raw, append-only, no dbt)
    → dbt Staging (views — light rename/cast only)
    → dbt SILVER (dim_*, fct_*, bridge_* — full tests & docs required)
    → dbt GOLD (mrt_* — Power BI consumption layer)
```

**Naming conventions used throughout:** `dim_*` (dimensions), `fct_*` (facts), `bridge_*` (bridge tables), `mrt_*` (marts/gold). Silver and Gold models require mandatory grain statements, column-level docs, and tests on `_key` columns (`unique` + `not_null`).

**Bloomwell dbt profile target:** `BLOOMWELL_DEV` database, schema pattern `TESTING__dev_{yourname}`, role `TRANSFORMER_DEV`, Snowflake external browser auth.
