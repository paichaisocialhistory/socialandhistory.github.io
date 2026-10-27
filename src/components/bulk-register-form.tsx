'use client';

import { useActionState } from 'react';
import { Alert } from './ui';
import { SubmitButton } from './submit-button';
import type { BulkResult } from '@/app/register/actions';

/** 명단을 붙여넣어 한꺼번에 등록한다. */
export function BulkRegisterForm({
  admissionYears,
  defaultYear,
  action,
}: {
  admissionYears: number[];
  defaultYear: number;
  action: (formData: FormData) => Promise<BulkResult>;
}) {
  const [state, formAction] = useActionState<BulkResult | null, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );

  const created = state && 'created' in state ? state.created : [];
  const skipped = state && 'skipped' in state ? state.skipped : [];
  const parseErrors = state && 'parseErrors' in state ? state.parseErrors : [];

  return (
    <>
      <form action={formAction} className="space-y-3">
        <div aria-live="polite" className="empty:hidden">
          {state && 'error' in state ? <Alert kind="error">{state.error}</Alert> : null}
          {state && 'success' in state ? <Alert kind="success">{state.success}</Alert> : null}
        </div>

        <div>
          <label className="label" htmlFor="bulk_year">입학년도</label>
          <select id="bulk_year" name="admission_year" className="field !w-40" defaultValue={defaultYear}>
            {admissionYears.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="roster">명단</label>
          <textarea
            id="roster"
            name="roster"
            rows={10}
            className="field font-mono !text-xs"
            required
            placeholder={'1,3,7,김민준\n1,5,11,이서준\n2,1,3,박도윤'}
          />
          <p className="muted mt-1 text-xs leading-relaxed">
            한 줄에 한 명씩 <strong>학년, 반, 번호, 이름</strong> 순으로 넣습니다. 포지션은
            맨 뒤에 선택으로 붙일 수 있습니다(GK·DF·MF·FW). 엑셀에서 복사해 붙여넣어도 되고,
            &ldquo;1학년 3반 7번 김민준&rdquo; 처럼 단위가 붙어 있어도 읽습니다. 제목 줄은
            알아서 건너뜁니다. 한 번에 500명까지.
          </p>
        </div>

        <SubmitButton pendingLabel="등록 중…">명단 등록</SubmitButton>
      </form>

      {created.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">등록됨 {created.length}명</h3>
          <div className="table-wrap max-h-56 overflow-y-auto">
            <table className="data-table">
              <thead>
                <tr><th>학번</th><th>이름</th></tr>
              </thead>
              <tbody>
                {created.map((row) => (
                  <tr key={row.studentNo ?? row.name}>
                    <td className="font-mono text-xs tabular-nums">{row.studentNo}</td>
                    <td>{row.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {skipped.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">건너뜀 {skipped.length}명</h3>
          <ul className="muted space-y-1 text-xs">
            {skipped.map((row, i) => (
              <li key={`${row.name}-${i}`}>{row.name} — {row.reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {parseErrors.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">읽지 못한 줄 {parseErrors.length}개</h3>
          <ul className="muted space-y-1 text-xs">
            {parseErrors.map((row) => (
              <li key={row.line}>
                {row.line}번째 줄 — {row.reason}
                <span className="ml-1 font-mono">({row.text})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
