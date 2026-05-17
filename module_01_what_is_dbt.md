# Module 01 — What is dbt and Why We Use It

**Tier:** 🟢 Beginner · **Duration:** 90 min · **Prerequisites:** None

---

## Agenda

| Time | Duration | Topic | Learning Goal | Mode | Participant Activity | Materials | Trainer Notes | Checkpoint |
|---|---|---|---|---|---|---|---|---|
| 00:00 | 10 min | Welcome & overview | Understand what this module covers and what success looks like | Present | Listen, ask questions | This doc | Set expectations: "by end of session you can explain dbt to a colleague in plain language" | Verbal: "what do you already know about dbt?" |
| 00:10 | 20 min | The problem dbt solves | Understand why raw SQL pipelines break at scale | Present + Discussion | Ask questions, share own pain points | Whiteboard / slides | Use a real Bloomwell example: HubSpot raw data → `BRONZE.HUBSPOT.contacts` → how it used to be queried ad hoc | "Name one pain point you have today with data transformations" |
| 00:30 | 15 min | What dbt actually is | Understand what dbt does — and does not do | Present | Listen, annotate | Slide: dbt stack diagram | Common confusion: dbt is NOT a database, scheduler, or ETL tool. It transforms data already in Snowflake | "Is Bloomwell on dbt Core or dbt Cloud? What's the difference?" |
| 00:45 | 15 min | Live demo: project structure | Recognise the key files and folders in the Bloomwell project | Demo | Watch, no coding | VS Code with dbt project open | Show real project: `dbt_project.yml`, `models/`, `macros/`, `tests/`. Don't explain every file — just build a mental map. Make one deliberate navigation mistake and correct it. | "Point to where a Silver model lives" |
| 01:00 | 25 min | Exercise: explore and document | Navigate the project and find real examples | Practice | Independent exploration | Bloomwell dbt project (read-only) | Give worksheet below. Circulate but don't answer immediately — let participants struggle for 2 min first | All 4 worksheet questions answered correctly |
| 01:25 | 10 min | Debrief + 3-bullet summary | Consolidate learning | Debrief | Discuss, write down summary | Whiteboard | Reveal the 3 bullets only after participants share their own first | "Explain dbt in one sentence to a non-technical colleague" |

---

## Theory — Part A: The Problem dbt Solves (20 min)

### What happened before dbt

A data team wants to answer: *"How many HubSpot contacts converted to active patients last month?"*

They write a SQL query. It works. They save it somewhere — a shared folder, a BI tool, their laptop. Three months later the query is broken. A column was renamed in the source. No tests, no documentation. Two analysts wrote the same transformation differently and got different numbers. The business has lost confidence in the data.

This is how most data teams operate without a transformation framework.

**The four core problems dbt solves:**

1. **No single source of truth** — same calculation defined in 10 different places
2. **No testing** — transformations break silently; nobody notices until a dashboard is wrong
3. **No documentation** — tribal knowledge about what `fct_prescription.amount` actually means
4. **No dependency management** — nobody knows what breaks when a source column changes

### What this looks like at Bloomwell today

- HubSpot pipeline stages are ingested via Lambda → `BRONZE.HUBSPOT.pipeline_stages`
- Silver models (`dim_pipeline`, `dim_pipeline_stage`) transform and clean that data
- Gold marts (`mrt_*`) serve Power BI directly
- If someone renames a column in Bronze, every downstream model that references it will break — unless dbt's dependency graph catches it

---

## Theory — Part B: What dbt Actually Is (15 min)

### The one-sentence definition

dbt is a **transformation framework** that lets you write SQL `SELECT` statements and handles materialisation, dependency resolution, testing, and documentation on top of them.

**dbt does:**
- Compile your SQL models into executable statements
- Resolve the order models must run in (the DAG)
- Run tests against your data
- Generate documentation

**dbt does not:**
- Extract data from sources (that's your Lambda / Fivetran / Airbyte)
- Load data into Snowflake (that's already done before dbt runs)
- Schedule itself (that's Airflow or another orchestrator)
- Store any data itself

### dbt Core vs dbt Cloud

| | dbt Core | dbt Cloud |
|---|---|---|
| What it is | Open-source CLI tool | Hosted platform with IDE, scheduler, CI |
| What Bloomwell uses | ✅ dbt Core | ❌ Not used |
| How we run it | CLI: `dbt run`, `dbt test`, `dbt build` | N/A |
| How we schedule it | Airflow on AWS ECS | N/A |

Everything in this training applies to **dbt Core only**.

### The dbt stack at Bloomwell

```
HubSpot / Source Systems
        ↓
   AWS Lambda (ingestion)
        ↓
   Snowflake — BRONZE layer (raw, append-only)
        ↓
   dbt — STAGING (views, rename/cast)
        ↓
   dbt — SILVER (dim_*, fct_*, bridge_*)
        ↓
   dbt — GOLD (mrt_* → Power BI)
```

dbt owns everything from Staging downward.

---

## Live Demo Script (15 min)

Open VS Code with the Bloomwell dbt project. Walk through:

1. `dbt_project.yml` — project name, model paths, default materialisation config
2. `models/` directory — show Bronze staging, Silver, Gold folder structure
3. One Silver model — open `dim_patient.sql`, point out the `{{ ref() }}` call (don't explain it yet — just say "this is how models connect; we'll cover it in Module 03")
4. `schema.yml` — show it exists, explain it holds tests and documentation (covered later)
5. **Deliberate mistake:** navigate to the wrong folder, act confused, correct yourself — this shows how to orient yourself when lost in a real project

Do not run `dbt run`. That belongs in Module 02 after setup is confirmed.

---

## Exercise Worksheet (25 min)

Answer all four questions using only the Bloomwell dbt project — no Googling.

**Q1.** What is the project name defined in `dbt_project.yml`?

**Q2.** Find one Silver dimension model (`dim_*`). What table does it reference using `{{ ref() }}`?

**Q3.** How many models are in the `models/gold/` folder? List their names.

**Q4.** Open `dbt_project.yml`. What is the default materialisation for Silver models?

**Bonus:** Run `dbt ls` in the terminal. How many models are listed?

---

## Debrief — 3-Bullet Summary

After participants share their own answers, confirm these three:

1. dbt transforms data that is **already in Snowflake** — it does not extract or load
2. At Bloomwell, dbt owns Bronze Staging → Silver → Gold; Lambda handles ingestion
3. Every model is a `SELECT` statement; dbt handles the `CREATE TABLE` / `CREATE VIEW` around it

---

## Reference Material

- [dbt Core documentation](https://docs.getdbt.com/docs/introduction)
- [What is dbt? (official overview)](https://docs.getdbt.com/docs/introduction#what-is-dbt)
- Bloomwell internal: `bloomwell-conventions` skill — layer ownership, naming rules
- Bloomwell internal: `references/go_live_checklist.md` — read before first PR

---

## Prep Questions for Module 02

Participants should be able to answer these at the start of the next session — from memory, without notes:

1. What does `dbt_project.yml` configure?
2. What is the difference between dbt Core and dbt Cloud?
3. dbt does NOT do three things — name them.
4. Which layer does dbt own at Bloomwell?
