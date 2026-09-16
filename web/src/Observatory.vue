<script setup lang="ts">
import { ref } from "vue";
import AppShell from "@/AppShell.vue";
import Dashboard from "@/components/Dashboard.vue";
import { loadObservatoryData } from "@/lib/data";
import type { ObservatoryData } from "@/types";

const data = ref<ObservatoryData | null>(null);
const error = ref<string | null>(null);

loadObservatoryData()
  .then((d) => (data.value = d))
  .catch((e) => (error.value = e instanceof Error ? e.message : String(e)));

</script>

<template>
  <Dashboard v-if="data" v-bind="data" />
  <AppShell v-else :is-error="error !== null" :message="error" />
</template>
