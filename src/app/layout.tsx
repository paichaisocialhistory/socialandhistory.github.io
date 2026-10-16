import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteNav } from '@/components/site-nav';
import { getFeatures } from '@/lib/features';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient, getCurrentUser, getProfile, isAdmin, isStaff } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: {
    default: '교내 축구리그',
    template: '%s · 교내 축구리그',
  },
  description: '교내 축구리그 팀·일정·순위와 선수 데이터베이스',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const features = getFeatures();
  const configured = isSupabaseConfigured();

  const user = configured ? await getCurrentUser() : null;
  const admin = configured && user ? await isAdmin() : false;
  const staff = configured && user ? await isStaff() : false;

  // 학생 계정이면 자기 선수 화면으로 가는 바로가기를 메뉴에 넣는다.
  const profile = configured && user ? await getProfile() : null;
  let studentNo: string | null = null;
  if (profile?.player_id) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('players')
      .select('student_no')
      .eq('id', profile.player_id)
      .maybeSingle();
    studentNo = (data as { student_no: string | null } | null)?.student_no ?? null;
  }

  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        <SiteNav
          features={features}
          isAdmin={admin}
          isStaff={staff}
          studentNo={studentNo}
          userEmail={user?.email ?? null}
        />

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
          {configured ? (
            children
          ) : (
            <div className="surface p-6">
              <h1 className="text-xl font-bold">환경변수 설정이 필요합니다</h1>
              <p className="muted mt-2 text-sm">
                <code>.env.local</code> 에 <code>NEXT_PUBLIC_SUPABASE_URL</code> 과{' '}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 를 설정한 뒤 다시 실행하세요.
                자세한 절차는 저장소의 <code>README.md</code> 를 참고하세요.
              </p>
            </div>
          )}
        </main>

        <footer className="mx-auto w-full max-w-6xl px-4 pb-10">
          <p className="muted text-xs leading-relaxed">
            이 사이트는 재학 중인 선수의 이름·학년·반·번호를 다룹니다. 선수 정보의 공개 범위와
            졸업(입학년도+3년) 후 보관·삭제는 학교 개인정보 운영 정책에 따릅니다.
          </p>
        </footer>
      </body>
    </html>
  );
}
