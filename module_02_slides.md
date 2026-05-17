---
theme: default
background: '#f9f8f5'
title: 'Module 02 — Project Setup, Repo Structure & Execution Sequence'
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
    🟢 Beginner · Module 02 · 60 min
  </div>
  <h1 class="text-5xl font-bold text-slate-900 leading-[1.1] mb-6">
    Project Setup,<br>Repo Structure<br>& Execution Sequence
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    How dbt connects to Snowflake, what the project config controls, core CLI commands, and what actually happens when you run dbt.
  </p>
</div>

<!--
Start with the 4 prep questions from Module 01 — cold, no notes.
1. What does dbt_project.yml configure?
2. Difference between dbt Core and dbt Cloud?
3. Three things dbt does NOT do?
4. Which layer does dbt own at Bloomwell?

Don't move on until all four are correct. Fix any wrong answers now — they'll compound if left.
-->

---

# `profiles.yml` — How dbt Connects to Snowflake

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

```yaml
bloomwell:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: abc123.eu-west-1
      user: thorsten@bloomwellhealth.com
      authenticator: externalbrowser
      role: TRANSFORMER_DEV
      warehouse: COMPUTE_WH_DEV
      database: BLOOMWELL_DEV
      schema: TESTING__dev_thorsten
      threads: 4

    prod:
      type: snowflake
      role: TRANSFORMER_PROD
      warehouse: COMPUTE_WH_PROD
      database: BLOOMWELL
      schema: SILVER
      threads: 8
```

</div>
<div class="flex flex-col gap-3 mt-2">

<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
  <strong>NOT in the repo.</strong> Lives at <code>~/.dbt/profiles.yml</code>. Contains credentials — never commit to git.
</div>

<div class="bg-white border border-slate-200 rounded-lg p-3 text-sm">
  <div class="font-mono text-xs text-slate-400 mb-1">Dev schema rule</div>
  Your dev target writes to <code>TESTING.dev_{yourname}</code>. You cannot write to Silver or Gold from your laptop.
</div>

<div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
  <code class="font-mono">dbt debug</code> — run this first after cloning. Validates your connection before anything else.
</div>

</div>
</div>

<!--
Walk through each key in the YAML live — don't just show the slide.

Key questions to ask mid-explanation:
- "What schema does your dev target write to?" → TESTING.dev_{yourname}
- "Why is profiles.yml not in the repo?" → credentials, personal config per developer

The externalbrowser authenticator means SSO login — Snowflake will open a browser tab. Show this live if possible so participants know what to expect.

Emphasise: Airflow uses the prod target. You as a developer always use dev.
-->

---

# `dbt_project.yml` — The Project Config

```yaml {all|3|5|7-10|all}
name: bloomwell
version: "1.0.0"
profile: bloomwell          # must match the key in profiles.yml

model-paths: ["models"]

models:
  bloomwell:                # ← project namespace — must match name above
    staging:
      +materialized: view
      +tags: ["staging"]
    silver:
      +materialized: table
      +tags: ["silver"]
      +persist_docs:
        relation: true
        columns: true
    gold:
      +materialized: table
      +tags: ["gold"]
      +persist_docs:
        relation: true
        columns: true
```

<div class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
  <strong>Why <code>bloomwell:</code>?</strong> It's a project namespace — scopes these configs to <em>your</em> models only, not to models from installed packages. Must match <code>name: bloomwell</code> at the top. Always include it.
</div>

<!--
Use the line highlights: click through profile link, then model-paths, then the bloomwell: namespace key.

Four things to emphasise:
1. The profile key must match profiles.yml exactly — a mismatch is the #1 setup error.
2. The + prefix means "apply to all models in this folder and subfolders."
3. persist_docs: true is why Power BI and Snowsight show our column descriptions — dbt runs COMMENT ON COLUMN after every build.
4. The bloomwell: namespace: it scopes these configs to your project only. If you install a package (dbt_utils etc.), package models live under their own namespace and won't inherit your configs. Without the namespace, your configs would bleed into package models.

Ask: "Can you skip the bloomwell: namespace?" → Technically yes, but if you ever add a package, your layer configs could apply to package models unexpectedly. Always include it.

Individual models can override any of this with a {{ config() }} block — covered in Module 03.
-->

---

# Core CLI Commands

<div class="mt-4">

