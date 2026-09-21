'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { quizApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface QuizItem {
  id: string
  question: string
  choices: string[]
  difficulty: number
}

export function Step4Quiz() {
  const { student, selectedPerson, setQuizResult, setStep } = useAppStore()
  const [items, setItems] = useState<QuizItem[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (selectedPerson) {
      quizApi.getItems(selectedPerson).then((res) => {
        setItems(res.data)
        setLoading(false)
      })
    }
  }, [selectedPerson])

  const allAnswered = items.length > 0 && items.every((item) => answers[item.id] !== undefined)

  const handleSubmit = async () => {
    if (!student || !allAnswered) return
    setSubmitting(true)
    try {
      const answerList = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }))
      const res = await quizApi.submit({ studentId: student.studentId, answers: answerList })
      const data = res.data
      setResult(data)
      setShowResult(true)
      setQuizResult({
        score: data.score,
        total: data.total,
        passed: data.passed,
        attempts: data.attempts,
      })
      if (data.passed) {
        setStep(5)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-court-gold animate-pulse text-xl">❓ 퀴즈 준비 중...</span>
      </div>
    )
  }

  // 결과 화면
  if (showResult && result) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto">
        <div className="court-card p-8 text-center">
          <div className={cn(
            'text-6xl mb-4 animate-stamp inline-block',
            result.passed ? '' : ''
          )}>
            {result.passed ? '🎉' : '😅'}
          </div>
          <h2 className={cn(
            'text-3xl font-bold mb-2',
            result.passed ? 'text-court-gold' : 'text-white'
          )}>
            {result.passed ? '합격!' : '아쉽네요...'}
          </h2>
          <p className="text-white/60 mb-6">
            {result.score}점 / {result.total}점
            {result.attempts > 1 && ` (${result.attempts}번째 시도)`}
          </p>

          {/* 문항별 결과 */}
          <div className="space-y-2 mb-6 text-left">
            {(result.results || []).map((r: any, idx: number) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  r.correct ? 'bg-green-500/10' : 'bg-red-500/10'
                )}
              >
                <span>{r.correct ? '✅' : '❌'}</span>
                <span className="text-white/70 flex-1 truncate">
                  {items.find(i => i.id === r.questionId)?.question.slice(0, 40)}...
                </span>
              </div>
            ))}
          </div>

          {result.passed ? (
            <button onClick={() => setStep(5)} className="btn-court w-full">
              역할 선택하기 →
            </button>
          ) : (
            <button
              onClick={() => {
                setShowResult(false)
                setAnswers({})
              }}
              className="btn-outline-court w-full"
            >
              다시 도전하기 ({result.attempts}번째)
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-court-gold mb-2">
          ❓ {selectedPerson} 퀴즈
        </h2>
        <p className="text-white/60 text-sm">
          60% 이상 정답이면 합격! 재도전 횟수 제한 없음
        </p>
      </div>

      <div className="space-y-6">
        {items.map((item, idx) => (
          <div key={item.id} className="court-card p-5">
            <p className="text-white font-medium mb-4">
              <span className="text-court-gold mr-2">Q{idx + 1}.</span>
              {item.question}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {item.choices.map((choice, choiceIdx) => (
                <button
                  key={choiceIdx}
                  onClick={() => setAnswers({ ...answers, [item.id]: choiceIdx })}
                  className={cn(
                    'px-4 py-3 rounded-lg text-left text-sm transition-all',
                    answers[item.id] === choiceIdx
                      ? 'bg-court-gold/20 border border-court-gold text-court-gold font-medium'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:border-white/30'
                  )}
                >
                  <span className="font-bold mr-2">{['①', '②', '③', '④'][choiceIdx]}</span>
                  {choice}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 답안 제출 */}
      <div className="mt-6 court-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-sm">
            {Object.keys(answers).length} / {items.length} 문항 답변
          </span>
          <span className="text-court-gold text-sm font-bold">
            {allAnswered ? '✅ 모두 답변 완료' : '⏳ 남은 문항 있음'}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="btn-court w-full"
        >
          {submitting ? '채점 중...' : '답안 제출하기'}
        </button>
      </div>
    </div>
  )
}
