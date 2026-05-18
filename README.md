# dbt Training — Data Team

This repo is a structured, hands-on training curriculum for data team members learning dbt Core on a Snowflake + medallion architecture stack. It covers 16 modules across three tiers — from first principles through production patterns.

---

## Purpose

This is a complete training resource, not a runnable dbt project. It contains lesson plans, slide decks, a hands-on coding project, reference data, and trainer guides. Everything you need to deliver or self-study the curriculum is here.

---

## Audience

- **Primary:** Data analysts and analytics engineers new to dbt who already know SQL
- **Secondary:** Trainers and team leads delivering the sessions
- **Assumed knowledge:** Basic SQL, familiarity with a data warehouse (Snowflake preferred), version control basics (git clone, commit, push)

---

## Scope

### Covered

| Tier | Modules | Topics |
|------|---------|--------|
| 🟢 Foundations | 1–7 | Why dbt, local setup, Jinja basics, materializations, sources, testing, documentation |
| 🟡 Working Effectively | 8–12 | Advanced materializations, seeds & variables, macros, SCD2/snapshots, CI/CD and slim CI |
| 🔴 Production & Advanced | 13–16 | Advanced testing, custom macros, governance, production patterns |

Full lesson content (lesson plans + slides) exists for **Tier 1 (Modules 1–7)**. Tier 2 has slides. Tier 3 is planned.

### Not covered

- dbt Cloud (the course uses dbt Core)
- Orchestration (Airflow is referenced as context; not taught here)
- Snowflake administration
- Power BI / BI layer development

---

## Repository Layout

```
dbt-training/
│
├── module_0X_[topic].md          Detailed lesson plans — Modules 01–07
│
├── presentation/
│   ├── module_0X_slides.md       Slidev decks mirroring each lesson plan
│   ├── course_overview_1slide.md One-slide course map (Slidev)
│   ├── course_overview_2slides.md Two-slide course overview (Slidev)
│   ├── course_overview_2slides.pdf Pre-rendered PDF version of the overview
│   ├── package.json              Slidev dependency manifest
│   └── slidev.config.ts          Slidev configuration
│
├── exercises/
│   ├── exercises.md              Participant guide — step-by-step exercises, Modules 01–07
│   ├── exercises_trainer.md      Trainer guide — expected outcomes, common mistakes, verify commands
│   ├── dbt_project.yml           dbt project config handed to participants
│   ├── packages.yml              dbt package dependencies (dbt_utils)
│   ├── profiles.yml.example      Snowflake connection template (copy to ~/.dbt/profiles.yml)
│   ├── models/                   SQL scaffold — pre-built Silver models + buggy staging model
│   ├── seeds/                    Bronze CSV data loaded via `dbt seed`
│   └── reference/                Silver expected-output CSVs for trainer verification
│
├── resources/
│   ├── reference.md              Book-to-module mapping (Analytics Engineering with dbt, O'Reilly)
│   ├── Data_Quality_Validation.md Data quality validation framework and patterns
│   └── dbt_mindmap_light.png     Curriculum mind map image
│
├── public/
│   ├── dbt_mindmap.jsx           React mind map of the full curriculum
│   ├── dbt_quality_validation.tsx React data quality validation demo component
│   ├── mindmap.html              Standalone HTML viewer for the mind map
│   └── quality.html              Standalone HTML viewer for the validation demo
│
├── dbt_training_agenda_bloomwell.md  Full 16-module agenda with durations and goals
├── dbt_training_methodology.md       Delivery framework and pedagogical approach
└── CLAUDE.md                         AI assistant instructions for this repo
```

---

## Key Documents

| Document | Who reads it | What it contains |
|----------|-------------|-----------------|
| `dbt_training_agenda_bloomwell.md` | Trainers, team leads | Full 16-module curriculum, durations, learning goals |
| `dbt_training_methodology.md` | Trainers | How to structure and deliver sessions, the pedagogical framework |
| `module_0X_[topic].md` | Trainers, self-study | Detailed lesson plan: recap → theory → live demo → exercise → debrief |
| `presentation/module_0X_slides.md` | Trainers (present) | Slidev deck for the session — mirrors the lesson plan |
| `exercises/exercises.md` | You (participant) | Step-by-step coding exercises building one dbt project across Modules 01–07 |
| `exercises/exercises_trainer.md` | Trainers | Per-step expected outcomes, deliberate bugs explained, verify commands |
| `resources/reference.md` | Self-study | Chapter-to-module mapping for the O'Reilly dbt book |

---

## The Hands-on Project (`exercises/`)

You'll build a single dbt project incrementally across Modules 01–07. You start from a partially built scaffold — a broken staging model and four untested Silver models — and add the staging layer, tests, and documentation session by session.

Before you start, copy the connection template and configure it for your environment:

```bash
cp exercises/profiles.yml.example ~/.dbt/profiles.yml
# Edit ~/.dbt/profiles.yml — set account, user, role, warehouse, database, schema
dbt debug   # run from inside exercises/ — all checks must pass before Module 03
```

> `profiles.yml` is gitignored and must never be committed. It contains credentials.

---

## Slidev — Installation and Usage

The slide decks in `presentation/` use [Slidev](https://sli.dev) — a Markdown-based presentation framework that runs in the browser.

### Requirements

- **Node.js** 18 or later (`node --version` to check)
- **npm** 8 or later (`npm --version` to check)

### Install

```bash
cd presentation
npm install
```

This installs Slidev and its dependencies into `presentation/node_modules/`. You only need to do this once.

### Start a presentation

```bash
cd presentation
npx slidev module_01_slides.md
```

Slidev starts a local dev server and opens the slides in your browser at `http://localhost:3030`. Edit the `.md` file and the browser updates live.

To open a different module, replace the filename:

```bash
npx slidev module_06_slides.md
npx slidev course_overview_2slides.md
```

### Present in fullscreen

Press `F` in the browser to enter fullscreen. Use arrow keys or swipe to navigate. Press `O` for slide overview, `D` to toggle dark mode.

### Export to PDF

```bash
npx slidev export module_01_slides.md --output module_01.pdf
```

This requires Playwright (`npx playwright install`) for PDF rendering. Alternatively, use the browser's Print → Save as PDF in presentation mode.

### Build as static HTML

```bash
npx slidev build module_01_slides.md --out dist/
```

This produces a standalone `dist/` folder you can serve from any static host.

---

## Requirements Summary

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Run Slidev |
| npm | ≥ 8 | Install Slidev packages |
| dbt Core | ≥ 1.5 | Run exercises |
| Snowflake account | — | Target for exercises |
| git | any | Clone and work with the repo |

dbt Core installation: `pip install dbt-snowflake`

---

## Contributing

Use Modules 01–07 as the style reference when adding new lesson content. Every lesson plan follows the same five-part structure: Opening Recap → Theory Block → Live Demo → Hands-on Exercise → Debrief. Slide decks mirror the lesson plan in Slidev format. See `CLAUDE.md` for content rules (no company-specific names, no credentials).
