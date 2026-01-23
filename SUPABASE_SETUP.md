# Supabase 데이터베이스 설정 가이드

## 📋 개요

이 문서는 Story Creator Personal App의 Supabase 데이터베이스 설정을 안내합니다.

---

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `story-creator-personal`
   - **Database Password**: 안전한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 또는 `Northeast Asia (Tokyo)` 권장
   - **Pricing Plan**: Free (무료) 또는 Pro (유료)

4. "Create new project" 클릭 → 약 2분 대기

---

## 2. 데이터베이스 스키마 생성

### 2.1 SQL Editor 열기

Supabase Dashboard → SQL Editor → "New query"

### 2.2 테이블 생성

```sql
-- 1. users 테이블 (사용자 프로필)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. works 테이블 (작품 데이터)
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  theme TEXT,
  characters TEXT[],
  panels JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. visual_dnas 테이블 (비주얼 DNA 설정)
CREATE TABLE visual_dnas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  characters JSONB DEFAULT '[]',
  art_style TEXT,
  color_tone TEXT,
  lighting TEXT,
  environment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_works_user_id ON works(user_id);
CREATE INDEX idx_works_created_at ON works(created_at DESC);
CREATE INDEX idx_visual_dnas_user_id ON visual_dnas(user_id);
CREATE INDEX idx_visual_dnas_work_id ON visual_dnas(work_id);
```

**실행**: "Run" 버튼 클릭

---

## 3. Row Level Security (RLS) 정책 설정

### 3.1 RLS 활성화

```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_dnas ENABLE ROW LEVEL SECURITY;
```

### 3.2 users 테이블 정책

```sql
-- 본인 정보 조회
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 본인 정보 수정
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- 신규 사용자 생성 (회원가입 시)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 관리자는 모든 사용자 조회 가능
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3.3 works 테이블 정책

```sql
-- 본인 작품 조회
CREATE POLICY "Users can view own works"
  ON works FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 작품 생성
CREATE POLICY "Users can insert own works"
  ON works FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 작품 수정
CREATE POLICY "Users can update own works"
  ON works FOR UPDATE
  USING (auth.uid() = user_id);

-- 본인 작품 삭제
CREATE POLICY "Users can delete own works"
  ON works FOR DELETE
  USING (auth.uid() = user_id);
```

### 3.4 visual_dnas 테이블 정책

```sql
-- 본인 비주얼 DNA 조회
CREATE POLICY "Users can view own visual dnas"
  ON visual_dnas FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 비주얼 DNA 생성
CREATE POLICY "Users can insert own visual dnas"
  ON visual_dnas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 비주얼 DNA 수정
CREATE POLICY "Users can update own visual dnas"
  ON visual_dnas FOR UPDATE
  USING (auth.uid() = user_id);

-- 본인 비주얼 DNA 삭제
CREATE POLICY "Users can delete own visual dnas"
  ON visual_dnas FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 4. 트리거 함수 생성

### 4.1 updated_at 자동 업데이트

```sql
-- 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users 테이블 트리거
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- works 테이블 트리거
CREATE TRIGGER update_works_updated_at
  BEFORE UPDATE ON works
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- visual_dnas 테이블 트리거
CREATE TRIGGER update_visual_dnas_updated_at
  BEFORE UPDATE ON visual_dnas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 사용자 프로필 자동 생성

```sql
-- 신규 사용자 회원가입 시 자동으로 users 테이블에 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성 또는 선택
3. "API 및 서비스" → "OAuth 동의 화면"
   - 사용자 유형: **외부** 선택
   - 앱 이름: `Story Creator`
   - 지원 이메일: 본인 이메일
4. "API 및 서비스" → "사용자 인증 정보"
   - "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID"
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: `Story Creator Web`
   - 승인된 리디렉션 URI 추가:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
     (Supabase Dashboard → Settings → API → Project URL에서 확인)
5. Client ID와 Client Secret 저장

### 5.2 Supabase에 Google OAuth 연결

1. Supabase Dashboard → Authentication → Providers
2. Google 찾기 → "Enabled" 토글 활성화
3. Google Cloud Console에서 복사한 정보 입력:
   - **Client ID**: `<your-client-id>.apps.googleusercontent.com`
   - **Client Secret**: `<your-client-secret>`
4. "Save" 클릭

---

## 6. 환경 변수 설정

### 6.1 Supabase 정보 확인

Supabase Dashboard → Settings → API:

- **Project URL**: `https://<project-ref>.supabase.co`
- **anon public key**: `eyJhbGciOi...` (긴 문자열)

### 6.2 로컬 개발 환경 (.env)

`personal-app/.env` 파일 생성:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**주의**: `.env` 파일을 Git에 커밋하지 마세요! (`.gitignore`에 포함됨)

### 6.3 Vercel 프로덕션 환경

Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL = https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY = <your-anon-key>
```

---

## 7. 검증 및 테스트

### 7.1 데이터베이스 스키마 확인

```sql
-- 테이블 목록 확인
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- RLS 정책 확인
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

예상 결과:
- 테이블: `users`, `works`, `visual_dnas`
- 정책: 각 테이블당 4개 이상

### 7.2 로컬에서 연결 테스트

```bash
cd personal-app
npm run dev
```

브라우저에서 `http://localhost:5173` 접속:
1. Google 로그인 클릭
2. 로그인 성공 확인
3. Dashboard 접속 확인

### 7.3 Supabase Table Editor 확인

Supabase Dashboard → Table Editor:
- `users` 테이블에 새 사용자 레코드 생성 확인
- `email`, `full_name`, `avatar_url` 필드 데이터 확인

---

## 8. 관리자 계정 설정 (선택사항)

특정 사용자를 관리자로 설정:

```sql
-- 본인 이메일로 관리자 권한 부여
UPDATE users
SET role = 'admin', is_approved = true
WHERE email = 'your-email@gmail.com';
```

관리자는 다음 권한을 가집니다:
- 모든 사용자 조회
- 사용자 승인/거부
- (향후 추가 기능)

---

## 🔧 문제 해결

### 테이블 생성 실패
- **오류**: `permission denied`
- **해결**: SQL Editor에서 실행 권한 확인, Supabase 프로젝트 Owner 권한 필요

### RLS 정책 오류
- **오류**: `new row violates row-level security policy`
- **해결**: 정책 조건 확인, `auth.uid()` 값이 올바른지 확인

### Google OAuth 실패
- **오류**: `redirect_uri_mismatch`
- **해결**: Google Cloud Console의 Redirect URI와 Supabase Callback URL 일치 확인

### 연결 실패
- **오류**: `Failed to connect to database`
- **해결**:
  1. 환경 변수 확인 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
  2. Supabase 프로젝트 상태 확인 (paused 상태일 수 있음)
  3. 네트워크 연결 확인

---

## 📞 추가 지원

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- GitHub Issues

---

**최종 업데이트**: 2026-01-23
