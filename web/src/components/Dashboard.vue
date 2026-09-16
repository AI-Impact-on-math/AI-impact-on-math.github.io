<script setup lang="ts">
import { computed, ref, watch } from "vue";
import * as echarts from "echarts";
import VChart from "@/components/VChart.vue";
import SectionLabel from "@/components/SectionLabel.vue";
import PaperRow from "@/components/PaperRow.vue";
import StatCard from "@/components/StatCard.vue";
import type {
  AiTool,
  MethodologyStep,
  MonthlyTrendPoint,
  RecentPaper,
  Scope,
  Stats,
  Subfield,
} from "@/types";

const props = defineProps<{
  monthlyTrend: Record<Scope, MonthlyTrendPoint[]>;
  subfields: Record<Scope, Subfield[]>;
  aiTools: Record<Scope, AiTool[]>;
  recentPapers: RecentPaper[];
  stats: {
    stats: Record<Scope, Stats>;
    dateRange: [string, string];
    lastUpdated: string;
  };
  methodology: MethodologyStep[];
}>();

// 数据科学主题色：图表蓝为主，Okabe-Ito 色盲安全强调色
const BLUE = "#2563a8";
const ORANGE = "#d2622a";
const TEAL = "#2c8a72";
const SURFACE = "#fcfcfa";
const BORDER = "#ddddda";
const TEXT = "#23272e";
const TEXT2 = "#464b54";
const MUTED = "#8a8a82";
const MUTED_FAINT = "#b0b0a8";
// 子域条形图降档色：主色向浅灰蓝过渡
const BAR_STEPS = [BLUE, "#4a7cba", "#7498ca"];

type Tab = "trend" | "subfields" | "tools";

const activeTab = ref<Tab>("trend");
const searchQuery = ref("");
const subfieldFilter = ref("all");
const scope = ref<Scope>("primary");

const scopeMeta: { key: Scope; label: string; desc: string }[] = [
  { key: "primary", label: "Primary math.* only", desc: "primary_category ∈ math.* — each paper counted once" },
  { key: "any", label: "Any category incl. math.*", desc: "categories contain math.* — cross-lists counted per category" },
];
const activeScopeDesc = computed(
  () => scopeMeta.find((s) => s.key === scope.value)?.desc ?? "",
);

const activeTrend = computed(() => props.monthlyTrend[scope.value]);
const activeSubfields = computed(() => props.subfields[scope.value]);
const activeTools = computed(() => props.aiTools[scope.value]);
const activeStats = computed(() => props.stats.stats[scope.value]);

const subfieldMax = computed(() => {
  const max = Math.max(...activeSubfields.value.map((s) => s.pct), 10);
  return Math.ceil(max / 5) * 5;
});

watch(activeSubfields, () => {
  if (
    subfieldFilter.value !== "all" &&
    !activeSubfields.value.some((s) => s.code === subfieldFilter.value)
  ) {
    subfieldFilter.value = "all";
  }
});

const tabs: { key: Tab; label: string }[] = [
  { key: "trend", label: "Monthly Trend" },
  { key: "subfields", label: "By Subfield" },
  { key: "tools", label: "AI Tools" },
];

// 当前口径下的披露论文：primary 看主分类；any 看 categories 含 math
const scopedPapers = computed(() =>
  props.recentPapers.filter((p) =>
    scope.value === "primary" ? p.subfield.startsWith("math") : p.mathCats.length > 0,
  ),
);

const filteredPapers = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return scopedPapers.value.filter((p) => {
    const matchSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q)) ||
      p.tools.some((t) => t.toLowerCase().includes(q));
    const matchField =
      subfieldFilter.value === "all" ||
      (scope.value === "any"
        ? p.mathCats.includes(subfieldFilter.value)
        : p.subfield === subfieldFilter.value);
    return matchSearch && matchField;
  });
});

const tooltipStyle = {
  backgroundColor: SURFACE,
  borderColor: "#c4c4bd",
  borderWidth: 1,
  padding: [8, 12] as [number, number],
  textStyle: { color: TEXT, fontSize: 11, fontFamily: "JetBrains Mono" },
  extraCssText: "box-shadow: 0 2px 8px rgba(35, 39, 46, 0.1);",
};

