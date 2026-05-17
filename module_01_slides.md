---
theme: default
background: '#f9f8f5'
title: 'Module 01 — What is dbt and Why We Use It'
info: Bloomwell Data & Analytics · dbt Training · Tier 1 Beginner
highlighter: shiki
lineNumbers: false
transition: slide-left
fonts:
  sans: 'DM Sans'
  mono: 'JetBrains Mono'
---

<div class="h-full flex flex-col justify-center pl-2">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">Bloomwell Data & Analytics · dbt Training</div>
  <div class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono px-3 py-1 rounded-full w-fit mb-6">
    🟢 Beginner · Module 01 · 90 min
  </div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    What is dbt<br>and Why<br>We Use It
  </h1>
  <p class="text-slate-400 text-base max-w-sm leading-relaxed">
    From raw SQL chaos to tested, documented, versioned transformations at Bloomwell.
  </p>
</div>

<!--
Welcome everyone. This is Module 01 — the start of the Beginner tier. No prerequisites.

Before we dive in: ask the group what they already know about dbt. Listen for misconceptions — especially anyone who's used dbt Cloud before. We're on dbt Core only.

By the end of this session, the goal is one thing: you can explain what dbt is and where it fits in our stack, in plain language, to a colleague who's never heard of it.
-->

---

# The Problem: SQL Pipelines Without Structure

<div class="grid grid-cols-2 gap-10 mt-6">
<div>

**What happens without dbt**

Someone needs to answer:
> *"How many HubSpot contacts converted to active patients last month?"*

They write a SQL query. It works. They save it somewhere — a shared folder, a BI tool, their laptop.

Three months later: **broken**. A column was renamed. No tests. No docs. Two analysts got different numbers.

</div>
<div class="flex flex-col gap-3 mt-1">

<div class="bg-red-50 border border-red-200 rounded-lg p-4">
  <div class="text-red-700 font-semibold text-sm mb-1">❌ No single source of truth</div>
  <div class="text-red-600 text-xs">Same calculation in 10 different places</div>
</div>
<div class="bg-red-50 border border-red-200 rounded-lg p-4">
  <div class="text-red-700 font-semibold text-sm mb-1">❌ No testing</div>
  <div class="text-red-600 text-xs">Transformations break silently</div>
</div>
<div class="bg-red-50 border border-red-200 rounded-lg p-4">
  <div class="text-red-700 font-semibold text-sm mb-1">❌ No documentation</div>
  <div class="text-red-600 text-xs">Tribal knowledge about what columns mean</div>
</div>
<div class="bg-red-50 border border-red-200 rounded-lg p-4">
  <div class="text-red-700 font-semibold text-sm mb-1">❌ No dependency management</div>
  <div class="text-red-600 text-xs">Nobody knows what breaks when a source changes</div>
</div>

</div>
</div>

<!--
This is not a hypothetical. Ask the group: "has this happened to you?" Give them 30 seconds to share.

Use a real Bloomwell example: HubSpot raw data lands in BRONZE.HUBSPOT.contacts. Before dbt, someone would query it directly — hardcoded schema, no tests, no lineage. A column rename in the Lambda pipeline breaks everything silently.

Don't rush this slide. The pain needs to feel real before the solution means anything.
-->

---

# What dbt Actually Is

<div class="grid grid-cols-2 gap-10 mt-4">
<div>

**The one-sentence definition**

dbt is a **transformation framework** that lets you write SQL `SELECT` statements — and handles materialisation, dependency resolution, testing, and documentation on top of them.

<div class="mt-6 space-y-2">
  <div class="flex items-center gap-2 text-sm"><span class="text-emerald-600 font-bold">✓</span> Compiles SQL models into executable statements</div>
  <div class="flex items-center gap-2 text-sm"><span class="text-emerald-600 font-bold">✓</span> Resolves the run order via a DAG</div>
  <div class="flex items-center gap-2 text-sm"><span class="text-emerald-600 font-bold">✓</span> Runs tests against your data</div>
  <div class="flex items-center gap-2 text-sm"><span class="text-emerald-600 font-bold">✓</span> Generates browsable documentation</div>
</div>

</div>
<div>

**dbt does NOT:**

