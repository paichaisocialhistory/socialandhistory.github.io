import { describe, expect, it } from 'vitest';
import { calculateStandings } from './standings';
import type { Match, Team } from './types';

const team = (id: string, name: string): Team => ({ id, name, created_at: '2026-03-01T00:00:00Z' });

const match = (over: Partial<Match>): Match => ({
  id: crypto.randomUUID(),
  team_a_id: null,
  team_b_id: null,
  match_date: '2026-03-10',
  score_a: null,
  score_b: null,
  is_confirmed: true,
  created_at: '2026-03-01T00:00:00Z',
  ...over,
});

describe('calculateStandings', () => {
  const teams = [team('a', '청룡'), team('b', '백호'), team('c', '주작')];

  it('승 3점, 무 1점, 패 0점으로 승점을 계산한다', () => {
    const rows = calculateStandings(teams, [
      match({ team_a_id: 'a', team_b_id: 'b', score_a: 2, score_b: 0 }),
      match({ team_a_id: 'b', team_b_id: 'c', score_a: 1, score_b: 1 }),
    ]);

    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));
    expect(byId.a.points).toBe(3);
    expect(byId.b.points).toBe(1);
    expect(byId.c.points).toBe(1);
    expect(byId.a.won).toBe(1);
    expect(byId.b.lost).toBe(1);
    expect(byId.b.drawn).toBe(1);
  });

  it('확정되지 않은 경기는 집계하지 않는다', () => {
    const rows = calculateStandings(teams, [
      match({ team_a_id: 'a', team_b_id: 'b', score_a: 5, score_b: 0, is_confirmed: false }),
    ]);

    expect(rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it('점수가 비어 있는 경기는 집계하지 않는다', () => {
    const rows = calculateStandings(teams, [
      match({ team_a_id: 'a', team_b_id: 'b', score_a: 3, score_b: null }),
    ]);

    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it('승점이 같으면 득실차 → 득점 순으로 정렬한다', () => {
    // a: 1승(3-0), b: 1승(1-0), c: 0승 2패
    const rows = calculateStandings(teams, [
      match({ team_a_id: 'a', team_b_id: 'c', score_a: 3, score_b: 0 }),
      match({ team_a_id: 'b', team_b_id: 'c', score_a: 1, score_b: 0 }),
    ]);

    expect(rows.map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
    expect(rows[0].goalDiff).toBe(3);
    expect(rows[1].goalDiff).toBe(1);
  });

  it('승점·득실차·득점이 모두 같으면 팀명 가나다순으로 정렬한다', () => {
    const rows = calculateStandings([team('a', '청룡'), team('b', '백호')], []);
    expect(rows.map((r) => r.teamName)).toEqual(['백호', '청룡']);
  });

  it('삭제된 팀의 과거 경기는 건너뛴다', () => {
    const rows = calculateStandings([team('a', '청룡')], [
      match({ team_a_id: 'a', team_b_id: 'gone', score_a: 2, score_b: 1 }),
    ]);

    expect(rows[0].played).toBe(0);
  });

  it('경기를 치르지 않은 팀도 0점으로 표에 포함한다', () => {
    const rows = calculateStandings(teams, []);
    expect(rows).toHaveLength(3);
  });
});
