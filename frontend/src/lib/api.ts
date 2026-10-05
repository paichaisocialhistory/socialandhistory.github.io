import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // AI 응답 대기 60초
})

// 교사 토큰 자동 첨부
api.interceptors.request.use((config) => {
  let token: string | null = null
  try {
    token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null
  } catch {
    // 사파리 개인정보 보호 모드 등에서 저장소를 못 읽을 때
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 교사 로그인이 만료되면(하루) 저장된 토큰을 지우고 로그인 화면으로 돌려보낸다
export const TEACHER_LOGOUT_EVENT = 'teacher-logout'
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || ''
    const status = error.response?.status
    const notLoggedIn = status === 401 || (status === 403 && error.response?.data?.detail === 'Not authenticated')
    if (typeof window !== 'undefined' && url.startsWith('/teacher/') && url !== '/teacher/login' && notLoggedIn) {
      try {
        localStorage.removeItem('teacher_token')
      } catch {}
      window.dispatchEvent(new Event(TEACHER_LOGOUT_EVENT))
    }
    return Promise.reject(error)
  }
)

// ---- Student APIs ----

export const sessionApi = {
  create: (data: {
    classCode: string
    grade: number
    classNo: number
    studentNo: number
    name: string
  }) => api.post('/session', data),
  
  get: (studentId: string) => api.get(`/session/${studentId}`),
}

export const personsApi = {
  list: () => api.get('/persons'),
  get: (name: string) => api.get(`/persons/${encodeURIComponent(name)}`),
  select: (studentId: string, person: string) =>
    api.post('/persons/select', { studentId, person }),
}

export const quizApi = {
  getItems: (personName: string) => 
    api.get(`/quiz/${encodeURIComponent(personName)}`),
  
  submit: (data: {
    studentId: string
    answers: Array<{ questionId: string; answer: number }>
  }) => api.post('/quiz/submit', data),
}

export const trialApi = {
  start: (data: { studentId: string; person: string; role: string }) =>
    api.post('/trial/start', data),
  
  turn: (data: { trialId: string; turn: number; message: string }) =>
    api.post('/trial/turn', data),

  finish: (trialId: string) => api.post('/trial/finish', { trialId }),
  
  history: (trialId: string) => api.get(`/trial/${trialId}/history`),
}

export const reflectionApi = {
  submit: (data: {
    studentId: string
    reflection1: string
    reflection2: string
  }) => api.post('/reflection', data),
  
  get: (studentId: string) => api.get(`/reflection/${studentId}`),
}

// ---- Teacher APIs ----

export const teacherApi = {
  login: (email: string, password: string) =>
    api.post('/teacher/login', { email, password }),
  
  register: (email: string, password: string, name: string) =>
    api.post('/teacher/register', { email, password, name }),
  
  getClasses: () => api.get('/teacher/classes'),
  
  createClass: (data: {
    className: string
    classCode: string
    sheetUrl?: string
  }) => api.post('/teacher/classes', data),
  
  updateSheetUrl: (classId: string, sheetUrl: string) =>
    api.put(`/teacher/classes/${classId}/sheet`, null, {
      params: { sheet_url: sheetUrl },
    }),
  
  syncSheet: (classId: string) =>
    api.post(`/teacher/classes/${classId}/sheet/sync`, null, { timeout: 180000 }),

  getStudents: (classId: string) =>
    api.get(`/teacher/classes/${classId}/students`),
}
