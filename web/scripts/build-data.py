#!/usr/bin/env python3
"""从 ssds-sys 的 arXiv math 解析数据生成网站数据 JSON（数据真相来源）。

两种统计口径（前端全局切换）:
  primary — 主分类（primary_category）为 math.* 的论文集合，一篇只计一次
  any     — categories 中含任一 math.* 的论文集合；子域分布按每个 math 分类计一次（交叉列表重复计数）

输入（只读）:
  arxiv-math-2026-q2-parsed/papers/<id>/meta.json  全量论文元数据
  arxiv-math-2026-q2-parsed/disclosed_papers_final_v36.csv  AI 披露论文清单

输出（覆盖写入仓库，均为 {"primary": ..., "any": ...} 双口径结构）:
  web/public/data/monthly-trend.json
  web/public/data/subfields.json
  web/public/data/ai-tools.json
  web/public/data/recent-papers.json
  web/public/data/stats.json

用法:
  python3 scripts/build-data.py [--source PATH]
"""
from __future__ import annotations

import argparse
import collections
import csv
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = (
    Path.home()
    / "workspace/ssds-project/ssds-sys-repos/ssds-sys/ssds-sys-admin"
    / "apps/bib_library/scripts/arxiv-math-2026-q2-parsed"
)
OUT = REPO / "public" / "data"

# arXiv 官方分类全称（用于图表展示 "code (name)"）
CATEGORY_NAMES = {
    "math.CO": "Combinatorics",
    "math.ST": "Statistics Theory",
    "math.NT": "Number Theory",
    "math.OC": "Optimization and Control",
    "math.FA": "Functional Analysis",
    "math.PR": "Probability",
    "math.AG": "Algebraic Geometry",
    "math.NA": "Numerical Analysis",
    "math.DG": "Differential Geometry",
    "math.DS": "Dynamical Systems",
    "math-ph": "Mathematical Physics",
    "math.AP": "Analysis of PDEs",
    "math.AT": "Algebraic Topology",
    "math.GR": "Group Theory",
    "math.LO": "Logic",
    "math.CA": "Classical Analysis and ODEs",
    "math.RT": "Representation Theory",
    "math.GT": "Geometric Topology",
    "math.CV": "Complex Variables",
    "math.HO": "History and Overview",
    "math.IT": "Information Theory",
    "math.KT": "K-Theory and Homology",
    "math.MP": "Mathematical Physics",
    "math.QA": "Quantum Algebra",
    "math.RA": "Rings and Algebras",
    "math.SG": "Symplectic Geometry",
    "math.SP": "Spectral Theory",
    "cs.LG": "Machine Learning",
    "cs.IT": "Information Theory",
    "q-fin.CP": "Computational Finance",
}

TOOL_COLORS = {
    "ChatGPT": "#2563a8",
    "GitHub Copilot": "#6a3d9a",
    "Claude": "#d2622a",
    "Gemini": "#2c8a72",
    "Perplexity": "#3a8fa3",
    "DeepSeek": "#3b6fd4",
    "Llama": "#8a6d3b",
    "Grok": "#5a6472",
    "Qwen": "#7a4a3a",
    "Gemma": "#955096",
    "Mistral": "#b56a4a",
    "Other LLMs": "#63635c",
    "Unspecified AI": "#a9a99e",
}

# 数据文件 ai-tools.json 展示前 N 个工具，其余并入 Other LLMs
TOP_TOOLS = 8

