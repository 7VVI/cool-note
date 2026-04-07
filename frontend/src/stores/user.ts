import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const user = ref<{ id: string; username: string } | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isLoggedIn = computed(() => !!user.value && !!token.value)

  // 初始化：验证token并获取用户信息
  async function init() {
    if (token.value) {
      try {
        const res = await authApi.me()
        if (res.success) {
          user.value = res.data
        } else {
          logout()
        }
      } catch (err) {
        logout()
      }
    }
  }

  // 注册
  async function register(username: string, password: string) {
    const res = await authApi.register(username, password)
    if (res.success) {
      user.value = { id: res.data.id, username: res.data.username }
      token.value = res.data.token
      localStorage.setItem('token', res.data.token)
    }
    return res
  }

  // 登录
  async function login(username: string, password: string) {
    const res = await authApi.login(username, password)
    if (res.success) {
      user.value = { id: res.data.id, username: res.data.username }
      token.value = res.data.token
      localStorage.setItem('token', res.data.token)
    }
    return res
  }

  // 登出
  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    isLoggedIn,
    init,
    register,
    login,
    logout
  }
})