import { useState, useEffect, useRef } from "react";

const NODES = [
  // Center
  { id: "dbt", label: "dbt Core", sublabel: "Data Build Tool", x: 500, y: 400, r: 52, type: "center" },

  // Tier 1 — Foundations (top-left arc)
  { id: "setup", label: "Setup &\nProfiles", sublabel: "profiles.yml · dbt init · Snowflake conn", x: 230, y: 180, r: 38, type: "beginner" },
  { id: "repo", label: "Repo\nStructure", sublabel: "models/ macros/ seeds/ tests/ snapshots/", x: 380, y: 120, r: 38, type: "beginner" },
  { id: "models", label: "Models", sublabel: "SQL files → views/tables in warehouse", x: 560, y: 105, r: 38, type: "beginner" },
  { id: "sources", label: "Sources &\nref()", sublabel: "source() · ref() · DAG dependencies", x: 710, y: 160, r: 38, type: "beginner" },
  { id: "execution", label: "Execution\nSequence", sublabel: "Parse → Resolve → Compile → Execute", x: 800, y: 290, r: 38, type: "beginner" },

  // Tier 1 continued — bottom arc
  { id: "testing", label: "Testing", sublabel: "unique · not_null · relationships · accepted_values", x: 790, y: 510, r: 38, type: "beginner" },
  { id: "docs", label: "Docs &\nGrain", sublabel: "schema.yml · dbt docs serve · persist_docs", x: 700, y: 630, r: 38, type: "beginner" },

  // Tier 2 — Intermediate (left side)
  { id: "materializations", label: "Materializa-\ntions", sublabel: "view · table · incremental · ephemeral", x: 220, y: 370, r: 36, type: "intermediate" },
  { id: "incremental", label: "Incremental\nModels", sublabel: "is_incremental() · merge · unique_key", x: 195, y: 520, r: 36, type: "intermediate" },
  { id: "scd2", label: "SCD2 &\nSnapshots", sublabel: "scd2_merge macro · dbt_valid_from/to", x: 290, y: 650, r: 36, type: "intermediate" },
  { id: "jinja", label: "Jinja &\nMacros", sublabel: "{{ }} · {% %} · hooks · packages", x: 430, y: 700, r: 36, type: "intermediate" },
  { id: "seeds", label: "Seeds &\nVariables", sublabel: "CSV lookups · var() · runtime flags", x: 570, y: 710, r: 36, type: "intermediate" },
  { id: "selectors", label: "Selectors\n& Tags", sublabel: "+model · state:modified · result:error", x: 155, y: 250, r: 34, type: "intermediate" },

  // Tier 3 — Advanced (right side)
  { id: "cicd", label: "CI/CD", sublabel: "GitHub Actions · slim CI · manifest.json", x: 830, y: 155, r: 34, type: "advanced" },
  { id: "adv_testing", label: "Advanced\nTesting", sublabel: "store_failures · dbt-expectations · unit tests", x: 870, y: 400, r: 34, type: "advanced" },
  { id: "custom_macros", label: "Custom\nMacros", sublabel: "dispatch · run-operation · scd2_merge deep dive", x: 830, y: 640, r: 34, type: "advanced" },
  { id: "governance", label: "Governance\n& Contracts", sublabel: "contracts · access levels · versions · PK/FK", x: 580, y: 570, r: 34, type: "advanced" },

  // Stack layer (small satellites)
  { id: "medallion", label: "Bronze·Silver\n·Gold", sublabel: "Medallion architecture", x: 365, y: 300, r: 28, type: "stack" },
  { id: "hubspot", label: "HubSpot\nPipelines", sublabel: "Lambda ingestion → Bronze", x: 430, y: 490, r: 28, type: "stack" },
  { id: "snowflake", label: "Snowflake", sublabel: "Target warehouse · clustering · tasks", x: 620, y: 310, r: 28, type: "stack" },
];

const EDGES = [
  // Center to Tier 1
  ["dbt", "setup"], ["dbt", "repo"], ["dbt", "models"], ["dbt", "sources"],
  ["dbt", "execution"], ["dbt", "testing"], ["dbt", "docs"],
  // Center to Tier 2
  ["dbt", "materializations"], ["dbt", "incremental"], ["dbt", "jinja"],
  ["dbt", "seeds"], ["dbt", "selectors"], ["dbt", "scd2"],
  // Center to Tier 3
  ["dbt", "cicd"], ["dbt", "adv_testing"], ["dbt", "custom_macros"], ["dbt", "governance"],
  // Center to stack nodes
  ["dbt", "medallion"], ["dbt", "hubspot"], ["dbt", "snowflake"],
  // Logical connections
  ["models", "materializations"], ["materializations", "incremental"],
  ["incremental", "scd2"], ["scd2", "custom_macros"],
  ["jinja", "custom_macros"], ["testing", "adv_testing"],
  ["sources", "execution"], ["execution", "cicd"],
  ["docs", "governance"], ["selectors", "cicd"],
  ["medallion", "sources"], ["snowflake", "materializations"],
  ["hubspot", "medallion"], ["seeds", "jinja"],
  ["repo", "setup"], ["models", "docs"],
  ["governance", "adv_testing"],
];

const TYPE_STYLES = {
  center:       { bg: "#0f172a", border: "#38bdf8", text: "#f0f9ff", glow: "#38bdf8", label: "dbt Core" },
  beginner:     { bg: "#0f2a1a", border: "#22c55e", text: "#dcfce7", glow: "#22c55e", label: "Foundations" },
  intermediate: { bg: "#1a1a0f", border: "#eab308", text: "#fef9c3", glow: "#eab308", label: "Intermediate" },
  advanced:     { bg: "#1a0f1a", border: "#a855f7", text: "#f3e8ff", glow: "#a855f7", label: "Advanced" },
  stack:        { bg: "#0f1a2a", border: "#38bdf8", text: "#bae6fd", glow: "#0ea5e9", label: "Stack" },
};

