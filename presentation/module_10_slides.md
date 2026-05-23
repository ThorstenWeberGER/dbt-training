---
theme: default
background: '#f9f8f5'
title: 'Module 10 — Slowly Changing Dimensions and Snapshots'
highlighter: shiki
lineNumbers: false
transition: slide-left
fonts:
  sans: 'DM Sans'
  mono: 'JetBrains Mono'
---

<div class="h-full flex flex-col justify-center pl-2">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-6">dbt Training</div>
  <div class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-mono px-3 py-1 rounded-full w-fit mb-6">
    🟡 Working Effectively · Module 10 · 90 min
  </div>
  <h1 class="text-6xl font-bold text-slate-900 leading-[1.05] mb-6">
    Slowly Changing<br>Dimensions &<br>Snapshots
  </h1>
  <p class="text-slate-400 text-sm max-w-sm">
    How to preserve dimension history in dbt — and why we went beyond native snapshots.
  </p>
</div>

<!--
Recap prep questions from Module 09 — cold, no notes:
1. What is a slowly changing dimension? What type does a dbt snapshot implement by default?
2. If a contact's email changes in HubSpot, how would you preserve both the old and new value with history?
3. What columns does a dbt snapshot add to track row history?
4. In dim_contact, contact_key is a hash of hubspot_contact_id. If a contact's email changes, does contact_key change? Why does that matter for snapshot strategy?

