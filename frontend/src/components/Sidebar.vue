<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TreeNode from './TreeNode.vue'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import { useDocumentStore } from '@/stores/document'

interface Props {
  open: boolean
  nodes: any[]
  activeId: string | null
  blocks: any[]
  autoRenameId: string | null
  activeDocContent: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleSidebar: []
  select: [id: string]
  createFolder: [name: string, parentId?: string]
  createDoc: [title?: string, content?: string, parentId?: string]
  delete: [id: string]
  rename: [id: string, name: string]
  renameDone: []
  toggle: [id: string]
  move: [id: string, parentId: string | null]
  showMoveModal: [node: any]
  exportDoc: [node: any]
  kbChange: [kbId: string | null]
  folderSelect: [folderId: string]
}>()

const uiStore = useUiStore()
const userStore = useUserStore()
const docStore = useDocumentStore()

const search = ref('')
const dragId = ref<string | null>(null)
const dropId = ref<string | null>(null)
const activeOutlineId = ref<string | null>(null)

// 知识库相关状态
const currentKbId = ref<string | null>(null)
const activeFolderId = ref<string | null>(null)
const kbColors = ['#5a7a6a', '#7a5a6a', '#6a6a5a', '#5a6a7a', '#7a6a5a', '#6a5a7a']
const kbIcons = ['folder', 'bookmark', 'book-open', 'code', 'palette', 'lightbulb']

// 构建树形结构（根据 parentId）
function buildTree(parentId: string | null = null): any[] {
  const children = props.nodes.filter(n => n.parentId === parentId)
  return children.map(node => ({
    ...node,
    children: node.type === 'folder' ? buildTree(node.id) : []
  })).sort((a, b) => (a.order || 0) - (b.order || 0))
}

// 知识库列表
const knowledgeBases = computed(() => {
  // 根据文件夹生成知识库（根文件夹 = 没有parentId的文件夹）
  const rootFolders = props.nodes.filter(n => n.type === 'folder' && !n.parentId)
  return rootFolders.map((folder, index) => {
    // 构建该知识库的子节点
    const children = buildTree(folder.id)
    return {
      id: folder.id,
      name: folder.name,
      color: kbColors[index % kbColors.length],
      icon: kbIcons[index % kbIcons.length],
      children,
      docCount: countDocs(children)
    }
  })
})

// 当前知识库
const currentKb = computed(() => {
  if (!currentKbId.value) return null
  return knowledgeBases.value.find(kb => kb.id === currentKbId.value)
})

// 当前显示的树（知识库内或全部）
const displayTree = computed(() => {
  if (currentKbId.value) {
    // 返回当前知识库的子节点
    return buildTree(currentKbId.value)
  }
  return tree.value
})

// 计算文档数量
function countDocs(items: any[]): number {
  let count = 0
  for (const item of items) {
    if (item.type === 'doc') count++
    if (item.children) count += countDocs(item.children)
  }
  return count
}

// 进入知识库
function enterKb(kbId: string) {
  currentKbId.value = kbId
  emit('kbChange', kbId)
}

// 返回知识库列表
function backToKbList() {
  currentKbId.value = null
  activeFolderId.value = null
  emit('kbChange', null)
}

// 新建知识库
function handleCreateKb() {
  emit('createFolder', '新建知识库')
}

// 解析Markdown标题
interface Heading {
  level: number
  text: string
  id: string
}

const outline = computed<Heading[]>(() => {
  if (!props.activeDocContent) return []
  const headings: Heading[] = []
  const lines = props.activeDocContent.split('\n')
  let headingIndex = 0

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = `heading-${headingIndex++}`
      headings.push({ level, text, id })
    }
  }
  return headings
})

// 构建树形结构
const tree = computed(() => {
  let filtered = props.nodes
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    filtered = props.nodes.filter(n => {
      if (n.type === 'folder') return n.name.toLowerCase().includes(q)
      return (n.title || '').toLowerCase().includes(q)
    })
  }

  const nodeMap: Record<string, any> = {}
  filtered.forEach(n => { nodeMap[n.id] = { ...n, children: [] } })

  const roots: any[] = []
  filtered.forEach(n => {
    const node = nodeMap[n.id]
    if (n.parentId && nodeMap[n.parentId]) {
      nodeMap[n.parentId].children.push(node)
    } else {
      roots.push(node)
    }
  })

  function sortChildren(children: any[]) {
    children.sort((a, b) => (a.order || 0) - (b.order || 0))
    children.forEach(c => { if (c.children?.length) sortChildren(c.children) })
  }

  roots.sort((a, b) => (a.order || 0) - (b.order || 0))
  roots.forEach(r => { if (r.children?.length) sortChildren(r.children) })

  return roots
})

// 拖拽事件
function handleDragStart(id: string) { dragId.value = id }
function handleDragOver(id: string) { if (dragId.value && dragId.value !== id) dropId.value = id }
function handleDrop(id: string) {
  if (dragId.value && dragId.value !== id) emit('move', dragId.value, id)
  dragId.value = null
  dropId.value = null
}
function handleDragLeave() { dropId.value = null }
function handleRootDrop() {
  if (dragId.value) emit('move', dragId.value, null)
  dragId.value = null
  dropId.value = null
}

