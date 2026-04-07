<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Props {
  tabs: string[]
  activeId: string | null
  docMap: Record<string, any>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
}>()

const scrollRef = ref<HTMLDivElement | null>(null)

// 滚动到活动标签
watch(() => props.activeId, () => {
  nextTick(scrollToActive)
})

function scrollToActive() {
  if (!scrollRef.value) return

  const tabs = scrollRef.value.querySelectorAll('.tab')
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i].classList.contains('active')) {
      tabs[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      break
    }
  }
}

function nextTick(fn: () => void) {
  setTimeout(fn, 0)
}
</script>

<template>
  <div
    v-if="tabs.length > 0"
    class="h-[42px] flex items-stretch px-1 gap-[2px] overflow-x-auto"
    style="background: #ffffff; border-bottom: 1px solid #e8e6e2; scrollbar-width: none;"
  >
    <!-- 移动端切换按钮 -->
    <button class="hidden md:hidden w-9 h-9 items-center justify-center rounded-sm" style="color: #8e8e92;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="4" x2="20" y1="12" y2="12"/>
        <line x1="4" x2="20" y1="6" y2="6"/>
        <line x1="4" x2="20" y1="18" y2="18"/>
      </svg>
    </button>

    <div ref="scrollRef" class="flex overflow-x-auto" style="scrollbar-width: none;">
      <div
        v-for="tabId in tabs"
        :key="tabId"
        class="tab"
        :class="tabId === activeId ? 'active' : ''"
        @click="emit('select', tabId)"
      >
        <!-- 文档图标 -->
        <span class="tab-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          </svg>
        </span>

        <!-- 标题 -->
        <span class="overflow-hidden text-ellipsis max-w-[120px]">
          {{ docMap[tabId]?.title || '无标题文档' }}
        </span>

        <!-- 未读标记 -->
        <span v-if="tabId !== activeId && docMap[tabId]?.hasUnsavedChanges" class="tab-dot"></span>

        <!-- 关闭按钮 -->
        <span
          class="tab-close"
          @click.stop="emit('close', tabId)"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 42px;
  font-size: 12.5px;
  color: #8e8e92;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  position: relative;
  user-select: none;
}

.tab:hover {
  color: #2c2c2e;
  background: rgba(191,138,94,0.08);
}

.tab.active {
  color: #2c2c2e;
  border-bottom-color: #bf8a5e;
}

.tab .tab-icon {
  font-size: 13px;
  opacity: 0.5;
  display: flex;
  align-items: center;
}

.tab.active .tab-icon {
  opacity: 0.8;
  color: #bf8a5e;
}

.tab .tab-close {
  width: 16px;
  height: 16px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  color: #8e8e92;
  background: none;
  cursor: pointer;
  margin-left: 2px;
}

.tab:hover .tab-close {
  display: flex;
  opacity: 0.6;
}

.tab .tab-close:hover {
  opacity: 1;
  background: rgba(0,0,0,0.06);
}

.tab .tab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bf8a5e;
  margin-left: 4px;
  flex-shrink: 0;
}

::-webkit-scrollbar {
  display: none;
}
</style>