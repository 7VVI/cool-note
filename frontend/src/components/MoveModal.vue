<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  open: boolean
  node: any
  folders: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  move: [nodeId: string, targetFolderId: string | null]
}>()

const selectedFolderId = ref<string | null>(null)

// 构建文件夹树（用于选择）
const folderTree = computed(() => {
  if (!props.folders) return []
  const folders = props.folders.filter(f => f.id !== props.node?.id)

  // 构建树
  const nodeMap: Record<string, any> = {}
  folders.forEach(n => {
    nodeMap[n.id] = { ...n, children: [] }
  })

  const roots: any[] = []
  folders.forEach(n => {
    const node = nodeMap[n.id]
    if (n.parentId && nodeMap[n.parentId]) {
      nodeMap[n.parentId].children.push(node)
    } else {
      roots.push(node)
    }
  })

  // 排序
  function sortChildren(children: any[]) {
    children.sort((a, b) => (a.order || 0) - (b.order || 0))
    children.forEach(c => {
      if (c.children?.length) {
        sortChildren(c.children)
      }
    })
  }

  roots.sort((a, b) => (a.order || 0) - (b.order || 0))
  roots.forEach(r => {
    if (r.children?.length) {
      sortChildren(r.children)
    }
  })

  return roots
})

// 重置选择
watch(() => props.open, (open) => {
  if (open) {
    selectedFolderId.value = props.node?.parentId || null
  }
})

// 关闭弹窗
function handleClose() {
  emit('close')
}

// 移动
function handleMove() {
  if (props.node) {
    emit('move', props.node.id, selectedFolderId.value)
    emit('close')
  }
}

// 渲染文件夹选项
function renderFolderOption(folder: any, depth: number = 0): any[] {
  const options: any[] = []

  options.push({
    id: folder.id,
    name: folder.name,
    depth
  })

  if (folder.children?.length) {
    for (const child of folder.children) {
      options.push(...renderFolderOption(child, depth + 1))
    }
  }

  return options
}

// 扁平化的文件夹选项
const flatFolderOptions = computed(() => {
  const options: any[] = [{ id: null, name: '根目录', depth: 0 }]

  for (const folder of folderTree.value) {
    options.push(...renderFolderOption(folder))
  }

  return options
})
</script>

<template>
  <!-- 遮罩层 -->
  <div
    v-if="open"
    class="fixed inset-0 z-50"
    style="background: rgba(0,0,0,0.3); backdrop-filter: blur(2px);"
    @click="handleClose"
  ></div>

  <!-- 弹窗 -->
  <div
    v-if="open"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4"
  >
    <div
      class="rounded-xl shadow-2xl w-full max-w-sm animate-scale-in"
      style="background: #1c1c20; border: 1px solid #2e2e34;"
      @click.stop
    >
      <div class="p-5">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold" style="color: #e8e8ea;">移动到</h3>
          <button
            type="button"
            @click="handleClose"
            class="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
            style="color: #636370;"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <!-- 当前项目 -->
        <div class="mb-3 px-3 py-2 rounded-lg" style="background: #2a2a30;">
          <span class="text-[11px]" style="color: #636370;">当前：</span>
          <span class="text-sm font-medium" style="color: #c8c8cc;">{{ node?.type === 'folder' ? node.name : (node?.title || '无标题文档') }}</span>
        </div>

        <!-- 文件夹列表 -->
        <div
          class="max-h-[280px] overflow-y-auto rounded-lg mb-4"
          style="border: 1px solid #2e2e34; scrollbar-width: thin; scrollbar-color: #2e2e34 transparent;"
        >
          <div
            v-for="opt in flatFolderOptions"
            :key="opt.id || 'root'"
            @click="selectedFolderId = opt.id"
            class="px-3 py-2 cursor-pointer transition-colors flex items-center gap-2"
            :class="selectedFolderId === opt.id ? 'bg-accent' : ''"
            :style="{
              paddingLeft: opt.depth * 16 + 12 + 'px',
              background: selectedFolderId === opt.id ? 'rgba(191,138,94,0.15)' : 'transparent',
              color: selectedFolderId === opt.id ? '#bf8a5e' : '#a0a0a8'
            }"
          >
            <svg v-if="opt.id === null" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0" style="color: #636370;">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0" style="color: #bf8a5e;">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
            </svg>
            <span class="text-[13px]">{{ opt.name }}</span>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style="color: #a0a0a8;"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleMove"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style="background: #bf8a5e; color: white;"
          >
            移动
          </button>
        </div>
      </div>
    </div>
  </div>
</template>