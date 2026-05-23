# dbt Training — Session Methodology Guidelines

> How to run each module so concepts actually stick.

---

## Core Learning Loop

Every module follows the same repeating cycle:

```
Concept → Demo → Exercise → Debrief → Recap next session
```

Never skip a phase. The debrief is where the learning consolidates.

---

## 1. Session Structure (per module)

### Opening Recap (10 min)
Start every session — without exception — by revisiting the previous module.

- Ask 2–3 questions out loud, not rhetorical: *"What does `{{ ref() }}` do? Why do we use it instead of a hardcoded table name?"*
- Participants answer from memory, no notes.
- Correct misremembering immediately and briefly — don't let wrong mental models linger.
- This forces active retrieval, which is the single most effective memory technique known.

### Theory Block (15–20 min max)
- Explain the concept with a clear *why* before the *how*.
- Use one concrete, relevant example — never abstract toy data.
- Draw the DAG, the data flow, or the architecture by hand or on a whiteboard. Diagrams beat slides.
- No more than 3 new concepts per theory block. If you have more, split the session.

### Live Demo (10–15 min)
- Code in real time, in the real dbt project (dev environment).
- Narrate every decision out loud: *"I'm using `ref()` here instead of hardcoding because..."*
- Make at least one deliberate mistake and fix it live. Watching debugging is more instructive than watching perfect code.
- Participants don't code during the demo — they watch and ask questions.

### Hands-On Exercise (20–30 min)
- Participants code independently (or in pairs for complex topics).
- The exercise must produce a real output: a model that runs, a test that passes, a DAG that renders.
- Grade by outcome, not syntax: *"Does your model produce the correct rows?"*
- Circulate — don't answer questions immediately. Let participants struggle for 2–3 minutes first. Productive struggle is where learning happens.

### Debrief (10 min)
- Review 2–3 participants' solutions together.
- Ask: *"What would break if...?"* — stress-test the concept.
- Summarise the module in 3 bullet points. Write them down. Participants copy them.

### Homework / Reading (optional, async)
- One focused reading assignment, max 15 minutes.
- One optional challenge exercise for those who want to go deeper.

---

## 2. Interleaving and Spaced Repetition

Don't teach a topic once and move on. Concepts must recur.

| When | What to do |
|---|---|
| Start of every session | Retrieval recap of previous session |
| Every 3rd session | 5-minute review of a concept from 2 sessions ago |
| End of each tier | Full recap exercise covering all modules in that tier |

**Practical rule:** If a concept was important enough to teach, it must appear again within the next two sessions — either in the recap, in the exercise setup, or as a prerequisite to the new topic.

---

## 3. Theory Before Practice — But Not Too Much

Here's a common mistake: 45 minutes of theory, then "now you try it." By minute 30, participants are passive and retention drops sharply.

**The rule:** No theory block longer than 20 minutes before participants touch code.

For complex modules (e.g., incremental models, SCD2), break the theory into two sub-blocks with a mini exercise between them:

```
Theory Part A (15 min) → Mini exercise (10 min) → Theory Part B (15 min) → Full exercise (25 min)
```

---

## 4. Reference Material

Provide reference material *after* the exercise, not before.

Giving it before encourages reading instead of thinking. Providing it after means participants consult it as a reference — which is the correct mental model for how documentation works.

**Each module should have:**

| Material | Format | When to share |
|---|---|---|
| Session summary (3–5 bullet points) | Written in the session | During debrief |
| Official dbt docs link(s) for the topic | URL | After exercise |
| Project convention notes | Internal reference | After exercise |
| Optional deep-dive reading | URL or doc | Async/homework |

**Recommended dbt resources by module tier:**

- 🟢 Beginner: [dbt Learn fundamentals (free)](https://learn.getdbt.com/courses/dbt-fundamentals) — use as supplementary reading, not primary instruction
- 🟡 Intermediate: [dbt docs — Materializations](https://docs.getdbt.com/docs/build/materializations), [Incremental models](https://docs.getdbt.com/docs/build/incremental-models)
- 🔴 Advanced: [dbt docs — Jinja & Macros](https://docs.getdbt.com/docs/build/jinja-macros), [Model contracts](https://docs.getdbt.com/docs/collaborate/govern/model-contracts)

---

## 5. Videos

Use sparingly. Videos are passive — they create the illusion of learning without the work.

**When videos are appropriate:**

- As pre-reading before a session (max 10–15 min video, assigned async)
- For concepts that are hard to explain without animation (e.g., how dbt compiles SQL, DAG traversal)
- Never as a substitute for live demo or exercise

**Recommended:**
- [dbt's official YouTube channel](https://www.youtube.com/@dbt-labs) — short concept videos (3–8 min) are good pre-session primers
- Avoid long conference talks for training purposes — they're too discursive

---

## 6. Exercises — Design Principles

Good exercises are specific, achievable, and produce a verifiable output.

| Principle | What it means in practice |
|---|---|
| **Real data, real project** | Exercises run against the dev environment, not toy datasets |
| **One concept at a time** | Each exercise isolates the concept just taught — no compounding new unknowns |
| **Verifiable output** | "Run `dbt test` and show a green output" is verifiable. "Understand incremental models" is not |
| **Escalating difficulty** | Start with a guided version (fill in the blanks), then a free-build version |
| **Bonus challenge** | Always include one harder optional task for faster participants — keeps pacing manageable |

**Exercise structure template:**

```
Context: [1–2 sentences on what they're building and why it matters]
Task: [Specific, unambiguous instruction]
Success criteria: [Exactly what "done" looks like — command output, row count, test result]
Bonus: [Optional harder extension]
```

---

## 7. Group Size and Format

| Format | Best for |
|---|---|
| 1 trainer : 1–4 participants | Ideal — trainer can circulate and give immediate feedback |
| 1 trainer : 5–8 participants | Workable — use pair programming for exercises |
| Async / self-paced | Only for reference reading and optional challenges — not for core modules |

Avoid async delivery for Tier 1 modules. The concepts are simple, but you need to build the mental model correctly the first time. Misunderstandings at Module 2 compound badly by Module 8.

---

## 8. Pacing Guidelines

| Tier | Sessions | Recommended cadence |
|---|---|---|
| 🟢 Tier 1 (Modules 1–5) | 5 × 1.5 hr | 2 per week — close together so context stays fresh |
| 🟡 Tier 2 (Modules 6–11) | 6 × 1.5–2 hr | 1–2 per week |
| 🔴 Tier 3 (Modules 12–15) | 4 × 1.5–2 hr | 1 per week — these require time to absorb |

**Between sessions:** Assign one small async task (max 20 min) to keep the topic active. Example: *"Before next session, look at one of our existing Bronze models and identify which dbt materialisation it uses and why."*

---

## 9. Signs the Session Is Going Wrong

| Signal | What to do |
|---|---|
| Participants are quiet during exercises | Check in individually — silence is usually confusion, not flow |
| Nobody attempts the bonus task | Pacing is too fast — slow down, the core isn't solid yet |
| Everyone finishes in under 10 min | Exercise is too easy — increase complexity next time |
| Questions are all about syntax | Participants are pattern-matching, not understanding — ask "why" questions |
| The debrief runs out of things to say | The theory block was too abstract — ground it in concrete examples next time |

---

## 10. One Rule Above All

**If a participant can't explain the concept back in their own words, they haven't learned it yet.**

The goal of every session isn't coverage of material — it's the ability to apply the concept independently next week.

When in doubt: do less, go deeper.
