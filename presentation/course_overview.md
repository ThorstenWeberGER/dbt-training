---
theme: default
background: '#f9f8f5'
title: 'dbt Training — Course Overview'
info: dbt Training · All Tiers
highlighter: shiki
lineNumbers: false
transition: slide-left
fonts:
  sans: 'DM Sans'
  mono: 'JetBrains Mono'
---

<div class="h-full flex flex-col justify-center pl-2">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">dbt Training · Course Overview</div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    What you'll<br>learn — and<br>why it matters
  </h1>
  <div class="grid grid-cols-3 gap-3 max-w-xl mb-8">
    <div class="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-center">
      <div class="text-xs font-mono text-emerald-700 font-semibold">🟢 Tier 1</div>
      <div class="text-xs text-slate-500">Foundations · ~9 h</div>
    </div>
    <div class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
      <div class="text-xs font-mono text-amber-700 font-semibold">🟡 Tier 2</div>
      <div class="text-xs text-slate-500">Working Effectively · ~6 h</div>
    </div>
    <div class="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-center">
      <div class="text-xs font-mono text-rose-700 font-semibold">🔴 Tier 3</div>
      <div class="text-xs text-slate-500">Production · ~6 h</div>
    </div>
  </div>
  <p class="text-slate-500 text-base max-w-lg leading-relaxed">
    17 modules · ~21 hours · dbt Core + Snowflake.<br>
    By the end you can <strong class="text-slate-700">read, write, test, and maintain</strong> dbt models confidently.
  </p>
</div>

<!--
This is the opener. Put it up before anything else.

The goal of this slide is simple: set expectations. Participants know what they're signing up for before they start.

Say out loud:
- Three tiers. You don't have to do them all at once.
- Tier 1 is for everyone on the team — no prior dbt knowledge required.
- Tier 2 is for anyone writing models regularly or maintaining existing ones.
- Tier 3 is for people who own CI pipelines, write macros, or ship production models.
- Sessions can be split across days. Each module stands on its own after Tier 1.

Then move to the next slide for the full module breakdown.
-->

---

# Course Map

<div class="grid grid-cols-3 gap-5 mt-4">

<div v-click class="bg-white border-t-4 border-emerald-400 rounded-xl p-4 shadow-sm">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-emerald-700">🟢 Tier 1 — Foundations</span>
    <span class="text-xs text-slate-400 font-mono">~9 h</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">01</span>
      <span class="text-slate-700">What is dbt and Why We Use It</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">02</span>
      <span class="text-slate-700">Project Setup, Repo Structure &amp; Execution Sequence</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">03</span>
      <span class="text-slate-700">Jinja Basics for dbt</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">04</span>
      <span class="text-slate-700">Materializations</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">05</span>
      <span class="text-slate-700">Sources and the Medallion Architecture</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">06</span>
      <span class="text-slate-700">Testing Data Quality</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">07</span>
      <span class="text-slate-700">Documentation</span>
    </div>
  </div>
  <div class="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">Full lesson plans + exercises</div>
</div>

<div v-click class="bg-white border-t-4 border-amber-400 rounded-xl p-4 shadow-sm">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-amber-700">🟡 Tier 2 — Working Effectively</span>
    <span class="text-xs text-slate-400 font-mono">~6 h</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">08</span>
      <span class="text-slate-700">Materializations in depth</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">09</span>
      <span class="text-slate-700">Seeds and variables</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">10</span>
      <span class="text-slate-700">Macros</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">11</span>
      <span class="text-slate-700">Slowly changing dimensions and snapshots</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">12</span>
      <span class="text-slate-700">Selectors, tags, and running subsets</span>
    </div>
  </div>
  <div class="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">Slides + hands-on practice</div>
</div>

<div v-click class="bg-white border-t-4 border-rose-400 rounded-xl p-4 shadow-sm">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-rose-700">🔴 Tier 3 — Production & Advanced</span>
    <span class="text-xs text-slate-400 font-mono">~6 h</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">13</span>
      <span class="text-slate-700">Workflow: One repo, branching, PRs</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">14</span>
      <span class="text-slate-700">Advanced testing patterns</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">15</span>
      <span class="text-slate-700">Incremental patterns for large tables</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">16</span>
      <span class="text-slate-700">Custom macros and <code>scd2_merge</code> deep dive</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">17</span>
      <span class="text-slate-700">Governance, contracts, and access</span>
    </div>
  </div>
  <div class="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">Planned — builds on Tier 2</div>
</div>

</div>

<div v-click class="mt-4 bg-slate-800 text-white rounded-xl px-5 py-3 flex items-center justify-between">
  <span class="text-sm">Each module builds on the previous one. Practice will create one complete project, step by step.</span>
  <span class="text-xs text-slate-400 font-mono"></span>
</div>

<!--
Walk through each column briefly — don't read every module title out loud.

