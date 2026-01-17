-- ============================================
-- 스토리 구성 웹학습지 - 개인 모드
-- Supabase 초기 스키마
-- ============================================

-- 사용자 테이블
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nickname text,
  avatar_url text,
  provider text default 'email',

  -- 승인 시스템
  status text default 'approved' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  -- MVP: 'approved' (자동승인)
  -- Production: 'pending' (승인대기)

  approved_at timestamptz,
  approved_by uuid references public.users(id),
  rejection_reason text,

  -- 역할
  role text default 'user' check (role in ('user', 'admin')),

  -- 메타
  created_at timestamptz default now() not null,
  last_login_at timestamptz
);

-- 작품 테이블
create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text default '제목 없음',
  step int default 1 check (step >= 1 and step <= 3),
  panels jsonb default '[]',
  ai_generated jsonb,  -- AI 생성 데이터 (이미지 URL 등)
  is_public boolean default false,
  status text default 'draft' check (status in ('draft', 'complete')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 승인 로그 테이블
create table if not exists public.approval_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  action text not null,  -- 'approved', 'rejected', 'suspended'
  admin_id uuid references public.users(id),
  reason text,
  created_at timestamptz default now() not null
);

-- ============================================
-- 인덱스
-- ============================================

create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_works_user_id on public.works(user_id);
create index if not exists idx_works_updated_at on public.works(updated_at desc);
create index if not exists idx_approval_logs_user_id on public.approval_logs(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.users enable row level security;
alter table public.works enable row level security;
alter table public.approval_logs enable row level security;

-- Users 정책
-- 본인 정보 조회
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- 관리자는 모든 사용자 조회 가능
create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- 본인 정보 수정 (제한된 필드만)
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 관리자는 사용자 상태 변경 가능
create policy "Admins can update user status"
  on public.users for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Works 정책
-- 승인된 사용자만 작품 조회
create policy "Approved users can view own works"
  on public.works for select
  using (
    user_id = auth.uid() and
    exists (
      select 1 from public.users
      where id = auth.uid() and status = 'approved'
    )
  );

-- 승인된 사용자만 작품 생성
create policy "Approved users can create works"
  on public.works for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.users
      where id = auth.uid() and status = 'approved'
    )
  );

-- 본인 작품 수정
create policy "Users can update own works"
  on public.works for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 본인 작품 삭제
create policy "Users can delete own works"
  on public.works for delete
  using (user_id = auth.uid());

-- 공개 작품은 누구나 조회 가능
create policy "Anyone can view public works"
  on public.works for select
  using (is_public = true);

-- Approval Logs 정책
-- 관리자만 로그 조회/생성 가능
create policy "Admins can view approval logs"
  on public.approval_logs for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can create approval logs"
  on public.approval_logs for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- Functions & Triggers
-- ============================================

-- 작품 업데이트 시 updated_at 자동 갱신
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_works_updated_at
  before update on public.works
  for each row
  execute function update_updated_at_column();

-- 신규 사용자 생성 시 auth.users와 연동
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, provider, status, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    'approved',  -- MVP: 자동 승인
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Auth 트리거 (신규 사용자 자동 등록)
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ============================================
-- 초기 데이터 (개발용)
-- ============================================

-- 첫 번째 관리자 계정 설정 (실제 배포 시 변경 필요)
-- 이 쿼리는 Supabase 대시보드에서 수동으로 실행
-- update public.users set role = 'admin' where email = 'admin@example.com';
