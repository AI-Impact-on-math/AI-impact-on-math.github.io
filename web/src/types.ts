export type Scope = "primary" | "any";

export interface MonthlyTrendPoint {
  month: string;
  total: number;
  disclosed: number;
  pct: number;
}

export type ScopeedList<T> = Record<Scope, T>;

export interface Subfield {
  code: string;
  name: string;
  total: number;
  disclosed: number;
  pct: number;
}

export interface AiTool {
  name: string;
  count: number;
  pct: number;
  color: string;
}

export interface RecentPaper {
  id: string;
  title: string;
  authors: string[];
  subfield: string;
  mathCats: string[];
  date: string;
  confidence: number;
  tools: string[];
  context: string;
  excerpt: string;
}

export interface Stats {
  totalPapers: number;
  totalDisclosed: number;
  disclosedPct: number;
  monthlyGrowth: number;
  uniqueTools: number;
}

export interface MethodologyStep {
  step: string;
  title: string;
  body: string;
}

export type SubfieldScope = ScopeedList<Subfield[]>;

export interface ObservatoryData {
  monthlyTrend: ScopeedList<MonthlyTrendPoint[]>;
  subfields: SubfieldScope;
  aiTools: ScopeedList<AiTool[]>;
  recentPapers: RecentPaper[];
  stats: {
    stats: ScopeedList<Stats>;
    dateRange: [string, string];
    lastUpdated: string;
  };
  methodology: MethodologyStep[];
}
