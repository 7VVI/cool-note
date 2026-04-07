import { defineStore } from 'pinia'
import { ref } from 'vue'

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
    toggleSidebar,
    showLoginModal,
    showRegisterModal,
    closeAuthModal,
    switchAuthTab,
    showShareModal,
    closeShareModal,
    showContextMenu,
    closeContextMenu,
    showToast
  }
})