// 处理移动事件
function handleMove(nodeId: string) {
  const node = props.nodes.find(n => n.id === nodeId)
  if (node) emit('showMoveModal', node)
}

// 处理导出事件
function handleExportDoc(node: any) { emit('exportDoc', node) }

// 创建文件夹
function handleCreateFolder() {
  // 如果有选中的文件夹，创建在该文件夹下；否则创建在当前知识库根目录
  const parentId = activeFolderId.value || currentKbId.value || null
  emit('createFolder', '新建文件夹', parentId)
}

// 处理文件夹选中
function handleFolderSelect(folderId: string) {
  activeFolderId.value = folderId
}

// 创建文档
function handleCreateDoc() { emit('createDoc', '', '', currentKbId.value || null) }

// 点击大纲项
function handleOutlineClick(heading: Heading) {
  activeOutlineId.value = heading.id
  const vditorEl = document.querySelector('.vditor-wysiwyg')
  if (vditorEl) {
    const headings = vditorEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let currentIndex = 0
    for (const h of headings) {
      if (currentIndex === parseInt(heading.id.replace('heading-', ''))) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
      currentIndex++
    }
  }
}

// 点击空白区域关闭右键菜单
function handleClick(e: MouseEvent) {
  if (uiStore.contextMenu) uiStore.closeContextMenu()
}

// 获取用户名首字母
const userInitial = computed(() => {
  const name = userStore.user?.username || '用户'
  return name.charAt(0).toUpperCase()
})

onMounted(() => document.addEventListener('click', handleClick))
onUnmounted(() => document.removeEventListener('click', handleClick))
</script>