<div class="space-y-2 mt-1">
  <div class="bg-slate-100 rounded-lg p-3 text-sm text-slate-600">Extract data from HubSpot — that's Lambda</div>
  <div class="bg-slate-100 rounded-lg p-3 text-sm text-slate-600">Load data into Snowflake — already done before dbt runs</div>
  <div class="bg-slate-100 rounded-lg p-3 text-sm text-slate-600">Schedule itself — that's Airflow on AWS ECS</div>
  <div class="bg-slate-100 rounded-lg p-3 text-sm text-slate-600">Store any data itself</div>
</div>

<div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
  <strong>Common confusion:</strong> dbt is not a database, not an ETL tool, not a scheduler. It transforms data that is <em>already in Snowflake</em>.
</div>

</div>
</div>

<!--
The "does not" column is as important as the "does" column. Most confusion about dbt comes from people thinking it replaces the whole pipeline.

Checkpoint question after this slide: "Is dbt Core or dbt Cloud? What's the difference?" — expect someone to not know. Answer: Core is open-source CLI. Cloud is a hosted platform with IDE and scheduler. Bloomwell uses Core only. Everything in this training is Core.
-->

---

# dbt Core vs dbt Cloud

<div class="mt-6">

| | dbt Core | dbt Cloud |
|---|---|---|
| What it is | Open-source CLI tool | Hosted platform: IDE, scheduler, CI |
| **What Bloomwell uses** | **✅ dbt Core** | **❌ Not used** |
| How we run it | `dbt run`, `dbt test`, `dbt build` | N/A |
| How we schedule it | Airflow on AWS ECS | N/A |

</div>

<div class="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
  <div class="font-semibold text-emerald-800 mb-2">Everything in this training applies to dbt Core only.</div>
  <div class="text-emerald-700 text-sm">All commands, all config, all patterns — dbt Core. If you see dbt Cloud tutorials online, they may look different. Ignore the Cloud-specific UI features.</div>
</div>

<!--
This comes up constantly when people do their own research. They find a YouTube tutorial that shows a browser-based IDE — that's dbt Cloud. Our dev environment is VS Code + CLI.

If anyone has used dbt Cloud before, flag that their muscle memory around the scheduler and the IDE won't apply here.
-->

---

# The Bloomwell Stack

```
HubSpot / Source Systems
        │
        ▼
   AWS Lambda          ← extracts and loads raw data
        │
        ▼
   Snowflake — BRONZE  ← raw, append-only, Lambda owns this
        │
        ▼ ─── dbt takes over here ───────────────────────
        │
   dbt — STAGING       ← views, rename/cast columns
        │
        ▼
   dbt — SILVER        ← dim_*, fct_*, bridge_*
        │
        ▼
   dbt — GOLD          ← mrt_* → Power BI
```

<div class="mt-4 text-sm text-slate-500">dbt owns everything from Staging downward. Bronze is Lambda's responsibility.</div>

<!--
Draw this on the whiteboard — don't just show the slide. The physical act of drawing it helps people remember the layer boundaries.

Key point to hammer: dbt does NOT write to Bronze. Lambda does. dbt starts at Staging and references Bronze as a *source*. This distinction matters in Module 05 when we cover sources.yml.

Checkpoint: "Who writes to the Bronze layer?" — Answer: Lambda / the ingestion layer. Not dbt.
-->

---

# Live Demo: Project Structure

<div class="grid grid-cols-2 gap-10 mt-4">
<div>

**Open VS Code — Bloomwell dbt project**

```
bloomwell/
├── dbt_project.yml      ← project config
├── profiles.yml         ← NOT here (in ~/.dbt/)
├── models/
│   ├── staging/         ← hubspot__contacts etc.
│   ├── silver/          ← dim_patient, fct_prescription
│   └── gold/            ← mrt_monthly_volume
├── macros/              ← scd2_merge and others
├── tests/               ← singular tests
└── target/              ← compiled SQL (git-ignored)
```

</div>
<div class="flex flex-col gap-3 mt-2">

<div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
  <div class="font-mono text-slate-500 text-xs mb-1">dbt_project.yml</div>
  Project name, model paths, default materialisation per layer
</div>
<div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
  <div class="font-mono text-slate-500 text-xs mb-1">models/silver/dim_patient.sql</div>
  Contains <code>{{ ref() }}</code> — we'll cover this in Module 03