# 别名归并：正则别名 -> 主工具名（版本号/变体统一归入主类）
TOOL_ALIASES: list[tuple[re.Pattern, str]] = [
    # OpenAI 系：ChatGPT、GPT-5.6 Sol、GPT-4o 等全部归入 ChatGPT
    (re.compile(r"(?<![\w-])(?:chat\s?gpt|gpt[\s-]?\d[\w.]*|gpt-?o\d?|"
                r"chatgpt(?:\s?sol)?|gpt(?:\s?sol)?)(?:\s?sol)?(?![\w-])"), "ChatGPT"),
    (re.compile(r"(?<![\w-])github[\s-]?copilot(?![\w-])"), "GitHub Copilot"),
    (re.compile(r"(?<![\w-])claude(?:[\s-]?\d[\w.]*)?(?:\s?(?:opus|sonnet|haiku))?"), "Claude"),
    (re.compile(r"(?<![\w-])gemini(?:[\s-]?\d[\w.]*)?(?:\s?(?:pro|ultra|flash))?"), "Gemini"),
    (re.compile(r"(?<![\w-])deep\s?seek(?:[\s-]?\d[\w.]*)?"), "DeepSeek"),
    (re.compile(r"(?<![\w-])perplexity(?![\w-])"), "Perplexity"),
    (re.compile(r"(?<![\w-])(?:meta[\s-]?)?llama(?:[\s-]?\d[\w.]*)?"), "Llama"),
    (re.compile(r"(?<![\w-])grok(?:[\s-]?\d[\w.]*)?"), "Grok"),
    (re.compile(r"(?<![\w-])qwen(?:[\s-]?\d[\w.]*)?"), "Qwen"),
    (re.compile(r"(?<![\w-])gemma(?:[\s-]?\d[\w.]*)?"), "Gemma"),
    (re.compile(r"(?<![\w-])mistral(?:[\s-]?\d[\w.]*)?"), "Mistral"),
]


def tool_regex() -> re.Pattern:
    return re.compile(
        "|".join(f"(?P<t{i}>{p.pattern})" for i, (p, _) in enumerate(TOOL_ALIASES)),
        re.IGNORECASE,
    )


TOOL_RE = tool_regex()

# 泛 AI 提法（不计入具体工具，计入 Unspecified AI）
GENERIC_RE = re.compile(
    r"(?i)(?<![\w-])(ai|a\.i\.|artificial\s+intelligence|llms?|large\s+language\s+model|"
    r"generative\s+(?:ai|tool|model)|language\s+model|foundation\s+model)(?![\w-])"
)


