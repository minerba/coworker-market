-- ============ 관리자 ============
alter table public.profiles add column is_admin boolean not null default false;
-- 사용자가 자기 권한(is_admin)을 바꿀 수 없도록 컬럼 단위로만 수정 허용
revoke update on public.profiles from authenticated, anon;
grant update (nickname, building) on public.profiles to authenticated;

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false)
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "items_delete_admin" on public.items
  for delete to authenticated using (public.is_admin());

-- ============ 차단 ============
create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "blocks_select_own" on public.user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks_insert_own" on public.user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "blocks_delete_own" on public.user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- (내가 차단한 판매자의 글 숨김은 20261105010000 마이그레이션의 제한 정책으로 처리)

-- 차단 관계(어느 쪽이든)에서는 채팅방 생성/메시지 전송 불가
create function public.reject_if_blocked(a uuid, b uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  ) then
    raise exception '대화할 수 없는 상대입니다.' using errcode = 'check_violation';
  end if;
end;
$$;

create function public.check_block_on_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.reject_if_blocked(new.buyer_id, new.seller_id);
  return new;
end;
$$;
create trigger conversations_z_check_block
  before insert on public.conversations
  for each row execute function public.check_block_on_conversation();

create function public.check_block_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  perform public.reject_if_blocked(c.buyer_id, c.seller_id);
  return new;
end;
$$;
create trigger messages_check_block
  before insert on public.messages
  for each row execute function public.check_block_on_message();

revoke execute on function public.reject_if_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.check_block_on_conversation() from public, anon, authenticated;
revoke execute on function public.check_block_on_message() from public, anon, authenticated;

-- ============ 신고 ============
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_id bigint references public.items (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  target_label text not null default '', -- 대상이 삭제돼도 남는 스냅샷 (트리거가 채움)
  reason text not null check (reason in ('spam', 'fraud', 'prohibited', 'abuse', 'other')),
  detail text not null default '' check (char_length(detail) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index reports_once_per_item on public.reports (reporter_id, item_id) where item_id is not null;
create unique index reports_once_per_user on public.reports (reporter_id, reported_user_id) where reported_user_id is not null;
create index reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;
create policy "reports_select_own_or_admin" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and num_nonnulls(item_id, reported_user_id) = 1
    and status = 'open'
  );
create policy "reports_update_admin" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke update on public.reports from authenticated, anon;
grant update (status) on public.reports to authenticated;

create function public.prepare_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare owner_id uuid;
begin
  if new.item_id is not null then
    select i.seller_id, i.title into owner_id, new.target_label from public.items i where i.id = new.item_id;
    if owner_id = new.reporter_id then
      raise exception '본인 글은 신고할 수 없습니다.' using errcode = 'check_violation';
    end if;
    new.reported_user_id := null;
  else
    if new.reported_user_id = new.reporter_id then
      raise exception '본인은 신고할 수 없습니다.' using errcode = 'check_violation';
    end if;
    select p.nickname into new.target_label from public.profiles p where p.id = new.reported_user_id;
  end if;
  return new;
end;
$$;
create trigger reports_prepare
  before insert on public.reports
  for each row execute function public.prepare_report();

create function public.stamp_report_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> old.status then
    new.resolved_by := (select auth.uid());
    new.resolved_at := now();
  end if;
  return new;
end;
$$;
create trigger reports_stamp_resolution
  before update on public.reports
  for each row execute function public.stamp_report_resolution();

revoke execute on function public.prepare_report() from public, anon, authenticated;
revoke execute on function public.stamp_report_resolution() from public, anon, authenticated;

-- ============ 알림 ============
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('message', 'like')),
  title text not null,
  body text not null default '',
  link text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
-- 읽지 않은 알림은 (사용자, 링크, 종류)당 1개로 합쳐서 도배 방지
create unique index notifications_unread_message_uniq on public.notifications (user_id, link)
  where type = 'message' and read_at is null;
create unique index notifications_unread_like_uniq on public.notifications (user_id, link)
  where type = 'like' and read_at is null;

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.conversations;
  recipient uuid;
  sender_name text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  recipient := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;
  select nickname into sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (recipient, 'message', coalesce(sender_name, '새 메시지'), left(new.body, 80), '/chat/' || c.id)
  on conflict (user_id, link) where type = 'message' and read_at is null
  do update set title = excluded.title, body = excluded.body, created_at = now();
  return new;
end;
$$;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

create function public.notify_new_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare i public.items;
begin
  select * into i from public.items where id = new.item_id;
  if i.id is not null and i.seller_id <> new.user_id then
    insert into public.notifications (user_id, type, title, body, link)
    values (i.seller_id, 'like', '관심 등록', '"' || left(i.title, 30) || '" 글에 관심을 보인 동료가 있어요.', '/items/' || i.id)
    on conflict (user_id, link) where type = 'like' and read_at is null do nothing;
  end if;
  return new;
end;
$$;
create trigger likes_notify
  after insert on public.item_likes
  for each row execute function public.notify_new_like();

revoke execute on function public.notify_new_message() from public, anon, authenticated;
revoke execute on function public.notify_new_like() from public, anon, authenticated;

alter publication supabase_realtime add table public.notifications;
