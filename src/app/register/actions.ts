'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { describeError, fail, integer, ok, text, type ActionState } from '@/lib/action-result';
import { POSITIONS, type Position } from '@/lib/types';

/**
 * 선수 등록 신청 (로그인 불필요).
 * status='pending' 으로만 저장되고, 학번(student_no)은 관리자 승인 시점에 발급된다.
 */
export async function submitRegistration(formData: FormData): Promise<ActionState> {
  const name = text(formData, 'name');
  const admissionYear = integer(formData, 'admission_year');
  const position = text(formData, 'position');
  const teamId = text(formData, 'team_id');

  if (!name) return fail('이름을 입력하세요.');
  if (name.length > 20) return fail('이름은 20자 이내로 입력하세요.');

  const thisYear = new Date().getFullYear();
  if (admissionYear === null) return fail('입학년도를 선택하세요.');
  if (admissionYear < thisYear - 6 || admissionYear > thisYear + 1) {
    return fail('입학년도를 다시 확인하세요.');
  }

  if (position !== null && !POSITIONS.includes(position as Position)) {
    return fail('포지션 값이 올바르지 않습니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('players').insert({
    name,
    admission_year: admissionYear,
    grade: text(formData, 'grade'),
    class_no: text(formData, 'class_no'),
    number: text(formData, 'number'),
    position,
    team_id: teamId,
    status: 'pending',
  });

  if (error) return fail(describeError(error));

  revalidatePath('/admin/players');
  return ok('신청서를 제출했습니다. 담당 선생님의 승인 후 선수 명단에 등록됩니다.');
}
