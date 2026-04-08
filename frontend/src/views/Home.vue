<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useDocumentStore } from '@/stores/document'
import { useUiStore, mdThemes, type MdThemeId } from '@/stores/ui'
import Sidebar from '@/components/Sidebar.vue'
import Editor from '@/components/Editor.vue'
import TabBar from '@/components/TabBar.vue'
import AuthModal from '@/components/AuthModal.vue'
import ShareModal from '@/components/ShareModal.vue'
import MoveModal from '@/components/MoveModal.vue'

const userStore = useUserStore()
const docStore = useDocumentStore()
const uiStore = useUiStore()

const titleInput = ref('')
const saveTimer = ref<number | null>(null)

// 移动弹窗状态
const moveModalOpen = ref(false)
const nodeToMove = ref<any>(null)

// 自动重命名状态
const autoRenameId = ref<string | null>(null)

// 当前知识库ID
const currentKbId = ref<string | null>(null)

// 监听当前文档变化
watch(() => docStore.activeDoc, (doc) => {
  if (doc) {
    titleInput.value = doc.title || ''
  } else {
    titleInput.value = ''
  }
})

// 更新标题（防抖）
async function handleTitleChange(e: Event) {
  const target = e.target as HTMLInputElement
  titleInput.value = target.value

  if (docStore.activeDoc) {
    clearTimeout(saveTimer.value!)
    saveTimer.value = window.setTimeout(async () => {
      try {
        await docStore.updateDocTitle(docStore.activeDoc!.id, target.value)
      } catch (err) {
        uiStore.showToast('保存标题失败', 'error')
      }
    }, 300)
  }
}

// 创建文档
async function createDoc() {
  try {
    const parentId = docStore.activeDoc?.parentId || null
    await docStore.createDoc('', '', parentId)
    uiStore.showToast('文档已创建')
  } catch (err) {
    uiStore.showToast('创建文档失败', 'error')
  }
}

// 创建文件夹（并设置自动重命名）
async function handleCreateFolder(name: string, parentId?: string) {
  try {
    await docStore.createFolder(name, parentId)
    const newFolder = docStore.folders[docStore.folders.length - 1]
    if (newFolder) {
      autoRenameId.value = newFolder.id
    }
  } catch (err) {
    uiStore.showToast('创建文件夹失败', 'error')
  }
}

// 重命名完成
function handleRenameDone() {
  autoRenameId.value = null
}

// 处理知识库切换
function handleKbChange(kbId: string | null) {
  currentKbId.value = kbId
}

// 处理重命名（根据类型调用不同的方法）
async function handleRename(id: string, name: string) {
  const isFolder = docStore.folders.some(f => f.id === id)
  const isDoc = docStore.documents.some(d => d.id === id)

  try {
    if (isFolder) {
      await docStore.updateFolder(id, { name })
    } else if (isDoc) {
      await docStore.updateDocTitle(id, name)
    }
  } catch (err) {
    uiStore.showToast('重命名失败', 'error')
  }
}

// 显示移动弹窗
function handleShowMoveModal(node: any) {
  nodeToMove.value = node
  moveModalOpen.value = true
}

// 关闭移动弹窗
function handleCloseMoveModal() {
  moveModalOpen.value = false
  nodeToMove.value = null
}

// 执行移动
async function handleMove(nodeId: string, targetFolderId: string | null) {
  try {
    await docStore.moveNode(nodeId, targetFolderId)
    uiStore.showToast('移动成功')
  } catch (err) {
    uiStore.showToast('移动失败', 'error')
  }
}