function getNode(id) { return NODES.find(n => n.id === id); }

export default function DBTMindMap() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const activeNode = selected || hovered;

  const connectedIds = activeNode
    ? new Set(
        EDGES.flatMap(([a, b]) =>
          a === activeNode ? [b] : b === activeNode ? [a] : []
        ).concat([activeNode])
      )
    : null;

  const isConnected = (id) => !connectedIds || connectedIds.has(id);
  const isActive = (id) => activeNode === id;

  const nodeDetail = activeNode ? NODES.find(n => n.id === activeNode) : null;

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#050a14",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        opacity: 0.6,
      }} />

      {/* Header */}
      <div style={{
        zIndex: 10, textAlign: "center", paddingTop: 28, paddingBottom: 4,
        opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease",
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", color: "#38bdf8", textTransform: "uppercase", marginBottom: 6 }}>
          Data &amp; Analytics
        </div>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 700,
          color: "#f0f9ff", letterSpacing: "0.05em",
        }}>
          dbt Training — Concept Map
        </h1>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 20, marginTop: 12, marginBottom: 4,
        zIndex: 10,
        opacity: mounted ? 1 : 0, transition: "opacity 1s ease 0.3s",
      }}>
        {Object.entries(TYPE_STYLES).filter(([k]) => k !== "center").map(([type, s]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: s.border, boxShadow: `0 0 6px ${s.glow}`,
            }} />
            <span style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.1em" }}>
              {s.label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Mind Map */}
      <div style={{ position: "relative", width: "100%", maxWidth: 1060 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 1000 800"
          style={{
            width: "100%", display: "block",
            opacity: mounted ? 1 : 0, transition: "opacity 1.2s ease 0.2s",
          }}
        >
          <defs>
            {Object.entries(TYPE_STYLES).map(([type, s]) => (
              <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            <filter id="glow-strong" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {EDGES.map(([a, b], i) => {
            const na = getNode(a), nb = getNode(b);
            if (!na || !nb) return null;
            const isHighlighted = connectedIds && connectedIds.has(a) && connectedIds.has(b);
            const isFaded = connectedIds && !isHighlighted;
            return (
              <line
                key={i}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={isHighlighted ? "#38bdf8" : "#1e3a5f"}
                strokeWidth={isHighlighted ? 1.8 : 0.8}
                strokeOpacity={isFaded ? 0.1 : isHighlighted ? 0.9 : 0.35}
                style={{ transition: "all 0.25s ease" }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const s = TYPE_STYLES[node.type];
            const active = isActive(node.id);
            const connected = isConnected(node.id);
            const faded = !connected;
            const lines = node.label.split("\n");

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: "pointer", transition: "all 0.25s ease" }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(selected === node.id ? null : node.id)}
              >
                {/* Outer glow ring when active */}
                {active && (
                  <circle
                    r={node.r + 10}
                    fill="none"
                    stroke={s.border}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    filter={`url(#glow-${node.type})`}
                  />
                )}

                {/* Main circle */}
                <circle
                  r={node.r}
                  fill={s.bg}
                  stroke={s.border}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeOpacity={faded ? 0.2 : 1}
                  fillOpacity={faded ? 0.3 : 1}
                  filter={active ? `url(#glow-strong)` : undefined}
                  style={{ transition: "all 0.25s ease" }}
                />

                {/* Label */}
                {lines.map((line, li) => (
                  <text
                    key={li}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={(lines.length === 1 ? 0 : (li - (lines.length - 1) / 2) * 13)}
                    fontSize={node.type === "center" ? 13 : node.r > 35 ? 10 : 9}
                    fontWeight={node.type === "center" ? 700 : 600}
                    fill={s.text}
                    fillOpacity={faded ? 0.25 : 1}
                    style={{ transition: "fill-opacity 0.25s ease", userSelect: "none" }}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>

        {/* Detail tooltip — bottom overlay */}
        <div style={{
          position: "absolute",
          bottom: 12, left: "50%", transform: "translateX(-50%)",
          width: 320,
          background: nodeDetail ? TYPE_STYLES[nodeDetail.type].bg : "transparent",
          border: nodeDetail ? `1px solid ${TYPE_STYLES[nodeDetail.type].border}` : "none",
          borderRadius: 8,
          padding: nodeDetail ? "12px 16px" : 0,
          opacity: nodeDetail ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: "none",
          boxShadow: nodeDetail ? `0 0 20px ${TYPE_STYLES[nodeDetail.type]?.glow}22` : "none",
          zIndex: 20,
        }}>
          {nodeDetail && (
            <>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: TYPE_STYLES[nodeDetail.type].border, textTransform: "uppercase", marginBottom: 4 }}>
                {TYPE_STYLES[nodeDetail.type].label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TYPE_STYLES[nodeDetail.type].text, marginBottom: 5 }}>
                {nodeDetail.label.replace("\n", " ")}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>
                {nodeDetail.sublabel}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div style={{
        fontSize: 9, letterSpacing: "0.15em", color: "#334155",
        textTransform: "uppercase", marginTop: 4, marginBottom: 16, zIndex: 10,
        opacity: mounted ? 1 : 0, transition: "opacity 1s ease 0.8s",
      }}>
        Hover or click any node to explore connections
      </div>
    </div>
  );
}
