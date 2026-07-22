---
name: session-report
description: Generate an explorable HTML report of Claude Code / Antigravity session usage — tokens, cache efficiency, subagents, skills, and expensive prompts. Use when the user asks about session costs, token usage, or wants to audit AI spending.
---

# Session Report

Produce a self-contained HTML report of Claude Code / Antigravity usage and save it to the current working directory.

## Prerequisites

The analyzer script and HTML template ship with the official `session-report` plugin marketplace entry.
Locate them at:

```
SKILL_DIR = d:\Pax-Automata\.vscode\plugins\marketplaces\claude-plugins-official\plugins\session-report\skills\session-report
```

Both files must exist:

- `<SKILL_DIR>/analyze-sessions.mjs`
- `<SKILL_DIR>/template.html`

## Steps

### 1. Run the analyzer

Default window: last 7 days. Accept a different range if the user specified one (`24h`, `30d`, `all`).

```powershell
# Last 7 days (default)
node "d:\Pax-Automata\.vscode\plugins\marketplaces\claude-plugins-official\plugins\session-report\skills\session-report\analyze-sessions.mjs" --json --since 7d | Out-File -Encoding utf8 "$env:TEMP\session-report.json"

# All time
node "d:\Pax-Automata\.vscode\plugins\marketplaces\claude-plugins-official\plugins\session-report\skills\session-report\analyze-sessions.mjs" --json | Out-File -Encoding utf8 "$env:TEMP\session-report.json"
```

### 2. Read the JSON

Open `$env:TEMP\session-report.json`. Skim these top-level keys:

- `overall` — total tokens, cache stats, cost estimate
- `by_project` — breakdown per project
- `by_subagent_type` — subagent spending
- `by_skill` — which skills consume most tokens
- `cache_breaks` — moments where cache was invalidated
- `top_prompts` — most expensive individual prompts

### 3. Copy the template to output

```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$output = ".\session-report-$timestamp.html"
Copy-Item "d:\Pax-Automata\.vscode\plugins\marketplaces\claude-plugins-official\plugins\session-report\skills\session-report\template.html" $output
```

### 4. Inject data and narrative into the HTML

Edit the output file (preserve the template's JS/CSS — do not rewrite):

**a) JSON data**: Replace the contents of `<script id="report-data" type="application/json">` with the full JSON from step 2.

**b) Anomalies block** — fill `<!-- AGENT: anomalies -->` with 3–5 one-line findings.
Express figures as % of total tokens (`overall.input_tokens.total + overall.output_tokens`).

```html
<div class="take bad">
  <div class="fig">41%</div>
  <div class="txt"><b>cc-monitor</b> consumed 41% of the week across just 3 sessions</div>
</div>
<div class="take good">
  <div class="fig">91%</div>
  <div class="txt">Cache hit rate healthy at <b>91%</b> — no major invalidation events</div>
</div>
<div class="take info">
  <div class="fig">7</div>
  <div class="txt"><b>session-report</b> skill ran 7 times this week</div>
</div>
```

Classes: `.take bad` = red (waste/anomaly), `.take good` = green (healthy), `.take info` = blue (neutral).
Look for: disproportionate project/skill share, cache-hit < 85%, single prompt > 2% of total, subagent averages > 1M tokens/call.

**c) Optimizations block** — fill `<!-- AGENT: optimizations -->` (bottom of page) with 1–4 `<div class="callout">` suggestions tied to specific rows.

### 5. Report the saved file path

Tell the user the full path of the generated HTML file. Do not open it or render it inline.

## Notes

- If the JSON is > 2MB, trim `top_prompts` to 100 entries and `cache_breaks` to 100 before embedding.
- `top_prompts` already includes subagent tokens and rolls task-notification continuations into the originating prompt.
- Keep commentary terse and specific — reference actual project names, numbers, timestamps from the JSON.
- The template handles all interactivity (sorting, expand/collapse, bar charts) — your job is data + narrative.
