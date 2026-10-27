export type PlayerStatus = 'pending' | 'approved' | 'rejected';
export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export const POSITIONS: Position[] = ['GK', 'DF', 'MF', 'FW'];

export const POSITION_LABEL: Record<Position, string> = {
  GK: '골키퍼',
  DF: '수비수',
  MF: '미드필더',
  FW: '공격수',
};

export const ABILITY_KEYS = ['shoot', 'dribble', 'pass', 'stamina', 'defense'] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const ABILITY_LABEL: Record<AbilityKey, string> = {
  shoot: '슛',
  dribble: '드리블',
  pass: '패스',
  stamina: '체력',
  defense: '수비',
};

export type Team = {
  id: string;
  name: string;
  created_at: string;
};

export type Player = {
  id: string;
  student_no: string | null;
  admission_year: number;
  name: string;
  grade: string | null;
  class_no: string | null;
  number: string | null;
  position: Position | null;
  team_id: string | null;
  status: PlayerStatus;
  coach_note: string | null;
  reject_reason: string | null;
  submitted_at: string;
  approved_at: string | null;
  graduation_year: number;
};

export type PlayerWithTeam = Player & { teams: Pick<Team, 'id' | 'name'> | null };

export type Match = {
  id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  match_date: string | null;
  score_a: number | null;
  score_b: number | null;
  is_confirmed: boolean;
  created_at: string;
};

export type PlayerAbilities = Record<AbilityKey, number | null> & {
  player_id: string;
  updated_at: string;
};

export type PlayerSeasonStats = {
  player_id: string;
  appearances: number;
  goals: number;
  assists: number;
};

export type AbilityChangeRequest = {
  id: string;
  player_id: string | null;
  proposed_abilities: Record<AbilityKey, number>;
  requested_by: string | null;
  requested_at: string;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
};

export type Video = {
  id: string;
  title: string | null;
  source_url: string;
  match_id: string | null;
  team_id: string | null;
  player_id: string | null;
  created_at: string;
  /** 킥오프 순간의 이 영상 재생 위치(초). 여러 카메라 시간 맞추기에 쓴다. */
  sync_offset_seconds: number;
};

export type VideoAnnotation = {
  id: string;
  video_id: string;
  timestamp_seconds: number;
  player_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  /** 경기장 위치(0~1 비율). 찍지 않은 메모는 null. */
  pitch_x: number | null;
  pitch_y: number | null;
};
