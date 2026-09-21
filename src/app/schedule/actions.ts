'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, integer, ok, text, type ActionState } from '@/lib/action-result';

function revalidateSchedule() {
  revalidatePath('/schedule');
  revalidatePath('/standings');
  revalidatePath('/');
}

export async function createMatch(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 경기를 등록할 수 있습니다.');

  const teamA = text(formData, 'team_a_id');
  const teamB = text(formData, 'team_b_id');
  const matchDate = text(formData, 'match_date');

  if (!teamA || !teamB) return fail('두 팀을 모두 선택하세요.');
  if (teamA === teamB) return fail('서로 다른 두 팀을 선택하세요.');
  if (!matchDate) return fail('경기 날짜를 입력하세요.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('matches').insert({
    team_a_id: teamA,
    team_b_id: teamB,
    match_date: matchDate,
  });

  if (error) return fail(describeError(error));

  revalidateSchedule();
  return ok('경기를 등록했습니다.');
}

/** 점수 입력 및 결과 확정. 확정된 경기만 순위표에 집계된다. */
export async function saveMatchResult(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 결과를 입력할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('경기를 찾을 수 없습니다.');

  const scoreA = integer(formData, 'score_a');
  const scoreB = integer(formData, 'score_b');
  const confirm = formData.get('is_confirmed') === 'on';

  if (scoreA !== null && scoreA < 0) return fail('점수는 0 이상이어야 합니다.');
  if (scoreB !== null && scoreB < 0) return fail('점수는 0 이상이어야 합니다.');
  if (confirm && (scoreA === null || scoreB === null)) {
    return fail('결과를 확정하려면 양 팀 점수를 모두 입력해야 합니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('matches')
    .update({ score_a: scoreA, score_b: scoreB, is_confirmed: confirm })
    .eq('id', id);

  if (error) return fail(describeError(error));

  revalidateSchedule();
  return ok(confirm ? '결과를 확정했습니다. 순위표에 반영됩니다.' : '점수를 저장했습니다(미확정).');
}

export async function deleteMatch(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 경기를 삭제할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('경기를 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) return fail(describeError(error));

  revalidateSchedule();
  return ok('경기를 삭제했습니다.');
}
