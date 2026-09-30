'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { personsApi } from '@/lib/api'

interface Person {
  id: string
  name: string
  category: string
  period: string
  summary: string
  content: Record<string, any>
}

// 재판 쟁점의 역할별 입장 (DB의 영어 키 → 화면에 보일 한글 이름)
const ROLE_LABELS = [
  { key: 'prosecutor', label: '검사 측 입장' },
  { key: 'defender', label: '변호인 측 입장' },
  { key: 'defendant', label: '피고인의 주장' },
]

export function Step3Study() {
  const { selectedPerson, setStep } = useAppStore()
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [readSection, setReadSection] = useState(0)
  const TOTAL_SECTIONS = 4

  useEffect(() => {
    if (selectedPerson) {
      personsApi.get(selectedPerson).then((res) => {
        setPerson(res.data)
        setLoading(false)
      })
    }
  }, [selectedPerson])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-court-gold animate-pulse text-xl">📚 학습 자료 불러오는 중...</span>
      </div>
    )
  }

  if (!person) return null

  const content = person.content || {}

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-court-gold mb-1">
          📚 {person.name} 학습하기
        </h2>
        <p className="text-white/50 text-sm">{person.period}</p>
      </div>

      {/* 학습 자료 */}
      <div className="space-y-4">
        {/* 기본 정보 */}
        <div className="court-card p-5" onClick={() => setReadSection(Math.max(readSection, 1))}>
          <h3 className="text-court-gold font-bold mb-3 flex items-center gap-2">
            <span>👤</span> 인물 소개
          </h3>
          <p className="text-white/80 leading-relaxed">{person.summary}</p>
          <div className="mt-3 flex gap-4 text-sm text-white/50">
            <span>📅 출생: {content.birth || '미상'}</span>
            <span>📅 사망: {content.death || '미상'}</span>
          </div>
        </div>

        {/* 주요 업적 */}
        <div className="court-card p-5" onClick={() => setReadSection(Math.max(readSection, 2))}>
          <h3 className="text-court-gold font-bold mb-3 flex items-center gap-2">
            <span>🏆</span> 주요 업적 및 활동
          </h3>
          <ul className="space-y-2">
            {(content.achievements || []).map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-white/80">
                <span className="text-court-gold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 역사적 배경 */}
        <div className="court-card p-5" onClick={() => setReadSection(Math.max(readSection, 3))}>
          <h3 className="text-court-gold font-bold mb-3 flex items-center gap-2">
            <span>📜</span> 역사적 배경
          </h3>
          <p className="text-white/80 leading-relaxed">
            {content.background || '상세 정보가 없습니다.'}
          </p>
        </div>

        {/* 재판 쟁점 */}
        <div className="court-card p-5 border-court-gold/40" onClick={() => setReadSection(Math.max(readSection, 4))}>
          <h3 className="text-court-gold font-bold mb-3 flex items-center gap-2">
            <span>⚖️</span> 재판 핵심 쟁점
          </h3>
          <p className="text-white/80 leading-relaxed">
            {content.trial_context || '재판 쟁점 정보가 없습니다.'}
          </p>
          
          {/* 역할별 입장 미리보기 */}
          {content.roles && (
            <div className="mt-4 grid grid-cols-1 gap-2">
              {ROLE_LABELS.filter(({ key }) => content.roles[key]).map(({ key, label }) => (
                <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-court-gold text-xs font-bold">[{label}]</span>
                  <span className="text-white/70 text-sm ml-2">{content.roles[key]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 학습 진행 표시 */}
      <div className="court-card p-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-sm">학습 진행도</span>
          <span className="text-court-gold text-sm font-bold">
            {Math.round((readSection / TOTAL_SECTIONS) * 100)}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-court-gold h-2 rounded-full transition-all duration-500"
            style={{ width: `${(readSection / TOTAL_SECTIONS) * 100}%` }}
          />
        </div>
        <p className="text-white/50 text-xs mt-2 text-center">
          각 항목을 클릭하면 학습한 것으로 기록됩니다
        </p>
      </div>

      <button
        onClick={() => setStep(4)}
        className="btn-court w-full mt-4 text-lg"
      >
        퀴즈 풀기 →
      </button>
    </div>
  )
}
