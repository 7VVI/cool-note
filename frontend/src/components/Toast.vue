<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
</script>

<template>
  <div class="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
    <div
      v-for="toast in uiStore.toasts"
      :key="toast.id"
      class="animate-slide-right px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2"
      :class="toast.type === 'success' ? 'bg-ink-900 text-white' : 'bg-red-600 text-white'"
    >
      <svg v-if="toast.type === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      {{ toast.msg }}
    </div>
  </div>
</template>