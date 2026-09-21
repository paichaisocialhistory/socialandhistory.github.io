import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: '정보 입력', icon: '✏️' },
  { id: 2, label: '인물 선택', icon: '👤' },
  { id: 3, label: '학습', icon: '📚' },
  { id: 4, label: '퀴즈', icon: '❓' },
  { id: 5, label: '역할 선택', icon: '⚖️' },
  { id: 6, label: 'AI 모의재판', icon: '🔨' },
  { id: 7, label: '느낀점', icon: '✍️' },
]

interface StepProgressProps {
  currentStep: number
}

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="w-full bg-court-navy border-b border-court-gold/30 py-3 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 모바일: 현재 단계만 표시 */}
        <div className="flex items-center justify-between mb-2 md:hidden">
          <span className="text-court-gold text-sm font-medium">
            {STEPS[currentStep - 1]?.icon} {STEPS[currentStep - 1]?.label}
          </span>
          <span className="text-white/60 text-xs">{currentStep} / 7</span>
        </div>
        
        {/* 진행 바 */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-3 md:mb-4">
          <div
            className="bg-court-gold h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
          />
        </div>
        
        {/* 데스크탑: 전체 스텝 표시 */}
        <div className="hidden md:flex justify-between">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center gap-1',
                step.id <= currentStep ? 'opacity-100' : 'opacity-40'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all',
                  step.id < currentStep
                    ? 'bg-court-gold border-court-gold text-court-dark'
                    : step.id === currentStep
                    ? 'bg-court-dark border-court-gold text-court-gold'
                    : 'bg-transparent border-white/30 text-white/30'
                )}
              >
                {step.id < currentStep ? '✓' : step.id}
              </div>
              <span
                className={cn(
                  'text-xs',
                  step.id === currentStep ? 'text-court-gold font-bold' : 'text-white/60'
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
