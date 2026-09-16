<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}>();

const valueColor = computed(() => props.accent ?? "#23272e");
</script>

<template>
  <div class="flex flex-col gap-1 border border-[#ddddda] bg-[#fcfcfa] p-5">
    <div class="font-mono text-xs uppercase tracking-widest text-[#8a8a82]">{{ label }}</div>
    <div class="font-serif text-4xl leading-none" :style="{ color: valueColor }">{{ value }}</div>
    <div v-if="sub" class="mt-1 font-mono text-xs text-[#63635c]">{{ sub }}</div>
  </div>
</template>
