import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  monthlyTrend, subfields, aiTools, disclosureTypes, recentPapers, stats,
} from "./data";

const CYAN = "#00d4ff";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const MUTED = "#4a4a62";
const BORDER = "#1e1e28";

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="border border-[#1e1e28] bg-[#0f0f12] p-5 flex flex-col gap-1">
      <div className="font-mono text-xs text-[#4a4a62] uppercase tracking-widest">{label}</div>
      <div className="font-serif text-4xl leading-none" style={{ color: accent ?? "#e2e2ef" }}>{value}</div>
      {sub && <div className="font-mono text-xs text-[#6b6b8a] mt-1">{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-4 bg-[#00d4ff]" />
      <span className="font-mono text-xs text-[#6b6b8a] uppercase tracking-widest">{children}</span>
    </div>
  );
}

const confidenceBadge = (c: number) => {
  const pct = Math.round(c * 100);
  const color = c >= 0.95 ? GREEN : c >= 0.85 ? CYAN : c >= 0.75 ? AMBER : MUTED;
  return (
    <span className="font-mono text-xs px-1.5 py-0.5 border" style={{ color, borderColor: color + "44", background: color + "11" }}>
      {pct}%
    </span>
  );
};

const contextBadge = (ctx: string) => {
  const map: Record<string, string> = {
    acknowledged: "#a78bfa",
    abstract: CYAN,
    body: AMBER,
  };
  const color = map[ctx] ?? MUTED;
  return (
    <span className="font-mono text-[10px] px-1.5 py-0.5 border uppercase tracking-wider" style={{ color, borderColor: color + "44", background: color + "11" }}>
      {ctx}
    </span>
  );
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[#2a2a38] bg-[#0f0f12] px-3 py-2 text-xs font-mono">
      <div className="text-[#6b6b8a] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? "#e2e2ef" }}>
          {p.name}: <span className="font-semibold">{typeof p.value === "number" && p.name.includes("%") ? p.value.toFixed(2) + "%" : p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

type Tab = "trend" | "subfields" | "tools";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("trend");
  const [searchQuery, setSearchQuery] = useState("");
  const [subfieldFilter, setSubfieldFilter] = useState("all");

  const filteredPapers = useMemo(() => {
    return recentPapers.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.authors.some(a => a.toLowerCase().includes(q)) || p.tools.some(t => t.toLowerCase().includes(q));
      const matchField = subfieldFilter === "all" || p.subfield === subfieldFilter;
      return matchSearch && matchField;
    });
  }, [searchQuery, subfieldFilter]);

  const chartData = monthlyTrend.map(d => ({
    ...d,
    label: d.month.slice(0, 7),
    "AI Disclosure %": d.pct,
    "Papers": d.total,
    "Disclosed": d.disclosed,
  }));

  const tabs: { key: Tab; label: string }[] = [
    { key: "trend", label: "Monthly Trend" },
    { key: "subfields", label: "By Subfield" },
    { key: "tools", label: "AI Tools" },
  ];

  return (
    <div className="min-h-full bg-[#080809] text-[#e2e2ef] font-sans">
      {/* Top bar */}
      <div className="border-b border-[#1e1e28] bg-[#0a0a0c] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="font-mono text-xs text-[#4a4a62] uppercase tracking-widest">arxiv · math.* categories</span>
          <span className="font-mono text-xs text-[#2a2a38]">|</span>
          <span className="font-mono text-xs text-[#4a4a62]">Jan 2023 – Aug 2026</span>
        </div>
        <div className="font-mono text-xs text-[#4a4a62]">
          Updated <span className="text-[#6b6b8a]">{stats.lastUpdated}</span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-10">
          <div className="font-mono text-[10px] text-[#4a4a62] uppercase tracking-widest mb-3">
            AI Impact Observatory
          </div>
          <h1 className="font-serif text-5xl leading-tight text-[#e2e2ef] mb-3">
            AI Disclosure in<br />
            <span style={{ color: CYAN }}>Mathematical Research</span>
          </h1>
          <p className="text-[#6b6b8a] text-sm max-w-xl leading-relaxed">
            Tracking how many preprints on arxiv's math.* categories explicitly disclose the use
            of AI tools — detected via keyword matching in abstracts, acknowledgments, and body text.
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1e1e28] mb-px">
          <Stat label="Papers Analyzed" value={stats.totalPapers.toLocaleString()} sub="math.* · Jan 2023–Aug 2026" />
          <Stat label="AI Disclosed" value={stats.totalDisclosed.toLocaleString()} sub={`${stats.disclosedPct}% of total`} accent={CYAN} />
          <Stat label="Aug 2026 Rate" value="34.0%" sub={`+${stats.monthlyGrowth.toFixed(2)}pp month-over-month`} accent={AMBER} />
          <Stat label="Tools Detected" value={stats.uniqueTools.toString()} sub="distinct AI systems mentioned" accent={GREEN} />
        </div>
        <div className="h-px bg-[#1e1e28] mb-10" />

        {/* Chart section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <SectionLabel>Analysis</SectionLabel>
            <div className="flex border border-[#1e1e28]">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="font-mono text-xs px-4 py-2 transition-colors"
                  style={{
                    background: activeTab === t.key ? "#1e1e28" : "transparent",
                    color: activeTab === t.key ? CYAN : "#4a4a62",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-[#1e1e28] bg-[#0f0f12] p-6" style={{ height: 380 }}>
            {activeTab === "trend" && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1e1e28" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#4a4a62", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={{ stroke: BORDER }}
                    interval={3}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="left"
                    tick={{ fill: "#4a4a62", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    yAxisId="count"
                    orientation="right"
                    tick={{ fill: "#2a2a38", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line yAxisId="pct" type="monotone" dataKey="AI Disclosure %" stroke={CYAN} strokeWidth={2} dot={false} />
                  <Line yAxisId="count" type="monotone" dataKey="Disclosed" stroke={AMBER} strokeWidth={1} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {activeTab === "subfields" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subfields} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 120 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="#1e1e28" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#4a4a62", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={{ stroke: BORDER }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 45]}
                  />
                  <YAxis
                    type="category"
                    dataKey="code"
                    tick={{ fill: "#6b6b8a", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pct" name="AI Disclosure %" radius={0} maxBarSize={14}>
                    {subfields.map((s, i) => (
                      <Cell key={i} fill={i === 0 ? CYAN : i === 1 ? "#7dd3fc" : "#38bdf8"} fillOpacity={1 - i * 0.06} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === "tools" && (
              <div className="flex h-full items-center justify-center gap-12">
                <ResponsiveContainer width="45%" height="90%">
                  <PieChart>
                    <Pie
                      data={aiTools}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="52%"
                      outerRadius="78%"
                      strokeWidth={0}
                    >
                      {aiTools.map((t, i) => (
                        <Cell key={i} fill={t.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 flex-1">
                  {aiTools.map((t) => (
                    <div key={t.name} className="flex items-center gap-3">
                      <div className="w-2 h-2 flex-shrink-0" style={{ background: t.color }} />
                      <div className="font-mono text-xs text-[#9898b8] flex-1">{t.name}</div>
                      <div className="font-mono text-xs" style={{ color: t.color }}>{t.pct}%</div>
                      <div className="font-mono text-xs text-[#4a4a62] w-16 text-right">{t.count.toLocaleString()}</div>
                    </div>
                  ))}
                  <div className="border-t border-[#1e1e28] pt-3 mt-1">
                    <div className="font-mono text-[10px] text-[#4a4a62] uppercase tracking-wider">Disclosure type breakdown</div>
                    {disclosureTypes.map((d) => (
                      <div key={d.type} className="flex items-center gap-2 mt-2">
                        <div className="h-px flex-1 bg-[#1e1e28] relative">
                          <div className="absolute left-0 top-0 h-full bg-[#2a2a38]" style={{ width: `${d.pct / 35 * 100}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-[#4a4a62] w-40 text-right">{d.type}</span>
                        <span className="font-mono text-[10px] text-[#6b6b8a] w-10 text-right">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Papers table */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Recent Disclosed Papers</SectionLabel>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search title, author, tool..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="font-mono text-xs bg-[#0f0f12] border border-[#1e1e28] px-3 py-1.5 text-[#9898b8] placeholder-[#2a2a38] outline-none focus:border-[#2a2a38] w-52"
              />
              <select
                value={subfieldFilter}
                onChange={(e) => setSubfieldFilter(e.target.value)}
                className="font-mono text-xs bg-[#0f0f12] border border-[#1e1e28] px-3 py-1.5 text-[#9898b8] outline-none"
              >
                <option value="all">All subfields</option>
                {subfields.map((s) => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-[#1e1e28]">
            {/* Header */}
            <div className="grid border-b border-[#1e1e28] bg-[#0a0a0c] px-4 py-2"
              style={{ gridTemplateColumns: "7rem 1fr 8rem 6rem 5rem 6rem" }}>
              {["arxiv ID", "Title & Authors", "Tools", "Subfield", "Context", "Confidence"].map((h) => (
                <div key={h} className="font-mono text-[10px] text-[#4a4a62] uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {filteredPapers.length === 0 && (
              <div className="px-4 py-8 text-center font-mono text-xs text-[#4a4a62]">No papers match your filter.</div>
            )}

            {filteredPapers.map((p, i) => (
              <div
                key={p.id}
                className="group border-b border-[#1e1e28] last:border-0 hover:bg-[#0f0f12] transition-colors"
              >
                <div className="grid px-4 py-3 items-start"
                  style={{ gridTemplateColumns: "7rem 1fr 8rem 6rem 5rem 6rem" }}>
                  <div className="font-mono text-xs" style={{ color: CYAN }}>
                    <a href={`https://arxiv.org/abs/${p.id}`} target="_blank" rel="noopener noreferrer"
                      className="hover:underline">{p.id}</a>
                    <div className="text-[#4a4a62] text-[10px] mt-0.5">{p.date}</div>
                  </div>
                  <div className="pr-4">
                    <div className="text-sm text-[#e2e2ef] leading-snug mb-1">{p.title}</div>
                    <div className="font-mono text-[10px] text-[#4a4a62]">{p.authors.join(", ")}</div>
                    <div className="font-mono text-[10px] text-[#2a2a38] mt-1 italic leading-relaxed line-clamp-2">
                      "{p.excerpt}"
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {p.tools.map((t) => {
                      const tool = aiTools.find(a => a.name.includes(t.split(" ")[0]));
                      return (
                        <span key={t} className="font-mono text-[10px] px-1.5 py-0.5 border w-fit"
                          style={{ color: tool?.color ?? MUTED, borderColor: (tool?.color ?? MUTED) + "44", background: (tool?.color ?? MUTED) + "11" }}>
                          {t}
                        </span>
                      );
                    })}
                  </div>
                  <div className="font-mono text-xs text-[#6b6b8a]">{p.subfield}</div>
                  <div>{contextBadge(p.context)}</div>
                  <div>{confidenceBadge(p.confidence)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="border border-[#1e1e28] bg-[#0a0a0c] p-6 mb-8">
          <SectionLabel>Methodology</SectionLabel>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Data Collection",
                body: "Papers retrieved from the arxiv API (export.arxiv.org) across all math.* subcategories. Full metadata including abstracts and body text fetched nightly via the OAI-PMH endpoint.",
              },
              {
                step: "02",
                title: "Keyword Detection",
                body: "Multi-pass regex matching over abstract, acknowledgment section, and full text for 120+ AI tool names and disclosure phrases. Confidence scored by match location, specificity, and surrounding context.",
              },
              {
                step: "03",
                title: "Classification",
                body: "Matches labeled by context (abstract / acknowledged / body), tool identified where possible, and disclosure type categorized. All data updated daily; historical series recomputed monthly.",
              },
            ].map((m) => (
              <div key={m.step}>
                <div className="font-mono text-[10px] text-[#2a2a38] mb-1">STEP {m.step}</div>
                <div className="font-mono text-xs text-[#9898b8] mb-2">{m.title}</div>
                <div className="text-xs text-[#4a4a62] leading-relaxed">{m.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1e1e28] pt-6">
          <div className="font-mono text-[10px] text-[#2a2a38]">
            Data sourced from <span className="text-[#4a4a62]">arxiv.org</span> · Sample dataset for demonstration
          </div>
          <div className="font-mono text-[10px] text-[#2a2a38]">
            AI Impact Observatory · 2026
          </div>
        </div>
      </div>
    </div>
  );
}
