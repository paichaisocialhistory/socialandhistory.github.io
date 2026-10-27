/**
 * 교사가 명단을 붙여넣어 선수를 한꺼번에 등록할 때 쓰는 파서.
 *
 * 엑셀에서 복사하면 탭으로, CSV 로 저장하면 쉼표로 구분된다. 둘 다 받고,
 * "1학년 3반 7번" 처럼 단위가 붙은 형태도 받는다.
 */

import { POSITIONS, type Position } from './types';

export type ImportRow = {
  line: number;
  grade: string;
  classNo: string;
  number: string;
  name: string;
  position: Position | null;
};

export type ImportError = { line: number; text: string; reason: string };

export type ImportResult = {
  rows: ImportRow[];
  errors: ImportError[];
};

/** "1학년" → "1", "03반" → "3", "7번" → "7" */
function digits(value: string): string {
  const matched = value.match(/\d+/);
  return matched ? String(Number(matched[0])) : '';
}

function splitLine(line: string): string[] {
  // 쉼표·탭이 있으면 그것을 우선 쓰고, 없으면 공백으로 나눈다.
  const separator = /[,\t]/.test(line) ? /[,\t]/ : /\s+/;
  return line.split(separator).map((cell) => cell.trim()).filter((cell) => cell !== '');
}

const HEADER_WORDS = ['학년', '반', '번호', '이름', '성명', '포지션'];

function looksLikeHeader(cells: string[]): boolean {
  // 숫자가 하나도 없고 머리글 단어로만 이루어진 줄은 제목 줄로 본다.
  const joined = cells.join('');
  if (/\d/.test(joined)) return false;
  return cells.some((cell) => HEADER_WORDS.includes(cell));
}

/**
 * 붙여넣은 명단을 해석한다.
 * 형식: 학년, 반, 번호, 이름 [, 포지션]
 */
export function parsePlayerList(input: string): ImportResult {
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const seen = new Map<string, number>();

  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = i + 1;
    if (raw.trim() === '') continue;

    const cells = splitLine(raw);
    if (looksLikeHeader(cells)) continue;

    if (cells.length < 4) {
      errors.push({ line, text: raw.trim(), reason: '학년·반·번호·이름 4개가 필요합니다' });
      continue;
    }

    const [rawGrade, rawClass, rawNumber, rawName, rawPosition] = cells;
    const grade = digits(rawGrade);
    const classNo = digits(rawClass);
    const number = digits(rawNumber);
    const name = rawName.trim();

    if (!grade || !classNo || !number) {
      errors.push({ line, text: raw.trim(), reason: '학년·반·번호는 숫자여야 합니다' });
      continue;
    }
    if (!name) {
      errors.push({ line, text: raw.trim(), reason: '이름이 비어 있습니다' });
      continue;
    }
    if (name.length > 20) {
      errors.push({ line, text: raw.trim(), reason: '이름이 너무 깁니다' });
      continue;
    }

    let position: Position | null = null;
    if (rawPosition) {
      const upper = rawPosition.trim().toUpperCase();
      if (POSITIONS.includes(upper as Position)) {
        position = upper as Position;
      } else {
        errors.push({ line, text: raw.trim(), reason: `포지션 "${rawPosition}" 을 알 수 없습니다` });
        continue;
      }
    }

    // 같은 학년·반·번호가 두 번 나오면 뒤엣것을 거른다.
    const key = `${grade}-${classNo}-${number}`;
    const firstSeen = seen.get(key);
    if (firstSeen !== undefined) {
      errors.push({ line, text: raw.trim(), reason: `${firstSeen}번째 줄과 학년·반·번호가 같습니다` });
      continue;
    }
    seen.set(key, line);

    rows.push({ line, grade, classNo, number, name, position });
  }

  return { rows, errors };
}
