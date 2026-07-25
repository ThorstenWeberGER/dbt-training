# dbt Training — Data Team 

This repo is a structured, hands-on dbt Core training curriculum built on a Snowflake + medallion architecture stack. It covers 12 built modules across two tiers, with a third tier planned.

---

## Purpose

This is a complete training resource, not a runnable dbt project on its own — except for `excercises/`, which *is* a real, runnable dbt project. The repo contains lesson plans, slide decks, a hands-on coding project, reference data, and trainer guides. Everything you need to deliver or self-study the curriculum is here, in one place.

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
| 🟡 Working Effectively | 8–12 | Seeds & variables, Jinja macros, SCD2 & snapshots, selectors/tags, CI/CD & slim CI |
| 🔴 Production & Advanced | 13–16 | Advanced testing, custom macros, governance, production patterns |

Full lesson content (lesson plans + slides + hands-on exercises) exists for **both Tier 1 (Modules 1–7) and Tier 2 (Modules 8–12)**. Tier 3 is planned — no lesson plans, slides, or exercises exist for it yet.

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
├── handouts/
│   └── module_0X_[topic].md          Detailed lesson plans — Modules 01–12
│
├── presentation/
│   ├── module_0X.md                  Slidev decks mirroring each lesson plan — Modules 01–12
│   ├── course_overview.md            Course map (Slidev)
│   ├── components/                   Shared Vue components for the decks
│   ├── resources/                    Images used by the decks
│   ├── package.json                  Slidev dependency manifest
│   └── slidev.config.ts              Slidev configuration
│
├── excercises/
│   ├── README.md                     Setup + how to run (Snowflake training mode or local DuckDB mode)
│   ├── guide_participants_tier1.md   Participant guide — Modules 01–07
│   ├── guide_participants_tier2.md   Participant guide — Modules 08–12
│   ├── guide_trainer_all.md          Trainer guide — all modules, expected outcomes, verify commands
│   ├── dbt_project.yml               dbt project config handed to participants
│   ├── packages.yml                  dbt package dependencies (dbt_utils)
│   ├── profiles.yml.example          Connection template (copy to ~/.dbt/profiles.yml)
│   ├── models/                       1_staging / 2_silver / 3_gold — the SQL scaffold, including deliberate bugs
│   ├── seeds/                        Lookup + Bronze-simulation CSVs loaded via `dbt seed`
│   ├── macros/                       Custom macros used in the exercises
│   └── snapshots/                    SCD2 snapshot exercise (Module 10)
│
├── resources/
│   ├── reference.md                       Chapter-to-module mapping for a companion O'Reilly book
│   ├── Data_Quality_Validation.md         Data quality validation framework and patterns
│   ├── dbt_mindmap.jsx / mindmap.html     Curriculum mind map (React component + standalone viewer)
│   └── dbt_quality_validation.tsx / quality.html   Data quality demo component + standalone viewer
│
├── docs/
│   ├── dbt_training_agenda_bloomwell.md   Full 16-module agenda with durations and goals
│   ├── dbt_training_methodology.md        Delivery framework and pedagogical approach
│   ├── checklist.md                       Internal reference — see note below
│   └── session_retrospective.md           Lessons learned from building this curriculum
│
├── docs-payments-system/                  Supplementary payments-domain workshop material
├── pdfs/                                  Pre-rendered PDF exports of handouts, exercise guides, and slides
└── CLAUDE.md                              AI assistant instructions for this repo
```

---

## Key Documents

| Document | Who reads it | What it contains |
|----------|-------------|-----------------|
| `docs/dbt_training_agenda_bloomwell.md` | Trainers, team leads | Full curriculum outline, durations, learning goals |
| `docs/dbt_training_methodology.md` | Trainers | How to structure and deliver sessions, the pedagogical framework |
| `handouts/module_0X_[topic].md` | Trainers, self-study | Detailed lesson plan: recap → theory → live demo → exercise → debrief |
| `presentation/module_0X.md` | Trainers (present) | Slidev deck for the session — mirrors the lesson plan |
| `excercises/guide_participants_tier1.md` | You (participant, Modules 01–07) | Step-by-step coding exercises |
| `excercises/guide_participants_tier2.md` | You (participant, Modules 08–12) | Step-by-step coding exercises |
| `excercises/guide_trainer_all.md` | Trainers | Expected outcomes, deliberate bugs explained, verify commands |
| `resources/reference.md` | Self-study | Chapter-to-module mapping for a companion O'Reilly dbt book |

> **Note on `docs/checklist.md`:** this file documents internal production conventions from a real project and includes company-specific references. It's kept for internal reference but isn't part of the public-facing curriculum — don't cite it in anything meant to leave this repo.

---

## The Hands-on Project (`excercises/`)

You'll build a single dbt project incrementally: staging → silver → gold, across both tiers. The project runs two ways:

- **Snowflake ("training mode")** — the trainer pre-loads Bronze source tables; you seed only the lookup tables.
- **DuckDB (local testing mode)** — runs fully offline, **no Snowflake credentials needed**. Good for self-study or CI.

Full setup steps live in `excercises/README.md`. The short version, from inside `excercises/`:

```bash
pip install -r requirements.txt
dbt deps

# DuckDB, no credentials required:
dbt seed --target test
dbt run  --target test
dbt test --target test    # expect 1 intentional failure — it's a teaching exercise
```

> `profiles.yml` is gitignored and must never be committed. Only `profiles.yml.example` lives in the repo.

The exercise project ships with a small number of **deliberate, catalogued bugs** — see `excercises/README.md` for the exact list and which module fixes each one. That's intentional: the curriculum is designed so you debug real mistakes, not just read about concepts.

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
npx slidev module_01.md
```

Slidev starts a local dev server and opens the slides in your browser at `http://localhost:3030`. Edit the `.md` file and the browser updates live.

To open a different module, replace the filename:

```bash
npx slidev module_08.md
npx slidev course_overview.md
```

### Present in fullscreen

Press `F` in the browser to enter fullscreen. Use arrow keys or swipe to navigate. Press `O` for slide overview, `D` to toggle dark mode.

### Export to PDF

```bash
npx slidev export module_01.md --output module_01.pdf
```

This requires Playwright (`npx playwright install`) for PDF rendering. Alternatively, use the browser's Print → Save as PDF in presentation mode. Pre-rendered PDF exports of every handout, guide, and deck already exist under `pdfs/`, if you just want the output without running Slidev yourself.

### Build as static HTML

```bash
npx slidev build module_01.md --out dist/
```

This produces a standalone `dist/` folder you can serve from any static host.

---

## Requirements Summary

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Run Slidev |
| npm | ≥ 8 | Install Slidev packages |
| dbt Core | ≥ 1.5, ≤ Python 3.12 | Run exercises |
| Snowflake account | Optional | Only needed for "training mode"; DuckDB mode needs none |
| git | any | Clone and work with the repo |

dbt Core installation: `pip install -r excercises/requirements.txt` (installs both the Snowflake and DuckDB adapters)

---

## Contributing

Use Modules 01–07 as the style reference when adding new lesson content. Every lesson plan follows the same five-part structure: Opening Recap → Theory Block → Live Demo → Hands-on Exercise → Debrief. Slide decks mirror the lesson plan in Slidev format. See `CLAUDE.md` for content rules — no company-specific names, no credentials.
