-- =============================================================================
-- 첫 로그인 때 학생이 직접 비밀번호를 정하게 한다.
--
-- 교사가 발급한 임시 비밀번호는 한 번 쓰고 버린다. 학생이 처음 로그인하면
-- 비밀번호 설정 화면에서 벗어날 수 없고, 새 비밀번호를 정해야 사이트를 쓸 수
-- 있다. 관리자가 비밀번호를 재설정한 경우에도 같다.
-- =============================================================================

alter table public.profiles
  add column if not exists must_set_password boolean not null default false;

comment on column public.profiles.must_set_password is
  '임시 비밀번호 상태. true 면 본인이 새 비밀번호를 정할 때까지 다른 화면을 쓸 수 없다.';

-- -----------------------------------------------------------------------------
-- 본인이 비밀번호를 정한 뒤 표시를 내린다.
--
-- profiles 에는 update 정책이 없으므로 학생이 직접 이 값을 끌 수 없다. 비밀번호
-- 변경을 마친 본인만 이 함수로 내릴 수 있게 한다(auth.uid() 한 행만 건드린다).
-- -----------------------------------------------------------------------------
create or replace function public.complete_password_setup()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;

  update public.profiles
     set must_set_password = false
   where user_id = auth.uid();
end;
$$;

revoke all on function public.complete_password_setup() from public, anon;
grant execute on function public.complete_password_setup() to authenticated;
