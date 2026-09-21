'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppStore } from '@/store/appStore'
import { sessionApi } from '@/lib/api'

const schema = z.object({
  classCode: z.string().min(1, '학급 코드를 입력하세요'),
  grade: z.number().min(1).max(3),
  classNo: z.number().min(1).max(20),
  studentNo: z.number().min(1).max(50),
  name: z.string().min(2, '이름은 2자 이상 입력하세요').max(20),
})

type FormData = z.infer<typeof schema>

export function Step1Session() {
  const { setStudent, setStep, currentStep, student } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      classCode: student?.classCode || '',
      grade: student?.grade || 2,
      classNo: student?.classNo || 1,
      studentNo: student?.studentNo || 1,
      name: student?.name || '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await sessionApi.create(data)
      const { studentId, currentStep: serverStep, stepData } = res.data

      setStudent({
        studentId,
        name: data.name,
        grade: data.grade,
        classNo: data.classNo,
        studentNo: data.studentNo,
        classCode: data.classCode,
      })

      // 서버의 진행 단계로 복원
      if (serverStep > 1) {
        setStep(serverStep as 1 | 2 | 3 | 4 | 5 | 6 | 7)
      } else {
        setStep(2)
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || '접속에 실패했습니다. 학급 코드를 확인하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      {/* 환영 메시지 */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">⚖️</div>
        <h2 className="text-2xl font-bold text-court-gold mb-2">
          역사 모의 법정에 오신 것을 환영합니다
        </h2>
        <p className="text-white/60 text-sm">
          학급 코드와 학생 정보를 입력하면 시작됩니다
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="court-card p-6 space-y-4">
        {/* 학급 코드 */}
        <div>
          <label className="text-white/80 text-sm font-medium block mb-1">
            학급 코드 *
          </label>
          <input
            {...register('classCode')}
            placeholder="예: HIST2-0921"
            className="input-court uppercase"
            style={{ textTransform: 'uppercase' }}
          />
          {errors.classCode && (
            <p className="text-red-400 text-xs mt-1">{errors.classCode.message}</p>
          )}
        </div>

        {/* 학년/반/번호 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">학년</label>
            <select
              {...register('grade', { valueAsNumber: true })}
              className="input-court bg-white/10"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n} className="bg-court-dark">{n}학년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">반</label>
            <select
              {...register('classNo', { valueAsNumber: true })}
              className="input-court bg-white/10"
            >
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="bg-court-dark">{n}반</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">번호</label>
            <select
              {...register('studentNo', { valueAsNumber: true })}
              className="input-court bg-white/10"
            >
              {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="bg-court-dark">{n}번</option>
              ))}
            </select>
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="text-white/80 text-sm font-medium block mb-1">
            이름 *
          </label>
          <input
            {...register('name')}
            placeholder="홍길동"
            className="input-court"
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-court w-full text-lg mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> 접속 중...
            </span>
          ) : (
            '법정 입장하기 →'
          )}
        </button>
      </form>

      {/* 재접속 안내 */}
      {student && (
        <div className="mt-4 court-card p-4 text-center">
          <p className="text-white/60 text-sm">
            이전 기록이 있습니다. 위 정보로 입력하면 이어서 진행할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  )
}
