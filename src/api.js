// ==========================================
// КЛИЕНТ API БЭКЕНДА
// ==========================================
// Все запросы идут на /api/... — в режиме разработки Vite перенаправляет их
// на бэкенд http://127.0.0.1:8000 (см. vite.config.js), поэтому CORS не мешает.
// Если бэкенд на другом адресе, задайте VITE_API_URL в файле .env фронтенда.

const API_URL = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'swipet_token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* приватный режим браузера: токен живёт до перезагрузки */ }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Ссылка на файл с бэкенда (фото): /uploads/... -> полный адрес
export function fileUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return API_URL + path
}

async function request(method, path, body, isForm = false) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(API_URL + '/api/v1' + path, {
      method,
      headers,
      body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
    })
  } catch {
    throw new ApiError(0, 'Сервер не отвечает. Запустите бэкенд: uvicorn main:app --reload')
  }

  let data = null
  const text = await response.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }
  if (!response.ok) {
    let message = data && data.detail ? data.detail : `Ошибка ${response.status}`
    if (Array.isArray(message)) {   // ошибки проверки полей от FastAPI
      message = message.map(e => e.msg).join('; ')
    }
    if (response.status === 401 && token) setToken(null)
    throw new ApiError(response.status, message)
  }
  return data
}

export const api = {
  // аккаунт
  register: (data) => request('POST', '/auth/register', data),
  login: (login, password) => request('POST', '/auth/login', { email: login, password }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/profile/me'),
  savePrefs: (prefs) => request('PUT', '/me/prefs', prefs),

  // лента
  feed: (limit = 10) => request('GET', `/feed?limit=${limit}`),
  swipe: (petId, direction) => request('POST', `/feed/${petId}/swipe`, { direction }),
  why: (petId) => request('GET', `/feed/${petId}/why`),

  // анкеты
  createPet: (data) => request('POST', '/animals', data),
  uploadPhoto: (petId, file) => {
    const form = new FormData()
    form.append('file', file)
    return request('POST', `/animals/${petId}/photos`, form, true)
  },
  myPets: () => request('GET', '/me/animals'),
  setPetStatus: (petId, status) => request('PATCH', `/animals/${petId}/status?status=${status}`),

  // чаты
  chats: () => request('GET', '/chats'),
  messages: (chatId) => request('GET', `/chats/${chatId}/messages`),
  sendMessage: (chatId, text) => request('POST', `/chats/${chatId}/messages`, { text }),

  // подписка
  subscription: () => request('GET', '/me/subscription'),
  activatePremium: () => request('POST', '/me/subscription/activate'),
  cancelPremium: () => request('POST', '/me/subscription/cancel'),
}