</div>
<div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
  <div class="font-mono text-slate-500 text-xs mb-1">target/ folder</div>
  Where compiled SQL lives — always git-ignored, never commit it
</div>
<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
  <strong>Deliberate mistake:</strong> Navigate to the wrong folder. Get confused. Correct yourself. This is normal in a real project.
</div>

</div>
</div>

<!--
Do NOT run dbt run here. Running a model requires ref(), materialisation, and schema config — all coming in later modules.

Make the deliberate navigation mistake — it's not optional. Participants need to see what disorientation looks like and how to recover. The message is: everyone gets lost in a codebase. Here's how you re-orient.

Don't explain every file in depth. The goal is just: "here's the map." Depth comes in Module 02.

After the demo, ask: "Point to where a Silver model lives." Make someone answer before moving on.
-->

---

# Exercise: Explore the Project (25 min)

**Answer all four questions using only the dbt project — no Googling.**

<div class="grid grid-cols-2 gap-6 mt-4">
<div class="space-y-4">

<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-1">Q1</div>
  <div class="text-sm font-medium text-slate-800">What is the project name defined in <code>dbt_project.yml</code>?</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-1">Q2</div>
  <div class="text-sm font-medium text-slate-800">Find one Silver dimension model (<code>dim_*</code>). What table does it reference using <code>{{ ref() }}</code>?</div>
</div>

</div>
<div class="space-y-4">

<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-1">Q3</div>
  <div class="text-sm font-medium text-slate-800">How many models are in <code>models/gold/</code>? List their names.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-1">Q4</div>
  <div class="text-sm font-medium text-slate-800">Open <code>dbt_project.yml</code>. What is the default materialisation for Silver models?</div>
</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
  <div class="text-xs font-mono text-emerald-600 mb-1">Bonus</div>
  <div class="text-sm font-medium text-emerald-800">Run <code>dbt ls</code> in the terminal. How many models are listed?</div>
</div>

</div>
</div>

<!--
Give them 25 minutes. Circulate — but don't answer immediately. If someone is stuck after 2 minutes, give a hint about where to look, not what the answer is.

The exercise is deliberately passive (reading, not coding). That's correct for Module 01. The goal is orientation, not execution.

If anyone finishes in under 10 minutes, push them to the bonus question and ask them to also find where the scd2_merge macro lives.

All four questions must be answered correctly before you move on. Don't skip the checkpoint.
-->

---

# Debrief: The 3 Core Bullets

<div class="mt-6 space-y-4">

<div class="bg-white border-l-4 border-emerald-500 rounded-r-xl p-5 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-2">01</div>
  <div class="text-lg font-semibold text-slate-800">dbt transforms data that is <span class="text-emerald-600">already in Snowflake</span> — it does not extract or load.</div>
</div>

<div class="bg-white border-l-4 border-emerald-500 rounded-r-xl p-5 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-2">02</div>
  <div class="text-lg font-semibold text-slate-800">At Bloomwell, dbt owns <span class="text-emerald-600">Staging → Silver → Gold</span>. Lambda handles ingestion into Bronze.</div>
</div>

<div class="bg-white border-l-4 border-emerald-500 rounded-r-xl p-5 shadow-sm">
  <div class="text-xs font-mono text-slate-400 mb-2">03</div>
  <div class="text-lg font-semibold text-slate-800">Every dbt model is a <span class="text-emerald-600">SELECT statement</span>. dbt wraps it in the right DDL based on materialisation config.</div>
</div>

</div>

<div class="mt-6 text-sm text-slate-400">Prep questions for Module 02 are in the module document. You'll be asked them cold at the start of next session.</div>

<!--
DO NOT reveal these bullets first. Ask participants to give you their three takeaways first. Write them on the whiteboard. Then compare to these three.

If any are missing or wrong, address them now — don't let wrong mental models carry into Module 02.

Final checkpoint: "Explain dbt in one sentence to a non-technical colleague." Ask someone to try. This is the Module 01 success criterion.

Remind them of the prep questions at the end of the module document — they'll be asked without warning at the start of Module 02.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 01 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 02</h2>
  <p class="text-slate-500 mb-8">Project Setup, Repo Structure & Execution Sequence</p>
  <div class="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">
    Prep: review dbt_project.yml before next session
  </div>
</div>
