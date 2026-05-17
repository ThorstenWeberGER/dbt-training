import { useState } from "react";

// ── Design tokens — light theme ───────────────────────────────────────────────
const BG       = "#F8F9FC";
const SURFACE  = "#FFFFFF";
const BORDER   = "#E4E8F0";
const BORDER2  = "#CBD5E1";

const T1 = "#0F172A";
const T2 = "#334155";
const T3 = "#64748B";
const T4 = "#94A3B8";

const A1 = "#0EA5E9";
const A2 = "#F97316";
const A3 = "#8B5CF6";
const A4 = "#10B981";
const A5 = "#EF4444";

const slides = [
  { id: "concept-1", section: "concept", title: "Quality vs. Validation" },
  { id: "concept-2", section: "concept", title: "Two Failure Surfaces" },
  { id: "concept-3", section: "concept", title: "Where Problems Originate" },
  { id: "tools-1",   section: "tools",   title: "Contracts" },
  { id: "tools-2",   section: "tools",   title: "Test Types" },
  { id: "tools-3",   section: "tools",   title: "Tests in Practice" },
  { id: "tools-4",   section: "tools",   title: "Post-Hooks" },
  { id: "tools-5",   section: "tools",   title: "All Three Together" },
];

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "14", color,
      border: `1px solid ${color}30`,
      borderRadius: 4, padding: "2px 9px",
      fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
      textTransform: "uppercase", fontFamily: "monospace", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function SlideWrapper({ children, active }) {
  return (
    <div style={{
      display: active ? "flex" : "none",
      flexDirection: "column", height: "100%",
      padding: "28px 44px", boxSizing: "border-box",
      gap: 16, overflowY: "auto",
    }}>{children}</div>
  );
}

function Heading({ label, color = A1, children }) {
  return (
    <div style={{ marginBottom: 2 }}>
      {label && <div style={{ color, fontFamily: "monospace", fontSize: 10, letterSpacing: 2, marginBottom: 5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>}
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T1, letterSpacing: -0.5, lineHeight: 1.2 }}>{children}</h2>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: BORDER, margin: "2px 0" }} />;
}

function Row({ children, gap = 14 }) {
  return <div style={{ display: "flex", gap, flex: 1, minHeight: 0 }}>{children}</div>;
}

