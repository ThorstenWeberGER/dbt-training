# Skill: Humanize Writing

## When to use

Use this skill when asked to:
- Rewrite a document in a more human, conversational voice
- Write new lesson content, exercises, or trainer notes
- Review existing content for tone and style

Trigger phrases: "humanize", "rewrite in a human way", "make this more conversational", "review the tone".

---

## Instructions

Rewrite the target document following every rule below. Change the tone; preserve every technical fact, command, column name, file path, and concept exactly.

### Rules

**Second person throughout.**
Write "you'll learn" and "you can" — not "participants will learn" or "the user can".

**Short sentences.**
If a sentence needs two commas or a semicolon, split it into two sentences.

**Contractions are fine.**
Use it's, you'll, don't, here's, that's. They're normal English, not sloppy writing.

**Active voice.**
"dbt compiles your SQL" not "your SQL is compiled by dbt".

**Why before how.**
Before explaining a concept or command, write one sentence on why it matters. Then explain how.

**Be honest about difficulty.**
Say "this trips people up" or "this looks weird at first" when something genuinely is hard. Don't pretend everything is straightforward.

**No filler.**
Delete:
- "it is important to note that"
- "please be aware"
- "in order to"
- "utilize" (use "use")
- "leverage" (use "use")
- "at this point in time" (use "now")
- "in the event that" (use "if")
- "due to the fact that" (use "because")

**Concrete over abstract.**
Show an example before or alongside the rule, not after. If you're explaining a concept, lead with a real instance of it.

**No multi-paragraph intros.**
Get to the point. Cut any paragraph whose only job is to say what the next paragraph will say.

**Headings and bullets stay.**
Don't flatten structure. Keep all headers, code blocks, tables, and bullet lists. Only the prose changes.

### What not to change

- Code blocks, SQL, YAML, shell commands — unchanged
- Column names, file paths, dbt model names — unchanged
- Technical accuracy of any kind — unchanged
- Table structure (headers, columns, rows) — unchanged
- Speaker notes format in Slidev files (`<!-- -->` comments) — unchanged
- Company name references that are intentional exceptions (e.g. `dbt_training_agenda_bloomwell.md`) — unchanged

---

## Example transformation

**Before:**
> It is important to note that participants will be required to configure their `profiles.yml` file prior to commencing any exercises. This file is utilized by dbt in order to establish a connection to Snowflake.

**After:**
> Before you start the exercises, you need to configure your `profiles.yml`. That's how dbt knows how to connect to Snowflake.

---

## Checklist before finishing

- [ ] No sentences longer than ~25 words
- [ ] No passive voice ("is performed", "will be required", "was created")
- [ ] No filler phrases (see list above)
- [ ] Every "you" check: changed "participants/the user/learners" to "you"
- [ ] Technical facts, commands, paths all intact
