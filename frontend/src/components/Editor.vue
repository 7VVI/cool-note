<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { useUiStore } from '@/stores/ui'

interface Props {
  doc: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [content: string]
  save: [content: string]
}>()

const uiStore = useUiStore()
const saveTimer = ref<number | null>(null)
const isInternalUpdate = ref(false)

// 初始化 Turndown (HTML to Markdown)
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

// 当前文档内容（Markdown）
const docContent = computed(() => props.doc?.content || '')

// Markdown 转 HTML
function mdToHtml(md: string): string {
  if (!md || !md.trim()) return '<p></p>'
  try {
    const html = marked.parse(md, { breaks: true })
    return html as string
  } catch (err) {
    console.error('Markdown parse error:', err)
    return `<p>${md}</p>`
  }
}

// HTML 转 Markdown
function htmlToMd(html: string): string {
  if (!html || !html.trim()) return ''
  try {
    return turndownService.turndown(html)
  } catch (err) {
    console.error('HTML to Markdown error:', err)
    return html
  }
}

// 初始化 TipTap 编辑器
const editor = useEditor({
  content: mdToHtml(docContent.value),
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4],
      },
    }),
    Placeholder.configure({
      placeholder: '开始编写...',
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Highlight,
    Link.configure({
      openOnClick: false,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose-editor',
    },
  },
  onUpdate: ({ editor }) => {
    if (isInternalUpdate.value) {
      isInternalUpdate.value = false
      return
    }

    const html = editor.getHTML()
    const markdown = htmlToMd(html)

    // 立即emit用于大纲显示（发送 HTML）
    emit('update', html)

    // 防抖emit用于后端保存（发送 Markdown）
    clearTimeout(saveTimer.value!)
    saveTimer.value = window.setTimeout(() => {
      emit('save', markdown)
    }, 500)
  },
})

// 监听文档ID变化（优先处理）
watch(() => props.doc?.id, (newId, oldId) => {
  if (!editor.value) return

  // 只在ID真正变化时才重置内容
  if (newId !== oldId) {
    isInternalUpdate.value = true
    const html = mdToHtml(docContent.value)
    editor.value.commands.setContent(html || '<p></p>', false)
  }
}, { immediate: true })

// 监听文档内容变化
watch(docContent, (newContent, oldContent) => {
  if (!editor.value) return
  if (!props.doc?.id) return

  // 避免循环更新：只有当新内容与当前编辑器内容不同时才更新
  const currentHtml = editor.value.getHTML()
  const newHtml = mdToHtml(newContent)
  
  if (newContent && newHtml !== currentHtml && newContent !== oldContent) {
    isInternalUpdate.value = true
    editor.value.commands.setContent(newHtml, false)
  }
})

// 右键菜单处理
function handleContextMenu(e: MouseEvent) {
  e.preventDefault()

  const items = [
    { icon: 'heading', label: '标题', fn: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'bold', label: '粗体', fn: () => editor.value?.chain().focus().toggleBold().run() },
    { icon: 'italic', label: '斜体', fn: () => editor.value?.chain().focus().toggleItalic().run() },
    { icon: 'strike', label: '删除线', fn: () => editor.value?.chain().focus().toggleStrike().run() },
    { label: 'separator', fn: () => {} },
    { icon: 'quote', label: '引用', fn: () => editor.value?.chain().focus().toggleBlockquote().run() },
    { icon: 'list', label: '无序列表', fn: () => editor.value?.chain().focus().toggleBulletList().run() },
    { icon: 'ordered-list', label: '有序列表', fn: () => editor.value?.chain().focus().toggleOrderedList().run() },
    { icon: 'check', label: '任务列表', fn: () => editor.value?.chain().focus().toggleTaskList().run() },
    { label: 'separator', fn: () => {} },
    { icon: 'code', label: '代码块', fn: () => editor.value?.chain().focus().toggleCodeBlock().run() },
    { icon: 'inline-code', label: '行内代码', fn: () => editor.value?.chain().focus().toggleCode().run() },
    { icon: 'link', label: '链接', fn: () => addLink() },
    { icon: 'hr', label: '分割线', fn: () => editor.value?.chain().focus().setHorizontalRule().run() },
  ]

  uiStore.showContextMenu(e.clientX, e.clientY, items)
}

