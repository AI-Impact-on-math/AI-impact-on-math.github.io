import type {
  AiTool,
  MethodologyStep,
  MonthlyTrendPoint,
  ObservatoryData,
  RecentPaper,
  Scope,
  Stats,
  SubfieldScope,
} from "@/types";

const base = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}data/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadObservatoryData(): Promise<ObservatoryData> {
  return Promise.all([
    fetchJson<{ monthlyTrend: Partial<Record<Scope, MonthlyTrendPoint[]>> }>("monthly-trend.json").then(
      (r) => ({
        primary: r.monthlyTrend.primary ?? [],
        any: r.monthlyTrend.any ?? [],
      }),
    ),
    fetchJson<Partial<SubfieldScope>>("subfields.json").then((r) => ({
      primary: r.primary ?? [],
      any: r.any ?? [],
    })),
    fetchJson<{ aiTools: Partial<Record<Scope, AiTool[]>> }>("ai-tools.json").then((r) => ({
      primary: r.aiTools.primary ?? [],
      any: r.aiTools.any ?? [],
    })),
    fetchJson<{ recentPapers: RecentPaper[] }>("recent-papers.json").then((r) => r.recentPapers),
    fetchJson<{
      stats: Partial<Record<Scope, Stats>>;
      dateRange: [string, string];
      lastUpdated: string;
      methodology: MethodologyStep[];
    }>("stats.json").then((r) => {
      const primary: Stats = r.stats.primary ?? {
        totalPapers: 0,
        totalDisclosed: 0,
        disclosedPct: 0,
        monthlyGrowth: 0,
        uniqueTools: 0,
      };
      const any: Stats = r.stats.any ?? primary;
      return {
        stats: { primary, any },
        dateRange: r.dateRange,
        lastUpdated: r.lastUpdated,
        methodology: r.methodology,
      };
    }),
  ]).then(([monthlyTrend, subfields, aiTools, recentPapers, statsFile]) => ({
    monthlyTrend,
    subfields,
    aiTools,
    recentPapers,
    stats: statsFile,
    methodology: statsFile.methodology,
  }));
}
