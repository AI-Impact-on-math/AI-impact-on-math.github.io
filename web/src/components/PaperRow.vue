<script setup lang="ts">
import LatexText from "@/components/LatexText.vue";
import type { RecentPaper, AiTool } from "@/types";

const props = defineProps<{
  paper: RecentPaper;
  tools: AiTool[];
}>();

const MUTED = "#8a8a82";
const BLUE = "#2563a8";

function toolColor(name: string) {
  const key = name.split(" ")[0];
  const found = props.tools.find((a) => a.name.includes(key));
  return found?.color ?? MUTED;
}
</script>

<template>
  <div class="group border-b border-[#ddddda] transition-colors last:border-0 hover:bg-[#edecdf]">
    <div
      class="grid items-start px-4 py-3"
      style="grid-template-columns: 7rem 1fr 8rem 6rem"
    >
      <div class="font-mono text-xs" :style="{ color: BLUE }">
        <a
          :href="`https://arxiv.org/abs/${paper.id}`"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
          >{{ paper.id }}</a
        >
        <div class="mt-0.5 text-[10px] text-[#8a8a82]">{{ paper.date }}</div>
      </div>
      <div class="pr-4">
        <a
          :href="`https://arxiv.org/abs/${paper.id}`"
          target="_blank"
          rel="noopener noreferrer"
          class="mb-1 block text-sm leading-snug text-[#23272e] hover:text-[#2563a8] hover:underline"
        >
          <LatexText :text="paper.title" />
        </a>
        <div class="font-mono text-[10px] text-[#8a8a82]">{{ paper.authors.join(", ") }}</div>
        <div class="mt-1 line-clamp-2 font-mono text-[10px] italic leading-relaxed text-[#a9a99e]">
          "{{ paper.excerpt }}"
        </div>
      </div>
      <div class="flex flex-col items-start gap-1">
        <span
          v-for="t in paper.tools"
          :key="t"
          class="w-fit border px-1.5 py-0.5 font-mono text-[10px]"
          :style="{
            color: toolColor(t),
            borderColor: toolColor(t) + '44',
            background: toolColor(t) + '11',
          }"
        >
          {{ t }}
        </span>
      </div>
      <div class="font-mono text-xs text-[#63635c]">{{ paper.subfield }}</div>
    </div>
  </div>
</template>
