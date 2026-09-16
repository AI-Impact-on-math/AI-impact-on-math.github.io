<script setup lang="ts">
import katex from "katex";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    text: string;
    displayMode?: boolean;
  }>(),
  { displayMode: false },
);

function renderMath(src: string, displayMode: boolean): string {
  try {
    return katex.renderToString(src, {
      displayMode,
      throwOnError: true,
      strict: false,
      output: "html",
    });
  } catch {
    return "";
  }
}

// 把混合文本拆成 普通文本 / $...$ 行内式 / $$...$$ 展示式 三类分段
const segments = computed(() => {
  const out: { kind: "text" | "math"; value: string; html?: string }[] = [];
  const re = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(props.text)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: props.text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "math", value: m[1] });
    else out.push({ kind: "math", value: m[2] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < props.text.length) out.push({ kind: "text", value: props.text.slice(last) });
  return out.map((seg) =>
    seg.kind === "math"
      ? { kind: seg.kind, value: seg.value, html: renderMath(seg.value, props.displayMode) }
      : seg,
  );
});
</script>

<template>
  <span class="katex-inline">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.kind === 'text'">{{ seg.value }}</span>
      <span v-else-if="seg.html" v-html="seg.html" />
      <!-- 公式解析失败时回退为原文（含 $ 定界符） -->
      <span v-else class="katex-fallback">
        {{ seg.kind === "math" && displayMode ? `$$${seg.value}$$` : `$${seg.value}$` }}
      </span>
    </template>
  </span>
</template>

<style>
@import "katex/dist/katex.min.css";

.katex-inline {
  white-space: normal;
  font-size: 1em;
}
.katex {
  font-size: 1.06em;
}
.katex-fallback {
  color: inherit;
}
</style>
