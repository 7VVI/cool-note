<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  node: any
  depth: number
  activeId: string | null
  activeFolderId: string | null
  dragId: string | null
  dropId: string | null
  autoRenameId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
  toggle: [id: string]
  rename: [{ id: string; name: string }]
  renameDone: []
  delete: [id: string]
  createDoc: [parentId: string]
  move: [nodeId: string, targetId: string | null]
  exportDoc: [node: any]
  dragStart: [id: string]
  dragOver: [id: string]
  drop: [id: string]
  dragLeave: []
  folderSelect: [folderId: string]
}>()

const renaming = ref(false)
const renameValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

const isFolder = computed(() => props.node.type === 'folder')
const isDoc = computed(() => props.node.type === 'doc')
const isActive = computed(() => {
  if (isDoc.value) return props.node.id === props.activeId
  if (isFolder.value) return props.node.id === props.activeFolderId
  return false
})
const isDragOver = computed(() => props.dropId === props.node.id && props.dragId && props.dragId !== props.node.id)

// 子节点数量
const childCount = computed(() => {
  if (!isFolder.value) return 0
  return props.node.children?.length || 0
})

// 监听 autoRenameId
watch(() => props.autoRenameId, (newId) => {
  if (newId === props.node.id && !renaming.value) {
    nextTick(() => {
      startRename()
    })
  }
})

// 开始重命名
function startRename() {
  renameValue.value = isFolder.value ? props.node.name : (props.node.title || '')
  renaming.value = true
  dropdownOpen.value = false
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  })
}

// 完成重命名
function finishRename() {
  if (!renaming.value) return
  renaming.value = false

  const newName = renameValue.value.trim()
  if (newName) {
    emit('rename', { id: props.node.id, name: newName })
  }
  emit('renameDone')
}

// 取消重命名
function cancelRename() {
  renaming.value = false
  renameValue.value = isFolder.value ? props.node.name : (props.node.title || '')
  emit('renameDone')
}

// 创建文档
function handleCreateDoc(e: MouseEvent) {
  e.stopPropagation()
  emit('createDoc', props.node.id)
}

// 切换下拉菜单
function toggleDropdown(e: MouseEvent) {
  e.stopPropagation()
  dropdownOpen.value = !dropdownOpen.value
}

// 点击外部关闭下拉菜单
function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false
  }
}

// 菜单项操作
function handleRename() {
  dropdownOpen.value = false
  startRename()
}

function handleDelete() {
  dropdownOpen.value = false
  emit('delete', props.node.id)
}

function handleMove() {
  dropdownOpen.value = false
  emit('move', props.node.id, null)
}

function handleExport() {
  dropdownOpen.value = false
  emit('exportDoc', props.node)
}

// 拖拽事件
function handleDragStart(e: DragEvent) {
  e.dataTransfer!.effectAllowed = 'move'
  emit('dragStart', props.node.id)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  emit('dragOver', props.node.id)
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  emit('drop', props.node.id)
}

// 分享标签
const shareTag = computed(() => {
  if (!isDoc.value || !props.node.shareSettings?.enabled) return null
  return props.node.shareSettings.mode === 'password' ? '密码保护' : '已分享'
})

