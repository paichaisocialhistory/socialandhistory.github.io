'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { trialApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const BRANCH_CONFIG = {
  A: { label: '역사적 타당', color: 'badge-A', desc: '탁월한 발언입니다!' },
  B: { label: '근거 부족', color: 'badge-B', desc: '내용은 맞지만 근거를 보강하세요' },
  C: { label: '오류 있음', color: 'badge-C', desc: '역사적 사실을 다시 확인하세요' },
  D: { label: '성의 부족', color: 'badge-D', desc: '더 구체적으로 발언하세요' },
}

const ROLE_ICONS: Record<string, string> = {
  '검사': '⚡',
  '변호인': '🛡️',
  '판사': '⚖️',
  '증인': '👁️',
  '피고인': '🎭',
}

export function Step6Trial() {
  const { student, trial, addTrialTurn, finishTrial, setStep } = useAppStore()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentTurn = trial?.currentTurn ?? 0
  const maxTurns = trial?.maxTurns ?? 5
  const isFinished = trial?.isFinished ?? false

  // 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [trial?.turns])

  const handleSend = async () => {
    if (!message.trim() || !trial || loading || isFinished) return
    if (message.trim().length < 10) {
      setError('발언은 10자 이상 입력해주세요.')
      return
    }

    const nextTurn = currentTurn + 1
    setLoading(true)
    setError('')

    try {
      const res = await trialApi.turn({
        trialId: trial.trialId,
        turn: nextTurn,
        message: message.trim(),
      })

      const data = res.data

      addTrialTurn({
        turnNo: nextTurn,
        studentMessage: message.trim(),
        branch: data.branch,
        approved: data.approved,
        rejectReason: data.rejectReason,
        responses: data.responses || [],
      })

      if (data.isFinished) {
        finishTrial()
      }

      setMessage('')
    } catch (e: any) {
      setError(e.response?.data?.detail || '오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  if (!trial) return null

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-2xl mx-auto animate-fade-in">
      {/* 재판 헤더 */}
      <div className="court-card p-4 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ROLE_ICONS[trial.role] || '⚖️'}</span>
          <div>
            <p className="text-court-gold font-bold text-sm">{trial.person} 재판</p>
            <p className="text-white/50 text-xs">
              나의 역할: <span className="text-white/80">{trial.role}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-xs">진행 턴</p>
          <p className="text-court-gold font-bold text-lg">
            {currentTurn} <span className="text-white/40 text-sm">/ {maxTurns}</span>
          </p>
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* 법정 개정 안내 */}
        <div className="text-center">
          <div className="inline-block bg-court-gold/10 border border-court-gold/30 rounded-full px-4 py-2 text-sm text-court-gold">
            🔨 {trial.person}에 대한 역사 모의 법정이 시작됩니다
          </div>
        </div>

        {/* 턴별 대화 */}
        {trial.turns.map((turn) => (
          <div key={turn.turnNo} className="space-y-3">
            {/* 학생 발언 */}
            <div className="flex justify-end">
              <div className="bubble-student">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/50 text-xs">턴 {turn.turnNo}</span>
                  <span className="text-xs font-bold text-court-gold">
                    {ROLE_ICONS[trial.role]} {trial.role}
                  </span>
                </div>
                <p className="text-white text-sm">{turn.studentMessage}</p>
                
                {/* AI 판정 결과 */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full border',
                    BRANCH_CONFIG[turn.branch as keyof typeof BRANCH_CONFIG]?.color || 'badge-B'
                  )}>
                    {BRANCH_CONFIG[turn.branch as keyof typeof BRANCH_CONFIG]?.label || turn.branch}
                  </span>
                  {!turn.approved && turn.rejectReason && (
                    <span className="text-red-400 text-xs">{turn.rejectReason}</span>
                  )}
                </div>
              </div>
            </div>

            {/* AI 응답들 */}
            {turn.responses.map((resp, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-court-royal/60 border border-court-gold/30 flex items-center justify-center text-sm flex-shrink-0">
                  {ROLE_ICONS[resp.speaker] || '👤'}
                </div>
                <div className="bubble-ai flex-1">
                  <p className="text-court-gold text-xs font-bold mb-1">{resp.speaker}</p>
                  <p className="text-white/80 text-sm">{resp.message}</p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* 로딩 */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-court-royal/60 border border-court-gold/30 flex items-center justify-center text-sm">
              ⚖️
            </div>
            <div className="bubble-ai">
              <p className="text-court-gold text-xs font-bold mb-1">AI 법정</p>
              <div className="flex gap-1 items-center">
                <span className="text-white/50 text-sm">검토 중</span>
                <span className="animate-bounce delay-0 text-court-gold">.</span>
                <span className="animate-bounce delay-100 text-court-gold">.</span>
                <span className="animate-bounce delay-200 text-court-gold">.</span>
              </div>
            </div>
          </div>
        )}

        {/* 재판 종료 */}
        {isFinished && (
          <div className="text-center py-4">
            <div className="inline-block bg-court-gold/20 border border-court-gold rounded-xl px-6 py-4">
              <p className="text-3xl mb-2">🔨</p>
              <p className="text-court-gold font-bold text-lg">재판이 종료되었습니다</p>
              <p className="text-white/60 text-sm mt-1">총 {currentTurn}턴 진행</p>
              <button
                onClick={() => setStep(7)}
                className="btn-court mt-4 w-full"
              >
                느낀점 작성하기 →
              </button>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 입력 영역 */}
      {!isFinished && (
        <div className="mt-3 court-card p-3">
          {/* 남은 턴 표시 */}
          <div className="flex gap-1 mb-2">
            {Array.from({ length: maxTurns }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all',
                  i < currentTurn ? 'bg-court-gold' : 'bg-white/10'
                )}
              />
            ))}
          </div>
          <p className="text-white/40 text-xs mb-2 text-right">
            {maxTurns - currentTurn}턴 남음
          </p>
          
          {error && (
            <p className="text-red-400 text-xs mb-2">⚠️ {error}</p>
          )}
          
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`${trial.role}으로서 역사적 발언을 입력하세요... (Enter로 제출, Shift+Enter 줄바꿈)`}
              rows={2}
              disabled={loading}
              className="input-court flex-1 resize-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || loading}
              className={cn(
                'px-4 rounded-lg font-bold transition-all',
                message.trim() && !loading
                  ? 'bg-court-gold text-court-dark hover:bg-court-gold/80'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {loading ? '⏳' : '발언'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