// 导出文档
function handleExportDoc(node: any) {
  const doc = docStore.documents.find(d => d.id === node.id)
  if (!doc) {
    uiStore.showToast('文档不存在', 'error')
    return
  }

  const content = doc.content || ''
  const title = doc.title || '无标题文档'

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.md`

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  uiStore.showToast('导出成功')
}

// 字数统计
const wordCount = computed(() => {
  if (!docStore.activeDoc) return 0
  const content = docStore.activeDoc.content || ''
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const english = (content.match(/[a-zA-Z]+/g) || []).length
  return chinese + english
})

// 字符数
const charCount = computed(() => {
  return docStore.activeDoc?.content?.length || 0
})

// 阅读时间（分钟）
const readTime = computed(() => {
  return Math.max(1, Math.ceil(wordCount.value / 300))
})

// 分享状态标签
const shareBadge = computed(() => {
  if (!docStore.activeDoc?.shareSettings?.enabled) return null
  if (docStore.activeDoc.shareSettings.mode === 'password') {
    return { type: 'password', text: '密码保护' }
  }
  return { type: 'link', text: '已分享' }
})

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})

// MD 主题切换
function handleMdThemeChange(themeId: MdThemeId) {
  uiStore.applyMdTheme(themeId)
  uiStore.closeMdThemePanel()
  const theme = mdThemes.find(t => t.id === themeId)
  if (theme) {
    uiStore.showToast(`文档主题切换为「${theme.name}」`)
  }
}

// 点击外部关闭 MD 主题面板
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (uiStore.mdThemePanelOpen && !target.closest('.md-theme-panel') && !target.closest('.toolbar-btn[title="文档主题"]')) {
    uiStore.closeMdThemePanel()
  }
}

onMounted(async () => {
  // 初始化主题
  uiStore.initThemes()

  // 添加点击外部关闭面板的事件监听
  document.addEventListener('click', handleClickOutside)

  if (userStore.isLoggedIn) {
    await docStore.loadAll()
    // 从URL恢复文档选中状态
    docStore.restoreFromUrl()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="h-screen flex overflow-hidden" style="background: var(--ed-bg);">
    <!-- 侧边栏 -->
    <Sidebar
      :open="userStore.isLoggedIn"
      :nodes="docStore.allNodes"
      :active-id="docStore.activeDocId"
      :blocks="[]"
      :auto-rename-id="autoRenameId"
      :active-doc-content="(docStore.activeDoc as any)?._htmlContent || docStore.activeDoc?.content || ''"
      @toggle-sidebar="() => {}"
      @select="docStore.selectDoc"
      @create-folder="handleCreateFolder"
      @create-doc="docStore.createDoc"
      @delete="docStore.deleteNode"
      @rename="handleRename"
      @rename-done="handleRenameDone"
      @toggle="(id) => docStore.updateFolder(id, { collapsed: !docStore.folders.find(f => f.id === id)?.collapsed })"
      @move="docStore.moveNode"
      @show-move-modal="handleShowMoveModal"
      @export-doc="handleExportDoc"
      @kb-change="handleKbChange"
    />

    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 标签页栏 -->
      <TabBar
        v-if="userStore.isLoggedIn"
        :tabs="docStore.validTabs"
        :active-id="docStore.activeDocId"
        :doc-map="docStore.docMap"
        @select="docStore.selectDoc"
        @close="docStore.closeTab"
      />

      <!-- 工具栏 -->
      <div
        v-if="userStore.isLoggedIn && docStore.activeDoc"
        class="h-[40px] flex items-center px-5 gap-[2px]"
        style="background: var(--chrome-bg); border-bottom: 1px solid var(--chrome-border);"
      >
        <!-- 左侧工具按钮 -->
        <button class="toolbar-btn" title="加粗">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
        </button>
        <button class="toolbar-btn" title="斜体">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" x2="10" y1="4" y2="4"/>
            <line x1="14" x2="5" y1="20" y2="20"/>
            <line x1="15" x2="9" y1="4" y2="20"/>
          </svg>
        </button>
        <button class="toolbar-btn" title="删除线">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4H9a3 3 0 0 0-2.83 2"/>
            <path d="M14 12a4 4 0 0 1 0 8H6"/>
            <line x1="4" x2="20" y1="12" y2="12"/>
          </svg>
        </button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" title="标题1" style="font-size:13px;font-weight:700;">H1</button>
        <button class="toolbar-btn" title="标题2" style="font-size:13px;font-weight:700;">H2</button>
        <button class="toolbar-btn" title="标题3" style="font-size:13px;font-weight:700;">H3</button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn" title="无序列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" x2="21" y1="6" y2="6"/>
            <line x1="8" x2="21" y1="12" y2="12"/>
            <line x1="8" x2="21" y1="18" y2="18"/>
            <line x1="3" x2="3.01" y1="6" y2="6"/>
            <line x1="3" x2="3.01" y1="12" y2="12"/>
            <line x1="3" x2="3.01" y1="18" y2="18"/>
          </svg>
        </button>
        <button class="toolbar-btn" title="待办事项">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </button>
        <button class="toolbar-btn" title="引用">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h1c-1 0 1.5 5-2 8"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h1c-1 0 1.5 5-2 8"/>
          </svg>
        </button>
        <button class="toolbar-btn" title="代码块">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </button>
        <button class="toolbar-btn" title="分割线">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" x2="19" y1="12" y2="12"/>
          </svg>
        </button>

        <!-- 右侧区域 -->
        <div class="ml-auto flex items-center gap-[4px] relative">
          <!-- 分享状态标签 -->
          <span
            v-if="shareBadge"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium"
            :class="shareBadge.type === 'password' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'"
          >
            {{ shareBadge.text }}
          </span>

          <!-- MD主题按钮 -->
          <div class="relative">
            <button
              @click="uiStore.toggleMdThemePanel"
              class="toolbar-btn"
              title="文档主题"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
                <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
                <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
                <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
              </svg>
            </button>
            <!-- MD主题面板 -->
            <div v-if="uiStore.mdThemePanelOpen" class="md-theme-panel show">
              <div class="mtp-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/>
                  <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/>
                  <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/>
                  <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
                </svg>
                文档主题
              </div>
              <div class="mtp-grid">
                <div
                  v-for="theme in mdThemes"
                  :key="theme.id"
                  class="mtp-card"
                  :class="{ active: uiStore.mdTheme === theme.id }"
                  @click="handleMdThemeChange(theme.id)"
                >
                  <div class="mtp-check">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div class="mtp-preview" :style="{ background: theme.bg }">
                    <div class="mtp-preview-h1" :style="{ background: theme.h1 }"></div>
                    <div class="mtp-preview-h2" :style="{ background: theme.h2 }"></div>
                    <div class="mtp-preview-text" :style="{ background: theme.text }"></div>
                    <div class="mtp-preview-text2" :style="{ background: theme.text }"></div>
                    <div class="mtp-preview-quote" :style="{ background: theme.qb }"></div>
                  </div>
                  <div class="mtp-label">{{ theme.name }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分享按钮 -->
          <button
            @click="uiStore.showShareModal"
            class="toolbar-btn"
            title="分享"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
            </svg>
          </button>

          <!-- 导出按钮 -->
          <button
            @click="handleExportDoc({ id: docStore.activeDocId })"
            class="toolbar-btn"
            title="导出"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 主内容区 -->
      <template v-if="userStore.isLoggedIn">
        <!-- 有文档时显示编辑器 -->
        <Editor
          v-if="docStore.activeDoc"
          :doc="docStore.activeDoc"
          @update="(content) => {
            // 立即更新store中的content用于大纲显示（保存HTML用于实时预览）
            const doc = docStore.documents.find(d => d.id === docStore.activeDocId)
            if (doc) {
              // 临时存储HTML用于大纲解析，但不覆盖Markdown内容
              ;(doc as any)._htmlContent = content
            }
          }"
          @save="(content) => docStore.updateDocContent(docStore.activeDoc!.id, content)"
        />

        <!-- 无文档时显示空状态 -->
        <div v-else class="flex-1 flex items-center justify-center" style="background: rgba(250,249,247,0.3);">
          <div class="text-center animate-slide-up">
            <div
              class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style="background: rgba(191,138,94,0.08); border: 1px solid rgba(191,138,94,0.15);"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bf8a5e" stroke-width="2">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold mb-2" style="color: #2c2c2e;">选择或创建文档</h3>
            <p class="text-sm mb-6 max-w-[240px] mx-auto" style="color: #8e8e92;">
              {{ currentKbId ? '从左侧选择一个文档，或创建新文档开始书写' : '进入左侧知识库后选择或创建文档' }}
            </p>
            <button
              v-if="currentKbId"
              @click="createDoc"
              class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors"
              style="background: #2c2c2e; color: white;"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>
              </svg>
              新建文档
            </button>
          </div>
        </div>
      </template>

      <!-- 未登录时显示欢迎页面 -->
      <div v-else class="flex-1 flex items-center justify-center" style="background: rgba(250,249,247,0.3);">
        <div class="text-center animate-slide-up max-w-md px-4">
          <div
            class="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style="background: linear-gradient(135deg, #bf8a5e, #d4a574);"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="font-family: 'Noto Serif SC', serif;">
              <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="28" font-weight="700">N</text>
            </svg>
          </div>
          <h1 class="text-2xl font-bold mb-3" style="color: #2c2c2e;">笔记本</h1>
          <p class="mb-8" style="color: #8e8e92;">你的个人 Markdown 笔记工具，支持文档管理、即时渲染与安全分享</p>
          <div class="flex items-center justify-center gap-3">
            <button
              @click="uiStore.showRegisterModal"
              class="px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors"
              style="background: #bf8a5e; color: white;"
            >
              开始使用
            </button>
            <button
              @click="uiStore.showLoginModal"
              class="px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors"
              style="border: 1px solid #e8e6e2; color: #2c2c2e; background: white;"
            >
              登录
            </button>
          </div>
        </div>
      </div>

      <!-- 底部状态栏 -->
      <div
        v-if="userStore.isLoggedIn && docStore.activeDoc"
        class="status-bar"
      >
        <div class="status-item">
          <span class="status-dot"></span>
          <span>已保存</span>
        </div>
        <div class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
            <polyline points="4 7 4 4 20 4 20 7"/>
            <line x1="9" x2="15" y1="20" y2="20"/>
            <line x1="12" x2="12" y1="15" y2="20"/>
            <path d="M8 7h8l-1 8H9L8 7Z"/>
          </svg>
          <span>{{ wordCount }} 字</span>
        </div>
        <div class="status-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.6;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>约 {{ readTime }} 分钟阅读</span>
        </div>
        <div class="flex-1"></div>
        <div class="status-item">
          <span>Markdown</span>
        </div>
        <!-- 系统主题切换 -->
        <button class="sys-toggle" @click="uiStore.toggleSysTheme" title="切换主题">
          <svg v-if="uiStore.sysDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" x2="12" y1="1" y2="3"/>
            <line x1="12" x2="12" y1="21" y2="23"/>
            <line x1="4.22" x2="5.64" y1="4.22" y2="5.64"/>
            <line x1="18.36" x2="19.78" y1="18.36" y2="19.78"/>
            <line x1="1" x2="3" y1="12" y2="12"/>
            <line x1="21" x2="23" y1="12" y2="12"/>
            <line x1="4.22" x2="5.64" y1="19.78" y2="18.36"/>
            <line x1="18.36" x2="19.78" y1="5.64" y2="4.22"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 登录/注册弹窗 -->
    <AuthModal
      v-if="uiStore.authModalOpen"
      :tab="uiStore.authModalTab"
      @close="uiStore.closeAuthModal"
      @switch="uiStore.switchAuthTab"
      @success="uiStore.closeAuthModal(); docStore.loadAll()"
    />

    <!-- 分享弹窗 -->
    <ShareModal
      v-if="uiStore.shareModalOpen"
      :doc="docStore.activeDoc"
      @close="uiStore.closeShareModal"
      @update="(settings) => docStore.updateShareSettings(docStore.activeDoc!.id, settings)"
    />

    <!-- 移动弹窗 -->
    <MoveModal
      :open="moveModalOpen"
      :node="nodeToMove"
      :folders="docStore.folders"
      @close="handleCloseMoveModal"
      @move="handleMove"
    />
  </div>
</template>

<style scoped>
.toolbar-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: none;
  color: #8e8e92;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.toolbar-btn:hover {
  background: #f0ece7;
  color: #2c2c2e;
}

.toolbar-btn.active {
  background: rgba(191,138,94,0.08);
  color: #bf8a5e;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: #e8e6e2;
  margin: 0 6px;
}

.status-bar {
  height: 32px;
  background: #ffffff;
  border-top: 1px solid #e8e6e2;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  font-size: 11px;
  color: #8e8e92;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5cb87a;
  box-shadow: 0 0 6px rgba(92,184,122,0.4);
}
</style>