function Card({ title, accent = A1, children, flex = 1 }) {
  return (
    <div style={{
      background: SURFACE, border: `1px solid ${BORDER}`,
      borderTop: `3px solid ${accent}`, borderRadius: 8,
      padding: "16px 18px", flex,
      display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
    }}>
      {title && <div style={{ color: accent, fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>{title}</div>}
      {children}
    </div>
  );
}

function Item({ icon, label, sub, color = T3 }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ color, fontSize: 13, marginTop: 1, minWidth: 16, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ color: T2, fontSize: 12, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ color: T3, fontSize: 11, marginTop: 1, lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Tag({ children, color = A1 }) {
  return (
    <span style={{
      background: color + "12", color, border: `1px solid ${color}28`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
    }}>{children}</span>
  );
}

function Code({ children, color = A1 }) {
  return (
    <code style={{
      background: "#F1F5F9", color, fontFamily: "monospace",
      fontSize: 11, padding: "1px 7px", borderRadius: 4, border: `1px solid ${BORDER}`,
    }}>{children}</code>
  );
}

function ErrorBox({ children }) {
  return (
    <div style={{
      background: "#FFF5F5", border: `1px solid ${A5}30`,
      borderLeft: `3px solid ${A5}`, borderRadius: 6,
      padding: "8px 12px", fontFamily: "monospace",
      fontSize: 11, color: A5, lineHeight: 1.7,
    }}>{children}</div>
  );
}

function Timeline({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 26 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, marginTop: 12, flexShrink: 0, boxShadow: `0 0 0 3px ${item.color}20` }} />
            {i < items.length - 1 && <div style={{ flex: 1, width: 1, background: BORDER, marginTop: 3 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: i < items.length - 1 ? 12 : 0, paddingLeft: 8, paddingTop: 8 }}>
            <div style={{ color: item.color, fontSize: 9, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 1 }}>{item.phase}</div>
            <div style={{ color: T1, fontSize: 12, fontWeight: 700 }}>{item.label}</div>
            {item.sub && <div style={{ color: T3, fontSize: 11, marginTop: 1 }}>{item.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionPill({ label, color }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: color + "10", border: `1px solid ${color}25`, borderRadius: 20, padding: "3px 10px" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      <span style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

// ── Slides ────────────────────────────────────────────────────────────────────

function Slide1({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="Concept 1 of 3" color={A1}>Data Quality vs. Data Validation</Heading>
      <Divider />
      <Row>
        <Card title="Data Quality" accent={A1}>
          <div style={{ color: T2, fontSize: 12, lineHeight: 1.7 }}>A <span style={{ color: A1, fontWeight: 700 }}>continuous property</span> — how fit the data is for its purpose. You measure, monitor, and track it over time.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[["Completeness","Are all expected records present?"],["Accuracy","Does the value reflect reality?"],["Consistency","Same fact, same meaning across models?"],["Timeliness","Is the data fresh enough to act on?"],["Uniqueness","Is there duplication distorting metrics?"]].map(([d,e]) => (
              <div key={d} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ color: A1, fontWeight: 700, fontSize: 12, minWidth: 96 }}>{d}</span>
                <span style={{ color: T3, fontSize: 11 }}>{e}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Data Validation" accent={A2}>
          <div style={{ color: T2, fontSize: 12, lineHeight: 1.7 }}>A <span style={{ color: A2, fontWeight: 700 }}>point-in-time gate</span> — does this data conform to a declared rule right now? Binary: pass or fail.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[["Structural","Is this column present with the right type?"],["Null check","Is this value not null?"],["Uniqueness","Is this key not duplicated?"],["Referential","Does this FK exist in the referenced table?"],["Domain","Is this value in the allowed set?"]].map(([d,e]) => (
              <div key={d} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ color: A2, fontWeight: 700, fontSize: 12, minWidth: 96 }}>{d}</span>
                <span style={{ color: T3, fontSize: 11 }}>{e}</span>
              </div>
            ))}
          </div>
        </Card>
      </Row>
      <Card accent={A3} title="The Gap Between Them">
        <div style={{ color: T2, fontSize: 12, lineHeight: 1.7 }}>
          You can have <span style={{ color: T1, fontWeight: 700 }}>passing validation and poor data quality</span> — every row passes <Code>not_null</Code>, but 40% of records have <Code color={A2}>created_at = 1970-01-01</Code> due to a bad default. The rule passes. The data is useless. Validation is the <span style={{ color: A3, fontWeight: 600 }}>tool</span>. Quality is the <span style={{ color: A3, fontWeight: 600 }}>goal</span>.
        </div>
      </Card>
    </SlideWrapper>
  );
}

function Slide2({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="Concept 2 of 3" color={A1}>Two Failure Surfaces — Independent, Both Real</Heading>
      <Divider />
      <Row gap={20}>
        <Card title="Structural Failure" accent={A2}>
          <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>The <span style={{ color: A2, fontWeight: 700 }}>shape</span> of the model is wrong — regardless of what values are inside it.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["A column disappears from SELECT","Type changes: TIMESTAMP_NTZ → TIMESTAMP_LTZ","A HubSpot field is renamed upstream","A cast is silently removed in a refactor"].map(s => <Item key={s} icon="▸" label={s} color={A2} />)}
          </div>
          <div style={{ marginTop: 4 }}><Tag color={A2}>Caught by: Contracts</Tag></div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4, minWidth: 36 }}>
          <div style={{ color: BORDER2, fontSize: 18 }}>⟷</div>
          <div style={{ color: T4, fontSize: 10, fontFamily: "monospace", textAlign: "center", lineHeight: 1.7 }}>neither<br/>replaces<br/>the other</div>
        </div>
        <Card title="Data Quality Failure" accent={A4}>
          <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>The <span style={{ color: A4, fontWeight: 700 }}>values</span> inside the model are wrong — even though the structure is correct.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Duplicate surrogate keys from a merge bug","FK references a deleted dimension record","Wrong SLA bucket from bad CASE WHEN logic","SCD2 has two current rows for the same contact"].map(s => <Item key={s} icon="▸" label={s} color={A4} />)}
          </div>
          <div style={{ marginTop: 4 }}><Tag color={A4}>Caught by: Tests</Tag></div>
        </Card>
      </Row>
      <Card accent={A3}>
        <div style={{ display: "flex" }}>
          {[
            { a:"Perfect structure", b:"+ terrible data", c:"contracts pass, tests fail", ca:A2 },
            { a:"Correct data",      b:"+ broken schema", c:"tests pass, contracts fail", ca:A2 },
            { a:"Both correct",      b:"= trustworthy model", c:"all checks pass ✓",     ca:A4 },
          ].map(({ a, b, c, ca }, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "6px 12px", borderRight: i < 2 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ color: T3, fontSize: 11, marginBottom: 2 }}>{a}</div>
              <div style={{ color: ca, fontSize: 12, fontWeight: 700 }}>{b}</div>
              <div style={{ color: T4, fontSize: 10, marginTop: 3, fontFamily: "monospace" }}>{c}</div>
            </div>
          ))}
        </div>
      </Card>
    </SlideWrapper>
  );
}

