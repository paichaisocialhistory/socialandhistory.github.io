'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppStore } from '@/store/appStore'
import { reflectionApi } from '@/lib/api'

const schema = z.object({
  reflection1: z.string().min(20, '20자 이상 작성해주세요').max(500),
  reflection2: z.string().min(20, '20자 이상 작성해주세요').max(500),
})

type FormData = z.infer<typeof schema>

export function Step7Reflection() {
  const { student, selectedPerson, selectedRole, quizResult, trial, retryWithNewRole, retryWithNewPerson } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sheetSynced, setSheetSynced] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const ref1 = watch('reflection1', '')
  const ref2 = watch('reflection2', '')

  const onSubmit = async (data: FormData) => {
    if (!student) return
    setLoading(true)
    try {
      const res = await reflectionApi.submit({
        studentId: student.studentId,
        reflection1: data.reflection1,
        reflection2: data.reflection2,
      })
      setSheetSynced(res.data.sheetSynced)
      setSubmitted(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto text-center py-8">
        <div className="text-7xl mb-4 animate-bounce">🎊</div>
        <h2 className="text-3xl font-bold text-court-gold mb-3">
          모든 활동 완료!
        </h2>
        <p className="text-white/70 mb-6">
          역사 모의 법정 활동을 성공적으로 마쳤습니다
        </p>

        {/* 활동 요약 */}
        <div className="court-card p-6 text-left mb-6 space-y-3">
          <h3 className="text-court-gold font-bold text-center mb-4">📊 활동 결과 요약</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs">이름</p>
              <p className="text-white font-bold">{student?.name}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs">선택 인물</p>
              <p className="text-white font-bold">{selectedPerson}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs">법정 역할</p>
              <p className="text-white font-bold">{selectedRole}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs">퀴즈 점수</p>
              <p className="text-white font-bold">
                {quizResult?.score}/{quizResult?.total}점
                <span className={quizResult?.passed ? ' text-green-400' : ' text-red-400'}>
                  {quizResult?.passed ? ' ✓합격' : ' 불합격'}
                </span>
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs">재판 진행</p>
              <p className="text-white font-bold">{trial?.currentTurn || 0}턴 완료</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/50 text-xs">데이터 저장</p>
              <p className={sheetSynced ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>
                {sheetSynced ? '✅ Google Sheets 저장됨' : '💾 로컬 저장됨'}
              </p>
            </div>
          </div>
        </div>

        <div className="court-card p-4 bg-court-gold/10 border-court-gold/40">
          <p className="text-court-gold font-bold mb-1">🌟 수고하셨습니다!</p>
          <p className="text-white/70 text-sm">
            선생님께서 여러분의 활동 내용을 확인하실 수 있습니다.
            역사 속 인물의 입장에서 생각해보는 소중한 경험이 되었기를 바랍니다.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={retryWithNewRole} className="btn-court text-sm">
            ↩ {selectedPerson} 재판, 다른 역할로 다시 하기
          </button>
          <button
            onClick={retryWithNewPerson}
            className="rounded-lg border border-court-gold/60 py-2.5 text-sm text-court-gold hover:bg-court-gold/10"
          >
            다른 인물로 다시 하기
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">
          다시 하고 느낀점을 또 제출하면, 선생님께는 가장 최근 활동이 전달됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-court-gold mb-2">
          ✍️ 느낀점 작성
        </h2>
        <p className="text-white/60 text-sm">
          <span className="text-court-gold">{selectedPerson}</span> 재판을 마치고 느낀 점을 작성해주세요
        </p>
      </div>

      {/* 재판 요약 카드 */}
      <div className="court-card p-4 mb-6 grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <p className="text-white/40 text-xs">선택 인물</p>
          <p className="text-court-gold font-bold">{selectedPerson}</p>
        </div>
        <div>
          <p className="text-white/40 text-xs">나의 역할</p>
          <p className="text-white font-bold">{selectedRole}</p>
        </div>
        <div>
          <p className="text-white/40 text-xs">퀴즈 결과</p>
          <p className={quizResult?.passed ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>
            {quizResult?.score}/{quizResult?.total}점
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 느낀점 1 */}
        <div className="court-card p-5">
          <label className="text-court-gold font-bold block mb-2">
            💭 재판을 통해 배운 점은 무엇인가요?
          </label>
          <p className="text-white/40 text-xs mb-3">
            {selectedPerson}의 역사적 행동에 대해 새롭게 알게 된 사실이나 관점을 적어주세요.
          </p>
          <textarea
            {...register('reflection1')}
            rows={4}
            placeholder="예: 김옥균은 단순한 반역자가 아니라 조선의 근대화를 진심으로 원했던 인물임을 알게 되었습니다..."
            className="input-court resize-none"
          />
          <div className="flex justify-between mt-1">
            {errors.reflection1 && (
              <p className="text-red-400 text-xs">{errors.reflection1.message}</p>
            )}
            <p className={`text-xs ml-auto ${ref1.length >= 20 ? 'text-green-400' : 'text-white/40'}`}>
              {ref1.length} / 500
            </p>
          </div>
        </div>

        {/* 느낀점 2 */}
        <div className="court-card p-5">
          <label className="text-court-gold font-bold block mb-2">
            🌍 역사를 통해 현재에 적용할 수 있는 교훈은?
          </label>
          <p className="text-white/40 text-xs mb-3">
            이 역사적 사건이 오늘날 우리에게 주는 교훈이나 생각을 적어주세요.
          </p>
          <textarea
            {...register('reflection2')}
            rows={4}
            placeholder="예: 변화를 이루려면 방법도 중요하다는 것을 배웠습니다. 좋은 목적이라도 잘못된 방법으로 추진하면..."
            className="input-court resize-none"
          />
          <div className="flex justify-between mt-1">
            {errors.reflection2 && (
              <p className="text-red-400 text-xs">{errors.reflection2.message}</p>
            )}
            <p className={`text-xs ml-auto ${ref2.length >= 20 ? 'text-green-400' : 'text-white/40'}`}>
              {ref2.length} / 500
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-court w-full text-lg py-4"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> 제출 중...
            </span>
          ) : (
            '느낀점 제출 완료하기 🎊'
          )}
        </button>
      </form>
    </div>
  )
}
