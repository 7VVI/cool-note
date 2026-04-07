<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useUiStore } from '@/stores/ui'

interface Props {
  doc: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [content: string]
}>()

const uiStore = useUiStore()
const editorRef = ref<HTMLDivElement | null>(null)
const vditorInstance = ref<Vditor | null>(null)
const saveTimer = ref<number | null>(null)

// 初始化编辑器
onMounted(() => {
  initVditor()
})

// 监听文档变化
watch(() => props.doc?.id, (newId, oldId) => {
  if (newId !== oldId && vditorInstance.value) {
    vditorInstance.value.setValue(props.doc?.content || '')
  }
})

// 监听文档内容变化（从外部更新）
watch(() => props.doc?.content, (newContent) => {
  if (vditorInstance.value && newContent !== vditorInstance.value.getValue()) {
    vditorInstance.value.setValue(newContent || '')
  }
})

function initVditor() {
  if (!editorRef.value) return

  vditorInstance.value = new Vditor(editorRef.value, {
    height: '100%',
    mode: 'wysiwyg',
    placeholder: '输入内容，或输入 / 选择区块类型...',
    value: props.doc?.content || '',
    cache: {
      enable: false
    },
    toolbar: false,
    preview: {
      delay: 500,
      mode: 'editor',
      markdown: {
        mark: true,
        toc: true
      }
    },
    wysiwyg: {
      codeTheme: 'github'
    },
    theme: 'classic',
    icon: 'ant',
    lang: 'zh_CN',
    input: (value: string) => {
      clearTimeout(saveTimer.value!)
      saveTimer.value = window.setTimeout(() => {
        emit('update', value)
      }, 500)
    },
    after: () => {
      setupContextMenu()
    }
  })
}

// 设置右键菜单
function setupContextMenu() {
  if (!editorRef.value) return

  const vditorEl = editorRef.value.querySelector('.vditor-wysiwyg') as HTMLElement
  if (vditorEl) {
    vditorEl.addEventListener('contextmenu', handleContextMenu)
  }
}

// 右键菜单处理
function handleContextMenu(e: MouseEvent) {
  e.preventDefault()

  const items = [
    { icon: 'heading', label: '标题', fn: () => insertMarkdown('heading') },
    { icon: 'bold', label: '粗体', fn: () => insertMarkdown('bold') },
    { icon: 'italic', label: '斜体', fn: () => insertMarkdown('italic') },
    { icon: 'strike', label: '删除线', fn: () => insertMarkdown('strike') },
    { label: 'separator', fn: () => {} },
    { icon: 'quote', label: '引用', fn: () => insertMarkdown('quote') },
    { icon: 'list', label: '无序列表', fn: () => insertMarkdown('list') },
    { icon: 'ordered-list', label: '有序列表', fn: () => insertMarkdown('ordered-list') },
    { icon: 'check', label: '任务列表', fn: () => insertMarkdown('check') },
    { label: 'separator', fn: () => {} },
    { icon: 'code', label: '代码块', fn: () => insertMarkdown('code') },
    { icon: 'inline-code', label: '行内代码', fn: () => insertMarkdown('inline-code') },
    { icon: 'link', label: '链接', fn: () => insertMarkdown('link') },
    { icon: 'table', label: '表格', fn: () => insertMarkdown('table') },
    { label: 'separator', fn: () => {} },
    { icon: 'hr', label: '分割线', fn: () => insertMarkdown('hr') },
  ]

  uiStore.showContextMenu(e.clientX, e.clientY, items)
}

// 插入 Markdown 语法
function insertMarkdown(type: string) {
  if (!vditorInstance.value) return

  const vditor = vditorInstance.value as any

  switch (type) {
    case 'heading':
      vditor.insertValue('## ')
      break
    case 'bold':
      vditor.insertValue('****')
      break
    case 'italic':
      vditor.insertValue('**')
      break
    case 'strike':
      vditor.insertValue('~~~~')
      break
    case 'quote':
      vditor.insertValue('> ')
      break
    case 'list':
      vditor.insertValue('- ')
      break
    case 'ordered-list':
      vditor.insertValue('1. ')
      break
    case 'check':
      vditor.insertValue('- [ ] ')
      break
    case 'code':
      vditor.insertValue('```\n\n```')
      break
    case 'inline-code':
      vditor.insertValue('``')
      break
    case 'link':
      vditor.insertValue('[](url)')
      break
    case 'table':
      vditor.insertValue('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |')
      break
    case 'hr':
      vditor.insertValue('\n---\n')
      break
  }
}

// 销毁编辑器
onUnmounted(() => {
  if (editorRef.value) {
    const vditorEl = editorRef.value.querySelector('.vditor-wysiwyg') as HTMLElement
    if (vditorEl) {
      vditorEl.removeEventListener('contextmenu', handleContextMenu)
    }
  }
  if (vditorInstance.value) {
    vditorInstance.value.destroy()
    vditorInstance.value = null
  }
})
</script>

<template>
  <div class="editor-wrap flex-1 min-h-0 overflow-y-auto">
    <div ref="editorRef" class="h-full w-full"></div>
  </div>
</template>

<style>
.editor-wrap {
  background: #faf9f7;
}

.editor-wrap::-webkit-scrollbar {
  width: 6px;
}

.editor-wrap::-webkit-scrollbar-thumb {
  background: #e8e6e2;
  border-radius: 3px;
}

.editor-wrap::-webkit-scrollbar-track {
  background: transparent;
}
</style>