import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { documentsApi, foldersApi } from '@/api'

export interface Folder {
  id: string
  name: string
  parentId: string | null
  collapsed: boolean
  order: number
  type: 'folder'
}

export interface Document {
  id: string
  title: string
  content: string
  parentId: string | null
  userId: string
  order: number
  createdAt: string
  updatedAt: string
  shareSettings: {
    enabled: boolean
    mode: 'private' | 'link' | 'password'
    password: string
    shareCode: string
  }
  type: 'doc'
}

export type TreeNode = Folder | Document

export const useDocumentStore = defineStore('document', () => {
  // 文件夹和文档列表
  const folders = ref<Folder[]>([])
  const documents = ref<Document[]>([])

  // 当前选中的文档ID
  const activeDocId = ref<string | null>(null)

  // 打开的标签页
  const openTabs = ref<string[]>([])

  // 所有节点（用于树形结构）
  const allNodes = computed<TreeNode[]>(() => {
    return [...folders.value, ...documents.value]
  })

  // 当前活动文档
  const activeDoc = computed<Document | null>(() => {
    if (!activeDocId.value) return null
    return documents.value.find(d => d.id === activeDocId.value) || null
  })

  // 文档映射（用于Tab栏）
  const docMap = computed<Record<string, Document>>(() => {
    const map: Record<string, Document> = {}
    documents.value.forEach(d => {
      map[d.id] = d
    })
    return map
  })

  // 有效标签页（过滤掉已删除的文档）
  const validTabs = computed<string[]>(() => {
    return openTabs.value.filter(id => docMap.value[id])
  })

  // 加载所有数据
  async function loadAll() {
    try {
      const [foldersRes, docsRes] = await Promise.all([
        foldersApi.getAll(),
        documentsApi.getAll()
      ])

      if (foldersRes.success) {
        folders.value = foldersRes.data
      }
      if (docsRes.success) {
        documents.value = docsRes.data
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  // 选择文档
  async function selectDoc(id: string | null) {
    activeDocId.value = id

    // 更新URL参数
    if (id) {
      const url = new URL(window.location.href)
      url.searchParams.set('doc', id)
      window.history.replaceState({}, '', url.toString())
    } else {
      const url = new URL(window.location.href)
      url.searchParams.delete('doc')
      window.history.replaceState({}, '', url.toString())
    }

    // 如果 id 为空，不进行后续操作
    if (!id) return

    // 添加到标签页
    if (!openTabs.value.includes(id)) {
      openTabs.value.push(id)
    }

    // 加载文档内容（如果还没加载）
    const doc = documents.value.find(d => d.id === id)
    if (doc && !doc.content) {
      try {
        const res = await documentsApi.getOne(id)
        if (res.success) {
          const idx = documents.value.findIndex(d => d.id === id)
          if (idx !== -1) {
            documents.value[idx] = res.data
          }
        }
      } catch (err) {
        console.error('Failed to load document:', err)
      }
    }
  }

  // 从URL恢复文档选中状态
  function restoreFromUrl() {
    const url = new URL(window.location.href)
    const docId = url.searchParams.get('doc')
    if (docId && documents.value.find(d => d.id === docId)) {
      selectDoc(docId)
    }
  }

  // 关闭标签页
  function closeTab(id: string) {
    const idx = openTabs.value.indexOf(id)
    if (idx === -1) return

    openTabs.value.splice(idx, 1)

    if (id === activeDocId.value) {
      if (openTabs.value.length > 0) {
        activeDocId.value = openTabs.value[Math.min(idx, openTabs.value.length - 1)]
      } else {
        activeDocId.value = null
      }
    }
  }

  // 创建文件夹
  async function createFolder(name: string, parentId?: string) {
    try {
      const res = await foldersApi.create(name, parentId)
      if (res.success) {
        folders.value.push(res.data)
        // 如果有父文件夹，展开它
        if (parentId) {
          const parent = folders.value.find(f => f.id === parentId)
          if (parent) {
            parent.collapsed = false
          }
        }
      }
      return res
    } catch (err) {
      throw err
    }
  }

  // 创建文档
  async function createDoc(title?: string, content?: string, parentId?: string) {
    try {
      const res = await documentsApi.create(title, content, parentId)
      if (res.success) {
        documents.value.push(res.data)
        selectDoc(res.data.id)
        // 如果有父文件夹，展开它
        if (parentId) {
          const parent = folders.value.find(f => f.id === parentId)
          if (parent) {
            parent.collapsed = false
          }
        }
      }
      return res
    } catch (err) {
      throw err
    }
  }

  // 更新文档内容
  async function updateDocContent(id: string, content: string) {
    try {
      await documentsApi.update(id, { content })
      const doc = documents.value.find(d => d.id === id)
      if (doc) {
        doc.content = content
        doc.updatedAt = new Date().toISOString()
      }
    } catch (err) {
      throw err
    }
  }

  // 更新文档标题
  async function updateDocTitle(id: string, title: string) {
    try {
      await documentsApi.update(id, { title })
      const doc = documents.value.find(d => d.id === id)
      if (doc) {
        doc.title = title
      }
    } catch (err) {
      throw err
    }
  }

  // 更新分享设置
  async function updateShareSettings(id: string, settings: any) {
    try {
      await documentsApi.update(id, { shareSettings: settings })
      const doc = documents.value.find(d => d.id === id)
      if (doc) {
        doc.shareSettings = settings
      }
    } catch (err) {
      throw err
    }
  }

  // 更新文件夹
  async function updateFolder(id: string, data: { name?: string; parentId?: string; collapsed?: boolean }) {
    try {
      await foldersApi.update(id, data)
      const folder = folders.value.find(f => f.id === id)
      if (folder) {
        if (data.name) folder.name = data.name
        if (data.parentId !== undefined) folder.parentId = data.parentId || null
        if (data.collapsed !== undefined) folder.collapsed = data.collapsed
      }
    } catch (err) {
      throw err
    }
  }

  // 删除节点（文件夹或文档）
  async function deleteNode(id: string) {
    const folder = folders.value.find(f => f.id === id)
    const doc = documents.value.find(d => d.id === id)

    try {
      if (folder) {
        await foldersApi.delete(id)
        // 删除文件夹及其子内容
        const childIds = getAllChildIds(id)
        folders.value = folders.value.filter(f => !childIds.includes(f.id) && f.id !== id)
        documents.value = documents.value.filter(d => !childIds.includes(d.folderId || '') && d.id !== id)
        openTabs.value = openTabs.value.filter(tid => documents.value.find(d => d.id === tid))
      } else if (doc) {
        await documentsApi.delete(id)
        documents.value = documents.value.filter(d => d.id !== id)
        closeTab(id)
      }

      // 如果当前活动文档被删除，切换到下一个
      if (activeDocId.value === id || !documents.value.find(d => d.id === activeDocId.value)) {
        if (openTabs.value.length > 0) {
          activeDocId.value = openTabs.value[0]
        } else {
          activeDocId.value = null
        }
      }
    } catch (err) {
      throw err
    }
  }

  // 移动节点
  async function moveNode(id: string, parentId: string | null) {
    const folder = folders.value.find(f => f.id === id)
    const doc = documents.value.find(d => d.id === id)

    try {
      if (folder) {
        await foldersApi.update(id, { parentId })
        folder.parentId = parentId || null
      } else if (doc) {
        await documentsApi.update(id, { parentId })
        doc.parentId = parentId || null
      }
    } catch (err) {
      throw err
    }
  }

  // 辅助函数：获取所有子节点ID
  function getAllChildIds(folderId: string): string[] {
    const ids: string[] = []
    const children = folders.value.filter(f => f.parentId === folderId)
    for (const child of children) {
      ids.push(child.id)
      ids.push(...getAllChildIds(child.id))
    }
    return ids
  }

  return {
    folders,
    documents,
    allNodes,
    activeDocId,
    activeDoc,
    openTabs,
    validTabs,
    docMap,
    loadAll,
    selectDoc,
    closeTab,
    createFolder,
    createDoc,
    updateDocContent,
    updateDocTitle,
    updateShareSettings,
    updateFolder,
    deleteNode,
    moveNode,
    restoreFromUrl
  }
})