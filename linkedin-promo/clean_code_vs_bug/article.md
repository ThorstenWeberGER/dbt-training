**Title (LinkedIn Article title field):** This dbt curriculum starts with a broken model. That's the point.

---

*Building follows a recipe. Debugging doesn't.*

You can work through a dbt tutorial end to end — every example compiles, every model runs green — and still freeze the first time a real Silver model returns zero rows in production.

That's not because the tutorial was bad. It's because the code in it never had to be wrong. Worked examples are great at teaching you to *build*. They can't teach you to *debug*, because there's nothing broken to find. Someone already fixed it before you opened the file.

Building follows a recipe: do these steps, in this order, get this result. Debugging doesn't. It means reading a DAG you didn't write. It means forming a hypothesis about why a number looks off. It means being wrong once or twice before you're right. That second skill is most of what running dbt in production actually looks like, and almost nothing in the standard learning path gives you reps at it.

**So the training I built does that part on purpose: the hands-on exercise project ships with real bugs already inside it, and part of the curriculum is finding and fixing them yourself.**

🔗 **https://github.com/ThorstenWeberGER/dbt-training**

---

### What's actually inside

This isn't a slide deck with a "coming soon" GitHub link attached. It's a **complete, two-tier curriculum with a runnable dbt project behind it**:

- **12 modules built end-to-end** across two tiers — 🟢 *Foundations* (Modules 1–7: why dbt exists, project setup, the five-phase execution lifecycle, materializations, sources, testing, documentation) and 🟡 *Working Effectively* (Modules 8–12: seeds & variables, Jinja macros, SCD2 & snapshots, selectors/tags, CI/CD & slim CI). A third tier — five more modules on advanced testing, incremental patterns, and governance — is scoped and next.
- Every built module ships **three matching artifacts**: a detailed lesson plan (recap → theory → live demo → exercise → debrief), a **Slidev** deck (`module_01.md` … `module_12.md`, browser-based, live-editable), and a hands-on exercise with a graded outcome.
- Behind it all is a **real, runnable dbt project** — not toy SQL: **15 models** across staging/silver/gold, **3 custom macros**, **1 SCD2 snapshot**, and **8 seed CSVs** — that runs entirely on **DuckDB with zero Snowflake credentials**, or against live Snowflake in "training mode." Two commands, no cloud account, no waiting on IT:
  ```bash
  dbt seed --target test --full-refresh
  dbt run  --target test
  dbt test --target test
  ```
- The whole thing is cross-referenced chapter-by-chapter against a real O'Reilly book (*Analytics Engineering with SQL and dbt*, Machado & Russa) — so self-study has an actual syllabus, not just a folder of markdown.

### The part a casual skim would miss

The exercise project ships with **real, catalogued bugs — on purpose**:

| File | The bug | Fixed in |
|---|---|---|
| `stg_hubspot__pipeline_stages.sql` | Materialized as a `table` instead of a `view` | Module 4 |
| `fct_prescription.sql` | `patient_key` and `doctor_key` aliases silently swapped | Module 6 |
| `mrt_country_summary.sql` | Joined on the wrong column — every country count reads `0` | Module 8 |

You don't *read about* incremental models, testing, or the DAG. You inherit someone else's mistake, in your own dev schema. You're the one who has to find it, explain in one sentence why it's wrong, and fix it with a one-line change. That's the exact muscle you use debugging a real model at 9am on a Monday.

"Understand incremental models" isn't verifiable. "Run `dbt test`, show me the green output, explain the failure you just fixed" is. Every exercise in this curriculum is graded the second way.

### Who this is for

- **Analysts and engineers ramping onto dbt** who want more depth than a 3-hour intro course
- **Anyone who's inherited a dbt project** and needs the mental model behind `ref()`, materializations, and testing — not just the syntax
- **Trainers and team leads** who need a curriculum they can run tomorrow, not one they have to build from scratch first

---

**Want to try it?** Clone the repo, `cd excercises`, run the three commands above — no Snowflake account required, results in under a minute.

**Hiring managers:** this is what "I know dbt" looks like when it's backed by a project instead of a checkbox — 15 working models, a documented DAG, deliberately broken code to fix, and a curriculum built to produce a verifiable outcome at every step, not a vague sense of having "covered the material."
