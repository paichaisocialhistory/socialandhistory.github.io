'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isStaff } from '@/lib/supabase/server';
import { describeError, fail, integer, ok, text, type ActionState } from '@/lib/action-result';
import { parsePlayerList } from '@/lib/player-import';
import { POSITIONS, type Position } from '@/lib/types';

function admissionYearOrNull(formData: FormData): number | null {
  const year = integer(formData, 'admission_year');
  const thisYear = new Date().getFullYear();
  if (year === null) return null;
  if (year < thisYear - 6 || year > thisYear + 1) return null;
  return year;
}

/** 선수 한 명을 등록한다. 교직원만 가능하다. */
export async function registerPlayer(formData: FormData): Promise<ActionState> {
  if (!(await isStaff())) return fail('교직원만 선수를 등록할 수 있습니다.');

  const name = text(formData, 'name');
  if (!name) return fail('이름을 입력하세요.');
  if (name.length > 20) return fail('이름은 20자 이내로 입력하세요.');

  const admissionYear = admissionYearOrNull(formData);
  if (admissionYear === null) return fail('입학년도를 다시 확인하세요.');

  const position = text(formData, 'position');
  if (position !== null && !POSITIONS.includes(position as Position)) {
    return fail('포지션 값이 올바르지 않습니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('register_players', {
    p_rows: [
      {
        grade: text(formData, 'grade'),
        class_no: text(formData, 'class_no'),
        number: text(formData, 'number'),
        name,
        position,
      },
    ],
    p_admission_year: admissionYear,
  });

  if (error) return fail(describeError(error));

  const row = (data as { student_no: string | null; created: boolean; reason: string | null }[])?.[0];
  if (!row?.created) return fail(row?.reason ?? '등록하지 못했습니다.');

  revalidatePath('/players');
  revalidatePath('/register');
  return ok(`${name} 선수를 등록했습니다. 학번 ${row.student_no} 발급.`);
}

export type BulkResult =
  | { error: string }
  | {
      success: string;
      created: { name: string; studentNo: string | null }[];
      skipped: { name: string; reason: string }[];
      parseErrors: { line: number; text: string; reason: string }[];
    };

/** 붙여넣은 명단을 한꺼번에 등록한다. */
export async function registerPlayersInBulk(formData: FormData): Promise<BulkResult> {
  if (!(await isStaff())) return { error: '교직원만 선수를 등록할 수 있습니다.' };

  const admissionYear = admissionYearOrNull(formData);
  if (admissionYear === null) return { error: '입학년도를 다시 확인하세요.' };

  const raw = text(formData, 'roster');
  if (!raw) return { error: '명단을 붙여넣으세요.' };

  const { rows, errors } = parsePlayerList(raw);
  if (rows.length === 0) {
    return {
      error:
        errors.length > 0
          ? `읽을 수 있는 줄이 없습니다. 첫 오류: ${errors[0].line}번째 줄 — ${errors[0].reason}`
          : '읽을 수 있는 줄이 없습니다.',
    };
  }

  // 한 번에 너무 많이 넣으면 응답이 길어지므로 상한을 둔다.
  if (rows.length > 500) {
    return { error: `한 번에 500명까지 등록할 수 있습니다. 지금 ${rows.length}명입니다. 나눠서 넣어 주세요.` };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('register_players', {
    p_rows: rows.map((row) => ({
      grade: row.grade,
      class_no: row.classNo,
      number: row.number,
      name: row.name,
      position: row.position,
    })),
    p_admission_year: admissionYear,
  });

  if (error) return { error: describeError(error) };

  const results =
    (data as { name: string; student_no: string | null; created: boolean; reason: string | null }[]) ??
    [];

  const created = results
    .filter((r) => r.created)
    .map((r) => ({ name: r.name, studentNo: r.student_no }));
  const skipped = results
    .filter((r) => !r.created)
    .map((r) => ({ name: r.name, reason: r.reason ?? '알 수 없음' }));

  revalidatePath('/players');
  revalidatePath('/register');

  return {
    success: `${created.length}명을 등록했습니다.${skipped.length > 0 ? ` ${skipped.length}명은 건너뛰었습니다.` : ''}`,
    created,
    skipped,
    parseErrors: errors,
  };
}
