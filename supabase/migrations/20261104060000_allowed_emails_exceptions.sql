-- 도메인 허용 외에, 개별 이메일 예외 (테스트용). 제거: delete from public.allowed_emails where email = '...';
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
-- 정책 없음: 클라이언트는 접근 불가, 가입 트리거(security definer)만 조회
-- 예외 허용 메일은 운영 DB에 직접 추가합니다 (저장소에는 실제 이메일 주소를 두지 않음):
--   insert into public.allowed_emails (email, note) values ('tester@example.com', '테스트용 임시 허용');

create or replace function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    exists (select 1 from public.allowed_email_domains d where d.domain = lower(split_part(new.email, '@', 2)))
    or exists (select 1 from public.allowed_emails e where e.email = lower(new.email))
  ) then
    raise exception '허용되지 않은 이메일입니다.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
