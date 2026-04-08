<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useUiStore } from '@/stores/ui'

interface Props {
  doc: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  update: [settings: any]
}>()

const uiStore = useUiStore()

const shareOn = ref(false)
const shareMode = ref<'public' | 'account' | 'secret'>('public')
const password = ref('')
const showPassword = ref(false)
const copied = ref(false)
const expireOpt = ref('7d')

// 初始化时同步文档的分享设置
watch(() => props.doc, (doc) => {
  if (doc?.shareSettings) {
    shareOn.value = doc.shareSettings.enabled || false
    shareMode.value = doc.shareSettings.mode || 'public'
    password.value = doc.shareSettings.password || ''
  }
}, { immediate: true })

// 分享链接
const shareUrl = computed(() => {
  if (!props.doc?.shareSettings?.shareCode) return 'https://note.app/s/abc123xyz'
  return `${window.location.origin}/share/${props.doc.shareSettings.shareCode}`
})

// 文档名称
const docName = computed(() => props.doc?.title || '无标题文档')

// 保存分享设置
function handleSave() {
  // 如果是秘钥访问模式且密码为空，自动生成
  if (shareMode.value === 'secret' && !password.value) {
    generateSecret()
  }

  const settings = {
    enabled: shareOn.value,
    mode: shareMode.value,
    password: shareMode.value === 'secret' ? password.value : ''
  }
  emit('update', settings)
  uiStore.showToast('分享设置已保存')
  emit('close')
}

// 复制链接
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    uiStore.showToast('分享链接已复制')
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    uiStore.showToast('复制失败', 'error')
  }
}

// 生成随机秘钥
function generateSecret() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let key = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) key += '-'
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  password.value = key
  uiStore.showToast('秘钥已重新生成')
}

// 过期时间选项
const expireOptions = [
  { value: '1h', label: '1 小时' },
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'never', label: '永不过期' }
]
</script>

