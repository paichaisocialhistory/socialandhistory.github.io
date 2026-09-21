'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, integer, ok, text, type ActionState } from '@/lib/action-result';
import { getFeatures } from '@/lib/features';
import { ABILITY_KEYS, POSITIONS, type AbilityKey, type Position } from '@/lib/types';

function revalidatePlayer(studentNo: string | null) {
  if (studentNo) revalidatePath(`/players/${studentNo}`);
  revalidatePath('/players');
}

/** 학년·반·번호·포지션·팀 수정. 학번과 입학년도는 바꿀 수 없다. */
export async function updatePlayer(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 선수 정보를 수정할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('선수를 찾을 수 없습니다.');

  const position = text(formData, 'position');
  if (position !== null && !POSITIONS.includes(position as Position)) {
    return fail('포지션 값이 올바르지 않습니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('players')
    .update({
      grade: text(formData, 'grade'),
      class_no: text(formData, 'class_no'),
      number: text(formData, 'number'),
      position,
      team_id: text(formData, 'team_id'),
    })
    .eq('id', id);

  if (error) return fail(describeError(error));

  revalidatePlayer(text(formData, 'student_no'));
  return ok('선수 정보를 저장했습니다.');
}

/** [2단계] 코치 메모 저장 */
export async function saveCoachNote(formData: FormData): Promise<ActionState> {
  if (!getFeatures().playerAbilities) return fail('사용할 수 없는 기능입니다.');
  if (!(await isAdmin())) return fail('관리자만 코치 메모를 저장할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('선수를 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('players')
    .update({ coach_note: text(formData, 'coach_note') })
    .eq('id', id);

  if (error) return fail(describeError(error));

  revalidatePlayer(text(formData, 'student_no'));
  return ok('코치 메모를 저장했습니다.');
}

/** [2단계] 시즌 기록 저장 */
export async function saveSeasonStats(formData: FormData): Promise<ActionState> {
  if (!getFeatures().playerAbilities) return fail('사용할 수 없는 기능입니다.');
  if (!(await isAdmin())) return fail('관리자만 시즌 기록을 저장할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('선수를 찾을 수 없습니다.');

  const values = {
    appearances: integer(formData, 'appearances') ?? 0,
    goals: integer(formData, 'goals') ?? 0,
    assists: integer(formData, 'assists') ?? 0,
  };

  if (Object.values(values).some((value) => value < 0)) {
    return fail('기록은 0 이상이어야 합니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('player_season_stats')
    .upsert({ player_id: id, ...values }, { onConflict: 'player_id' });

  if (error) return fail(describeError(error));

  revalidatePlayer(text(formData, 'student_no'));
  return ok('시즌 기록을 저장했습니다.');
}

/**
 * [2단계] 능력치 변경 요청.
 * 요청만 저장되고 player_abilities 에는 반영되지 않는다. 관리자 승인이 필요하다.
 */
export async function requestAbilityChange(formData: FormData): Promise<ActionState> {
  if (!getFeatures().playerAbilities) return fail('사용할 수 없는 기능입니다.');

  const user = await getCurrentUser();
  if (!user) return fail('교사 계정으로 로그인해야 능력치를 제안할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('선수를 찾을 수 없습니다.');

  const proposed: Record<AbilityKey, number> = {} as Record<AbilityKey, number>;
  for (const key of ABILITY_KEYS) {
    const value = integer(formData, key);
    if (value === null || value < 1 || value > 5) {
      return fail('능력치는 1~5 사이의 정수로 입력하세요.');
    }
    proposed[key] = value;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('ability_change_requests').insert({
    player_id: id,
    proposed_abilities: proposed,
    requested_by: user.email ?? user.id,
    status: 'pending',
  });

  if (error) return fail(describeError(error));

  revalidatePath('/admin/abilities');
  revalidatePlayer(text(formData, 'student_no'));
  return ok('능력치 변경을 요청했습니다. 관리자 승인 후 반영됩니다.');
}
