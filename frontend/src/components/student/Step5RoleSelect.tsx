'use client'

import { useState } from 'react'
import { useAppStore, type TrialTurn } from '@/store/appStore'
import { trialApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const ROLES = [
  {
    id: '검사',
    icon: '⚡',
    color: 'border-red-500/60 bg-red-500/10',
    activeColor: 'border-red-400 bg-red-500/20',
    desc: '피고인의 잘못을 밝혀 처벌을 요구한다',
    tip: '역사적 오류와 문제점을 지적하세요',
  },
  {
    id: '변호인',
    icon: '🛡️',
    color: 'border-blue-500/60 bg-blue-500/10',
    activeColor: 'border-blue-400 bg-blue-500/20',
    desc: '피고인의 행동을 역사적 맥락에서 변호한다',
    tip: '시대적 상황과 불가피성을 강조하세요',
  },
  {
    id: '증인',
    icon: '👁️',
    color: 'border-green-500/60 bg-green-500/10',
    activeColor: 'border-green-400 bg-green-500/20',
    desc: '당시 상황을 직접 목격한 역사적 인물로 증언한다',
    tip: '구체적인 사실과 경험을 바탕으로 증언하세요',
  },
  {
    id: '피고인',
    icon: '🎭',
    color: 'border-purple-500/60 bg-purple-500/10',
    activeColor: 'border-purple-400 bg-purple-500/20',
    desc: '재판받는 역사 인물이 되어 자신을 변호한다',
    tip: '인물의 입장에서 진심으로 변호하세요',
  },
]

export function Step5RoleSelect() {
  const { student, selectedPerson, setSelectedRole, setTrial, setStep } = useAppStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    if (!selected || !student || !selectedPerson) return
    setLoading(true)
    try {
      const res = await trialApi.start({
        studentId: student.studentId,
        person: selectedPerson,
        role: selected,
      })
      const { trialId, person, role, minTurns, maxTurns } = res.data

      // 같은 인물·역할로 진행 중이던 재판이 있으면 그동안의 발언을 불러와 이어서 한다
      let turns: TrialTurn[] = []
      try {
        const history = await trialApi.history(trialId)
        turns = (history.data.turns || []).map((t: any) => ({
          turnNo: t.turnNo,
          studentMessage: t.studentMessage,
          branch: t.branch,
          approved: t.approved,
          rejectReason: t.rejectReason,
          feedback: t.feedback,
          responses: t.responses || [],
        }))
      } catch {
        // 기록을 못 불러와도 재판은 이어서 할 수 있다
      }

      setSelectedRole(role)
      setTrial({
        trialId,
        person,
        role,
        currentTurn: turns.length ? turns[turns.length - 1].turnNo : 0,
        approvedTurns: turns.filter((t) => t.approved).length,
        minTurns,
        maxTurns,
        isFinished: false,
        turns,
      })
      setStep(6)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-court-gold mb-2">
          ⚖️ 법정 역할 선택
        </h2>
        <p className="text-white/60 text-sm">
          <span className="text-court-gold font-bold">{selectedPerson}</span> 재판에서
          맡을 역할을 선택하세요
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {ROLES.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelected(role.id)}
            className={cn(
              'court-card p-4 text-left transition-all duration-200 border-2',
              selected === role.id ? role.activeColor : role.color + ' hover:opacity-90'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{role.icon}</span>
              <div>
                <h3 className="font-bold text-white text-lg">{role.id}</h3>
                {selected === role.id && (
                  <span className="text-xs text-court-gold">✓ 선택됨</span>
                )}
              </div>
            </div>
            <p className="text-white/70 text-sm mb-2">{role.desc}</p>
            {selected === role.id && (
              <p className="text-white/50 text-xs bg-white/5 rounded px-2 py-1">
                💡 {role.tip}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* 선택 확인 및 시작 */}
      {selected && (
        <div className="court-card p-5 animate-fade-in border-court-gold/40">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{ROLES.find(r => r.id === selected)?.icon}</span>
            <div>
              <p className="text-white font-medium">
                <span className="text-court-gold font-bold">{selectedPerson}</span> 재판에서
              </p>
              <p className="text-white/80 text-lg font-bold">
                <span className="text-court-gold">{selected}</span> 역할을 맡습니다
              </p>
            </div>
          </div>
          
          <div className="bg-court-gold/10 rounded-lg p-3 mb-4 text-sm text-white/70">
            <p className="font-bold text-court-gold mb-1">📋 재판 안내</p>
            <ul className="space-y-1 text-xs">
              <li>• 발언 횟수 제한 없이 재판이 이어집니다 (최대 20번)</li>
              <li>• 발언할 때마다 역사 코치가 잘한 점과 다음 발언 힌트를 알려 줍니다</li>
              <li>• 인정된 발언이 3번 이상이면 원할 때 판결을 받을 수 있습니다</li>
              <li>• 상대편 인물들이 AI로 반박하고 질문합니다</li>
              <li>• 역사적으로 타당한 발언을 하세요</li>
            </ul>
          </div>
          
          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-court w-full text-lg"
          >
            {loading ? '법정 준비 중...' : '재판 시작하기 🔨'}
          </button>
        </div>
      )}
    </div>
  )
}
