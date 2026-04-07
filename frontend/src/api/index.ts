import axios from 'axios'
import { useUserStore } from '@/stores/user'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器：添加token
api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
    }
    return Promise.reject(error.response?.data?.error || error.message)
  }
)

// 认证API
export const authApi = {
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me')
}

// 文件夹API
export const foldersApi = {
  getAll: () => api.get('/folders'),
  create: (name: string, parentId?: string) =>
    api.post('/folders', { name, parentId }),
  update: (id: string, data: { name?: string; parentId?: string; collapsed?: boolean }) =>
    api.put(`/folders/${id}`, data),
  delete: (id: string) => api.delete(`/folders/${id}`)
}

// 文档API
export const documentsApi = {
  getAll: () => api.get('/documents'),
  getOne: (id: string) => api.get(`/documents/${id}`),
  create: (title?: string, content?: string, parentId?: string) =>
    api.post('/documents', { title, content, parentId }),
  update: (id: string, data: { title?: string; content?: string; parentId?: string; shareSettings?: any }) =>
    api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`)
}

// 分享API
export const shareApi = {
  getByCode: (code: string) => api.get(`/share/${code}`),
  verifyPassword: (code: string, password: string) =>
    api.post(`/share/${code}/verify`, { password })
}

export default api