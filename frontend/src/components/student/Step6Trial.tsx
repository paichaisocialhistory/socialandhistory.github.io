'use client'

import { useState, useRef, useEffect } from 'react'
import { useAppStore, type CoachFeedback, type TrialVerdict } from '@/store/appStore'
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

function CoachCard({ feedback }: { feedback: CoachFeedback }) {
  const items = [
    { icon: '👍', label: '잘한 점', text: feedback.good },
    { icon: '🔧', label: '보완할 점', text: feedback.improve },
    { icon: '💡', label: '다음 발언 힌트', text: feedback.hint },
  ].filter((item) => item.text)
  if (items.length === 0) return null

  return (
    <div className="ml-auto max-w-[85%] rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-emerald-300 text-xs font-bold mb-2">📘 역사 코치</p>
      <dl className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="text-sm">
            <dt className="inline text-emerald-200/90 font-bold">{item.icon} {item.label} </dt>
            <dd className="inline text-white/80">{item.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function VerdictCard({ verdict, totalTurns, onNext, onRetry }: {
  verdict: TrialVerdict
  totalTurns: number
  onNext: () => void
  onRetry: () => void
}) {
  return (
    <div className="space-y-3 py-2">
      <div className="court-card border-court-gold p-5">
        <p className="text-center text-3xl mb-2">🔨</p>
        <p className="text-center text-court-gold font-bold text-lg mb-3">판결문</p>
        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">{verdict.verdict}</p>
      </div>

      {(verdict.strengths || verdict.growth) && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <p className="text-emerald-300 font-bold mb-3">📘 역사 코치 총평</p>
          {verdict.strengths && (
            <div className="mb-3">
              <p className="text-emerald-200/90 text-sm font-bold mb-1">👍 이번 재판에서 잘한 점</p>
              <p className="text-white/80 text-sm leading-relaxed">{verdict.strengths}</p>
            </div>
          )}
          {verdict.growth && (
            <div>
              <p className="text-emerald-200/90 text-sm font-bold mb-1">🌱 다음에 더 성장할 점</p>
              <p className="text-white/80 text-sm leading-relaxed">{verdict.growth}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-white/50 text-xs">총 {totalTurns}번 발언</p>
      <button onClick={onNext} className="btn-court w-full">
        느낀점 작성하기 →
      </button>
      <button
        onClick={onRetry}
        className="w-full rounded-lg border border-court-gold/60 py-2.5 text-sm text-court-gold hover:bg-court-gold/10"
      >
        ↩ 다른 역할로 다시 재판하기
      </button>
    </div>
  )
}

export function Step6Trial() {
  const { trial, addTrialTurn, finishTrial, setStep, retryWithNewRole } = useAppStore()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmRetry, setConfirmRetry] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const currentTurn = trial?.currentTurn ?? 0
  const approvedTurns = trial?.approvedTurns ?? 0
  const minTurns = trial?.minTurns ?? 3
  const maxTurns = trial?.maxTurns ?? 20
  const isFinished = trial?.isFinished ?? false
  const canFinish = approvedTurns >= minTurns
  const turnsLeft = maxTurns - currentTurn
  const busy = loading || finishing

  // 스크롤 자동 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [trial?.turns, trial?.verdict, loading, finishing])

  const handleSend = async () => {
    if (!message.trim() || !trial || busy || isFinished) return
    if (message.trim().length < 10) {
      setError('발언은 10자 이상 입력해주세요.')
      return
    }

    const nextTurn = currentTurn + 1
    setLoading(true)
    setError('')
    setConfirmFinish(false)

    try {
      const res = await trialApi.turn({
        trialId: trial.trialId,
        turn: nextTurn,
        message: message.trim(),
      })

      const data = res.data

      addTrialTurn({
        turnNo: data.currentTurn ?? nextTurn,
        studentMessage: message.trim(),
        branch: data.branch,
        approved: data.approved,
        rejectReason: data.rejectReason,
        feedback: data.feedback,
        responses: data.responses || [],
      })

      if (data.isFinished && data.verdict) {
        finishTrial(data.verdict)
      }

      setMessage('')
    } catch (e: any) {
      setError(e.response?.data?.detail || '오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!trial || busy || isFinished) return
    setFinishing(true)
    setError('')
    try {
      const res = await trialApi.finish(trial.trialId)
      finishTrial(res.data.verdict)
    } catch (e: any) {
      setError(e.response?.data?.detail || '판결을 받지 못했습니다. 다시 시도하세요.')
    } finally {
      setFinishing(false)
      setConfirmFinish(false)
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
          {!isFinished && (
            <button
              onClick={() => (currentTurn === 0 ? retryWithNewRole() : setConfirmRetry(true))}
              disabled={busy}
              className="mb-1 text-xs text-white/50 underline-offset-2 hover:text-court-gold hover:underline"
            >
              ↩ 역할 다시 고르기
            </button>
          )}
          <p className="text-white/60 text-xs">발언</p>
          <p className="text-court-gold font-bold text-lg">
            {currentTurn}<span className="text-white/40 text-sm">번</span>
          </p>
          <p className="text-white/40 text-xs">인정 {approvedTurns}번</p>
        </div>
      </div>

      {confirmRetry && !isFinished && (
        <div className="court-card mb-3 flex flex-wrap items-center gap-2 border-court-gold/40 p-3">
          <span className="mr-auto text-xs text-white/70">
            역할을 바꾸면 새 재판이 처음부터 시작돼요. 지금 역할로 다시 고르면 이어서 할 수 있어요.
          </span>
          <button
            onClick={() => setConfirmRetry(false)}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            계속 재판하기
          </button>
          <button
            onClick={retryWithNewRole}
            className="rounded-lg bg-court-gold px-3 py-1.5 text-xs font-bold text-court-dark hover:bg-court-gold/80"
          >
            역할 다시 고르기
          </button>
        </div>
      )}

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
                  <span className="text-white/50 text-xs">{turn.turnNo}번째 발언</span>
                  <span className="text-xs font-bold text-court-gold">
                    {ROLE_ICONS[trial.role]} {trial.role}
                  </span>
                </div>
                <p className="text-white text-sm">{turn.studentMessage}</p>

                {/* AI 판정 결과 */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
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

            {/* 역사 코치 피드백 */}
            {turn.feedback && <CoachCard feedback={turn.feedback} />}

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
        {busy && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-court-royal/60 border border-court-gold/30 flex items-center justify-center text-sm">
              ⚖️
            </div>
            <div className="bubble-ai">
              <p className="text-court-gold text-xs font-bold mb-1">AI 법정</p>
              <div className="flex gap-1 items-center">
                <span className="text-white/50 text-sm">
                  {finishing ? '판사가 판결문을 작성하고 있습니다' : '검토 중'}
                </span>
                <span className="animate-bounce delay-0 text-court-gold">.</span>
                <span className="animate-bounce delay-100 text-court-gold">.</span>
                <span className="animate-bounce delay-200 text-court-gold">.</span>
              </div>
            </div>
          </div>
        )}

        {/* 재판 종료: 판결문과 총평 */}
        {isFinished && trial.verdict && (
          <VerdictCard
            verdict={trial.verdict}
            totalTurns={currentTurn}
            onNext={() => setStep(7)}
            onRetry={retryWithNewRole}
          />
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 입력 영역 */}
      {!isFinished && (
        <div className="mt-3 court-card p-3">
          {error && (
            <p className="text-red-400 text-xs mb-2">⚠️ {error}</p>
          )}

          <div className="flex gap-2">
            <textarea
              id="trial-message"
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
              disabled={busy}
              className="input-court flex-1 resize-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || busy}
              className={cn(
                'px-4 rounded-lg font-bold transition-all',
                message.trim() && !busy
                  ? 'bg-court-gold text-court-dark hover:bg-court-gold/80'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {loading ? '⏳' : '발언'}
            </button>
          </div>

          {/* 판결 받기 */}
          <div className="mt-2 pt-2 border-t border-white/10">
            {!canFinish ? (
              <p className="text-white/40 text-xs text-center">
                인정된 발언 {approvedTurns} / {minTurns}번 · {minTurns}번이 되면 원할 때 판결을 받을 수 있어요
              </p>
            ) : confirmFinish ? (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-white/70 text-xs mr-auto">
                  판결을 받으면 더 발언할 수 없어요. 마칠까요?
                </span>
                <button
                  onClick={() => setConfirmFinish(false)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/5"
                >
                  계속 발언하기
                </button>
                <button
                  onClick={handleFinish}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-court-gold text-court-dark font-bold hover:bg-court-gold/80"
                >
                  판결 받기 🔨
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/40 text-xs">
                  {turnsLeft <= 5 ? `재판 종료까지 ${turnsLeft}번 남음` : '충분히 변론했다면 판결을 받으세요'}
                </span>
                <button
                  onClick={() => setConfirmFinish(true)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 rounded-lg border border-court-gold/60 text-court-gold hover:bg-court-gold/10"
                >
                  최후 변론 마치고 판결 받기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
