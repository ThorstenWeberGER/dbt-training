# dbt Workshops on Payments System Modeling — Overview

## Goal state
> 1. Payments data is modeled end-to-end across Medaillon: from raw source tables to a clean, tested, documented data models ready for reporting.  
> 
> 2. The Bloomwell data team has learned the foundations to leverage dbt as a data transformation tool.

## Outcome
- **Models built** across Medaillon Architecture
- **Tested data** and clearly defined data quality  
- **Documentation** (what and why)
- **Pull requests** and reviews
- **dbt project** runs without error
- **Bloomwell conventions** leveraged
- **dbt best practices** implemented

## Phases at a Glance

1. **Investigate** | Understand data & requirements
2. **Foundation** | Bronze & Staging
3. **Data Modelling** | Conceptual & Logical
4. **Build, Test** | Silver & Gold

*Evtl. 3-4 workshops.*


## Guidelines

* Documentation & Testing is mandatory part of our job
* Data Quality needs to be prooved (tests)
* dbt best practices will be part of the journey

---
<br>

# Workshop 1 (11.06.2026)

> **Focus on payments and baskets**

| # | Phase | Goal | Method | Output |
|---|---|---|---|---|
| 1 | **Intro** | Team understands goal and scope and process | Presentation + scope decision | Approach: selective Silver |
| 2 | **Data Discovery** | Everyone has overview of payment system and details on payments + baskets <br> Questions for Devs defined | Walk through each table together, draw relationships on whiteboard | Shared understanding, question list |
| 3 | **Requirements** | Columns to model in source and staging are defined | Selection based on current use cases | Column list per table |
| 4 | **Dev environment** | Real life working experience | GitHub | Repo/ branch is set up per team, dbt runs |
| 5 | **Source & Staging Build** | Source & staging build in teams for Baskets & Payments | PR opened at end | Bronze & Staging models with descriptions + tests + post_hooks for PK/FK |
| 6 | **PR & Review** | Catch mistakes early, share knowledge across the team | Teams review each others PRs, discussion | 2 reviewed PRs |

---

<br>

# Following Workshops

*One workshop can cover one or more phases.*

| # | Phase | Goal | Method | Output |
|---|---|---|---|---|
| 8 | **Requirements & Gold Target** | Know what questions the data must answer, define reporting tables, metrics, grain, filters, etc.| Work backwards from reports, event storming, grain test, measures test | Gold sketch of fact + dimension tables |
| 9 | **Derive Silver from Gold** | Know exactly which Silver models to build and why | Trace every Gold column back to a Bronze source, group by entity, filter columns | Silver model list with grain + column contracts |
| 10 | **Build Silver & Gold** | Build Silver models then Gold | Assigned pairs | TEsted and documented Silver and Gold models |
| 11 | **Retro** | Learn from the process | Open discussion — what worked, what didn't | Actions to take |


# Workshop 2 (18.06.2026)

**Goal for today:** Generate staging models for Payments and Baskets

### AGENDA

* Review last session and *homework* (clarifications, dbt build successful)
* Staging models setting (one model for data typing and renaming, one for cleaning, one for decuplication) with tests on clean data
* Use of Claude Skills in Snowflake 
  * `Bloomwell conventions` 
  * Read skill `dbt-test-strategy` and apply for singular tests (finished after created), relationships, and expectations (non negative)
* dbt compile, dbt test in dev
* Error handling, debugging
* Evtl. add items to the "to clarify list"


----

For next workshop: Introduce macros for auto switch of dev and prod and demo difference of +schema "verhalten"