Probe question 4 in particular — contact_key does NOT change on email update (it's hashed from the ID only). This stable key design is exactly why SCD2 works correctly: the snapshot can add new rows while the same contact_key appears across all history rows, enabling clean joins from fact tables.
-->

---

# The Problem: History That Disappears

<div class="mt-4 text-slate-700 text-sm mb-4">Contact 42 moves from <strong>Lead</strong> → <strong>Opportunity</strong> on March 15. Your nightly dbt run fires.</div>

<div class="grid grid-cols-2 gap-6 mt-2">

<div>
  <div class="text-xs font-mono text-red-500 mb-2">BEFORE — March 14</div>
  <table class="text-xs w-full border-collapse">
    <thead><tr class="bg-slate-100"><th class="text-left p-2 border border-slate-200">contact_id</th><th class="text-left p-2 border border-slate-200">email</th><th class="text-left p-2 border border-slate-200">pipeline_stage</th></tr></thead>
    <tbody>
      <tr class="bg-white"><td class="p-2 border border-slate-200">42</td><td class="p-2 border border-slate-200">anna@example.com</td><td class="p-2 border border-slate-200 font-semibold text-amber-700">lead</td></tr>
      <tr class="bg-white"><td class="p-2 border border-slate-200">43</td><td class="p-2 border border-slate-200">ben@example.com</td><td class="p-2 border border-slate-200">opportunity</td></tr>
    </tbody>
  </table>
</div>

<div>
  <div class="text-xs font-mono text-red-500 mb-2">AFTER — March 15 (post-run)</div>
  <table class="text-xs w-full border-collapse">
    <thead><tr class="bg-slate-100"><th class="text-left p-2 border border-slate-200">contact_id</th><th class="text-left p-2 border border-slate-200">email</th><th class="text-left p-2 border border-slate-200">pipeline_stage</th></tr></thead>
    <tbody>
      <tr class="bg-white"><td class="p-2 border border-slate-200">42</td><td class="p-2 border border-slate-200">anna@example.com</td><td class="p-2 border border-slate-200 font-semibold text-emerald-700">opportunity</td></tr>
      <tr class="bg-white"><td class="p-2 border border-slate-200">43</td><td class="p-2 border border-slate-200">ben@example.com</td><td class="p-2 border border-slate-200">opportunity</td></tr>
    </tbody>
  </table>
</div>

</div>

<div class="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
  <strong>Stakeholder question:</strong> "How many contacts were in the Lead stage at the end of Q1?"<br>
  <span class="text-red-600 font-mono text-xs mt-1 block">You cannot answer this. The warehouse no longer contains that information.</span>
</div>

<!--
Make this concrete with a business scenario before introducing any syntax.

The damage is invisible until someone asks a historical question. The model ran successfully. No errors. But the data is gone.

Ask the room: "If you could only look at dim_contact, what was contact 42's stage on March 10?" → silence. That's the problem.

The overwrite happens inside the MERGE statement from the incremental model. Nothing wrong with the code — the logic is correct. The problem is architectural: storing only current state in a dimension means the past is always gone.
-->

---

# SCD Type 2: Keep Both Rows

<div class="text-slate-600 text-sm mt-2 mb-5">When a tracked attribute changes, <strong>close the old row</strong> and <strong>insert a new row</strong>. Never overwrite.</div>

<table class="text-xs w-full border-collapse mt-2">
  <thead>
    <tr class="bg-slate-100">
      <th class="text-left p-2 border border-slate-200">contact_id</th>
      <th class="text-left p-2 border border-slate-200">email</th>
      <th class="text-left p-2 border border-slate-200">pipeline_stage</th>
      <th class="text-left p-2 border border-slate-200">valid_from</th>
      <th class="text-left p-2 border border-slate-200">valid_to</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-amber-50">
      <td class="p-2 border border-slate-200">42</td>
      <td class="p-2 border border-slate-200">anna@example.com</td>
      <td class="p-2 border border-slate-200 font-semibold text-amber-700">lead</td>
      <td class="p-2 border border-slate-200 text-slate-500">2024-01-10</td>
      <td class="p-2 border border-slate-200 font-semibold text-red-600">2024-03-15</td>
    </tr>
    <tr class="bg-emerald-50">
      <td class="p-2 border border-slate-200">42</td>
      <td class="p-2 border border-slate-200">anna@example.com</td>
      <td class="p-2 border border-slate-200 font-semibold text-emerald-700">opportunity</td>
      <td class="p-2 border border-slate-200 text-slate-500">2024-03-15</td>
      <td class="p-2 border border-slate-200 font-semibold text-emerald-600">NULL ← current</td>
    </tr>
    <tr class="bg-white">
      <td class="p-2 border border-slate-200">43</td>
      <td class="p-2 border border-slate-200">ben@example.com</td>
      <td class="p-2 border border-slate-200">opportunity</td>
      <td class="p-2 border border-slate-200 text-slate-500">2024-01-10</td>
      <td class="p-2 border border-slate-200 text-slate-400">NULL ← current</td>
    </tr>
  </tbody>
</table>

<div class="mt-5 grid grid-cols-2 gap-4">
  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
    <strong>NULL in valid_to</strong> = this row is current. The contact is in this state right now.
  </div>
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
    <strong>Non-NULL valid_to</strong> = this row is historical. The contact was in this state between the two dates.
  </div>
</div>

<!--
The table is the SCD2 mental model. Two rows for the same contact_id — that's the signature.

Key questions to ask:
- "How many rows does contact 43 have? Why?" → One — nothing has changed for them.
- "How would you get only the current state for all contacts?" → WHERE valid_to IS NULL.
- "How would you get the state of all contacts as of March 10?" → WHERE valid_from <= '2024-03-10' AND (valid_to > '2024-03-10' OR valid_to IS NULL)

Don't rush this. If the table structure isn't clear, the snapshot syntax won't make sense.
-->

---

# dbt Snapshot Syntax

```sql {all|1|3-8|10-16|18|all}
{% snapshot snap_contacts %}

{{
    config(
        target_schema = 'snapshots',
        unique_key    = 'contact_id',
        strategy      = 'timestamp',
        updated_at    = 'updated_at'
    )
}}

SELECT
    contact_id,
    email,
    pipeline_stage,
    updated_at
FROM {{ ref('stg_hubspot__contacts') }}

{% endsnapshot %}
```

<div class="mt-4 grid grid-cols-3 gap-3 text-xs">
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">Lives in</div>
    <code>snapshots/</code> folder — not <code>models/</code>
  </div>
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">Run with</div>
    <code>dbt snapshot</code> — not <code>dbt run</code>
  </div>
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <div class="font-semibold text-slate-700 mb-1">SELECT is</div>
    Plain SQL — dbt manages the SCD2 rows from it
  </div>
</div>

<!--
Use line highlights: click through the snapshot block wrapper, then the config, then the SELECT.

The {% snapshot %} / {% endsnapshot %} is the boundary. Everything inside is plain SQL — the SELECT is what dbt reads each run and compares against the existing snapshot table.

target_schema: in DuckDB the snapshot lands in a 'snapshots' schema. In Snowflake this maps to SILVER_DEV.snapshots__dev_name.

unique_key: the natural key — one contact in the source is one "entity" in the snapshot. Multiple rows per unique_key are allowed in the output (the SCD2 history), but the key identifies which source entity each row belongs to.

Run dbt snapshot live now — show the output message and open the snapshot table in DuckDB.
-->

---

# Snapshot Strategies: `timestamp` vs `check`

<div class="mt-4">

| | `timestamp` | `check` |
|---|---|---|
| **How it detects changes** | Compares `updated_at` column | Hashes listed column values |
| **Speed** | Fast — single column compare | Slower — hashes all `check_cols` rows |
| **Requirement** | Reliable `updated_at` in source | No timestamp requirement |
| **Risk** | Misses changes if `updated_at` not bumped | None — always detects value changes |

</div>

<div class="grid grid-cols-2 gap-4 mt-5">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-500 mb-2">timestamp strategy</div>

```sql
config(
    strategy   = 'timestamp',
    updated_at = 'updated_at'
)
```

</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-500 mb-2">check strategy</div>

```sql
config(
    strategy   = 'check',
    check_cols = ['pipeline_stage',
                  'contact_owner',
                  'email']
)
```

</div>

</div>

<div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
  <strong>For this project:</strong> use <code>timestamp</code>. Lambda always bumps <code>updated_at</code> on every HubSpot write. The timestamp is reliable.
</div>

<!--
The key question: "when would you choose check over timestamp?"

Answer: when you don't control the source system and you can't guarantee updated_at is bumped on every relevant change. For example: a third-party API that only updates updated_at when certain fields change, not all fields. If you're tracking a field that doesn't trigger an updated_at bump, timestamp will miss the change. check always catches it.

check_cols = 'all' is the nuclear option — hash every column. Catches everything but expensive. Usually too broad — you end up versioning rows for column changes you don't care about (like last_activity_date).

For our HubSpot data: timestamp is safe because Lambda controls the write and always updates the timestamp.
-->

---

# Snapshot Metadata Columns

<div class="mt-4">

| Column | What it holds | Meaning of NULL |
|---|---|---|
| `dbt_valid_from` | Timestamp when this row version became active | Never NULL |
| `dbt_valid_to` | Timestamp when this row version was superseded | NULL = **this is the current row** |
| `dbt_scd_id` | Unique identifier for this row version (SHA1 hash) | Never NULL |
| `dbt_updated_at` | The source's `updated_at` at insert time | Never NULL |

</div>

<div class="mt-5 bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-mono text-slate-500 mb-3">Point-in-time query — "What was contact 42's stage on March 10?"</div>

```sql
SELECT contact_id, email, pipeline_stage
FROM snapshots.snap_contacts
WHERE dbt_valid_from  <= '2024-03-10'
  AND (dbt_valid_to    > '2024-03-10' OR dbt_valid_to IS NULL)
```

  <div class="text-xs text-slate-500 mt-2">The <code>OR dbt_valid_to IS NULL</code> is not optional — it includes the current row, which has no end date.</div>
</div>

<!--
The NULL check on dbt_valid_to is the most common mistake trainees make when writing their first point-in-time query.

Without OR dbt_valid_to IS NULL: current rows are excluded entirely. A contact who has never changed stage has only one row with dbt_valid_to = NULL — they disappear from every point-in-time query.

Ask: "If you want only current rows (no history), what's the WHERE clause?" → WHERE dbt_valid_to IS NULL. This is equivalent to querying a normal non-SCD2 dimension.

dbt_scd_id is the row-level unique key. It identifies a specific version of a specific entity. Contact 42 has two dbt_scd_id values — one for the lead period, one for the opportunity period. We'll see why this matters on the next slide.
-->

---

# Two Runs — What the Table Looks Like

<div class="grid grid-cols-2 gap-5 mt-4">

<div>
  <div class="text-xs font-mono text-slate-500 mb-2">After first <code>dbt snapshot</code></div>
  <table class="text-xs w-full border-collapse">
    <thead><tr class="bg-slate-100"><th class="text-left p-1.5 border border-slate-200">contact_id</th><th class="text-left p-1.5 border border-slate-200">stage</th><th class="text-left p-1.5 border border-slate-200">valid_from</th><th class="text-left p-1.5 border border-slate-200">valid_to</th></tr></thead>
    <tbody>
      <tr class="bg-white"><td class="p-1.5 border border-slate-200">1</td><td class="p-1.5 border border-slate-200">lead</td><td class="p-1.5 border border-slate-200 text-slate-400">Jan 10</td><td class="p-1.5 border border-slate-200 text-emerald-600">NULL</td></tr>
      <tr class="bg-white"><td class="p-1.5 border border-slate-200">2</td><td class="p-1.5 border border-slate-200">opportunity</td><td class="p-1.5 border border-slate-200 text-slate-400">Jan 10</td><td class="p-1.5 border border-slate-200 text-emerald-600">NULL</td></tr>
      <tr class="bg-white"><td class="p-1.5 border border-slate-200">3</td><td class="p-1.5 border border-slate-200">lead</td><td class="p-1.5 border border-slate-200 text-slate-400">Jan 10</td><td class="p-1.5 border border-slate-200 text-emerald-600">NULL</td></tr>
    </tbody>
  </table>
  <div class="text-xs text-slate-400 mt-2">3 rows. All current. All valid_to = NULL.</div>
</div>

<div>
  <div class="text-xs font-mono text-slate-500 mb-2">After second run (contact 1 changed stage)</div>
  <table class="text-xs w-full border-collapse">
    <thead><tr class="bg-slate-100"><th class="text-left p-1.5 border border-slate-200">contact_id</th><th class="text-left p-1.5 border border-slate-200">stage</th><th class="text-left p-1.5 border border-slate-200">valid_from</th><th class="text-left p-1.5 border border-slate-200">valid_to</th></tr></thead>
    <tbody>
      <tr class="bg-amber-50"><td class="p-1.5 border border-slate-200">1</td><td class="p-1.5 border border-slate-200 text-amber-700">lead</td><td class="p-1.5 border border-slate-200 text-slate-400">Jan 10</td><td class="p-1.5 border border-slate-200 font-semibold text-red-600">Mar 15</td></tr>
      <tr class="bg-emerald-50"><td class="p-1.5 border border-slate-200">1</td><td class="p-1.5 border border-slate-200 text-emerald-700">opportunity</td><td class="p-1.5 border border-slate-200 text-slate-400">Mar 15</td><td class="p-1.5 border border-slate-200 text-emerald-600">NULL</td></tr>
      <tr class="bg-white"><td class="p-1.5 border border-slate-200">2</td><td class="p-1.5 border border-slate-200">opportunity</td><td class="p-1.5 border border-slate-200 text-slate-400">Jan 10</td><td class="p-1.5 border border-slate-200 text-emerald-600">NULL</td></tr>
      <tr class="bg-white"><td class="p-1.5 border border-slate-200">3</td><td class="p-1.5 border border-slate-200">lead</td><td class="p-1.5 border border-slate-200 text-slate-400">Jan 10</td><td class="p-1.5 border border-slate-200 text-emerald-600">NULL</td></tr>
    </tbody>
  </table>
  <div class="text-xs text-slate-400 mt-2">4 rows. Contact 1 has two. Contacts 2 and 3 unchanged.</div>
</div>

</div>

<div class="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
  dbt closed the old row (set valid_to = Mar 15) and inserted a new current row. Contacts 2 and 3 were not touched — their <code>updated_at</code> didn't change.
</div>

<!--
This is the visual proof that SCD2 is working. Point to the amber row and the green row for contact 1 — same entity, two time-bounded versions.

Ask: "How many rows will this table have after 10 stage changes for contact 1?" → 11 rows (10 historical + 1 current).

Ask: "Which query gives you only the current pipeline stage for all contacts?" → WHERE valid_to IS NULL — returns 3 rows, one per contact.

The table is in DuckDB right now from the live demo. Switch back to the terminal and run both queries to show the answers.
-->

---

# The Surrogate Key Stability Problem

<div class="text-sm text-slate-700 mt-4 mb-4">Native snapshots work correctly. But they have one specific weakness: <strong>surrogate key regeneration on full refresh.</strong></div>

<div class="grid grid-cols-2 gap-5">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="text-xs font-semibold text-slate-600 mb-2">What <code>dbt_scd_id</code> is</div>
  <div class="text-xs text-slate-600 mb-3">SHA1 hash of <code>unique_key + dbt_valid_from</code>. Generated at insert time. Used as FK in downstream fact tables.</div>

```sql
-- fct_deal references the snapshot row
SELECT
    deal_id,
    contact_scd_id,   -- = snap_contacts.dbt_scd_id
    deal_amount
FROM fct_deal
```

</div>

<div class="bg-red-50 border border-red-200 rounded-xl p-4">
  <div class="text-xs font-semibold text-red-700 mb-2">What happens on <code>dbt snapshot --full-refresh</code></div>
  <div class="text-xs text-red-700">1. Snapshot table is dropped and rebuilt from scratch.<br>2. All rows re-inserted with new timestamps.<br>3. <code>dbt_valid_from</code> changes → <code>dbt_scd_id</code> changes.<br>4. Every FK in <code>fct_deal</code> now points to nothing.</div>
</div>

</div>

<div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
  <strong>Result:</strong> A full refresh silently breaks referential integrity across your entire Silver layer. No error. Wrong joins.
</div>

<!--
This slide explains the one reason we replaced native snapshots with a custom approach.

The key sequence:
1. fct_deal was built with contact_scd_id = 'abc123' (the dbt_scd_id from the snapshot).
2. Someone runs dbt snapshot --full-refresh.
3. The snapshot is rebuilt. The row that previously had dbt_scd_id = 'abc123' now has dbt_scd_id = 'xyz789' — because the valid_from timestamp changed (it's now the time of the new full refresh run, not the original insert).
4. fct_deal.contact_scd_id = 'abc123' no longer matches anything in snap_contacts. The join returns NULL.

Ask: "Would dbt error on this?" → No. The model runs fine. The join silently produces NULLs. This is exactly the kind of bug that reaches production undetected.

Ask: "When would you need to full-refresh a snapshot?" → After logic changes affecting which rows to track, after source data corrections, during initial setup on a new environment.
-->

---

# The scd2_merge Pattern: Stable Keys

<div class="text-sm text-slate-600 mt-3 mb-4">The fix: compute the surrogate key from <strong>source data values</strong>, not from insert timestamps.</div>

```sql {all|5-8|9|all}
WITH source AS (
    SELECT
        contact_id,
        email,
        pipeline_stage,
        -- Hash derived from source data — same result on every run, including full refresh
        md5(contact_id || '|' || pipeline_stage) AS contact_scd_key,
        -- Row hash — detects any change in tracked columns
        md5(email || '|' || pipeline_stage)      AS row_hash,
        updated_at
    FROM {{ ref('stg_hubspot__contacts') }}
)
```

<div class="grid grid-cols-2 gap-4 mt-4">
  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
    <strong>contact_scd_key</strong> is derived from contact_id + pipeline_stage. Run it 100 times — same result. Full refresh → same keys. FK references stay valid.
  </div>
  <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
    <strong>row_hash</strong> detects changes. If email or pipeline_stage changes, row_hash changes → a new SCD2 row is inserted. You control which columns trigger versioning.
  </div>
</div>

<!--
Click through the highlights: first the config block, then the contact_scd_key hash, then the row_hash.

The key insight is WHERE the hash is computed: in the source CTE, from data values. Not from timestamps, not from dbt internals — from the actual data.

contact_id = 42 and pipeline_stage = 'opportunity' will always hash to the same value. Whether you run the model today or after a full refresh next year, the key is identical.

Compare to dbt_scd_id: SHA1(contact_id || valid_from_timestamp). The timestamp changes on full refresh → the key changes. Our hash doesn't include the timestamp → the key is stable.

This is an engineering tradeoff: we gave up the automatic dbt-managed SCD machinery in exchange for surrogate key stability. For a data model with downstream FK references, that tradeoff is worthwhile.
-->

---
layout: default
background: '#f9f8f5'
---

# Exercise — Build and Operate a Snapshot (25 min)

<div class="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
  <strong>Goal:</strong> Create a snapshot for HubSpot contacts, observe SCD2 in action by simulating a data change, then answer a historical question using the snapshot table.
</div>

<div class="space-y-3">

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Task 1</span>
    <span class="text-sm font-semibold text-slate-700">Create <code>snapshots/snap_contacts.sql</code></span>
  </div>
  <div class="text-xs text-slate-600">Use <code>timestamp</code> strategy, <code>unique_key = 'contact_id'</code>, <code>updated_at = 'updated_at'</code>, <code>target_schema = 'snapshots'</code>. Track: contact_id, first_name, last_name, email, pipeline_stage, updated_at.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Task 2</span>
    <span class="text-sm font-semibold text-slate-700">Build the initial snapshot</span>
  </div>
  <div class="text-xs text-slate-600">Run <code>dbt snapshot</code>. Verify: row count matches <code>raw_contacts</code>. All <code>dbt_valid_to = NULL</code>.</div>
</div>

<div class="bg-white border border-slate-200 rounded-xl p-4">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Task 3</span>
    <span class="text-sm font-semibold text-slate-700">Simulate a change</span>
  </div>
  <div class="text-xs text-slate-600">Edit <code>seeds/raw_contacts.csv</code> — change contact_id 3's email and bump <code>updated_at</code> by one day. Run <code>dbt seed</code> then <code>dbt snapshot</code>. Verify: contact 3 now has two rows.</div>
</div>

<div class="bg-white border border-amber-200 rounded-xl p-4">
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono">Bonus</span>
    <span class="text-sm font-semibold text-slate-700">Answer a historical question</span>
  </div>
  <div class="text-xs text-slate-600">Write SQL to answer: "What email address did contact_id 3 have on 2024-06-01?" — using only <code>snapshots.snap_contacts</code>.</div>
</div>

</div>

<!--
TRAINER NOTES:

Most common stumbling block: forgetting to run dbt seed BEFORE dbt snapshot in Task 3.
If they run dbt snapshot without seeding first, the CSV change isn't in the staging view yet — the snapshot sees no change.

The correct sequence is always:
1. Edit CSV
2. dbt seed (reload the seed into DuckDB)
3. dbt snapshot (detect changes vs. current snapshot state)

For the bonus: remind them that updated_at dates they use in Task 3 control whether the change appears before or after 2024-06-01. If their bump puts updated_at at 2024-05-11, the change appears BEFORE June 1 — so the query returns the new email. If they use a date after June 1, the query returns the original email.

Both answers are correct — it depends on the date they chose. The goal is the correct WHERE clause, not a specific email value.
-->

---

# Key Takeaways

<div class="mt-6 space-y-4">

<div v-click class="flex gap-4 bg-white border border-slate-200 rounded-xl p-4 items-start">
  <div class="text-2xl mt-0.5">📸</div>
  <div>
    <div class="font-semibold text-slate-800 text-sm mb-1">dbt native snapshots implement SCD2 correctly</div>
    <div class="text-xs text-slate-600">The <code>timestamp</code> strategy detects changes via <code>updated_at</code>. Metadata columns (<code>dbt_valid_from</code>, <code>dbt_valid_to</code>) enable point-in-time queries. For many projects, native snapshots are the right choice.</div>
  </div>
</div>

<div v-click class="flex gap-4 bg-white border border-slate-200 rounded-xl p-4 items-start">
  <div class="text-2xl mt-0.5">⚠️</div>
  <div>
    <div class="font-semibold text-slate-800 text-sm mb-1">Surrogate key stability is the one reason we opted out</div>
    <div class="text-xs text-slate-600"><code>dbt_scd_id</code> regenerates on full refresh because it includes the insert timestamp. When downstream fact tables use it as a foreign key, a full refresh silently breaks all joins. This is a production data quality risk that doesn't surface as an error.</div>
  </div>
</div>

<div v-click class="flex gap-4 bg-white border border-slate-200 rounded-xl p-4 items-start">
  <div class="text-2xl mt-0.5">🔑</div>
  <div>
    <div class="font-semibold text-slate-800 text-sm mb-1">The scd2_merge pattern computes keys from data, not from timestamps</div>
    <div class="text-xs text-slate-600">Hash keys are derived from source data values in the source CTE. Same source data always produces the same key — full refresh safe. You also control which columns trigger versioning via the <code>row_hash</code>.</div>
  </div>
</div>

</div>

<!--
Summarise the module in three points before moving to prep questions.

Ask the room one final question: "If surrogate key stability wasn't a concern — say, you were building a standalone dimension with no FK references — which would you use, native snapshots or scd2_merge?"

There's no wrong answer. Native snapshots are less code, built-in to dbt, and well-documented. The custom pattern gives you stability and explicit control. The right answer depends on the model's role in the data model.

The goal of this module is to understand both options and the tradeoff — not to memorise one approach as "always correct."
-->

---
layout: center
---

<div class="text-center">
  <div class="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">Module 10 Complete</div>
  <h2 class="text-3xl font-bold text-slate-800 mb-2">Next: Module 11</h2>
  <p class="text-slate-500 mb-8">Advanced Testing and Data Contracts</p>
  <div class="space-y-2 text-left max-w-lg mx-auto">
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q1: What does dbt_valid_to = NULL mean in a snapshot table?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q2: When would you choose the check strategy over timestamp?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q3: Why does dbt snapshot --full-refresh break downstream FKs?</div>
    <div class="bg-slate-100 rounded-lg px-4 py-2 text-sm font-mono text-slate-600">Prep Q4: In scd2_merge, where is the surrogate key hash computed and why?</div>
  </div>
</div>
