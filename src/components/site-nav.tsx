import Link from 'next/link';
import { signOut } from '@/lib/auth-actions';
import type { Features } from '@/lib/features';

export type NavProps = {
  features: Features;
  isAdmin: boolean;
  userEmail: string | null;
};

function buildLinks({ features, isAdmin }: NavProps) {
  const links: { href: string; label: string }[] = [
    { href: '/', label: '홈' },
    { href: '/teams', label: '팀' },
    { href: '/schedule', label: '일정·결과' },
    { href: '/standings', label: '순위표' },
  ];

  if (features.publicPlayerDirectory || isAdmin) {
    links.push({ href: '/players', label: '선수' });
  }

  links.push({ href: '/register', label: '선수 등록 신청' });

  if (features.videos && isAdmin) {
    links.push({ href: '/videos', label: '영상' });
  }

  if (isAdmin) {
    links.push({ href: '/admin/players', label: '승인 대기' });
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
      <span className="muted hidden text-xs sm:inline">{props.userEmail}</span>
      <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
        로그아웃
      </button>
    </form>
  ) : (
    <Link href="/admin/login" className="btn-secondary !px-2.5 !py-1 !text-xs">
      관리자 로그인
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
