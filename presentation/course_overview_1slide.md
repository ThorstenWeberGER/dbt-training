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

<div class="h-full flex flex-col">

<div class="flex items-center justify-between mb-5">
  <div>
    <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-1">dbt Training · Course Overview</div>
    <div class="text-2xl font-bold text-slate-900">What to Expect — 16 Modules · ~19 Hours</div>
  </div>
  <div class="text-xs text-slate-400 font-mono text-right leading-relaxed">
    dbt Core · Snowflake<br>Bronze / Silver / Gold
  </div>
</div>

<div class="grid grid-cols-3 gap-5 flex-1">

<div class="bg-white border border-emerald-200 rounded-xl p-4 flex flex-col">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">🟢 Tier 1 — Foundations</span>
    <span class="text-xs text-slate-400 font-mono">~7 h</span>
  </div>
  <div class="space-y-2 flex-1">
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
  <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
    Full lesson plans + exercises
  </div>
</div>

<div class="bg-white border border-amber-200 rounded-xl p-4 flex flex-col">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">🟡 Tier 2 — Working Effectively</span>
    <span class="text-xs text-slate-400 font-mono">~6 h</span>
  </div>
  <div class="space-y-2 flex-1">
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
  <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
    Slides + hands-on practice
  </div>
</div>

<div class="bg-white border border-rose-200 rounded-xl p-4 flex flex-col">
  <div class="flex items-center justify-between mb-3">
    <span class="text-xs font-mono font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">🔴 Tier 3 — Production & Advanced</span>
    <span class="text-xs text-slate-400 font-mono">~6 h</span>
  </div>
  <div class="space-y-2 flex-1">
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
  <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
    Planned — builds on Tier 2
  </div>
</div>

</div>

<div class="mt-4 bg-slate-800 text-white rounded-xl px-5 py-3 flex items-center justify-between">
  <span class="text-sm font-semibold">Goal: read, write, test, and maintain dbt models confidently in our Snowflake stack.</span>
  <span class="text-xs text-slate-400 font-mono">Start at Tier 1 · work in order</span>
</div>

</div>

<!--
This is the course map. Put it up at the very start — before Module 01 — so participants see the full arc before they dive in.

Key things to say:
- Three tiers, 16 modules, roughly 19 hours of contact time.
- They don't have to do all of it in one go — sessions can be split across days.
- Tier 1 is the foundation. Modules 7–16 assume Tier 1 is solid.
- Most people on the team only need Tier 1 + Tier 2 to be productive day-to-day.
- Tier 3 is for anyone maintaining CI, writing macros, or owning production pipelines.

Point to the bottom bar: that sentence is the single thing to remember. If you can do all four of those verbs, you're done.
-->
