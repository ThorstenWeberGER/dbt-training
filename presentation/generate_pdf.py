from weasyprint import HTML, CSS

html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
    background: #f9f8f5;
  }

  @page {
    size: 297mm 167mm;
    margin: 0;
  }

  .slide {
    width: 297mm;
    height: 167mm;
    background: #f9f8f5;
    padding: 28pt 36pt;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .slide:last-child { page-break-after: avoid; }

  /* ── Slide 1 ── */
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 16pt;
  }

  .hero-title {
    font-size: 40pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.05;
    margin-bottom: 20pt;
  }

  .tier-row {
    display: flex;
    gap: 10pt;
    margin-bottom: 18pt;
  }

  .tier-badge {
    flex: 1;
    border-radius: 8pt;
    padding: 7pt 10pt;
    text-align: center;
  }
  .tier-badge .name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5pt;
    font-weight: 600;
  }
  .tier-badge .sub {
    font-size: 7pt;
    color: #64748b;
    margin-top: 1pt;
  }

  .t1 { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .t1 .name { color: #15803d; }
  .t2 { background: #fffbeb; border: 1px solid #fde68a; }
  .t2 .name { color: #b45309; }
  .t3 { background: #fff1f2; border: 1px solid #fecdd3; }
  .t3 .name { color: #be123c; }

  .goal {
    font-size: 10pt;
    color: #475569;
    line-height: 1.6;
    max-width: 420pt;
  }
  .goal strong { color: #1e293b; }

  /* ── Slide 2 ── */
  .slide2-header {
    display: flex;
    align-items: baseline;
    gap: 12pt;
    margin-bottom: 14pt;
  }
  .slide2-header h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #0f172a;
  }

  .grid {
    display: flex;
    gap: 10pt;
    flex: 1;
    min-height: 0;
  }

  .col {
    flex: 1;
    background: white;
    border-radius: 10pt;
    padding: 11pt 12pt;
    display: flex;
    flex-direction: column;
  }
  .col-t1 { border: 1.2pt solid #bbf7d0; }
  .col-t2 { border: 1.2pt solid #fde68a; }
  .col-t3 { border: 1.2pt solid #fecdd3; }

  .col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 9pt;
    padding-bottom: 7pt;
    border-bottom: 1pt solid #f1f5f9;
  }
  .col-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7pt;
    font-weight: 600;
  }
  .col-t1 .col-title { color: #15803d; }
  .col-t2 .col-title { color: #b45309; }
  .col-t3 .col-title { color: #be123c; }
  .col-duration {
    font-family: 'JetBrains Mono', monospace;
    font-size: 6.5pt;
    color: #94a3b8;
  }

  .module-list { flex: 1; }
  .module-item {
    display: flex;
    gap: 6pt;
    margin-bottom: 5.5pt;
  }
  .module-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 6.5pt;
    color: #cbd5e1;
    flex-shrink: 0;
    width: 12pt;
  }
  .module-name {
    font-size: 7.5pt;
    color: #334155;
    line-height: 1.35;
  }
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 6.5pt;
    background: #f1f5f9;
    padding: 0.5pt 2pt;
    border-radius: 2pt;
  }

  .col-footer {
    font-size: 6.5pt;
    color: #94a3b8;
    margin-top: 8pt;
    padding-top: 6pt;
    border-top: 1pt solid #f1f5f9;
  }

  .footer-bar {
    background: #1e293b;
    color: white;
    border-radius: 8pt;
    padding: 8pt 14pt;
    margin-top: 10pt;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-bar .left {
    font-size: 8pt;
    font-weight: 500;
  }
  .footer-bar .right {
    font-family: 'JetBrains Mono', monospace;
    font-size: 6.5pt;
    color: #94a3b8;
  }
</style>
</head>
<body>

<!-- ═══════════ SLIDE 1 — Title ═══════════ -->
<div class="slide">
  <div class="eyebrow">dbt Training · Course Overview</div>

  <div class="hero-title">
    What you'll learn —<br>and why it matters
  </div>

  <div class="tier-row">
    <div class="tier-badge t1">
      <div class="name">🟢 Tier 1 — Foundations</div>
      <div class="sub">~7 h · Modules 1–6</div>
    </div>
    <div class="tier-badge t2">
      <div class="name">🟡 Tier 2 — Working Effectively</div>
      <div class="sub">~6 h · Modules 7–11</div>
    </div>
    <div class="tier-badge t3">
      <div class="name">🔴 Tier 3 — Production &amp; Advanced</div>
      <div class="sub">~6 h · Modules 12–16</div>
    </div>
  </div>

  <p class="goal">
    16 modules · ~19 hours · dbt Core + Snowflake.<br>
    By the end you can <strong>read, write, test, and maintain</strong> dbt models
    confidently in our Snowflake stack.
  </p>
</div>

<!-- ═══════════ SLIDE 2 — Course Map ═══════════ -->
<div class="slide">
  <div class="slide2-header">
    <h1>Course Map</h1>
  </div>

  <div class="grid">

    <div class="col col-t1">
      <div class="col-header">
        <span class="col-title">🟢 Tier 1 — Foundations</span>
        <span class="col-duration">~7 h</span>
      </div>
      <div class="module-list">
        <div class="module-item"><span class="module-num">01</span><span class="module-name">Why dbt? Context and mental model</span></div>
        <div class="module-item"><span class="module-num">02</span><span class="module-name">Local setup: <code>profiles.yml</code>, project init, repo structure</span></div>
        <div class="module-item"><span class="module-num">03</span><span class="module-name">The dbt execution sequence</span></div>
        <div class="module-item"><span class="module-num">04</span><span class="module-name">Sources and the medallion architecture</span></div>
        <div class="module-item"><span class="module-num">05</span><span class="module-name">Testing data quality</span></div>
        <div class="module-item"><span class="module-num">06</span><span class="module-name">Documentation</span></div>
      </div>
      <div class="col-footer">Full lesson plans + exercises</div>
    </div>

    <div class="col col-t2">
      <div class="col-header">
        <span class="col-title">🟡 Tier 2 — Working Effectively</span>
        <span class="col-duration">~6 h</span>
      </div>
      <div class="module-list">
        <div class="module-item"><span class="module-num">07</span><span class="module-name">Materializations in depth</span></div>
        <div class="module-item"><span class="module-num">08</span><span class="module-name">Seeds and variables</span></div>
        <div class="module-item"><span class="module-num">09</span><span class="module-name">Jinja and macros</span></div>
        <div class="module-item"><span class="module-num">10</span><span class="module-name">Slowly changing dimensions and snapshots</span></div>
        <div class="module-item"><span class="module-num">11</span><span class="module-name">Selectors, tags, and running subsets</span></div>
      </div>
      <div class="col-footer">Slides + hands-on practice</div>
    </div>

    <div class="col col-t3">
      <div class="col-header">
        <span class="col-title">🔴 Tier 3 — Production &amp; Advanced</span>
        <span class="col-duration">~6 h</span>
      </div>
      <div class="module-list">
        <div class="module-item"><span class="module-num">12</span><span class="module-name">CI/CD and slim CI</span></div>
        <div class="module-item"><span class="module-num">13</span><span class="module-name">Advanced testing patterns</span></div>
        <div class="module-item"><span class="module-num">14</span><span class="module-name">Incremental patterns for large tables</span></div>
        <div class="module-item"><span class="module-num">15</span><span class="module-name">Custom macros and <code>scd2_merge</code> deep dive</span></div>
        <div class="module-item"><span class="module-num">16</span><span class="module-name">Governance, contracts, and access</span></div>
      </div>
      <div class="col-footer">Planned — builds on Tier 2</div>
    </div>

  </div>

  <div class="footer-bar">
    <span class="left">Start at Tier 1 and work in order. Each module builds on the previous one.</span>
    <span class="right">Not everyone needs Tier 3 — see the agenda for role-based paths.</span>
  </div>
</div>

</body>
</html>"""

HTML(string=html).write_pdf(
    "course_overview_2slides.pdf",
    stylesheets=[CSS(string="@page { margin: 0; }")]
)
print("PDF written: course_overview_2slides.pdf")
