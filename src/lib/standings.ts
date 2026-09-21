import type { Match, Team } from './types';

export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

type ScoredMatch = Match & { score_a: number; score_b: number; team_a_id: string; team_b_id: string };

/** 확정된 경기이고 양 팀 점수가 모두 있는 경기만 집계 대상이다. (지시서 3.4) */
function isCountable(match: Match): match is ScoredMatch {
  return (
    match.is_confirmed &&
    match.score_a !== null &&
    match.score_b !== null &&
    match.team_a_id !== null &&
    match.team_b_id !== null
  );
}

/**
 * 순위표 계산.
 * 승점 = 승×3 + 무×1 + 패×0
 * 정렬: 승점 desc → 득실차 desc → 득점 desc → 팀명 가나다순
 */
export function calculateStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (!isCountable(match)) continue;

    const home = rows.get(match.team_a_id);
    const away = rows.get(match.team_b_id);
    // 팀이 삭제된 과거 경기는 집계에서 제외한다.
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.score_a;
    home.goalsAgainst += match.score_b;
    away.goalsFor += match.score_b;
    away.goalsAgainst += match.score_a;

    if (match.score_a > match.score_b) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (match.score_a < match.score_b) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rows.values()) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName, 'ko'),
  );
}
