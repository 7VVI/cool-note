<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'

interface Props {
  tab: 'login' | 'register'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  switch: [tab: 'login' | 'register']
  success: []
}>()

const userStore = useUserStore()
const uiStore = useUiStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// 登录
async function handleLogin() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  try {
    loading.value = true
    error.value = null
    await userStore.login(username.value.trim(), password.value)
    uiStore.showToast('登录成功')
    emit('success')
  } catch (err: any) {
    error.value = err || '登录失败'
  } finally {
    loading.value = false
  }
}

// 注册
async function handleRegister() {
  if (!username.value.trim() || !password.value || !confirmPassword.value) {
    error.value = '请填写所有字段'
    return
  }

  if (username.value.trim().length < 3) {
    error.value = '用户名至少3个字符'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码至少6个字符'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次密码不一致'
    return
  }

  try {
    loading.value = true
    error.value = null
    await userStore.register(username.value.trim(), password.value)
    uiStore.showToast('注册成功')
    emit('success')
  } catch (err: any) {
    error.value = err || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- 遮罩层 -->
  <div
    class="fixed inset-0 z-50 animate-fade-in"
    style="background: rgba(0,0,0,0.3); backdrop-filter: blur(2px);"
    @click="emit('close')"
  ></div>

  <!-- 弹窗 -->
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
    <div
      class="w-full max-w-md pointer-events-auto animate-scale-in"
      style="background: #1c1c20; border: 1px solid #2e2e34; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);"
      @click.stop
    >
      <div class="p-6">
        <!-- 头部 -->
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold" style="color: #e8e8ea;">{{ tab === 'login' ? '登录' : '注册' }}</h3>
          <button
            @click="emit('close')"
            class="w-8 h-8 flex items-center justify-center rounded-sm transition-colors"
            style="color: #636370;"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <!-- Tab切换 -->
        <div class="flex mb-5" style="border-bottom: 1px solid #2e2e34;">
          <div
            class="flex-1 text-center py-2 text-sm font-semibold cursor-pointer transition-colors"
            :style="{
              color: tab === 'login' ? '#bf8a5e' : '#636370',
              borderBottom: tab === 'login' ? '2px solid #bf8a5e' : '2px solid transparent',
              marginBottom: '-1px'
            }"
            @click="emit('switch', 'login')"
          >
            登录
          </div>
          <div
            class="flex-1 text-center py-2 text-sm font-semibold cursor-pointer transition-colors"
            :style="{
              color: tab === 'register' ? '#bf8a5e' : '#636370',
              borderBottom: tab === 'register' ? '2px solid #bf8a5e' : '2px solid transparent',
              marginBottom: '-1px'
            }"
            @click="emit('switch', 'register')"
          >
            注册
          </div>
        </div>

        <!-- 表单 -->
        <div class="space-y-4">
          <!-- 用户名 -->
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #a0a0a8;">用户名</label>
            <input
              type="text"
              v-model="username"
              placeholder="输入用户名"
              class="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
              style="background: #2a2a30; border: 1px solid #2e2e34; color: #e8e8ea;"
            />
          </div>

          <!-- 密码 -->
          <div>
            <label class="block text-sm font-medium mb-1.5" style="color: #a0a0a8;">密码</label>
            <input
              type="password"
              v-model="password"
              placeholder="输入密码"
              class="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
              style="background: #2a2a30; border: 1px solid #2e2e34; color: #e8e8ea;"
            />
          </div>

          <!-- 确认密码（仅注册） -->
          <div v-if="tab === 'register'">
            <label class="block text-sm font-medium mb-1.5" style="color: #a0a0a8;">确认密码</label>
            <input
              type="password"
              v-model="confirmPassword"
              placeholder="再次输入密码"
              class="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
              style="background: #2a2a30; border: 1px solid #2e2e34; color: #e8e8ea;"
            />
          </div>

          <!-- 错误提示 -->
          <p v-if="error" class="text-sm" style="color: #c75050;">{{ error }}</p>

          <!-- 提交按钮 -->
          <button
            @click="tab === 'login' ? handleLogin() : handleRegister()"
            :disabled="loading"
            class="w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            style="background: #bf8a5e; color: white;"
          >
            {{ loading ? '处理中...' : (tab === 'login' ? '登录' : '注册') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input:focus {
  border-color: #bf8a5e;
}
</style>