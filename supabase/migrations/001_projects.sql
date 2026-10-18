-- ============================================
-- 옛이야기 영상 공방 — Supabase 스키마
-- 프로젝트 1개 = projects 행 1개 (data 열에 프로젝트 JSON 전체)
-- 이미지·음성 파일은 Storage 버킷 'assets'에 {owner}/{project_id}/파일 경로로 저장
-- ============================================

create table if not exists public.projects (
  id text primary key,                       -- 프로젝트 JSON의 id와 같다 (예: proj_k3x9a2)
  owner uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default '제목 없는 옛이야기',
  data jsonb not null,                       -- 프로젝트 JSON 전체 (schemaVersion 1.0)
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx on public.projects (owner, updated_at desc);

-- 수정 시각 자동 갱신
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- 행 단위 보안: 자기 프로젝트만 읽고 쓴다
alter table public.projects enable row level security;

create policy "own projects: select" on public.projects
  for select to authenticated using (owner = (select auth.uid()));
create policy "own projects: insert" on public.projects
  for insert to authenticated with check (owner = (select auth.uid()));
create policy "own projects: update" on public.projects
  for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "own projects: delete" on public.projects
  for delete to authenticated using (owner = (select auth.uid()));

-- Storage 버킷 (비공개)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

-- 버킷 정책: 첫 폴더 이름이 자기 사용자 ID인 경로만 접근
create policy "own assets: select" on storage.objects
  for select to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own assets: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own assets: update" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own assets: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
