'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { StepProgress } from '@/components/shared/StepProgress'
import { Step1Session } from '@/components/student/Step1Session'
import { Step2PersonSelect } from '@/components/student/Step2PersonSelect'
import { Step3Study } from '@/components/student/Step3Study'
import { Step4Quiz } from '@/components/student/Step4Quiz'
import { Step5RoleSelect } from '@/components/student/Step5RoleSelect'
import { Step6Trial } from '@/components/student/Step6Trial'
import { Step7Reflection } from '@/components/student/Step7Reflection'

export default function StudentPage() {
  const { currentStep } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-court-gold text-xl animate-pulse">
          ⚖️ 법정을 준비하고 있습니다...
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Session />
      case 2: return <Step2PersonSelect />
      case 3: return <Step3Study />
      case 4: return <Step4Quiz />
      case 5: return <Step5RoleSelect />
      case 6: return <Step6Trial />
      case 7: return <Step7Reflection />
      default: return <Step1Session />
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-court-dark border-b border-court-gold/30 py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-2xl">⚖️</span>
          <div>
            <h1 className="text-court-gold font-bold text-lg leading-tight">
              AI 역사 모의 법정
            </h1>
            <p className="text-white/50 text-xs">역사 속 인물을 재판하다</p>
          </div>
        </div>
      </header>

      {/* 단계 진행 표시 */}
      <StepProgress currentStep={currentStep} />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {renderStep()}
        </div>
      </main>
    </div>
  )
}