def load_disclosed(csv_path: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            sents = json.loads(row.get("sentences") or "[]")
            out[row["arxiv_id"].strip()] = {
                "sentences": sents,
                "n_sentences": int(row.get("n_sentences") or len(sents)),
            }
    return out


def pick_tool_sentences(sentences: list[str]) -> list[str]:
    return [s for s in sentences if TOOL_RE.search(s)]


def detect_tools(sentences: list[str]) -> list[str]:
    """返回归并后的主工具名列表（如 GPT-5.6 Sol -> ChatGPT）。"""
    found: set[str] = set()
    for s in sentences:
        for m in TOOL_RE.finditer(s):
            last = max(
                ((name, val) for name, val in m.groupdict().items() if val is not None),
                key=lambda kv: kv[1] != "",
                default=None,
            )
            if last:
                found.add(TOOL_ALIASES[int(last[0][1:])][1])
    return sorted(found)


def excerpt_of(sentences: list[str]) -> str:
    strong = pick_tool_sentences(sentences)
    s = (strong or sentences or [""])[0].strip()
    return (s[:220] + "…") if len(s) > 220 else s


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = ap.parse_args()
    src = args.source
    papers_root = src / "papers"
    csv_path = src / "disclosed_papers_final_v36.csv"

    disclosed = load_disclosed(csv_path)

    # 每个口径独立的计数器（工具/通用AI计数只在各自口径内累加）
    counters = {
        scope: {
            "total": 0,
            "disc": 0,
            "monthly_total": collections.Counter(),
            "monthly_disc": collections.Counter(),
            "tool_counter": collections.Counter(),
            "generic": 0,
        }
        for scope in ("primary", "any")
    }
    recent_rows: list[dict] = []
    tool_counter_global: collections.Counter[str] = collections.Counter()
    total_files = 0

    for aid in sorted(os.listdir(papers_root)):
        meta_p = papers_root / aid / "meta.json"
        try:
            meta = json.loads(meta_p.read_text(encoding="utf-8"))
        except Exception:
            continue
        total_files += 1
        month = (meta.get("published") or "")[:7]
        pc = meta.get("primary_category") or "unknown"
        cats = meta.get("categories") or [pc]
        math_cats = [c for c in cats if c.startswith("math")]

        # 总量先按口径计入（与是否披露无关）
        in_any = bool(math_cats)
        in_primary = pc.startswith("math")
        for scope, inside in (("primary", in_primary), ("any", in_any)):
            if inside:
                counters[scope]["total"] += 1
                counters[scope]["monthly_total"][month] += 1

        d = disclosed.get(aid)
        if not d:
            continue
        sents: list[str] = d["sentences"]
        tools = detect_tools(sents)
        named = tools or []
        # recent-papers: any 口径下的最新披露论文（primary 子域保留在字段里）
        recent_rows.append(
            {
                "id": aid,
                "title": (meta.get("title") or "").strip(),
                "authors": [a.get("name", "") for a in meta.get("authors", [])][:6],
                "subfield": pc,
                "mathCats": math_cats,
                "date": (meta.get("published") or "")[:10],
                "confidence": 1.0,
                "tools": named or ["Unspecified AI"],
                "context": "body",
                "excerpt": excerpt_of(sents),
            }
        )

        # 披露数按口径计入
        for scope, inside in (("primary", in_primary), ("any", in_any)):
            if not inside:
                continue
            c = counters[scope]
            c["disc"] += 1
            c["monthly_disc"][month] += 1
            if named:
                for t in named:
                    c["tool_counter"][t] += 1
                    tool_counter_global[t] += 1
            else:
                c["generic"] += 1

    # ---- monthly-trend.json / subfields.json：两口径各自独立 ----
    def scope_trend(c: dict) -> list[dict]:
        out = []
        for m in sorted(c["monthly_total"]):
            t, disc = c["monthly_total"][m], c["monthly_disc"][m]
            out.append(
                {
                    "month": m,
                    "total": t,
                    "disclosed": disc,
                    "pct": round(100 * disc / t, 2) if t else 0,
                }
            )
        return out

    def scope_subfield_counters() -> dict[str, tuple[collections.Counter, collections.Counter]]:
        res = {s: (collections.Counter(), collections.Counter()) for s in ("primary", "any")}
        for aid in sorted(os.listdir(papers_root)):
            meta_p = papers_root / aid / "meta.json"
            try:
                meta = json.loads(meta_p.read_text(encoding="utf-8"))
            except Exception:
                continue
            pc = meta.get("primary_category") or "unknown"
            cats = meta.get("categories") or [pc]
            math_cats = [c for c in cats if c.startswith("math")]
            is_disc = aid in disclosed
            for scope, inside, cat_list in (
                ("primary", pc.startswith("math"), [pc]),
                ("any", bool(math_cats), math_cats),
            ):
                if not inside:
                    continue
                ct, cd = res[scope]
                for cat in cat_list:
                    ct[cat] += 1
                    if is_disc:
                        cd[cat] += 1
        return res

    def build_subfield_rows(ct: collections.Counter, cd: collections.Counter) -> list[dict]:
        rows = []
        for pc, n in [(k, v) for k, v in ct.most_common() if k.startswith("math")][:12]:
            dcount = cd[pc]
            rows.append(
                {
                    "code": pc,
                    "name": CATEGORY_NAMES.get(pc, pc),
                    "total": n,
                    "disclosed": dcount,
                    "pct": round(100 * dcount / n, 2) if n else 0,
                }
            )
        rows.sort(key=lambda s: -s["pct"])
        return rows

    subfield_counters = scope_subfield_counters()
    subfields_data = {
        scope: build_subfield_rows(ct, cd) for scope, (ct, cd) in subfield_counters.items()
    }
    (OUT / "subfields.json").write_text(
        json.dumps(subfields_data, ensure_ascii=False, indent=2) + "\n"
    )

    trend_data = {scope: scope_trend(c) for scope, c in counters.items()}
    (OUT / "monthly-trend.json").write_text(
        json.dumps({"monthlyTrend": trend_data}, ensure_ascii=False, indent=2) + "\n"
    )

    # ---- ai-tools.json：两口径各自统计 ----
    def build_ai_tools(c: dict) -> list[dict]:
        tc: collections.Counter = c["tool_counter"]
        named = tc.most_common(TOP_TOOLS)
        other = sum(cnt for _, cnt in tc.most_common()[TOP_TOOLS:])
        total_mentions = sum(tc.values()) + c["generic"]
        rows = []
        for name, cnt in named:
            rows.append(
                {
                    "name": name,
                    "count": cnt,
                    "pct": round(100 * cnt / total_mentions, 2) if total_mentions else 0,
                    "color": TOOL_COLORS.get(name, "#6b6455"),
                }
            )
        if other:
            rows.append(
                {
                    "name": "Other LLMs",
                    "count": other,
                    "pct": round(100 * other / total_mentions, 2) if total_mentions else 0,
                    "color": TOOL_COLORS["Other LLMs"],
                }
            )
        rows.append(
            {
                "name": "Unspecified AI",
                "count": c["generic"],
                "pct": round(100 * c["generic"] / total_mentions, 2) if total_mentions else 0,
                "color": TOOL_COLORS["Unspecified AI"],
            }
        )
        return rows

    ai_tools_data = {scope: build_ai_tools(c) for scope, c in counters.items()}
    (OUT / "ai-tools.json").write_text(
        json.dumps({"aiTools": ai_tools_data}, ensure_ascii=False, indent=2) + "\n"
    )

    # ---- recent-papers.json：最新披露论文（含 mathCats 供前端按口径过滤）----
    recent_rows.sort(reverse=True, key=lambda r: (r["date"], r["id"]))
    recent = recent_rows[:16]
    (OUT / "recent-papers.json").write_text(
        json.dumps({"recentPapers": recent}, ensure_ascii=False, indent=2) + "\n"
    )

    # ---- stats.json：两口径各自的 KPI ----
    all_months = sorted({m for c in counters.values() for m in c["monthly_total"]})
    date_range = [all_months[0], all_months[-1]] if all_months else ["", ""]

    methodology = [
        {
            "step": "01",
            "title": "Data Collection",
            "body": "Papers harvested from arXiv math.* categories and parsed to full text (MinerU). Current snapshot covers the collection window; disclosed papers are identified in a one-pass offline scan.",
        },
        {
            "step": "02",
            "title": "Keyword Detection",
            "body": "Sentence-level regex matching for 30+ AI tool names and generic AI phrases over the parsed full text. A paper counts as disclosed when at least one sentence matches; evidence sentences are kept verbatim.",
        },
        {
            "step": "03",
            "title": "Classification",
            "body": "Matched sentences are scanned again for specific tool names (ChatGPT, Copilot, Claude, Gemini, …); papers without a specific mention fall back to generic AI. Planned: automated daily updates and monthly recomputation of the historical series (not yet implemented).",
        },
    ]

    def scope_stats(c: dict, trend_rows: list[dict]) -> dict:
        last = trend_rows[-1] if trend_rows else {"pct": 0}
        prev = trend_rows[-2] if len(trend_rows) > 1 else {"pct": 0}
        return {
            "totalPapers": c["total"],
            "totalDisclosed": c["disc"],
            "disclosedPct": round(100 * c["disc"] / max(c["total"], 1), 2),
            "monthlyGrowth": round(last["pct"] - prev["pct"], 2),
            "uniqueTools": len(c["tool_counter"]),
        }

    trend_data = {scope: scope_trend(c) for scope, c in counters.items()}
    stats = {
        "stats": {
            scope: scope_stats(c, trend_data[scope]) for scope, c in counters.items()
        },
        "dateRange": date_range,
        "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "methodology": methodology,
    }
    (OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n")

    n_primary = counters["primary"]["disc"]
    n_any = counters["any"]["disc"]
    print(f"files={total_files} disclosed primary={n_primary} any={n_any} months={len(all_months)}")
    for scope, c in counters.items():
        print(f"  [{scope}] papers={c['total']} disclosed={c['disc']} "
              f"tools={sum(c['tool_counter'].values())} generic={c['generic']}")
    for f in sorted(OUT.glob("*.json")):
        print("wrote", f)


if __name__ == "__main__":
    main()