const trendOption = computed((): echarts.EChartsOption => ({
  grid: { top: 36, right: 8, bottom: 8, left: 8, containLabel: true },
  tooltip: {
    ...tooltipStyle,
    trigger: "axis",
    axisPointer: {
      type: "line",
      lineStyle: { color: TEXT, width: 1, opacity: 0.3 },
    },
    formatter: (params: any) => {
      const list = Array.isArray(params) ? params : [params];
      const rows = list
        .map(
          (p: any) =>
            `<div style="color:${p.color}">${p.seriesName}: <b>${
              p.seriesName.includes("%") ? p.value.toFixed(2) + "%" : p.value.toLocaleString()
            }</b></div>`,
        )
        .join("");
      return `<div style="color:${TEXT2};margin-bottom:4px">${list[0]?.axisValue ?? ""}</div>${rows}`;
    },
  },
  legend: {
    show: true,
    top: 0,
    right: 8,
    icon: "rect",
    itemWidth: 12,
    itemHeight: 2,
    textStyle: { color: TEXT2, fontSize: 10, fontFamily: "JetBrains Mono" },
  },
  xAxis: {
    type: "category",
    data: activeTrend.value.map((d) => d.month),
    axisLine: { lineStyle: { color: BORDER } },
    axisTick: { show: false },
    axisLabel: {
      color: MUTED,
      fontSize: 10,
      fontFamily: "JetBrains Mono",
      interval: 3,
    },
  },
  yAxis: [
    {
      type: "value",
      axisLabel: { color: MUTED, fontSize: 10, fontFamily: "JetBrains Mono", formatter: "{value}%" },
      splitLine: { lineStyle: { color: BORDER, type: [2, 6] } },
    },
    {
      type: "value",
      axisLabel: { color: MUTED_FAINT, fontSize: 10, fontFamily: "JetBrains Mono", formatter: (v: number) => v.toLocaleString() },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: "AI Disclosure %",
      type: "line",
      yAxisIndex: 0,
      data: activeTrend.value.map((d) => d.pct),
      showSymbol: false,
      lineStyle: { color: BLUE, width: 2 },
      itemStyle: { color: BLUE },
      smooth: 0.3,
    },
    {
      name: "Disclosed",
      type: "line",
      yAxisIndex: 1,
      data: activeTrend.value.map((d) => d.disclosed),
      showSymbol: false,
      lineStyle: { color: ORANGE, width: 1, type: [4, 3] },
      itemStyle: { color: ORANGE },
      smooth: 0.3,
    },
  ],
}));

const subfieldOption = computed((): echarts.EChartsOption => ({
  grid: { top: 8, right: 80, bottom: 8, left: 8, containLabel: true },
  tooltip: {
    ...tooltipStyle,
    trigger: "item",
    formatter: (p: any) =>
      `<div style="color:${TEXT2};margin-bottom:4px">${p.name}</div>` +
      `<div style="color:${p.color}">AI Disclosure %: <b>${p.value.toFixed(2)}%</b></div>`,
  },
  xAxis: {
    type: "value",
    max: subfieldMax.value,
    axisLine: { lineStyle: { color: BORDER } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: BORDER, type: [2, 6] } },
    axisLabel: {
      color: MUTED,
      fontSize: 10,
      fontFamily: "JetBrains Mono",
      formatter: "{value}%",
    },
  },
  yAxis: {
    type: "category",
    data: activeSubfields.value.map((s) =>
      s.code === "others"
        ? `(incl. math.*) others`
        : s.name && s.name !== s.code
          ? `(${s.name}) ${s.code}`
          : s.code,
    ),
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: TEXT2, fontSize: 10, fontFamily: "JetBrains Mono" },
  },
  series: [
    {
      name: "AI Disclosure %",
      type: "bar",
      data: activeSubfields.value.map((s, i) => ({
        value: s.pct,
        itemStyle: {
          color:
            s.code === "others" ? "#a9a99e" : i < BAR_STEPS.length ? BAR_STEPS[i] : BAR_STEPS[BAR_STEPS.length - 1],
          opacity: s.code === "others" ? 1 : 1 - Math.min(i, BAR_STEPS.length - 1) * 0.12,
        },
      })),
      barWidth: 14,
    },
  ],
}));

