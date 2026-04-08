import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// MD主题类型
export type MdThemeId = 'default' | 'dark' | 'mint' | 'rose' | 'morandi' | 'ocean' | 'sunset' | 'paper' | 'indigo'

// MD主题配置
export const mdThemes: { id: MdThemeId; name: string; bg: string; h1: string; h2: string; h3: string; text: string; quote: string; qb: string; codeBg: string; codeT: string; link: string; hr: string; bullet: string; todo: string }[] = [
  { id: 'default', name: '默认', bg: '#faf9f7', h1: '#1a1a1c', h2: '#2c2c2e', h3: '#3a3a3c', text: '#2c2c2e', quote: '#8e8e92', qb: '#c4875a', codeBg: '#f3f1ed', codeT: '#4a4a4c', link: '#c4875a', hr: '#e8e6e2', bullet: '#c4875a', todo: '#d8d4d0' },
  { id: 'dark', name: '暗夜', bg: '#1a1a1e', h1: '#eeeeee', h2: '#d8d8dc', h3: '#b8b8bc', text: '#d0d0d4', quote: '#8a8a92', qb: '#d4a574', codeBg: '#28282e', codeT: '#b0b0b4', link: '#d4a574', hr: '#38383e', bullet: '#d4a574', todo: '#3a3a42' },
  { id: 'mint', name: '薄荷', bg: '#f2faf5', h1: '#0d1f16', h2: '#1a2e24', h3: '#2a4038', text: '#1a2e24', quote: '#4a7a62', qb: '#3aaa7a', codeBg: '#e4f2ea', codeT: '#2a4a3a', link: '#2a8a5a', hr: '#cce8d8', bullet: '#2a8a5a', todo: '#c0d8cc' },
  { id: 'rose', name: '玫瑰', bg: '#fdf7f5', h1: '#2a1a18', h2: '#3a2a28', h3: '#4a3a38', text: '#3a2a28', quote: '#8a6a66', qb: '#c47a6a', codeBg: '#f6ece6', codeT: '#4a3a38', link: '#b86a5a', hr: '#e8d6d0', bullet: '#b86a5a', todo: '#dcc8c2' },
  { id: 'morandi', name: '莫兰迪', bg: '#f0eeeb', h1: '#3a3634', h2: '#4a4644', h3: '#5a5654', text: '#4a4644', quote: '#8a8480', qb: '#9a8882', codeBg: '#e4e0dc', codeT: '#5a5654', link: '#8a7268', hr: '#d4d0cc', bullet: '#8a7268', todo: '#c8c2be' },
  { id: 'ocean', name: '深海', bg: '#eef3f8', h1: '#0d1a2a', h2: '#1a2a3a', h3: '#2a3a4a', text: '#1a2a3a', quote: '#4a6a8a', qb: '#4a8aba', codeBg: '#e0eaf4', codeT: '#2a3a4a', link: '#2a6aaa', hr: '#ccd8e6', bullet: '#2a6aaa', todo: '#c0cede' },
  { id: 'sunset', name: '日落', bg: '#fef8ee', h1: '#2a1a0d', h2: '#3a2a1a', h3: '#4a3a2a', text: '#3a2a1a', quote: '#8a6a4a', qb: '#d4943a', codeBg: '#f6ecdc', codeT: '#4a3a2a', link: '#c47a2a', hr: '#ead8c8', bullet: '#c47a2a', todo: '#dcc8b2' },
  { id: 'paper', name: '素纸', bg: '#fffdf6', h1: '#1a1a18', h2: '#333330', h3: '#4a4a48', text: '#333330', quote: '#7a7a70', qb: '#aaaa90', codeBg: '#f2f0e8', codeT: '#4a4a48', link: '#8a7a30', hr: '#dddac8', bullet: '#8a7a30', todo: '#d4d0be' },
  { id: 'indigo', name: '靛蓝', bg: '#f5f4fa', h1: '#1a1830', h2: '#2a2840', h3: '#3a3858', text: '#2a2840', quote: '#6a6890', qb: '#7a6ac0', codeBg: '#eae8f4', codeT: '#3a3858', link: '#6a5ac0', hr: '#d8d4e6', bullet: '#6a5ac0', todo: '#c8c4d8' }
]

