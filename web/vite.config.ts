import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // GitHub Pages 用户/组织主站部署在根路径；如用子路径部署，用 --mode=pages 切换
  base: mode === "pages" ? "/AI-impact-on-math.github.io/" : "/",
  build: {
    // 产出纯静态站点，数据在 public/data 下按原样拷贝
    outDir: "dist",
    assetsInlineLimit: 2048,
  },
}));
