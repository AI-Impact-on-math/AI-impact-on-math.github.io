<script setup lang="ts">
defineProps<{ isError?: boolean; message?: string | null }>();
</script>

<template>
  <div class="flex h-full items-center justify-center bg-[#f6f5f1]">
    <div
      v-if="isError"
      class="border border-[#ddddda] bg-[#fcfcfa] p-6 font-mono text-xs text-[#b53232]"
    >
      {{ message }}
    </div>
    <div v-else class="font-mono text-xs text-[#8a8a82]">loading observatory data…</div>
  </div>
</template>
