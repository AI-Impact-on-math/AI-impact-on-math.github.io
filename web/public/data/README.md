# 数据目录约定

页面运行时通过 `fetch("/data/*.json")` 从本目录加载全部数据；`vite build` 时本目录内容会原样拷贝到 `dist/data/`。

**当前数据为真实统计**，由 `web/scripts/build-data.py` 从 ssds-sys 的 arXiv math 解析数据一次性计算生成（2026-09-14），时间区间 **2025-08 – 2026-08**，后续上线时会用真实管线矫正重算。

## 重新生成

```bash
python3 web/scripts/build-data.py --source <arxiv-math-2026-q2-parsed 目录>
```

输入依赖（只读）：
- `<source>/papers/<id>/meta.json` — 全量论文元数据（发布时间、主分类、作者）
- `<source>/disclosed_papers_final_v36.csv` — AI 披露论文清单（含证据句子）

## 文件清单

| 文件 | 说明 | 消费位置 |
| --- | --- | --- |
| `monthly-trend.json` | 月度总量/披露数/披露率 | "Monthly Trend" 折线图 |
| `subfields.json` | 两种口径（`primary` / `any`）的子域披露率（各类前 12，按披露率降序） | "By Subfield" 条形图、口径切换按钮、筛选器 |
| `ai-tools.json` | 具体工具提及分布 + 未指明 AI 兜底；披露类型按动词信号粗分 | "AI Tools" 环形图与图例 |
| `recent-papers.json` | 最新披露的 8 篇论文（真实 arXiv ID，链接可点开验证） | 论文表格 |
| `stats.json` | KPI 汇总与方法论卡片文案 | KPI 区、Methodology 区 |

## 统计口径备注

- 披露判定直接采用 `disclosed_papers_final_v36.csv`（上游 v3 扫描器结论），本脚本不重复全文扫描。
- `primary` 口径：只统计主分类（primary_category）为 `math.*` 的论文，一篇论文只计入一个子域；`any` 口径：`categories` 里含 `math.*` 即计入，交叉列表会在多个子域重复计数，因此 `any` 各子域 total 之和可大于论文总数。
- 工具分布基于披露证据句中的具体工具名匹配；证据句无具体工具名时计入 "Unspecified AI"。
- "ChatGPT 5.x" 等带版本号的提及归并到 ChatGPT 主名的匹配规则中；如需完全归并版本号，调整 `scripts/build-data.py` 中 `TOOL_RE` 的版本后缀处理。
- `confidence` 字段当前恒为 1.0（披露即命中证据句），表中已隐藏该列，保留字段以兼容后续真实置信度。
