<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";

const props = withDefaults(
  defineProps<{
    option: echarts.EChartsOption;
    loading?: boolean;
  }>(),
  { loading: false },
);

const el = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;

function render() {
  chart?.setOption(props.option, true);
}

onMounted(() => {
  if (!el.value) return;
  chart = echarts.init(el.value);
  render();
  observer = new ResizeObserver(() => chart?.resize());
  observer.observe(el.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  chart?.dispose();
  chart = null;
});

watch(
  () => props.option,
  () => render(),
  { deep: true },
);
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="el" class="h-full w-full" />
    <div
      v-if="loading"
      class="absolute inset-0 z-10 grid place-items-center font-mono text-xs text-[#8a8a82]"
    >
      loading data…
    </div>
  </div>
</template>
