create table public.items (
  id bigint generated always as identity primary key,
  seller_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 2000),
  price integer not null default 0 check (price >= 0 and price <= 100000000), -- 0 = 나눔
  category text not null check (category in ('가전','가구','도서','패션','육아','취미','생활','기타')),
  place text not null default '' check (char_length(place) <= 40),
  status text not null default 'selling' check (status in ('selling','reserved','sold')),
  image_urls text[] not null default '{}' check (cardinality(image_urls) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_created_at_idx on public.items (created_at desc);
create index items_category_idx on public.items (category, created_at desc);
create index items_seller_idx on public.items (seller_id);

alter table public.items enable row level security;

create policy "items_select_authenticated" on public.items
  for select to authenticated using (true);
create policy "items_insert_own" on public.items
  for insert to authenticated with check (seller_id = (select auth.uid()));
create policy "items_update_own" on public.items
  for update to authenticated using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));
create policy "items_delete_own" on public.items
  for delete to authenticated using (seller_id = (select auth.uid()));

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();