function Slide3({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="Concept 3 of 3" color={A1}>Where Problems Originate</Heading>
      <Divider />
      <Row>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card title="Origin 1 — Upstream API" accent={A2}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>HubSpot renames a property. Bronze Lambda silently picks up the new name. Silver still references the old name.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Tag color={A2}>column disappears</Tag><Tag color={A2}>type changes</Tag></div>
          </Card>
          <Card title="Origin 2 — Inside dbt" accent={A3}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>Developer refactors a CTE, removes a cast, or accidentally drops a column from the final SELECT.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Tag color={A3}>type cast removed</Tag><Tag color={A3}>column dropped</Tag></div>
          </Card>
          <Card title="Origin 3 — Logic / Data" accent={A4}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>SCD2 merge logic has a bug. A CASE WHEN produces wrong buckets. A dim record deleted leaving orphaned FKs.</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Tag color={A4}>bad values</Tag><Tag color={A4}>duplicates</Tag><Tag color={A4}>orphaned FKs</Tag></div>
          </Card>
        </div>
        <Card title="Which Tool Catches What" accent={A1} flex={1.4}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { origin: "HubSpot field rename",        tool: "Contract",             color: A2  },
              { origin: "Bronze Lambda drops column",  tool: "Contract",             color: A2  },
              { origin: "Column dropped in refactor",  tool: "Contract",             color: A3  },
              { origin: "Type cast changed",           tool: "Contract",             color: A3  },
              { origin: "Duplicate surrogate keys",    tool: "Test: unique",         color: A4  },
              { origin: "NULL in required column",     tool: "Test: not_null",       color: A4  },
              { origin: "Orphaned FK",                 tool: "Test: relationships",  color: A4  },
              { origin: "Wrong CASE WHEN logic",       tool: "Test: singular",       color: A4  },
              { origin: "Two current SCD2 rows",       tool: "Test: singular",       color: A4  },
              { origin: "Value passes rule but wrong", tool: "Not caught — monitoring gap", color: T4 },
            ].map(({ origin, tool, color }) => (
              <div key={origin} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 9px", borderRadius: 5, background: color + "08", border: `1px solid ${color}20` }}>
                <span style={{ color: T2, fontSize: 11 }}>{origin}</span>
                <span style={{ color, fontSize: 10, fontFamily: "monospace", fontWeight: 700, minWidth: 130, textAlign: "right" }}>{tool}</span>
              </div>
            ))}
          </div>
        </Card>
      </Row>
    </SlideWrapper>
  );
}

function Slide4({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="dbt Tools 1 of 5" color={A2}>Contracts — Structural Validation at Compile Time</Heading>
      <Divider />
      <Row>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card title="Execution Timeline" accent={A2}>
            <Timeline items={[
              { phase: "dbt run → compile",    color: A2, label: "Contract fires here",         sub: "Before any row is written to Snowflake" },
              { phase: "fail fast",            color: A5, label: "Run blocked immediately",      sub: "Downstream models never execute" },
              { phase: "or pass",              color: A4, label: "Model materializes normally",  sub: "Post-hooks fire, data written" },
            ]} />
          </Card>
          <Card title="Catches" accent={A4}>
            <Item icon="✓" label="Column missing from SELECT" color={A4} />
            <Item icon="✓" label="Wrong type — TIMESTAMP_LTZ vs NTZ" color={A4} />
            <Item icon="✓" label="not_null column receiving NULLs" color={A4} />
          </Card>
          <Card title="Does Not Catch" accent={T4}>
            <Item icon="✗" label="Duplicate values" color={T4} />
            <Item icon="✗" label="Wrong data values or logic errors" color={T4} />
            <Item icon="✗" label="FK integrity violations" color={T4} />
          </Card>
        </div>
        <div style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card title="Example — Type Problem Caught" accent={A2}>
            <div style={{ color: T3, fontSize: 11, marginBottom: 2 }}>schema.yml declaration</div>
            <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: T2, lineHeight: 1.9, border: `1px solid ${BORDER}` }}>
              <span style={{ color: T3 }}>- name: </span><span style={{ color: A1 }}>created_at</span><br />
              <span style={{ color: T3 }}>{"  "}data_type: </span><span style={{ color: A2 }}>timestamp_ntz</span><br />
              <span style={{ color: T3 }}>{"  "}constraints:</span><br />
              <span style={{ color: T3 }}>{"    "}- type: </span><span style={{ color: A3 }}>not_null</span>
            </div>
            <div style={{ color: T3, fontSize: 11 }}>model returns timestamp_ltz → compile fails</div>
            <ErrorBox>Error: column "created_at"<br />expected TIMESTAMP_NTZ<br />but found TIMESTAMP_LTZ</ErrorBox>
          </Card>
          <Card title="Snowflake PK + RELY" accent={A3}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>Contract <Code>primary_key</Code> generates real Snowflake DDL. Add <Code color={A3}>expression: "rely"</Code> to enable <span style={{ color: A3, fontWeight: 600 }}>query optimizer join elimination</span> and <span style={{ color: A3, fontWeight: 600 }}>Cortex AI schema awareness</span>.</div>
          </Card>
          <Card title="Toggle On/Off" accent={A4}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>Single-line toggle per model. Safe to disable — model runs normally. Enable only when <span style={{ color: A2, fontWeight: 600 }}>schema stable 60+ days</span>. Add types first, <Code color={A5}>not_null</Code> constraints after backfill.</div>
          </Card>
        </div>
      </Row>
    </SlideWrapper>
  );
}

