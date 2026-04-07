<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { shareApi } from '@/api'

const route = useRoute()

const loading = ref(true)
const error = ref<string | null>(null)
const doc = ref<{
  id: string
  title: string
  content: string
  shareMode: string
  needPassword?: boolean
  isOwner: boolean
} | null>(null)

const password = ref('')
const showPassword = ref(false)
const passwordError = ref<string | null>(null)

const shareCode = computed(() => route.params.code as string)

// 简单的 Markdown 渲染函数
function renderMarkdown(content: string): string {
  if (!content) return '<p class="text-ink-300">暂无内容</p>'

  let html = content

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')

  // 标题
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')

  // 粗体和斜体
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // 引用
  html = html.replace(/^> (.*)$/gm, '<blockquote><p>$1</p></blockquote>')

  // 分割线
  html = html.replace(/^---$/gm, '<hr>')

  // 无序列表
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // 有序列表
  html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>')

  // 段落
  html = html.split('\n\n').map(p => {
    if (p.trim() && !p.match(/^<(h|ul|ol|li|pre|blockquote|hr)/)) {
      return `<p>${p.replace(/\n/g, '<br>')}</p>`
    }
    return p
  }).join('\n')

  return html
}

// 加载文档
async function loadDoc() {
  try {
    loading.value = true
    error.value = null

    const res = await shareApi.getByCode(shareCode.value)
    if (res.success) {
      doc.value = res.data
    } else {
      error.value = '文档不存在或未分享'
    }
  } catch (err: any) {
    error.value = err || '加载失败'
  } finally {
    loading.value = false
  }
}

// 验证密码
async function verifyPassword() {
  try {
    passwordError.value = null
    const res = await shareApi.verifyPassword(shareCode.value, password.value)
    if (res.success) {
      doc.value = res.data
    } else {
      passwordError.value = '密码错误'
    }
  } catch (err: any) {
    passwordError.value = err || '验证失败'
  }
}

onMounted(loadDoc)
</script>

<template>
  <div class="min-h-screen bg-white text-ink-900">
    <!-- 加载中 -->
    <div v-if="loading" class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div class="w-12 h-12 rounded-xl bg-note-50 border border-note-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CB7B4B" stroke-width="2">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          </svg>
        </div>
        <p class="text-sm text-ink-400">正在加载文档...</p>
      </div>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="flex items-center justify-center h-screen">
      <div class="text-center max-w-md px-4">
        <div class="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-ink-800 mb-2">无法访问文档</h3>
        <p class="text-sm text-ink-500 mb-4">{{ error }}</p>
        <a href="/" class="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-white text-sm font-medium rounded-lg hover:bg-ink-800">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          返回首页
        </a>
      </div>
    </div>

    <!-- 需要密码 -->
    <div v-else-if="doc?.needPassword" class="flex items-center justify-center h-screen">
      <div class="w-full max-w-md px-4">
        <div class="bg-white rounded-xl shadow-lg border border-ink-100 p-6">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2">
                <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-ink-900">{{ doc.title || '无标题文档' }}</h3>
              <p class="text-xs text-ink-500">此文档需要密码才能访问</p>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-ink-700 mb-1.5">访问密码</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="输入访问密码"
                class="w-full px-3 py-2 pr-10 text-sm border border-ink-200 rounded-lg focus:outline-none focus:border-note-400 focus:ring-2 focus:ring-note-100 font-mono"
                @keyup.enter="verifyPassword"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600"
              >
                <svg v-if="showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                  <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                  <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                  <path d="m2 2 20 20"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <p v-if="passwordError" class="text-xs text-red-500 mt-1.5">{{ passwordError }}</p>
          </div>

          <button
            @click="verifyPassword"
            class="w-full px-4 py-2.5 text-sm font-medium bg-ink-900 text-white rounded-lg hover:bg-ink-800 transition-colors"
          >
            验证密码
          </button>
        </div>
      </div>
    </div>

    <!-- 显示文档内容 -->
    <div v-else-if="doc" class="max-w-[720px] mx-auto px-8 py-8">
      <!-- 文档标题 -->
      <h1 class="text-2xl font-bold text-ink-900 mb-6">{{ doc.title || '无标题文档' }}</h1>

      <!-- 分享提示 -->
      <div class="mb-6 px-4 py-3 rounded-lg bg-note-50 border border-note-100">
        <p class="text-sm text-ink-600">
          <svg class="inline-block mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CB7B4B" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
          </svg>
          这是通过分享链接访问的文档。如需编辑，请
          <a href="/" class="text-note-500 hover:text-note-600 underline">登录</a>
          。
        </p>
      </div>

      <!-- 文档内容 -->
      <div class="md-preview" v-html="renderMarkdown(doc.content)"></div>
    </div>
  </div>
</template>