<template>
  <!-- 遮罩层 -->
  <div
    v-if="true"
    class="fixed inset-0 z-50 transition-all duration-300"
    :class="true ? 'opacity-100 visible' : 'opacity-0 invisible'"
    style="background: rgba(0,0,0,0.22); backdrop-filter: blur(2px);"
    @click="emit('close')"
  ></div>

  <!-- 抽屉 -->
  <div
    class="fixed top-0 right-0 bottom-0 w-[410px] max-w-[92vw] z-[60] transition-transform duration-350 flex flex-col"
    :class="true ? 'translate-x-0' : 'translate-x-full'"
    style="background: #fff; box-shadow: -8px 0 40px rgba(0,0,0,0.08); transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);"
    @click.stop
  >
    <!-- 头部 -->
    <div class="px-[26px] pt-[22px] pb-[18px] flex items-start justify-between" style="border-bottom: 1px solid #e8e6e2;">
      <div>
        <h2 class="text-[19px] font-bold -tracking-wide" style="font-family: 'Noto Serif SC', serif;">分享文档</h2>
        <p class="text-[12.5px]" style="color: #8e8e92;">{{ docName }}</p>
      </div>
      <button @click="emit('close')" class="w-[30px] h-[30px] flex items-center justify-center rounded-sm transition-all" style="color: #8e8e92;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto px-[26px] py-[22px]" style="scrollbar-width: thin; scrollbar-color: #e8e6e2 transparent;">
      <!-- 开关行 -->
      <div class="flex items-center justify-between p-[14px] rounded-[10px] mb-[22px]" style="background: #f0ece7;">
        <div class="flex items-center gap-[11px]">
          <div class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[17px] transition-all" :class="shareOn ? '' : ''" :style="{ background: shareOn ? 'rgba(196,135,90,0.08)' : '#e8e6e2', color: shareOn ? '#c4875a' : '#8e8e92' }">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
              <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
            </svg>
          </div>
          <div>
            <div class="text-[13.5px] font-medium">{{ shareOn ? '分享已开启' : '启用分享' }}</div>
            <div class="text-[11.5px]" style="color: #8e8e92;">{{ shareOn ? '拥有链接的人可以访问此文档' : '关闭后链接将立即失效' }}</div>
          </div>
        </div>
        <button @click="shareOn = !shareOn" class="w-[42px] h-[22px] rounded-full relative transition-all flex-shrink-0" :style="{ background: shareOn ? '#c4875a' : '#e8e6e2' }">
          <span class="absolute w-[16px] h-[16px] rounded-full bg-white top-[3px] transition-all" :style="{ left: shareOn ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }"></span>
        </button>
      </div>

      <!-- 分享内容 -->
      <div v-if="shareOn" class="animate-fade-in">
        <!-- 分享链接 -->
        <div class="text-[11px] font-semibold uppercase tracking-wide mb-[9px]" style="color: #8e8e92;">分享链接</div>
        <div class="flex items-center rounded-[10px] overflow-hidden mb-[22px] transition-all" style="border: 1px solid #e8e6e2;">
          <input :value="shareUrl" readonly class="flex-1 px-[13px] py-[9px] text-[12.5px] bg-transparent border-none outline-none" style="font-family: 'SF Mono', 'Fira Code', monospace; color: #2c2c2e;" />
          <button @click="handleCopy" class="px-[14px] py-[9px] flex items-center gap-[4px] text-[12.5px] font-medium transition-all" style="border-left: 1px solid #e8e6e2; color: #c4875a;" :style="{ color: copied ? '#4a9e6a' : '#c4875a' }">
            <svg v-if="copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>

        <!-- 访问权限 -->
        <div class="text-[11px] font-semibold uppercase tracking-wide mb-[9px]" style="color: #8e8e92;">访问权限</div>
        <div class="flex rounded-[10px] p-[3px] mb-4" style="background: #f0ece7;">
          <button @click="shareMode = 'public'" class="flex-1 py-2 text-center text-xs font-medium rounded-sm transition-all flex items-center justify-center gap-1" :style="{ background: shareMode === 'public' ? '#fff' : 'transparent', color: shareMode === 'public' ? '#2c2c2e' : '#8e8e92', boxShadow: shareMode === 'public' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none' }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            公开
          </button>
          <button @click="shareMode = 'account'" class="flex-1 py-2 text-center text-xs font-medium rounded-sm transition-all flex items-center justify-center gap-1" :style="{ background: shareMode === 'account' ? '#fff' : 'transparent', color: shareMode === 'account' ? '#2c2c2e' : '#8e8e92', boxShadow: shareMode === 'account' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none' }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            指定账号
          </button>
          <button @click="shareMode = 'secret'" class="flex-1 py-2 text-center text-xs font-medium rounded-sm transition-all flex items-center justify-center gap-1" :style="{ background: shareMode === 'secret' ? '#fff' : 'transparent', color: shareMode === 'secret' ? '#2c2c2e' : '#8e8e92', boxShadow: shareMode === 'secret' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none' }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            秘钥访问
          </button>
        </div>

        <!-- 公开模式提示 -->
        <div v-if="shareMode === 'public'" class="flex items-start gap-[9px] p-3 rounded-[10px] mb-4" style="background: rgba(74,158,106,0.08);">
          <svg class="w-[15px] h-[15px] flex-shrink-0 mt-px" style="color: #4a9e6a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span class="text-[12.5px] leading-normal" style="color: #3a6b4a;">任何拥有此链接的人都可以查看文档内容，无需额外验证。</span>
        </div>

        <!-- 指定账号模式 -->
        <div v-if="shareMode === 'account'" class="mb-4">
          <div class="flex items-center rounded-[10px] overflow-hidden mb-3 transition-all" style="border: 1px solid #e8e6e2;">
            <svg class="w-[13px] h-[13px] absolute left-[10px]" style="color: #c5c3be;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="输入用户名或邮箱搜索..." class="flex-1 px-[10px] py-2 pl-[32px] text-[12.5px] bg-transparent border-none outline-none" style="color: #2c2c2e;" />
            <button class="px-3 py-2 text-[11.5px] font-medium" style="border-left: 1px solid #e8e6e2; color: #c4875a;">添加</button>
          </div>
          <div class="text-center py-6" style="color: #c5c3be;">
            <svg class="w-7 h-7 mb-2 opacity-50 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            <p class="text-[12.5px] leading-relaxed">尚未添加任何账号<br>搜索并添加可以查看此文档的用户</p>
          </div>
        </div>

        <!-- 秘钥访问模式 -->
        <div v-if="shareMode === 'secret'" class="mb-4">
          <div class="rounded-[10px] overflow-hidden mb-3" style="border: 1px solid #e8e6e2;">
            <div class="flex items-center">
              <div class="flex-1 px-[14px] py-3 text-[15px] font-semibold tracking-widest" style="font-family: 'SF Mono', 'Fira Code', monospace; background: #f0ece7;">{{ showPassword ? password || 'ABC-D123' : '••••••••' }}</div>
              <div class="flex flex-col" style="border-left: 1px solid #e8e6e2;">
                <button @click="showPassword = !showPassword" class="flex-1 px-3 py-2 transition-all" style="color: #8e8e92;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button @click="handleCopy" class="flex-1 px-3 py-2 transition-all" style="border-top: 1px solid #e8e6e2; color: #8e8e92;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>
              </div>
            </div>
          </div>
          <div class="flex items-start gap-[9px] p-3 rounded-[10px] mb-2" style="background: rgba(196,135,90,0.08);">
            <svg class="w-[14px] h-[14px] flex-shrink-0 mt-px" style="color: #c4875a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span class="text-xs leading-normal" style="color: #7a6548;">访问者打开链接后需输入此秘钥才能查看文档内容，请通过安全渠道将秘钥告知对方。</span>
          </div>
          <button @click="generateSecret" class="w-full py-2 rounded-sm flex items-center justify-center gap-[5px] text-xs transition-all" style="border: 1px dashed #e8e6e2; color: #8e8e92;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            重新生成秘钥
          </button>
        </div>

        <!-- 过期时间 -->
        <div class="pt-[18px] mt-[22px]" style="border-top: 1px solid #e8e6e2;">
          <div class="text-[11px] font-semibold uppercase tracking-wide mb-[9px]" style="color: #8e8e92;">过期时间</div>
          <div class="flex flex-wrap gap-[7px]">
            <button v-for="opt in expireOptions" :key="opt.value" @click="expireOpt = opt.value" class="px-3 py-1.5 rounded-full text-[11.5px] transition-all" :style="{ background: expireOpt === opt.value ? 'rgba(196,135,90,0.08)' : 'transparent', border: expireOpt === opt.value ? '1px solid #c4875a' : '1px solid #e8e6e2', color: expireOpt === opt.value ? '#c4875a' : '#8e8e92', fontWeight: expireOpt === opt.value ? '500' : 'normal' }">
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="px-[26px] py-[14px] flex items-center gap-[9px]" style="border-top: 1px solid #e8e6e2;">
      <button @click="emit('close')" class="px-4 py-2.5 rounded-[10px] text-[12.5px] transition-all" style="border: 1px solid #e8e6e2; color: #8e8e92;">取消</button>
      <button @click="handleSave" class="flex-1 py-2.5 rounded-[10px] text-[13.5px] font-medium flex items-center justify-center gap-[5px] transition-all" style="background: #c4875a; color: white;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
        保存并分享
      </button>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeUp 0.3s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

button:hover {
  background: rgba(196,135,90,0.08) !important;
}

input:focus {
  border-color: #c4875a !important;
}
</style>