// 文件夹是否展开
const isOpen = computed(() => !props.node.collapsed)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div>
    <!-- 行 -->
    <div
      :data-node-id="node.id"
      class="nav-item group"
      :class="[
        isFolder ? 'folder' : '',
        isActive ? 'active' : '',
        isDragOver ? 'drag-over' : '',
        isFolder && isOpen ? 'open' : ''
      ]"
      :style="{ paddingLeft: depth * 16 + 12 + 'px' }"
      draggable="true"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @dragleave="emit('dragLeave')"
      @drop="handleDrop"
      @click="isFolder ? (emit('toggle', node.id), emit('folderSelect', node.id)) : emit('select', node.id)"
      @dblclick="startRename"
    >
      <!-- 折叠箭头（文件夹） -->
      <i
        v-if="isFolder"
        class="chevron text-[12px] transition-transform duration-[0.25s]"
        :class="isOpen ? 'rotate-90' : ''"
        style="color: #636370;"
        @click.stop="emit('toggle', node.id)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </i>

      <!-- 图标 -->
      <span class="item-icon">
        <!-- 文件夹图标 - 黄色填充 -->
        <svg v-if="isFolder" width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
        </svg>
        <!-- 文档图标 - 实心书本 -->
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="#e8e0d0" stroke="#bf8a5e" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 1.5 17V5A2.5 2.5 0 0 1 4 2.5h4a4 4 0 0 1 3 1.35A4 4 0 0 1 14 2.5h4A2.5 2.5 0 0 1 20.5 5v12a2.5 2.5 0 0 1-2.5 2.5h-4a4 4 0 0 0-3-1.35 4 4 0 0 0-3 1.35H4z"/>
          <path d="M12 3.5v16" stroke-width="1" stroke="#d4c4b0"/>
        </svg>
      </span>

      <!-- 名称 -->
      <input
        v-if="renaming"
        ref="inputRef"
        v-model="renameValue"
        class="flex-1 min-w-0 text-[13px] rounded-sm px-1.5 py-0.5 focus:outline-none"
        style="background: #2a2a30; border: 1px solid #bf8a5e; color: #e8e8ea;"
        @blur="finishRename"
        @keyup.enter="finishRename"
        @keyup.escape="cancelRename"
      />
      <span v-else class="item-label">
        {{ isFolder ? node.name : (node.title || '无标题文档') }}
      </span>

      <!-- 子项数量（文件夹） -->
      <span v-if="isFolder && childCount > 0 && !renaming" class="item-count">
        {{ childCount }}
      </span>

      <!-- 更多按钮 -->
      <div v-if="!renaming" class="relative" ref="dropdownRef">
        <button
          class="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style="color: #636370;"
          :class="dropdownOpen ? 'opacity-100' : ''"
          @click="toggleDropdown"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>

        <!-- 下拉菜单 -->
        <div
          v-if="dropdownOpen"
          class="absolute right-0 top-full mt-1 z-50 animate-menu-in"
          style="background: #2a2a30; border: 1px solid #2e2e34; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); min-width: 140px; padding: 4px;"
        >
          <!-- 重命名 -->
          <div
            class="flex items-center gap-2 px-3 py-2 text-[13px] rounded-sm cursor-pointer transition-colors"
            style="color: #a0a0a8;"
            @click="handleRename"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
            重命名
          </div>

          <!-- 移动 -->
          <div
            class="flex items-center gap-2 px-3 py-2 text-[13px] rounded-sm cursor-pointer transition-colors"
            style="color: #a0a0a8;"
            @click="handleMove"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v10"/>
              <path d="m18 8-6 6-6-6"/>
              <path d="M4 14v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>
            </svg>
            移动到...
          </div>

          <!-- 导出（仅文档） -->
          <div
            v-if="isDoc"
            class="flex items-center gap-2 px-3 py-2 text-[13px] rounded-sm cursor-pointer transition-colors"
            style="color: #a0a0a8;"
            @click="handleExport"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            导出为 .md
          </div>

          <!-- 分隔线 -->
          <div class="h-px my-1" style="background: #2e2e34; margin-left: 8px; margin-right: 8px;"></div>

          <!-- 删除 -->
          <div
            class="flex items-center gap-2 px-3 py-2 text-[13px] rounded-sm cursor-pointer transition-colors"
            style="color: #c75050;"
            @click="handleDelete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" x2="10" y1="11" y2="17"/>
              <line x1="14" x2="14" y1="11" y2="17"/>
            </svg>
            删除
          </div>
        </div>
      </div>
    </div>

    <!-- 子节点 -->
    <div
      v-if="isFolder && isOpen && node.children?.length"
      class="overflow-hidden"
      style="padding-left: 16px;"
    >
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        :active-folder-id="activeFolderId"
        :drag-id="dragId"
        :drop-id="dropId"
        :auto-rename-id="autoRenameId"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @rename="emit('rename', $event)"
        @rename-done="emit('renameDone')"
        @delete="emit('delete', $event)"
        @create-doc="emit('createDoc', $event)"
        @move="emit('move', $event, null)"
        @export-doc="emit('exportDoc', $event)"
        @drag-start="emit('dragStart', $event)"
        @drag-over="emit('dragOver', $event)"
        @drop="emit('drop', $event)"
        @drag-leave="emit('dragLeave')"
        @folder-select="emit('folderSelect', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
  position: relative;
}

.nav-item:hover {
  background: #2a2a30;
}

.nav-item.active {
  background: #333339;
  color: #e8e8ea;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: #bf8a5e;
  border-radius: 0 3px 3px 0;
}

.nav-item .item-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #636370;
  flex-shrink: 0;
}

.nav-item.active .item-icon {
  color: #bf8a5e;
}

.nav-item .item-label {
  font-size: 13px;
  font-weight: 500;
  color: #a0a0a8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.nav-item.active .item-label {
  color: #e0e0e2;
  font-weight: 600;
}

.nav-item .item-count {
  font-size: 10px;
  color: #636370;
  background: #1c1c20;
  padding: 1px 6px;
  border-radius: 10px;
}

.drag-over {
  background: rgba(191,138,94,0.15) !important;
  outline: 2px dashed #bf8a5e !important;
  outline-offset: -2px !important;
}

.nav-item.folder .chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 下拉菜单项hover */
.dropdown-item:hover {
  background: #333339;
}

.dropdown-item:hover {
  background: rgba(191,138,94,0.08);
}
</style>