// 添加链接
function addLink() {
  if (!editor.value) return

  const url = window.prompt('输入链接地址:')
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

// 清理
onBeforeUnmount(() => {
  clearTimeout(saveTimer.value!)
  editor.value?.destroy()
})
</script>

<template>
  <div class="editor-wrap flex-1 min-h-0 overflow-y-auto" @contextmenu="handleContextMenu">
    <div class="tiptap-editor">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style>
.editor-wrap {
  background: var(--md-bg);
  transition: background 0.35s ease;
}

.editor-wrap::-webkit-scrollbar {
  width: 6px;
}

.editor-wrap::-webkit-scrollbar-thumb {
  background: var(--md-hr);
  border-radius: 3px;
}

.editor-wrap::-webkit-scrollbar-track {
  background: transparent;
}

.tiptap-editor {
  max-width: 700px;
  margin: 0 auto;
  padding: 44px 40px 120px;
  min-height: 100%;
}

/* TipTap 编辑器基础样式 */
.prose-editor {
  outline: none;
  min-height: 100%;
}

.prose-editor p {
  font-size: 15px;
  line-height: 1.75;
  color: var(--md-text);
  margin: 0.5em 0;
}

.prose-editor p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--ed-ph);
  pointer-events: none;
  height: 0;
}

.prose-editor h1 {
  font-family: 'Noto Serif SC', serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.5px;
  color: var(--md-h1);
  margin: 0.8em 0 0.4em;
}

.prose-editor h2 {
  font-family: 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.2px;
  color: var(--md-h2);
  margin: 0.8em 0 0.4em;
}

.prose-editor h3 {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--md-h3);
  margin: 0.7em 0 0.3em;
}

.prose-editor h4 {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--md-text);
  margin: 0.6em 0 0.3em;
}

.prose-editor a {
  color: var(--md-link);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.prose-editor a:hover {
  opacity: 0.8;
}

.prose-editor strong {
  font-weight: 700;
}

.prose-editor em {
  font-style: italic;
}

.prose-editor s {
  text-decoration: line-through;
  color: var(--md-quote);
}

.prose-editor code {
  background: var(--md-code-bg);
  color: var(--md-code-text);
  padding: 2px 6px;
  border-radius: 6px;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 13px;
}

.prose-editor pre {
  background: var(--md-code-bg);
  border-radius: 10px;
  padding: 14px 18px;
  margin: 0.8em 0;
  overflow-x: auto;
}

.prose-editor pre code {
  background: none;
  padding: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--md-text);
}

.prose-editor blockquote {
  border-left: 3px solid var(--md-quote-border);
  padding-left: 16px;
  margin-left: 2px;
  color: var(--md-quote);
  font-style: italic;
}

.prose-editor ul,
.prose-editor ol {
  padding-left: 24px;
  margin: 0.5em 0;
}

.prose-editor li {
  margin: 0.2em 0;
  line-height: 1.6;
}

.prose-editor ul li::marker {
  color: var(--md-bullet);
}

.prose-editor ol li::marker {
  color: var(--md-bullet);
}

.prose-editor hr {
  border: none;
  height: 1px;
  background: var(--md-hr);
  margin: 1.5em 0;
}

/* 任务列表样式 */
.prose-editor ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.prose-editor ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0.3em 0;
}

.prose-editor ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
}

.prose-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
  width: 17px;
  height: 17px;
  cursor: pointer;
  accent-color: var(--md-quote-border);
}

.prose-editor ul[data-type="taskList"] li > div {
  flex: 1;
}

.prose-editor ul[data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through;
  color: var(--md-quote);
}

/* 高亮样式 */
.prose-editor mark {
  background: rgba(255, 235, 59, 0.4);
  padding: 2px 0;
  border-radius: 2px;
}

/* 选中文本样式 */
.prose-editor ::selection {
  background: rgba(191, 138, 94, 0.2);
}
</style>