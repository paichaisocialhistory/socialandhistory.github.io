import Link from 'next/link';
import { signOut } from '@/lib/auth-actions';
import type { Features } from '@/lib/features';

export type NavProps = {
  features: Features;
  isAdmin: boolean;
  isStaff: boolean;
  /** 로그인한 학생 계정에 연결된 선수의 학번. 없으면 null. */
  studentNo: string | null;
  userEmail: string | null;
};

function buildLinks({ features, isAdmin, isStaff, studentNo }: NavProps) {
  const links: { href: string; label: string }[] = [
    { href: '/', label: '홈' },
    { href: '/teams', label: '팀' },
    { href: '/schedule', label: '일정·결과' },
    { href: '/standings', label: '순위표' },
  ];

  if (features.publicPlayerDirectory || isAdmin) {
    links.push({ href: '/players', label: '선수' });
  }

  // 선수 등록은 교직원만 한다. 열람은 로그인 없이 누구나 가능하다.
  if (isStaff) {
    links.push({ href: '/register', label: '선수 등록' });
  }

  // 학생은 자기 화면에서 장면을 보므로 영상 목록 대신 내 기록으로 보낸다.
  if (features.videos && isStaff) {
    links.push({ href: '/videos', label: '영상' });
  }
  if (studentNo) {
    links.push({ href: `/players/${studentNo}`, label: '내 기록' });
  }

  if (isAdmin) {
    links.push({ href: '/admin/players', label: '승인 대기' });
    links.push({ href: '/admin/accounts', label: '계정 관리' });
    if (features.playerAbilities) {
      links.push({ href: '/admin/abilities', label: '능력치 승인' });
    }
  }

  return links;
}

export function SiteNav(props: NavProps) {
  const links = buildLinks(props);

  const accountArea = props.userEmail ? (
    <form action={signOut} className="flex items-center gap-2">
      <Link href="/account/password" className="muted hidden text-xs underline sm:inline">
        비밀번호 변경
      </Link>
      <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
        로그아웃
      </button>
    </form>
  ) : (
    <Link href="/login" className="btn-secondary !px-2.5 !py-1 !text-xs">
      로그인
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span aria-hidden="true">⚽</span>
          <span>교내 축구리그</span>
        </Link>

        <nav aria-label="주요 메뉴" className="order-3 -mx-4 w-full overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:overflow-visible sm:px-0">
          <ul className="flex items-center gap-1 whitespace-nowrap">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto shrink-0">{accountArea}</div>
      </div>
    </header>
  );
}
