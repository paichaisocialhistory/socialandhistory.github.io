import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface StudentInfo {
  studentId: string
  name: string
  grade: number
  classNo: number
  studentNo: number
  classCode: string
}

export interface QuizResult {
  score: number
  total: number
  passed: boolean
  attempts: number
}

export interface TrialState {
  trialId: string
  person: string
  role: string
  currentTurn: number
  maxTurns: number
  isFinished: boolean
  turns: TrialTurn[]
}

export interface TrialTurn {
  turnNo: number
  studentMessage: string
  branch: string
  approved: boolean
  rejectReason?: string
  responses: Array<{ speaker: string; message: string }>
}

interface AppState {
  // 현재 단계
  currentStep: Step
  
  // 학생 정보
  student: StudentInfo | null
  
  // 선택된 인물
  selectedPerson: string | null
  
  // 퀴즈 결과
  quizResult: QuizResult | null
  
  // 선택된 역할
  selectedRole: string | null
  
  // 재판 상태
  trial: TrialState | null
  
  // 액션
  setStep: (step: Step) => void
  setStudent: (student: StudentInfo) => void
  setSelectedPerson: (person: string) => void
  setQuizResult: (result: QuizResult) => void
  setSelectedRole: (role: string) => void
  setTrial: (trial: TrialState) => void
  addTrialTurn: (turn: TrialTurn) => void
  updateTrialTurn: (turnNo: number, updates: Partial<TrialTurn>) => void
  finishTrial: () => void
  reset: () => void
}

const initialState = {
  currentStep: 1 as Step,
  student: null,
  selectedPerson: null,
  quizResult: null,
  selectedRole: null,
  trial: null,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setStep: (step) => set({ currentStep: step }),
      
      setStudent: (student) => set({ student }),
      
      setSelectedPerson: (person) => set({ selectedPerson: person }),
      
      setQuizResult: (result) => set({ quizResult: result }),
      
      setSelectedRole: (role) => set({ selectedRole: role }),
      
      setTrial: (trial) => set({ trial }),
      
      addTrialTurn: (turn) =>
        set((state) => ({
          trial: state.trial
            ? {
                ...state.trial,
                turns: [...state.trial.turns, turn],
                currentTurn: turn.turnNo,
              }
            : state.trial,
        })),
      
      updateTrialTurn: (turnNo, updates) =>
        set((state) => ({
          trial: state.trial
            ? {
                ...state.trial,
                turns: state.trial.turns.map((t) =>
                  t.turnNo === turnNo ? { ...t, ...updates } : t
                ),
              }
            : state.trial,
        })),
      
      finishTrial: () =>
        set((state) => ({
          trial: state.trial ? { ...state.trial, isFinished: true } : state.trial,
        })),
      
      reset: () => set(initialState),
    }),
    {
      name: 'hist-court-store',
      // 민감하지 않은 데이터만 persist
      partialize: (state) => ({
        currentStep: state.currentStep,
        student: state.student,
        selectedPerson: state.selectedPerson,
        quizResult: state.quizResult,
        selectedRole: state.selectedRole,
        trial: state.trial,
      }),
    }
  )
)
