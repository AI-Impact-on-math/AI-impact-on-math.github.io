<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="mb-4 flex items-center gap-3">
    <div class="h-4 w-1 bg-[#2563a8]" />
    <span class="font-mono text-xs uppercase tracking-widest text-[#63635c]">{{ title }}</span>
  </div>
</template>