| Command | What it does | When to use |
|---|---|---|
| `dbt debug` | Validates connection and config | First after cloning |
| `dbt compile` | Renders Jinja → raw SQL, no execution | Inspecting compiled output |
| `dbt run` | Executes models, no tests | ⚠️ Avoid — use `dbt build` |
| `dbt test` | Runs tests only | Debugging one specific test |
| **`dbt build`** | **Models + tests in DAG order** | **Always. In CI and locally.** |
| `dbt docs generate` | Builds doc site artifact | Before `dbt docs serve` |
| `dbt docs serve` | Serves docs at localhost:8080 | Browsing DAG and column docs |
| `dbt ls` | Lists models matching a selector | Checking what a selector targets |

</div>

<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
  <strong>The most important distinction:</strong> <code>dbt run</code> does NOT run tests. <code>dbt build</code> does. Use <code>dbt build</code>.
</div>

<!--
Don't demo every command. Just walk the table.

The dbt build vs dbt run distinction is critical — it comes up again in Module 06 (Testing) with full explanation. Plant the seed here: "we'll come back to why dbt build is the only acceptable CI command in Module 06."

Selective runs: mention dbt run --select dim_patient+ briefly. The + means "and all downstream models." Selectors get a full module in Intermediate tier — don't go deep here.
-->

---

# The Execution Sequence

**What happens when you run `dbt run` or `dbt build`:**

<div class="mt-4 space-y-3">

<div class="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4">
  <div class="bg-slate-800 text-white text-xs font-mono px-2 py-1 rounded shrink-0">1. PARSE</div>
  <div class="text-sm">Read all <code>.sql</code> and <code>.yml</code> files, validate Jinja syntax<br><span class="text-red-500 text-xs">Fails here: Jinja syntax errors, missing macro definitions</span></div>
</div>

<div class="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4">
  <div class="bg-slate-800 text-white text-xs font-mono px-2 py-1 rounded shrink-0">2. RESOLVE</div>
  <div class="text-sm">Build the DAG — resolve all <code>{{ ref() }}</code> and <code>{{ source() }}</code> calls<br><span class="text-red-500 text-xs">Fails here: circular refs, missing models</span></div>
</div>

<div class="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4">
  <div class="bg-slate-800 text-white text-xs font-mono px-2 py-1 rounded shrink-0">3. COMPILE</div>
  <div class="text-sm">Render Jinja → raw SQL, write to <code>target/compiled/</code><br><span class="text-red-500 text-xs">Fails here: undefined variables, bad config blocks</span></div>
</div>

<div class="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4">
  <div class="bg-slate-800 text-white text-xs font-mono px-2 py-1 rounded shrink-0">4. EXECUTE</div>
  <div class="text-sm">Send compiled SQL to Snowflake<br><span class="text-red-500 text-xs">Fails here: SQL errors, permission errors, type mismatches</span></div>
</div>

<div class="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4">
  <div class="bg-slate-800 text-white text-xs font-mono px-2 py-1 rounded shrink-0">5. REPORT</div>
  <div class="text-sm">Log results, write <code>manifest.json</code> and <code>run_results.json</code><br><span class="text-slate-400 text-xs">Always runs — even failed runs produce a report</span></div>
</div>

</div>

<!--
The key message: when you get an error message, the phase tells you WHERE to look.

"Compilation Error" → your Jinja template is wrong. Check the .sql file, not Snowflake.
"Database Error" → Snowflake rejected the SQL. Open target/compiled/ and read what dbt actually sent.
"Dependency Error" → a ref() points to a model that doesn't exist. Check spelling and file path.

Ask: "At which phase does a Jinja syntax error appear?" → Phase 1 (Parse). This is a prep question for Module 03.

Make sure everyone knows target/compiled/ exists and that it's their best debugging tool. Show it in VS Code briefly.
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 02 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 03</h2>
  <p class="text-slate-500 mb-8">Jinja Basics for dbt</p>
  <div class="space-y-2">
    <div class="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600 block">
      Prep Q1: Where does profiles.yml live — inside the repo or outside it?
    </div>
    <div class="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600 block">
      Prep Q2: What does dbt build do that dbt run does not?
    </div>
    <div class="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600 block">
      Prep Q3: At which phase does a Jinja syntax error appear?
    </div>
  </div>
</div>
