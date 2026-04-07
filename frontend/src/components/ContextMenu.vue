<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const menuRef = ref<HTMLDivElement | null>(null)

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    uiStore.closeContextMenu()
  }
}

// 调整位置（防止溢出）
function adjustPosition() {
  if (!menuRef.value) return

  const rect = menuRef.value.getBoundingClientRect()
  if (rect.right > window.innerWidth) {
    menuRef.value.style.left = (uiStore.contextMenu!.x - rect.width) + 'px'
  }
  if (rect.bottom > window.innerHeight) {
    menuRef.value.style.top = (uiStore.contextMenu!.y - rect.height) + 'px'
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  adjustPosition()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

function handleClick(item: any) {
  uiStore.closeContextMenu()
  if (item.fn) {
    item.fn()
  }
}
</script>

<template>
  <div
    v-if="uiStore.contextMenu"
    ref="menuRef"
    class="context-menu animate-fade-in"
    :style="{ left: uiStore.contextMenu.x + 'px', top: uiStore.contextMenu.y + 'px' }"
  >
    <template v-for="(item, i) in uiStore.contextMenu.items" :key="i">
      <!-- 分隔线 -->
      <div v-if="item.label === 'separator'" class="context-menu-separator"></div>

      <!-- 菜单项 -->
      <div
        v-else
        class="context-menu-item"
        :class="item.danger ? 'danger' : ''"
        @click="handleClick(item)"
      >
        <!-- 图标 -->
        <svg
          v-if="item.icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          :class="item.danger ? 'text-red-500' : 'text-ink-400'"
        >
          <!-- 编辑/重命名 -->
          <template v-if="item.icon === 'edit'">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </template>
          <!-- 移动 -->
          <template v-else-if="item.icon === 'move'">
            <path d="M12 2v10"/>
            <path d="m18 8-6 6-6-6"/>
            <path d="M4 14v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>
          </template>
          <!-- 导出 -->
          <template v-else-if="item.icon === 'export'">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </template>
          <!-- 新建文件夹 -->
          <template v-else-if="item.icon === 'folderPlus'">
            <path d="M12 10v6"/>
            <path d="M9 13h6"/>
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
          </template>
          <!-- 新建文档 -->
          <template v-else-if="item.icon === 'filePlus'">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            <path d="M12 12v6"/>
            <path d="M9 15h6"/>
          </template>
          <!-- 删除 -->
          <template v-else-if="item.icon === 'trash'">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </template>
          <!-- 默认图标 -->
          <template v-else>
            <circle cx="12" cy="12" r="1"/>
          </template>
        </svg>

        <!-- 文字 -->
        <span>{{ item.label }}</span>
      </div>
    </template>
  </div>
</template>