export const useUiStore = defineStore('ui', () => {
  // 侧边栏是否展开
  const sidebarOpen = ref(true)

  // 登录/注册弹窗
  const authModalOpen = ref(false)
  const authModalTab = ref<'login' | 'register'>('login')

  // 分享弹窗
  const shareModalOpen = ref(false)

  // 右键菜单
  const contextMenu = ref<{
    x: number
    y: number
    items: { icon?: string; label: string; danger?: boolean; fn: () => void }[]
  } | null>(null)

  // Toast消息
  const toasts = ref<{ id: string; msg: string; type: 'success' | 'error' }[]>([])

  // 系统主题（深色/浅色）
  const sysDark = ref(false)

  // MD文档主题
  const mdTheme = ref<MdThemeId>('default')

  // MD主题面板是否显示
  const mdThemePanelOpen = ref(false)

  // 应用系统主题
  function applySysTheme() {
    if (sysDark.value) {
      document.documentElement.setAttribute('data-sys', 'dark')
    } else {
      document.documentElement.removeAttribute('data-sys')
    }
  }

  // 应用MD主题
  function applyMdTheme(themeId: MdThemeId) {
    mdTheme.value = themeId
    const theme = mdThemes.find(t => t.id === themeId)
    if (!theme) return

    const root = document.documentElement.style
    root.setProperty('--md-bg', theme.bg)
    root.setProperty('--md-text', theme.text)
    root.setProperty('--md-h1', theme.h1)
    root.setProperty('--md-h2', theme.h2)
    root.setProperty('--md-h3', theme.h3)
    root.setProperty('--md-quote', theme.quote)
    root.setProperty('--md-quote-border', theme.qb)
    root.setProperty('--md-code-bg', theme.codeBg)
    root.setProperty('--md-code-text', theme.codeT)
    root.setProperty('--md-link', theme.link)
    root.setProperty('--md-hr', theme.hr)
    root.setProperty('--md-bullet', theme.bullet)
    root.setProperty('--md-todo-border', theme.todo)

    // 更新编辑器背景
    const editorWrap = document.querySelector('.editor-wrap') as HTMLElement
    if (editorWrap) {
      // 移除所有主题class
      mdThemes.forEach(t => editorWrap.classList.remove('md-theme-' + t.id))
      editorWrap.classList.add('md-theme-' + themeId)
    }
  }

  // 切换系统主题
  function toggleSysTheme() {
    sysDark.value = !sysDark.value
    applySysTheme()
    showToast(sysDark.value ? '已切换到深色模式' : '已切换到浅色模式')
  }

  // 切换MD主题面板
  function toggleMdThemePanel() {
    mdThemePanelOpen.value = !mdThemePanelOpen.value
  }

  // 关闭MD主题面板
  function closeMdThemePanel() {
    mdThemePanelOpen.value = false
  }

  // 初始化主题
  function initThemes() {
    applySysTheme()
    applyMdTheme(mdTheme.value)
  }

  // 切换侧边栏
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 打开登录弹窗
  function showLoginModal() {
    authModalTab.value = 'login'
    authModalOpen.value = true
  }

  // 打开注册弹窗
  function showRegisterModal() {
    authModalTab.value = 'register'
    authModalOpen.value = true
  }

  // 关闭认证弹窗
  function closeAuthModal() {
    authModalOpen.value = false
  }

  // 切换认证弹窗Tab
  function switchAuthTab(tab: 'login' | 'register') {
    authModalTab.value = tab
  }

  // 打开分享弹窗
  function showShareModal() {
    shareModalOpen.value = true
  }

  // 关闭分享弹窗
  function closeShareModal() {
    shareModalOpen.value = false
  }

  // 显示右键菜单
  function showContextMenu(x: number, y: number, items: { icon?: string; label: string; danger?: boolean; fn: () => void }[]) {
    contextMenu.value = { x, y, items }
  }

  // 关闭右键菜单
  function closeContextMenu() {
    contextMenu.value = null
  }

  // 显示Toast
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    toasts.value.push({ id, msg, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 2800)
  }

  return {
    sidebarOpen,
    authModalOpen,
    authModalTab,
    shareModalOpen,
    contextMenu,
    toasts,
    sysDark,
    mdTheme,
    mdThemePanelOpen,
    toggleSidebar,
    showLoginModal,
    showRegisterModal,
    closeAuthModal,
    switchAuthTab,
    showShareModal,
    closeShareModal,
    showContextMenu,
    closeContextMenu,
    showToast,
    toggleSysTheme,
    applyMdTheme,
    toggleMdThemePanel,
    closeMdThemePanel,
    initThemes
  }
})