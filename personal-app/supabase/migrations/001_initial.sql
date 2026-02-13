-- ============================================
-- 스토리 구성 웹학습지 - 개인 모드
-- Supabase 초기 스키마
-- ============================================

-- 사용자 테이블
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,

  -- 승인 시스템
  is_approved boolean default true,
  -- MVP: true (자동승인)
  -- Production: false (승인대기)

  -- 역할
  role text default 'user' check (role in ('user', 'judge', 'admin')),

  -- 메타
  created_at timestamptz default now() not null,
  updated_at timestamptz default now()
);

-- 작품 테이블
create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text default '제목 없음',
  theme text,
  characters text[],
  panels jsonb default '[]',
  notes text,
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

create index if not exists idx_users_is_approved on public.users(is_approved);
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

-- 인증된 사용자는 프로필 생성 가능 (AuthContext.createProfile용)
create policy "Authenticated users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Works 정책
-- 승인된 사용자만 작품 조회
create policy "Approved users can view own works"
  on public.works for select
  using (
    user_id = auth.uid() and
    exists (
      select 1 from public.users
      where id = auth.uid() and is_approved = true
    )
  );

-- 승인된 사용자만 작품 생성
create policy "Approved users can create works"
  on public.works for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.users
      where id = auth.uid() and is_approved = true
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

-- NOTE: 신규 사용자 프로필 생성은 AuthContext.createProfile()에서 처리
-- handle_new_user 트리거는 사용하지 않음 (역할 결정 로직이 프론트엔드에 있으므로)

-- ============================================
-- 초기 데이터 (개발용)
-- ============================================

-- 첫 번째 관리자 계정 설정 (실제 배포 시 변경 필요)
-- 이 쿼리는 Supabase 대시보드에서 수동으로 실행
-- update public.users set role = 'admin' where email = 'admin@example.com';