function Slide5({ active }) {
  const [tab, setTab] = useState(0);
  const tabs = ["Built-in", "Packages", "Singular", "Generic (macro)", "Unit Tests"];
  const tabColors = [A1, A3, A4, A4, A2];

  const content = [
    {
      subtitle: "Shipped with dbt Core — zero setup required",
      color: A1,
      items: [
        { test: "unique", env: "prod", when: "Every surrogate key — Silver and Gold. Always error.", why: "A duplicate PK means two rows represent the same entity. Downstream aggregations double-count silently.", yaml: "tests:\n  - unique" },
        { test: "not_null", env: "prod", when: "Every surrogate key, every FK, every business-critical column.", why: "A NULL in a PK or FK breaks joins silently. NULLs in measure columns produce blank Power BI visuals.", yaml: "tests:\n  - not_null" },
        { test: "accepted_values", env: "prod", when: "Stable status/type enums. error if frozen, warn if evolving.", why: "Catches new enum values introduced by HubSpot before they silently flow into reports.", yaml: "tests:\n  - accepted_values:\n      values: ['open','closed']" },
        { test: "relationships", env: "prod", when: "Every FK column in Silver and Gold. Always error.", why: "An orphaned FK produces invisible NULLs in star schema joins downstream.", yaml: "tests:\n  - relationships:\n      to: ref('dim_owner')\n      field: owner_key" },
      ],
    },
    {
      subtitle: "dbt-utils, dbt-expectations — install via packages.yml",
      color: A3,
      items: [
        { test: "dbt_utils.expression_is_true", env: "prod", when: "Cross-column business rules — e.g. resolved_at > created_at.", why: "Built-in tests can't compare two columns. Fills the gap without a separate SQL file.", yaml: "- dbt_utils.expression_is_true:\n    expression: \"resolved_at > created_at\"" },
        { test: "dbt_utils.unique_combination_of_columns", env: "prod", when: "Composite PKs — e.g. fact tables with (ticket_id, date_key) grain.", why: "Built-in unique only works on single columns. Composite uniqueness requires this.", yaml: "- dbt_utils.unique_combination_of_columns:\n    combination_of_columns:\n      - ticket_id\n      - date_key" },
        { test: "expect_column_values_to_be_between", env: "prod", when: "Numeric sanity checks — e.g. SLA days between 0 and 730.", why: "Catches calculation overflows or wildly wrong outputs from date arithmetic.", yaml: "- expect_column_values_to_be_between:\n    min_value: 0\n    max_value: 730" },
        { test: "expect_table_row_count_to_be_between", env: "prod", when: "Fact tables — protect against merge bugs deleting all rows.", why: "A merge bug can silently empty a fact table. Row count lower bound catches it before Power BI loads.", yaml: "- expect_table_row_count_to_be_between:\n    min_value: 1000" },
      ],
    },
    {
      subtitle: "Custom SQL files in /tests — return rows = failure",
      color: A4,
      items: [
        { test: "One current SCD2 row per business key", env: "prod", when: "Every SCD2 dim table — dim_contact, dim_pipeline, dim_owner.", why: "A merge bug can create two is_current = true rows for the same HubSpot ID. Downstream always picks the wrong one.", yaml: "SELECT hubspot_id, COUNT(*) cnt\nFROM {{ ref('dim_contact') }}\nWHERE is_current = true\nGROUP BY 1 HAVING cnt > 1" },
        { test: "No future timestamps", env: "prod", when: "Any model with created_at or event timestamps.", why: "HubSpot date parsing bugs can produce timestamps in 2099. Silently breaks time intelligence in Power BI.", yaml: "SELECT *\nFROM {{ ref('fct_cs_ticket') }}\nWHERE created_at > CURRENT_TIMESTAMP()" },
        { test: "Referential completeness with tolerance", env: "prod", when: "When relationships test is too strict — need warn not error on FKs.", why: "More flexible than built-in relationships. Can add WHERE filters, thresholds, or percentage-based tolerance.", yaml: "SELECT t.owner_key\nFROM {{ ref('fct_cs_ticket') }} t\nLEFT JOIN {{ ref('dim_owner') }} d\n  ON t.owner_key = d.owner_key\nWHERE d.owner_key IS NULL" },
      ],
    },
    {
      subtitle: "Reusable test logic in /macros — used like built-in tests in YAML",
      color: A4,
      items: [
        { test: "not_null_where", env: "prod", when: "not_null only for current SCD2 rows, not historical ones.", why: "Built-in not_null checks all rows. Historical SCD2 rows may legitimately have NULLs. Adds a WHERE filter.", yaml: "{% macro test_not_null_where(model, column_name, where) %}\n  SELECT * FROM {{ model }}\n  WHERE {{ column_name }} IS NULL\n  AND {{ where }}\n{% endmacro %}" },
        { test: "at_least_n_rows", env: "prod", when: "Reusable row count floor across multiple fact tables.", why: "Same logic as the singular row count test but reusable in YAML without copy-pasting SQL.", yaml: "# schema.yml:\ntests:\n  - at_least_n_rows:\n      n: 500" },
        { test: "no_nulls_in_columns (dbt_utils)", env: "prod", when: "Bulk not_null across many columns at once.", why: "Reduces YAML verbosity when enforcing not_null on 10+ columns. One test, one config.", yaml: "tests:\n  - dbt_utils.no_nulls_in_columns" },
      ],
    },
    {
      subtitle: "dbt Core 1.8+ — test SQL logic with mock input/expected output",
      color: A2,
      items: [
        { test: "What a unit test is", env: "dev", when: "Test the transformation logic of a model in isolation — no real data needed.", why: "You define mock input rows and expected output rows. dbt runs model SQL against your mocks and compares. Catches logic bugs before prod data is involved.", yaml: "unit_tests:\n  - name: test_sla_bucket_logic\n    model: fct_cs_ticket\n    given:\n      - input: ref('dim_sla_status')\n        rows:\n          - {sla_days: 3}\n    expect:\n      rows:\n        - {sla_bucket: 'on_time'}" },
        { test: "When to write unit tests", env: "dev", when: "Complex CASE/WHEN. SLA bucketing. Date spine logic. Calculation groups.", why: "Only write when a specific logic bug has already occurred, or the logic is complex enough that you can't reason about correctness manually.", yaml: "# Good candidate — multi-condition SLA bucket:\n# CASE\n#   WHEN days <= 1 THEN 'same_day'\n#   WHEN days <= 3 THEN 'on_time'\n#   ELSE 'breached'\n# END" },
        { test: "Prod vs Dev", env: "dev", when: "Unit tests run in dev/CI — not in production dbt test runs.", why: "Unit tests use mock data, not real prod data. They test logic correctness at build time. Running them in prod is unnecessary — the real data tests cover prod.", yaml: "# Run in CI:\ndbt test --select fct_cs_ticket\n\n# Exclude in prod job:\n# configure in dbt_project.yml\n# or per-environment job settings" },
      ],
    },
  ];

  const c = content[tab];

  return (
    <SlideWrapper active={active}>
      <Heading label="dbt Tools 2 of 5" color={A4}>dbt Test Types — What Exists and When to Use Each</Heading>
      <Divider />
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}` }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "7px 14px", fontSize: 12,
            fontWeight: tab === i ? 700 : 400,
            color: tab === i ? tabColors[i] : T3,
            borderBottom: tab === i ? `2px solid ${tabColors[i]}` : "2px solid transparent",
            transition: "all 0.15s", marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T1 }}>{tabs[tab]}</div>
          <div style={{ color: T3, fontSize: 11, marginTop: 1 }}>{c.subtitle}</div>
        </div>
        <SectionPill label={tab === 4 ? "Dev / CI only" : "Production"} color={tab === 4 ? A2 : A4} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
        {c.items.map((item, i) => (
          <div key={i} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${c.color}`, borderRadius: 7, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <Code color={c.color}>{item.test}</Code>
              <Badge color={item.env === "dev" ? A2 : A4}>{item.env === "dev" ? "Dev/CI" : "Prod"}</Badge>
            </div>
            <div style={{ color: T2, fontSize: 11, lineHeight: 1.6 }}><span style={{ color: T1, fontWeight: 600 }}>When: </span>{item.when}</div>
            <div style={{ color: T3, fontSize: 11, lineHeight: 1.6 }}><span style={{ color: T2, fontWeight: 600 }}>Why: </span>{item.why}</div>
            <div style={{ background: "#F8FAFC", borderRadius: 5, padding: "7px 10px", fontFamily: "monospace", fontSize: 10, color: T3, lineHeight: 1.7, border: `1px solid ${BORDER}`, whiteSpace: "pre", overflowX: "auto", marginTop: "auto" }}>{item.yaml}</div>
          </div>
        ))}
      </div>
    </SlideWrapper>
  );
}

