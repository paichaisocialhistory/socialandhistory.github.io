'use client'

import { useState, useEffect } from 'react'
import { teacherApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface StudentProgress {
  studentId: string
  name: string
  grade: number
  classNo: number
  studentNo: number
  currentStep: number
  completed: boolean
  selectedPerson?: string
  selectedRole?: string
  quizScore?: number
  quizPassed?: boolean
  totalSeconds: number
}

interface ClassInfo {
  id: string
  className: string
  classCode: string
  sheetUrl?: string
  studentCount: number
}

const STEPS_LABEL = ['', '정보입력', '인물선택', '학습', '퀴즈', '역할선택', 'AI재판', '느낀점']
const STEP_COLORS = [
  '',
  'bg-gray-500/20',
  'bg-blue-500/20',
  'bg-green-500/20',
  'bg-yellow-500/20',
  'bg-orange-500/20',
  'bg-red-500/20',
  'bg-purple-500/20',
]

export default function TeacherDashboard() {
  const [token, setToken] = useState<string | null>(null)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [sheetUrlInput, setSheetUrlInput] = useState('')
  const [sheetSaving, setSheetSaving] = useState(false)
  const [newClassForm, setNewClassForm] = useState({ className: '', classCode: '' })
  const [showNewClass, setShowNewClass] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('teacher_token')
    if (t) {
      setToken(t)
      loadClasses()
    }
  }, [])

  const loadClasses = async () => {
    try {
      const res = await teacherApi.getClasses()
      setClasses(res.data)
    } catch {}
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await teacherApi.login(loginForm.email, loginForm.password)
      const t = res.data.access_token
      localStorage.setItem('teacher_token', t)
      setToken(t)
      await loadClasses()
    } catch {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  const handleSelectClass = async (cls: ClassInfo) => {
    setSelectedClass(cls)
    setSheetUrlInput(cls.sheetUrl || '')
    setLoading(true)
    try {
      const res = await teacherApi.getStudents(cls.id)
      setStudents(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSheet = async () => {
    if (!selectedClass) return
    setSheetSaving(true)
    try {
      await teacherApi.updateSheetUrl(selectedClass.id, sheetUrlInput)
      setSelectedClass({ ...selectedClass, sheetUrl: sheetUrlInput })
      alert('Google Sheets URL이 저장되었습니다.')
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSheetSaving(false)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await teacherApi.createClass(newClassForm)
      setClasses([...classes, res.data])
      setShowNewClass(false)
      setNewClassForm({ className: '', classCode: '' })
    } catch {
      alert('학급 생성에 실패했습니다.')
    }
  }

  // 통계 계산
  const stats = {
    total: students.length,
    completed: students.filter(s => s.completed).length,
    inProgress: students.filter(s => s.currentStep >= 2 && !s.completed).length,
    avgScore: students.filter(s => s.quizScore !== undefined).reduce((acc, s) => acc + (s.quizScore || 0), 0) /
              Math.max(students.filter(s => s.quizScore !== undefined).length, 1),
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="court-card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">👩‍🏫</div>
            <h1 className="text-2xl font-bold text-court-gold">교사 로그인</h1>
            <p className="text-white/50 text-sm mt-1">AI 역사 모의 법정 관리자</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={loginForm.email}
              onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
              placeholder="이메일"
              className="input-court"
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="비밀번호"
              className="input-court"
            />
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button type="submit" className="btn-court w-full">로그인</button>
          </form>
          <p className="text-white/40 text-xs text-center mt-4">
            테스트 계정: teacher@school.kr / password
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-court-gold">교사 대시보드</h1>
            <p className="text-white/50 text-sm">AI 역사 모의 법정 관리</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('teacher_token'); setToken(null) }}
            className="btn-outline-court text-sm py-2"
          >
            로그아웃
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 학급 목록 */}
          <div className="court-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-court-gold font-bold">내 학급</h2>
              <button
                onClick={() => setShowNewClass(!showNewClass)}
                className="text-court-gold text-sm hover:text-white transition-colors"
              >
                + 추가
              </button>
            </div>

            {showNewClass && (
              <form onSubmit={handleCreateClass} className="mb-4 space-y-2">
                <input
                  value={newClassForm.className}
                  onChange={e => setNewClassForm({ ...newClassForm, className: e.target.value })}
                  placeholder="학급명 (예: 2학년 3반)"
                  className="input-court text-sm py-2"
                />
                <input
                  value={newClassForm.classCode}
                  onChange={e => setNewClassForm({ ...newClassForm, classCode: e.target.value.toUpperCase() })}
                  placeholder="학급 코드 (예: HIST2-0921)"
                  className="input-court text-sm py-2 uppercase"
                />
                <button type="submit" className="btn-court w-full text-sm py-2">생성</button>
              </form>
            )}

            <div className="space-y-2">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => handleSelectClass(cls)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-all border',
                    selectedClass?.id === cls.id
                      ? 'border-court-gold bg-court-gold/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  )}
                >
                  <p className="font-medium text-white text-sm">{cls.className}</p>
                  <p className="text-white/50 text-xs">{cls.classCode}</p>
                  <p className="text-white/40 text-xs">학생 {cls.studentCount}명</p>
                </button>
              ))}
              {classes.length === 0 && (
                <p className="text-white/40 text-sm text-center py-4">학급을 추가하세요</p>
              )}
            </div>
          </div>

          {/* 메인 영역 */}
          <div className="lg:col-span-3 space-y-4">
            {selectedClass ? (
              <>
                {/* 통계 카드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: '전체 학생', value: stats.total, icon: '👥', color: 'text-white' },
                    { label: '완료', value: stats.completed, icon: '✅', color: 'text-green-400' },
                    { label: '진행 중', value: stats.inProgress, icon: '⏳', color: 'text-yellow-400' },
                    { label: '퀴즈 평균', value: `${stats.avgScore.toFixed(1)}점`, icon: '📊', color: 'text-blue-400' },
                  ].map(stat => (
                    <div key={stat.label} className="court-card p-4 text-center">
                      <p className="text-2xl mb-1">{stat.icon}</p>
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-white/50 text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Google Sheet 설정 */}
                <div className="court-card p-4">
                  <h3 className="text-court-gold font-bold mb-3">📊 Google Sheets 연동</h3>
                  <div className="flex gap-2">
                    <input
                      value={sheetUrlInput}
                      onChange={e => setSheetUrlInput(e.target.value)}
                      placeholder="Google Apps Script URL 붙여넣기"
                      className="input-court text-sm flex-1"
                    />
                    <button
                      onClick={handleSaveSheet}
                      disabled={sheetSaving}
                      className="btn-court text-sm py-2 px-4 whitespace-nowrap"
                    >
                      {sheetSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    학생이 느낀점을 제출하면 자동으로 Google Sheets에 저장됩니다
                  </p>
                </div>

                {/* 학생 진행 현황 테이블 */}
                <div className="court-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-court-gold font-bold">
                      학생 진행 현황 ({selectedClass.className})
                    </h3>
                    <button
                      onClick={() => handleSelectClass(selectedClass)}
                      className="text-white/50 text-sm hover:text-white"
                    >
                      🔄 새로고침
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 text-court-gold animate-pulse">
                      데이터 불러오는 중...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            {['번호', '이름', '진행단계', '선택인물', '역할', '퀴즈', '완료'].map(h => (
                              <th key={h} className="text-white/50 text-left py-2 px-3 font-normal">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map(s => (
                            <tr key={s.studentId} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-2 px-3 text-white/60">{s.classNo}-{s.studentNo}</td>
                              <td className="py-2 px-3 text-white font-medium">{s.name}</td>
                              <td className="py-2 px-3">
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  STEP_COLORS[s.currentStep] || 'bg-gray-500/20'
                                )}>
                                  {STEPS_LABEL[s.currentStep] || `${s.currentStep}단계`}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-white/70">{s.selectedPerson || '-'}</td>
                              <td className="py-2 px-3 text-white/70">{s.selectedRole || '-'}</td>
                              <td className="py-2 px-3">
                                {s.quizScore !== undefined ? (
                                  <span className={s.quizPassed ? 'text-green-400' : 'text-red-400'}>
                                    {s.quizScore}점
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="py-2 px-3">
                                {s.completed ? '✅' : '⏳'}
                              </td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-white/40">
                                아직 참여한 학생이 없습니다
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="court-card p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-white/50">왼쪽에서 학급을 선택하거나 새 학급을 추가하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
