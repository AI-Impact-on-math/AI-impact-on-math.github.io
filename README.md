# AI Impact Observatory（Vue 版）

基于 `docs/design/AI in Mathematics Webpage` 的设计稿，用 Vue 3 重构的静态数据观测页面：追踪 arXiv `math.*` 分类预印本中 AI 工具使用披露情况。

**线上地址**：<https://ai-impact-on-math.github.io/>

## 技术栈

- Vue 3 + TypeScript（`<script setup>`）
- Vite 7 构建，产物为纯静态站点（`dist/`）
- Tailwind CSS v4（数据科学主题：纸白底 / 图表蓝主色 / Okabe-Ito 色盲安全强调色）
- ECharts 6（折线 / 条形 / 环形图）、KaTeX（标题 LaTeX 公式渲染）

## 统计口径

页面右上角可全局切换两种口径，KPI、全部图表与论文列表联动：

- **Primary math.* only** — 主分类（primary_category）属于 `math.*` 的论文，一篇只计一次
- **Any category incl. math.*** — `categories` 中含任一 `math.*` 即计入，交叉列表会在多个子域重复计数

## 数据约定

所有数据存放在 **`web/public/data/`** 目录（由 `web/scripts/build-data.py` 从上游解析数据生成），页面运行时通过 `fetch` 加载，均为 `{"primary": ..., "any": ...}` 双口径结构：

| 文件 | 内容 |
| --- | --- |
| `monthly-trend.json` | 月度趋势（总数、披露数、披露率） |
| `subfields.json` | math.* 子领域披露率（各类前 12） |
| `ai-tools.json` | AI 工具分布 |
| `recent-papers.json` | 近期披露 AI 使用的论文（含 `mathCats`） |
| `stats.json` | 双口径 KPI、时间区间与方法论文案 |

重新生成数据：

```bash
python3 web/scripts/build-data.py --source <arxiv-math-parsed 目录>
```

详见 `web/public/data/README.md`。

## 开发与构建

```bash
cd web
npm install
npm run dev       # 开发服务器
npm run build     # 类型检查 + 构建到 dist/
npm run preview   # 本地预览 dist/
```

## 部署

GitHub Pages 仓库：<https://github.com/AI-Impact-on-math/AI-impact-on-math.github.io>（构建产物推送至其 `main` 分支根目录）。

```bash
cd web
bash scripts/deploy.sh "可选提交说明"   # 构建 + 推送到 Pages 仓库
```