function Slide6({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="dbt Tools 3 of 5" color={A4}>Tests in Practice — Layers, Severity, Net-New</Heading>
      <Divider />
      <Row>
        <Card title="By Layer" accent={A4}>
          {[
            { layer: "Bronze", color: "#B45309", bg: "#FFFBEB", tests: ["Source freshness — warn 6h, error 24h", "not_null on PK only", "No uniqueness — duplicates expected in raw"] },
            { layer: "Silver", color: A3,        bg: "#F5F3FF", tests: ["unique + not_null on every surrogate key → error", "relationships on every FK → error", "accepted_values on stable enums", "SCD2: one current row per business key (singular)"] },
            { layer: "Gold",   color: A1,        bg: "#F0F9FF", tests: ["unique + not_null on PK → error", "not_null on business-critical measure columns", "Row count lower bound on fact tables", "Net-new only — don't repeat Silver tests"] },
          ].map(({ layer, color, bg, tests }) => (
            <div key={layer} style={{ background: bg, border: `1px solid ${color}20`, borderRadius: 6, padding: "9px 12px", marginBottom: 4 }}>
              <div style={{ color, fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{layer}</div>
              {tests.map(t => (
                <div key={t} style={{ display: "flex", gap: 5, alignItems: "baseline", marginBottom: 2 }}>
                  <span style={{ color, fontSize: 10, flexShrink: 0 }}>▸</span>
                  <span style={{ color: T2, fontSize: 11 }}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
        <div style={{ flex: 1.3, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card title="Severity Guide" accent={A2}>
            {[
              { sev: "error", color: A5, items: ["PK unique + not_null","FK relationships","Business-critical not_null in Gold","accepted_values on frozen enums"] },
              { sev: "warn", color: "#F59E0B", items: ["accepted_values on evolving enums","Optional/descriptive columns","Source freshness < 6h","Row count anomaly (warn_if threshold)"] },
            ].map(({ sev, color, items }) => (
              <div key={sev} style={{ background: color + "0A", border: `1px solid ${color}22`, borderRadius: 6, padding: "8px 10px", marginBottom: 4 }}>
                <Badge color={color}>{sev}</Badge>
                <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
                  {items.map(i => <div key={i} style={{ color: T2, fontSize: 11 }}>— {i}</div>)}
                </div>
              </div>
            ))}
          </Card>
          <Card title="Net-New Principle" accent={A1}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6, marginBottom: 6 }}>Only test what is <span style={{ color: T1, fontWeight: 700 }}>new or transformed</span> in the current layer. Don't repeat tests on unchanged pass-through columns.</div>
            {[
              { bg: "#F0FDF4", bc: A4, label: "✓ Silver", text: "tests contact_key unique/not_null → Gold skips it — unchanged", color: A4 },
              { bg: "#FFF7ED", bc: A2, label: "✓ Gold", text: "derives sla_bucket via CASE WHEN → new surface, test here", color: A2 },
              { bg: "#FFF7ED", bc: A2, label: "Exception:", text: "Gold adds LEFT JOIN or COALESCE → new failure surface, re-test", color: A2 },
            ].map(({ bg, bc, label, text, color }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${bc}25`, borderRadius: 5, padding: "6px 10px", fontSize: 11, color: T2, marginBottom: 4 }}>
                <span style={{ color, fontWeight: 700 }}>{label} </span>{text}
              </div>
            ))}
          </Card>
        </div>
      </Row>
    </SlideWrapper>
  );
}

function Slide7({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="dbt Tools 4 of 5" color={A3}>Post-Hooks — Snowflake Side Effects</Heading>
      <Divider />
      <Row>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card title="When Post-Hooks Fire" accent={A3}>
            <Timeline items={[
              { phase: "compile",      color: T4, label: "Contract fires (if enforced)", sub: "Post-hook has no role here" },
              { phase: "materialize",  color: T4, label: "Model writes to Snowflake", sub: "" },
              { phase: "post-hook",    color: A3, label: "SQL executes against Snowflake", sub: "Every run — no schema or data awareness" },
            ]} />
          </Card>
          <Card title="Important" accent={A2}>
            <div style={{ color: T2, fontSize: 12, lineHeight: 1.6 }}>Post-hooks have <span style={{ color: A2, fontWeight: 700 }}>no knowledge</span> of schema or data. They execute arbitrary SQL. They cannot validate, check, or block anything.</div>
          </Card>
          <Card title="Not For" accent={T4}>
            <Item icon="✗" label="Schema validation" color={T4} />
            <Item icon="✗" label="Data quality checks" color={T4} />
            <Item icon="✗" label="Role grants — manage in Snowflake RBAC" color={T4} />
          </Card>
        </div>
        <Card title="Use Cases" accent={A3} flex={1.3}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { title: "PK constraint (if no contract)", color: A1, code: "ALTER TABLE {{ this }}\n  ADD PRIMARY KEY (contact_key) RELY", note: "Snowflake metadata only — not enforced. RELY enables query optimizer and Cortex AI." },
              { title: "FK constraint", color: A1, code: "ALTER TABLE {{ this }}\n  ADD FOREIGN KEY (owner_key)\n  REFERENCES dim_owner (owner_key) RELY", note: "Required until contract foreign_key DDL generation is confirmed (open TODO)." },
              { title: "PII tagging", color: A3, code: "ALTER TABLE {{ this }}\n  SET TAG governance.pii = 'true'", note: "Data governance metadata for Snowflake access policies." },
              { title: "Clustering key", color: A3, code: "ALTER TABLE {{ this }}\n  CLUSTER BY (created_date)", note: "Apply on large fact tables after initial load." },
            ].map(({ title, code, note, color }) => (
              <div key={title} style={{ background: "#F8FAFC", borderRadius: 6, padding: "9px 12px", border: `1px solid ${BORDER}` }}>
                <div style={{ color, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 10, color: T3, lineHeight: 1.7 }}>{code}</pre>
                <div style={{ color: T4, fontSize: 10, marginTop: 4 }}>{note}</div>
              </div>
            ))}
          </div>
        </Card>
      </Row>
    </SlideWrapper>
  );
}

function Slide8({ active }) {
  return (
    <SlideWrapper active={active}>
      <Heading label="dbt Tools 5 of 5" color={A1}>All Three Together — The Full Picture</Heading>
      <Divider />
      <Row>
        <Card title="Execution Timeline" accent={A1} flex={1}>
          <Timeline items={[
            { phase: "dbt run → compile",    color: A2, label: "CONTRACT fires",           sub: "Shape + types. Fails before any write." },
            { phase: "dbt run → materialize",color: T3, label: "Model writes to Snowflake", sub: "Data is in the table." },
            { phase: "dbt run → post-hook",  color: A3, label: "POST-HOOK fires",           sub: "PK/FK constraints, tags, clustering." },
            { phase: "dbt test (separate)",  color: A4, label: "TESTS fire",                sub: "Data values inspected. Failures don't undo the write." },
          ]} />
        </Card>
        <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { tool: "Contract", color: A2, role: "Structural guard",    what: ["Column presence","Data types","not_null structure"],     when: "Compile — before write",      catches: "Structural drift" },
              { tool: "Post-Hook",color: A3, role: "Snowflake metadata",  what: ["PK/FK DDL + RELY","Object tags","Clustering"],           when: "After write — every run",     catches: "Nothing — side effects only" },
              { tool: "Tests",    color: A4, role: "Data validation",     what: ["Uniqueness","Nullability","FK integrity","Business rules"],when: "Separate dbt test run",      catches: "Bad data values" },
            ].map(({ tool, color, role, what, when, catches }) => (
              <div key={tool} style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `3px solid ${color}`, borderRadius: 7, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                <div style={{ color, fontWeight: 800, fontSize: 14 }}>{tool}</div>
                <div style={{ color: T3, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{role}</div>
                <div style={{ flex: 1 }}>{what.map(w => <div key={w} style={{ color: T2, fontSize: 11, padding: "1px 0" }}>— {w}</div>)}</div>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 6 }}>
                  <div style={{ color: T3, fontSize: 10 }}>{when}</div>
                  <div style={{ color, fontSize: 11, fontWeight: 600, marginTop: 1 }}>{catches}</div>
                </div>
              </div>
            ))}
          </div>
          <Card title="The Non-Negotiable Rule" accent={A2}>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ flex: 1, color: T2, fontSize: 12, lineHeight: 1.7 }}>
                Snowflake <span style={{ color: A2, fontWeight: 700 }}>does not enforce</span> PK, FK, or UNIQUE constraints. Ever. You can insert duplicate PKs, broken FKs, and NULLs — Snowflake accepts all of it silently. Constraints power the optimizer and Cortex AI. <span style={{ color: T1, fontWeight: 600 }}>Tests are the only real enforcement.</span>
              </div>
              <div style={{ textAlign: "center", padding: "12px 16px", background: BG, borderRadius: 7, border: `1px solid ${BORDER}`, minWidth: 150 }}>
                <div style={{ color: T3, fontSize: 10, marginBottom: 2 }}>constraints describe</div>
                <div style={{ color: A4, fontWeight: 700, fontSize: 12 }}>what data SHOULD be</div>
                <div style={{ color: BORDER2, fontSize: 16, margin: "3px 0" }}>↕</div>
                <div style={{ color: T3, fontSize: 10, marginBottom: 2 }}>tests verify</div>
                <div style={{ color: A2, fontWeight: 700, fontSize: 12 }}>what data ACTUALLY is</div>
              </div>
            </div>
          </Card>
        </div>
      </Row>
    </SlideWrapper>
  );
}

const SLIDE_COMPONENTS = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8];

export default function App() {
  const [current, setCurrent] = useState(0);
  const total = slides.length;
  const isConcept = current < 3;
  const activeColor = isConcept ? A1 : A4;

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: T1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 44px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: A4, fontWeight: 700, letterSpacing: 1, background: A4 + "12", padding: "2px 9px", borderRadius: 4, border: `1px solid ${A4}25` }}>dbt training</div>
          <div style={{ width: 1, height: 14, background: BORDER }} />
          <div style={{ fontSize: 12, color: T3, fontWeight: 500 }}>Data Quality & Validation</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: T3, fontSize: 11 }}>{current + 1} / {total}</span>
          <div style={{ width: 1, height: 14, background: BORDER }} />
          <Badge color={isConcept ? A1 : A4}>{isConcept ? "Concept" : "dbt Tools"}</Badge>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", padding: "0 44px", borderBottom: `1px solid ${BORDER}`, background: SURFACE, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
          <span style={{ color: T4, fontSize: 9, fontFamily: "monospace", letterSpacing: 1.5, marginRight: 8, paddingRight: 8, borderRight: `1px solid ${BORDER}` }}>CONCEPT</span>
          {[0,1,2].map(i => (
            <button key={i} onClick={() => setCurrent(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "9px 13px", fontSize: 12, fontWeight: current === i ? 700 : 400, color: current === i ? A1 : T3, borderBottom: current === i ? `2px solid ${A1}` : "2px solid transparent", transition: "all 0.15s" }}>{slides[i].title}</button>
          ))}
          <span style={{ color: T4, fontSize: 9, fontFamily: "monospace", letterSpacing: 1.5, margin: "0 8px", padding: "0 8px", borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>TOOLS</span>
          {[3,4,5,6,7].map(i => (
            <button key={i} onClick={() => setCurrent(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "9px 13px", fontSize: 12, fontWeight: current === i ? 700 : 400, color: current === i ? A4 : T3, borderBottom: current === i ? `2px solid ${A4}` : "2px solid transparent", transition: "all 0.15s" }}>{slides[i].title}</button>
          ))}
        </div>
      </div>

      {/* Slides */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {SLIDE_COMPONENTS.map((S, i) => <S key={i} active={current === i} />)}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 44px", borderTop: `1px solid ${BORDER}`, background: SURFACE }}>
        <button onClick={() => setCurrent(c => Math.max(0, c-1))} disabled={current === 0} style={{ background: "none", border: `1px solid ${current === 0 ? BORDER : BORDER2}`, color: current === 0 ? T4 : T2, borderRadius: 6, padding: "5px 16px", fontSize: 12, cursor: current === 0 ? "default" : "pointer" }}>← Previous</button>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 16 : 5, height: 5, borderRadius: 3, background: i === current ? activeColor : BORDER, cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
        <button onClick={() => setCurrent(c => Math.min(total-1, c+1))} disabled={current === total-1} style={{ background: current === total-1 ? "none" : activeColor, border: `1px solid ${current === total-1 ? BORDER : activeColor}`, color: current === total-1 ? T4 : SURFACE, borderRadius: 6, padding: "5px 16px", fontSize: 12, fontWeight: 600, cursor: current === total-1 ? "default" : "pointer" }}>Next →</button>
      </div>
    </div>
  );
}