Key points to land:
- The columns get progressively narrower in terms of "who needs this."
  Tier 1: everyone. Tier 2: everyone who writes models. Tier 3: maintainers and CI owners.

- The footer is the instruction: start at Tier 1, go in order. Don't skip.

- You can mention that the agenda file includes a role-based path table
  (New to dbt / Can write SQL / Building production models / Maintaining pipelines).

After this slide, go to the audience check-in before Module 01.
-->

---
layout: default
background: '#f9f8f5'
highlighter: shiki
---

# Before we start · Quick check-in
## What do you already know?
<p class="text-slate-500 text-sm -mt-4 mb-6">No wrong answers — this helps calibrate where we start.</p>

<div class="grid grid-cols-3 gap-4">

  <div v-click class="bg-white border-t-4 border-emerald-400 rounded-xl p-4 shadow-sm flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-emerald-600 mb-1">
        <div class="i-mdi-numeric-1-box text-sm" /> QUESTION 01
      </div>
      <div class="text-sm font-bold text-slate-800">Why does dbt exist?</div>
    </div>
    <div class="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">What pain was it built to solve?</div>
  </div>

  <div v-click class="bg-white border-t-4 border-amber-400 rounded-xl p-4 shadow-sm flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-amber-600 mb-1">
        <div class="i-mdi-numeric-2-box text-sm" /> QUESTION 02
      </div>
      <div class="text-sm font-bold text-slate-800">Where in the data stack does dbt live?</div>
    </div>
    <div class="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">Ingestion? Transformation? Serving?</div>
  </div>

  <div v-click class="bg-white border-t-4 border-rose-400 rounded-xl p-4 shadow-sm flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-rose-600 mb-1">
        <div class="i-mdi-numeric-3-box text-sm" /> QUESTION 03
      </div>
      <div class="text-sm font-bold text-slate-800">Programming language, IDE, or framework?</div>
    </div>
    <div class="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">How would you describe it to a colleague?</div>
  </div>

  <div v-click class="bg-white border-t-4 border-sky-400 rounded-xl p-4 shadow-sm flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-sky-600 mb-1">
        <div class="i-mdi-numeric-4-box text-sm" /> QUESTION 04
      </div>
      <div class="text-sm font-bold text-slate-800">What does dbt actually produce?</div>
    </div>
    <div class="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">Tables, dashboards, pipelines, reports?</div>
  </div>

  <div v-click class="bg-white border-t-4 border-violet-400 rounded-xl p-4 shadow-sm flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-violet-600 mb-1">
        <div class="i-mdi-numeric-5-box text-sm" /> QUESTION 05
      </div>
      <div class="text-sm font-bold text-slate-800">What's the biggest win over raw SQL?</div>
    </div>
    <div class="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">You could write transforms without dbt — so why bother?</div>
  </div>

  <div v-click class="bg-white border-t-4 border-slate-400 rounded-xl p-4 shadow-sm flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-1.5 text-xs font-mono text-slate-600 mb-1">
        <div class="i-mdi-numeric-6-box text-sm" /> QUESTION 06
      </div>
      <div class="text-sm font-bold text-slate-800">Analyst tool, engineer tool, or both?</div>
    </div>
    <div class="text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">Who writes and runs dbt models in practice?</div>
  </div>

</div>

<div class="absolute bottom-6 left-14 right-14 bg-slate-900 text-slate-100 rounded-xl px-5 py-3 text-xs flex items-center gap-3 shadow-md">
  <div class="i-mdi-chat-question text-xl text-amber-400 animate-pulse" />
  <div>
    <span class="font-bold text-white">Interactive Session:</span> Shout out answers. We'll cover all of these in Module 01.
  </div>
</div>

<!--
Audience activation — ask, don't lecture. Aim for 3–5 minutes max.

ANSWERS (reveal after discussion):

Q1 — Why does dbt exist?
  Analysts were writing raw SQL transforms in scattered files with no version control,
  no tests, and no documentation. dbt brought software engineering practices to SQL.

Q2 — Where in the data stack does dbt live?
  Transformation layer — after data is loaded into the warehouse, before BI tools consume it.
  It does NOT move data in or out; it only transforms data already in the warehouse.

Q3 — Programming language, IDE, or framework?
  Framework. You write SQL + Jinja. dbt compiles and runs it against the warehouse.
  It's not a language, not an IDE — it's a build tool for SQL.

Q4 — What does dbt actually produce?
  Tables and views in the data warehouse. Nothing else.
  No dashboards, no pipelines, no files — just SQL objects in Snowflake/BigQuery/etc.

Q5 — Biggest win over raw SQL?
  Dependency management (models reference each other), built-in testing, auto-documentation,
  and version control. Raw SQL gives you none of that by default.

Q6 — Analyst tool, engineer tool, or both?
  Both. dbt was designed so analysts who know SQL can work like engineers —
  using Git, tests, and CI without needing to write Python or manage infrastructure.

End with: "All of this is exactly what Module 01 covers — let's go."
-->
