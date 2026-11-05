create extension if not exists pg_net;

-- 브라우저별 푸시 구독 (엔드포인트는 브라우저마다 고유)
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push_subs_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- 구독 등록: 같은 브라우저를 다른 계정이 쓰게 되면 소유자를 현재 사용자로 옮김
create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end;
$$;
revoke execute on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

-- 푸시 발송 설정(암호 키 등): 클라이언트는 접근할 수 없고 서버 함수만 읽음
create table public.push_config (
  key text primary key,
  value text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

-- 새 알림(읽지 않음)이 생기면 푸시 발송 함수를 호출. 실패해도 알림 저장에는 영향 없음
create function public.send_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_url text;
begin
  select value into v_secret from public.push_config where key = 'push_secret';
  select value into v_url from public.push_config where key = 'push_function_url';
  if v_secret is null or v_url is null then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('user_id', new.user_id, 'title', new.title, 'body', new.body, 'link', new.link)
  );
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.send_push_for_notification() from public, anon, authenticated;

create trigger notifications_send_push
  after insert or update on public.notifications
  for each row
  when (new.read_at is null)
  execute function public.send_push_for_notification();

-- 발송 함수 호출용 공유 비밀값은 DB 안에서 무작위로 생성 (코드나 대화에 값이 나타나지 않음)
-- VAPID 키는 send-push 함수가 첫 호출 때 스스로 만들어 이 테이블에 저장
-- vapid_subject의 실제 연락처 값은 운영 DB에서 직접 설정 (저장소에는 실제 이메일 주소를 두지 않음)
insert into public.push_config (key, value)
values ('push_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;
insert into public.push_config (key, value)
values ('push_function_url', 'https://ivlgxwzlxoianqebvlbw.supabase.co/functions/v1/send-push')
on conflict (key) do nothing;
insert into public.push_config (key, value)
values ('vapid_subject', 'mailto:admin@example.com')
on conflict (key) do nothing;