<template>
  <div
    class="h-full flex flex-col transition-all duration-300 relative"
    :class="open ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 overflow-hidden'"
    style="background: #19191d; border-right: 1px solid #2a2a30;"
  >
    <!-- Resize手柄 -->
    <div v-if="open" class="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize z-[11] hover:opacity-20 hover:rounded-[3px]" style="hover:background: #c4875a;"></div>

    <!-- Header -->
    <div class="px-[18px] pt-[18px] pb-[14px] flex items-center gap-[10px]" v-if="open">
      <div class="w-7 h-7 rounded-sm flex items-center justify-center text-white font-bold text-sm" style="background: linear-gradient(135deg, #c4875a, #d4a574); font-family: 'Noto Serif SC', serif;">N</div>
      <span class="text-[15px] font-semibold" style="color: #e8e8ea; letter-spacing: 0.3px;">笔记本</span>
    </div>

    <!-- Search -->
    <div class="mx-[14px] mb-3 relative" v-if="open">
      <svg class="absolute left-[9px] top-1/2 -translate-y-1/2 w-[13px] h-[13px]" style="color: #5c5c66;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input type="text" v-model="search" placeholder="搜索知识库或文档..." class="w-full h-8 rounded-sm px-[10px] pl-[32px] text-[12.5px] outline-none transition-all" style="background: #252529; border: 1px solid transparent; color: #c8c8cc;" />
      <span class="absolute right-[7px] top-1/2 -translate-y-1/2 text-[9.5px] px-[5px] py-[2px] rounded" style="color: #5c5c66; background: #19191d; border: 1px solid #2a2a30;">⌘K</span>
    </div>

    <!-- 知识库列表视图 -->
    <div v-if="open && !currentKbId" class="flex-1 flex flex-col overflow-hidden">
      <div class="px-[16px] pb-[10px] flex items-center justify-between">
        <span class="text-[11px] font-semibold uppercase tracking-wider" style="color: #5c5c66;">知识库</span>
        <button @click="handleCreateKb" class="h-[26px] px-[10px] rounded-sm flex items-center gap-[4px] text-[11px] transition-all" style="border: 1px dashed #2a2a30; color: #5c5c66; background: transparent;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          新建
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-[12px] pb-3 flex flex-col gap-[6px]" style="scrollbar-width: thin; scrollbar-color: #2a2a30 transparent;">
        <!-- 知识库卡片 -->
        <div
          v-for="kb in knowledgeBases"
          :key="kb.id"
          @click="enterKb(kb.id)"
          class="flex items-center gap-3 p-[14px] rounded-[10px] cursor-pointer transition-all relative overflow-hidden group"
          style="background: transparent;"
        >
          <div class="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm opacity-60 group-hover:opacity-100 transition-opacity" :style="{ background: kb.color }"></div>
          <div class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-base text-white flex-shrink-0 transition-transform group-hover:scale-105" :style="{ background: kb.color }">
            <svg v-if="kb.icon === 'folder'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
            </svg>
            <svg v-else-if="kb.icon === 'bookmark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[13.5px] font-semibold truncate" style="color: #dddde0;">{{ kb.name }}</div>
            <div class="text-[11px] flex items-center gap-[6px]" style="color: #5c5c66;">
              <span class="flex items-center gap-[3px]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                </svg>
                {{ kb.docCount }} 篇
              </span>
            </div>
          </div>
          <!-- 删除按钮 -->
          <button
            @click.stop="emit('delete', kb.id)"
            class="w-7 h-7 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
            style="color: #c75050;"
            title="删除知识库"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>

        <!-- 空状态 -->
        <div v-if="knowledgeBases.length === 0" class="flex-1 flex flex-col items-center justify-center py-10" style="color: #5c5c66;">
          <svg class="w-8 h-8 opacity-25 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <p class="text-xs text-center leading-relaxed">还没有知识库<br>点击右上角「新建」创建第一个</p>
        </div>
      </div>
    </div>

    <!-- 知识库内部视图（目录树） -->
    <div v-if="open && currentKbId" class="flex-1 flex flex-col overflow-hidden">
      <div class="px-[14px] pb-[10px]">
        <button @click="backToKbList" class="flex items-center gap-[6px] px-[10px] py-2 rounded-sm cursor-pointer text-[12.5px] transition-all w-full" style="color: #9e9ea6;">
          <svg class="transition-transform group-hover:-translate-x-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          返回知识库
        </button>
        <div class="flex items-center gap-[10px] px-[10px] pt-1 pb-[10px]">
          <div v-if="currentKb" class="w-8 h-8 rounded-sm flex items-center justify-center text-sm text-white flex-shrink-0" :style="{ background: currentKb.color }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
            </svg>
          </div>
          <div>
            <div v-if="currentKb" class="text-sm font-bold -tracking-wide" style="color: #e8e8ea;">{{ currentKb.name }}</div>
            <div v-if="currentKb" class="text-[11px]" style="color: #5c5c66;">{{ currentKb.docCount }} 篇文档</div>
          </div>
        </div>
      </div>
      <div class="h-px mx-[14px] mb-2" style="background: #2a2a30;"></div>

      <!-- 目录树 -->
      <div class="flex-1 overflow-y-auto px-2 pb-2" style="scrollbar-width: thin; scrollbar-color: #2a2a30 transparent;">
        <div v-if="displayTree.length === 0" class="text-center py-9" style="color: #5c5c66;">
          <svg class="w-[26px] h-[26px] mb-2 opacity-30 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
          <p class="text-xs leading-relaxed">此知识库为空<br>点击下方按钮新建文档</p>
        </div>

        <TreeNode
          v-for="node in displayTree"
          :key="node.id"
          :node="node"
          :depth="0"
          :active-id="activeId"
          :active-folder-id="activeFolderId"
          :drag-id="dragId"
          :drop-id="dropId"
          :auto-rename-id="autoRenameId"
          @select="emit('select', $event)"
          @toggle="emit('toggle', $event)"
          @rename="emit('rename', $event.id, $event.name)"
          @rename-done="emit('renameDone')"
          @delete="emit('delete', $event)"
          @create-doc="emit('createDoc', '', '', $event)"
          @move="handleMove"
          @export-doc="handleExportDoc"
          @drag-start="handleDragStart"
          @drag-over="handleDragOver"
          @drop="handleDrop"
          @drag-leave="handleDragLeave"
          @folder-select="handleFolderSelect"
        />
      </div>
    </div>

    <!-- 底部 -->
    <div v-if="open" style="border-top: 1px solid #2a2a30;">
      <!-- 操作按钮 -->
      <div v-if="currentKbId" class="px-[14px] py-[10px] flex gap-[6px]">
        <button @click="handleCreateFolder" class="flex-1 h-7 rounded-sm flex items-center justify-center gap-[4px] text-[11.5px] transition-all" style="border: 1px dashed #2a2a30; color: #5c5c66; background: transparent;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
          </svg>
          新建目录
        </button>
        <button @click="handleCreateDoc" class="flex-1 h-7 rounded-sm flex items-center justify-center gap-[4px] text-[11.5px] transition-all" style="border: 1px dashed #2a2a30; color: #5c5c66; background: transparent;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          新建文档
        </button>
      </div>

      <!-- 用户信息 -->
      <div class="px-[14px] py-[10px] flex items-center gap-[10px]">
        <div class="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold" style="background: linear-gradient(135deg, #5a7a6a, #3d5a4e); color: #c8ddd2;">{{ userInitial }}</div>
        <div class="flex-1 min-w-0">
          <div class="text-[11.5px] font-medium" style="color: #c8c8cc;">{{ userStore.user?.username || '用户' }}</div>
          <div class="text-[10px]" style="color: #5c5c66;">个人空间</div>
        </div>
        <button @click="userStore.logout()" class="w-[26px] h-[26px] flex items-center justify-center rounded-sm transition-all" style="color: #5c5c66;" title="退出登录">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
        </button>
        <button class="w-[26px] h-[26px] flex items-center justify-center rounded-sm transition-all" style="color: #5c5c66;" title="更多">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
button:hover {
  border-color: #c4875a !important;
  color: #c4875a !important;
  background: rgba(196,135,90,0.15) !important;
}

input:focus {
  border-color: #c4875a !important;
  background: #2e2e34 !important;
}

.kb-card:hover {
  background: #252529;
}
</style>