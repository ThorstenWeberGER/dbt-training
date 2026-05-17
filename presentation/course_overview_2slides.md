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
      <div class="text-xs text-slate-500">Foundations · ~7 h</div>
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
    16 modules · ~19 hours · dbt Core + Snowflake.<br>
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

<div class="bg-white border border-emerald-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-emerald-700">🟢 Tier 1 — Foundations</span>
    <span class="text-xs text-slate-400 font-mono">~7 h</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">01</span>
      <span class="text-slate-700">Why dbt? Context and mental model</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">02</span>
      <span class="text-slate-700">Local setup: <code>profiles.yml</code>, project init, repo structure</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">03</span>
      <span class="text-slate-700">The dbt execution sequence</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">04</span>
      <span class="text-slate-700">Sources and the medallion architecture</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">05</span>
      <span class="text-slate-700">Testing data quality</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">06</span>
      <span class="text-slate-700">Documentation</span>
    </div>
  </div>
  <div class="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">Full lesson plans + exercises</div>
</div>

<div class="bg-white border border-amber-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-amber-700">🟡 Tier 2 — Working Effectively</span>
    <span class="text-xs text-slate-400 font-mono">~6 h</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">07</span>
      <span class="text-slate-700">Materializations in depth</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">08</span>
      <span class="text-slate-700">Seeds and variables</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">09</span>
      <span class="text-slate-700">Jinja and macros</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">10</span>
      <span class="text-slate-700">Slowly changing dimensions and snapshots</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">11</span>
      <span class="text-slate-700">Selectors, tags, and running subsets</span>
    </div>
  </div>
  <div class="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">Slides + hands-on practice</div>
</div>

<div class="bg-white border border-rose-200 rounded-xl p-4">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-rose-700">🔴 Tier 3 — Production & Advanced</span>
    <span class="text-xs text-slate-400 font-mono">~6 h</span>
  </div>
  <div class="space-y-2">
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">12</span>
      <span class="text-slate-700">CI/CD and slim CI</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">13</span>
      <span class="text-slate-700">Advanced testing patterns</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">14</span>
      <span class="text-slate-700">Incremental patterns for large tables</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">15</span>
      <span class="text-slate-700">Custom macros and <code>scd2_merge</code> deep dive</span>
    </div>
    <div class="flex items-start gap-2 text-xs">
      <span class="font-mono text-slate-300 shrink-0">16</span>
      <span class="text-slate-700">Governance, contracts, and access</span>
    </div>
  </div>
  <div class="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">Planned — builds on Tier 2</div>
</div>

</div>

<div class="mt-4 bg-slate-800 text-white rounded-xl px-5 py-3 flex items-center justify-between">
  <span class="text-sm">Start at <strong>Tier 1</strong> and work in order. Each module builds on the previous one.</span>
  <span class="text-xs text-slate-400 font-mono">Not everyone needs Tier 3 — see the agenda for role-based paths.</span>
</div>

<!--
Walk through each column briefly — don't read every module title out loud.

Key points to land:
- The columns get progressively narrower in terms of "who needs this."
  Tier 1: everyone. Tier 2: everyone who writes models. Tier 3: maintainers and CI owners.

- The footer is the instruction: start at Tier 1, go in order. Don't skip.

- You can mention that the agenda file includes a role-based path table
  (New to dbt / Can write SQL / Building production models / Maintaining pipelines).

After this slide, go straight into Module 01.
-->