const toolsOption = computed((): echarts.EChartsOption => ({
  tooltip: {
    ...tooltipStyle,
    trigger: "item",
    formatter: (p: any) =>
      `<div style="color:${p.color}">${p.name}: <b>${p.value.toLocaleString()}</b> (${p.percent}%)</div>`,
  },
  series: [
    {
      type: "pie",
      radius: ["50%", "72%"],
      center: ["50%", "50%"],
      data: activeTools.value.map((t) => ({ name: t.name, value: t.count, itemStyle: { color: t.color } })),
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderWidth: 0 },
      minAngle: 2,
      emphasis: { scale: false },
      animationDurationUpdate: 0,
    },
  ],
}));

const formatted = (n: number) => n.toLocaleString();

const MONTH_FMT = (m: string) => {
  const [y, mm] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(mm) - 1]} ${y}`;
};

const dateRangeLabel = computed(() => {
  const [a, b] = props.stats.dateRange;
  return `${MONTH_FMT(a)} – ${MONTH_FMT(b)}`;
});

const lastMonthLabel = computed(() => {
  const last = activeTrend.value[activeTrend.value.length - 1];
  return last ? MONTH_FMT(last.month) : "";
});

const lastPct = computed(() => {
  const last = activeTrend.value[activeTrend.value.length - 1];
  return last ? last.pct.toFixed(1) : "0.0";
});

</script>

<template>
  <div class="min-h-full bg-[#f6f5f1] font-sans text-[#23272e]">
    <div class="border-b border-[#ddddda] bg-[#edecdf] flex items-center justify-between px-6 py-3">
      <div class="flex items-center gap-4">
        <div class="h-2 w-2 animate-pulse rounded-full bg-[#2c8a72]" />
        <span class="font-mono text-xs uppercase tracking-widest text-[#8a8a82]">arxiv · math.* categories</span>
        <span class="font-mono text-xs text-[#b0b0a8]">|</span>
        <span class="font-mono text-xs" :data-range="dateRangeLabel">{{ dateRangeLabel }}</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex border border-[#c4c4bd] bg-[#fcfcfa]" title="Counting scope applied to all sections">
          <button
            v-for="s in scopeMeta"
            :key="s.key"
            class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors"
            :style="{
              background: scope === s.key ? BLUE : 'transparent',
              color: scope === s.key ? '#fcfcfa' : '#8a8a82',
            }"
            @click="scope = s.key"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="font-mono text-xs text-[#8a8a82]">
          Updated <span class="text-[#63635c]">{{ stats.lastUpdated }}</span>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-[1400px] px-6 py-8">
      <div class="mb-6">
        <h1 class="mb-3 font-serif text-5xl leading-tight text-[#23272e]">
          AI Disclosure in<br />
          <span :style="{ color: BLUE }">Mathematical Research</span>
        </h1>
        <p class="whitespace-nowrap overflow-hidden text-ellipsis text-xs text-[#63635c]">
          Tracking how many preprints on arxiv's math.* categories explicitly disclose the use
          of AI tools — detected via keyword matching in abstracts, acknowledgments, and body text.
        </p>
        <div class="mt-2 font-mono text-[10px] text-[#8a8a82]">
          scope: <span :style="{ color: BLUE }">{{ activeScopeDesc }}</span>
        </div>
      </div>

      <div class="mb-px grid grid-cols-2 gap-px bg-[#ddddda] md:grid-cols-4">
        <StatCard label="Papers Analyzed" :value="formatted(activeStats.totalPapers)" :sub="`math.* · ${dateRangeLabel}`" />
        <StatCard label="AI Disclosed" :value="formatted(activeStats.totalDisclosed)" :sub="`${activeStats.disclosedPct}% of total`" :accent="BLUE" />
        <StatCard :label="`${lastMonthLabel} Rate`" :value="`${lastPct}%`" :sub="`${activeStats.monthlyGrowth >= 0 ? '+' : ''}${activeStats.monthlyGrowth.toFixed(2)}pp month-over-month`" :accent="ORANGE" />
        <StatCard label="Tools Detected" :value="String(activeStats.uniqueTools)" sub="distinct AI systems mentioned" :accent="TEAL" />
      </div>
      <div class="mb-10 h-px bg-[#ddddda]" />

      <div class="mb-10">
        <div class="mb-6 flex items-center justify-between">
          <SectionLabel title="Analysis" />
          <div class="flex border border-[#ddddda]">
            <button
              v-for="t in tabs"
              :key="t.key"
              class="px-4 py-2 font-mono text-xs transition-colors"
              :style="{
                background: activeTab === t.key ? '#ddddda' : 'transparent',
                color: activeTab === t.key ? BLUE : '#8a8a82',
              }"
              @click="activeTab = t.key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="h-[380px] border border-[#ddddda] bg-[#fcfcfa] p-6">
          <VChart v-show="activeTab === 'trend'" :option="trendOption" class="h-full w-full" />
          <VChart v-show="activeTab === 'subfields'" :option="subfieldOption" class="h-full w-full" />
          <div v-show="activeTab === 'tools'" class="flex h-full items-center gap-10">
            <div class="h-full w-[38%] shrink-0">
              <VChart :option="toolsOption" />
            </div>
            <div class="flex h-full flex-1 flex-col overflow-hidden">
              <div class="flex flex-1 flex-col justify-center gap-1.5">
                <div v-for="t in activeTools" :key="t.name" class="flex items-center gap-3">
                  <div class="h-2 w-2 shrink-0" :style="{ background: t.color }" />
                  <div class="flex-1 truncate font-mono text-xs text-[#464b54]">{{ t.name }}</div>
                  <div class="w-12 text-right font-mono text-xs" :style="{ color: t.color }">{{ t.pct }}%</div>
                  <div class="w-16 text-right font-mono text-xs text-[#8a8a82]">{{ formatted(t.count) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <SectionLabel title="Recent Disclosed Papers" />
          <div class="flex gap-2">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search title, author, tool..."
              class="w-52 border border-[#ddddda] bg-[#fcfcfa] px-3 py-1.5 font-mono text-xs text-[#464b54] outline-none placeholder-[#b0b0a8] focus:border-[#c4c4bd]"
            />
            <select
              v-model="subfieldFilter"
              class="border border-[#ddddda] bg-[#fcfcfa] px-3 py-1.5 font-mono text-xs text-[#464b54] outline-none"
            >
              <option value="all">All subfields</option>
              <option v-for="s in activeSubfields" :key="s.code" :value="s.code">{{ s.code }}</option>
            </select>
          </div>
        </div>

        <div class="border border-[#ddddda]">
          <div
            class="grid border-b border-[#ddddda] bg-[#edecdf] px-4 py-2"
            style="grid-template-columns: 7rem 1fr 8rem 6rem"
          >
            <div
              v-for="h in ['arxiv ID', 'Title & Authors', 'Tools', 'Subfield']"
              :key="h"
              class="font-mono text-[10px] uppercase tracking-widest text-[#8a8a82]"
            >
              {{ h }}
            </div>
          </div>

          <div v-if="filteredPapers.length === 0" class="px-4 py-8 text-center font-mono text-xs text-[#8a8a82]">
            No papers match your filter.
          </div>

          <PaperRow v-for="p in filteredPapers" :key="p.id" :paper="p" :tools="activeTools" />
        </div>
      </div>

      <div class="mb-8 border border-[#ddddda] bg-[#edecdf] p-6">
        <SectionLabel title="Methodology" />
        <div class="grid gap-6 md:grid-cols-3">
          <div v-for="m in methodology" :key="m.step">
            <div class="mb-1 font-mono text-[10px] text-[#b0b0a8]">STEP {{ m.step }}</div>
            <div class="mb-2 font-mono text-xs text-[#464b54]">{{ m.title }}</div>
            <div class="text-xs leading-relaxed text-[#8a8a82]">{{ m.body }}</div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-[#ddddda] pt-6">
        <div class="font-mono text-[10px] text-[#b0b0a8]">
          Data sourced from <span class="text-[#8a8a82]">arxiv.org</span> · Sample dataset for demonstration
        </div>
        <div class="font-mono text-[10px] text-[#b0b0a8]">2026</div>
      </div>
    </div>
  </div>
</template>
