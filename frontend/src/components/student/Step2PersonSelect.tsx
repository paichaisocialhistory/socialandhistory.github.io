'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { personsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Person {
  id: string
  name: string
  category: string
  period: string
  summary: string
  content: Record<string, any>
  image_url?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  '개화파': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  '동학농민운동': 'bg-green-500/20 text-green-400 border-green-500/40',
  '독립운동': 'bg-red-500/20 text-red-400 border-red-500/40',
  '왕실/외교': 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}

export function Step2PersonSelect() {
  const { student, setSelectedPerson, setStep } = useAppStore()
  const [persons, setPersons] = useState<Person[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    personsApi.list().then((res) => {
      setPersons(res.data)
      setLoading(false)
    })
  }, [])

  const handleSelect = async () => {
    if (!selected || !student) return
    setSubmitting(true)
    try {
      await personsApi.select(student.studentId, selected)
      setSelectedPerson(selected)
      setStep(3)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-court-gold animate-pulse text-xl">인물 목록 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-court-gold mb-2">
          📜 역사 인물 선택
        </h2>
        <p className="text-white/60 text-sm">
          재판할 역사 인물을 선택하세요. 이 인물에 대해 학습하고 모의 재판을 진행합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {persons.map((person) => (
          <button
            key={person.id}
            onClick={() => setSelected(person.name)}
            className={cn(
              'court-card p-5 text-left transition-all duration-200 hover:border-court-gold/60',
              selected === person.name
                ? 'border-court-gold bg-court-gold/10 scale-[1.02]'
                : 'hover:bg-white/5'
            )}
          >
            <div className="flex items-start gap-4">
              {/* 인물 아이콘 */}
              <div className="w-16 h-16 rounded-full bg-court-royal/60 border-2 border-court-gold/40 flex items-center justify-center text-3xl flex-shrink-0">
                {person.name === '김옥균' && '🎭'}
                {person.name === '전봉준' && '⚔️'}
                {person.name === '안중근' && '🦅'}
                {person.name === '명성황후' && '👑'}
                {!['김옥균', '전봉준', '안중근', '명성황후'].includes(person.name) && '👤'}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-white text-lg">{person.name}</h3>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full border',
                    CATEGORY_COLORS[person.category] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                  )}>
                    {person.category}
                  </span>
                </div>
                <p className="text-white/50 text-xs mb-2">{person.period}</p>
                <p className="text-white/70 text-sm line-clamp-2">{person.summary}</p>
              </div>
              
              {selected === person.name && (
                <div className="text-court-gold text-xl flex-shrink-0">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 선택 완료 버튼 */}
      {selected && (
        <div className="court-card p-4 mb-4 animate-fade-in">
          <p className="text-center text-white/80 text-sm mb-3">
            <span className="text-court-gold font-bold">{selected}</span>을(를) 선택했습니다.
          </p>
          <button
            onClick={handleSelect}
            disabled={submitting}
            className="btn-court w-full"
          >
            {submitting ? '처리 중...' : `${selected} 학습 시작하기 →`}
          </button>
        </div>
      )}
    </div>
  )
}
