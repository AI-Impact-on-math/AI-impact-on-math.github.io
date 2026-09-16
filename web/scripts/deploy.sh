#!/usr/bin/env bash
# 构建前端并把 web/dist 作为独立历史推送到 GitHub Pages 仓库。
# Pages 仓库: https://github.com/AI-Impact-on-math/AI-impact-on-math.github.io
# 用法: bash scripts/deploy.sh [commit message]
set -euo pipefail

cd "$(dirname "$0")/.."

PAGES_REPO="https://AI-Impact-on-math@github.com/AI-Impact-on-math/AI-impact-on-math.github.io.git"
DEPLOY_DIR="dist-deploy"
MSG="${1:-deploy: update site $(date +%F\ %H:%M)}"

npm run build

rm -rf "$DEPLOY_DIR"
git clone --depth 1 "$PAGES_REPO" "$DEPLOY_DIR"

# 清空旧产物但保留 git 与可能的 Pages 配置文件
find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

cp -R dist/. "$DEPLOY_DIR"/
touch "$DEPLOY_DIR/.nojekyll"  # 跳过 Jekyll 处理，保留下划线等静态资源

cd "$DEPLOY_DIR"
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "$MSG"
  git push origin HEAD
  echo "deployed -> https://ai-impact-on-math.github.io/"
else
  echo "no changes to deploy"
fi
