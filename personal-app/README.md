# 스토리 구성 웹학습지 - 개인 모드

> ⚠️ **학급 모드와 완전히 분리된 시스템입니다.**
> 학급 모드는 [classroom-gas/](../classroom-gas/)를 참조하세요.

React + Vite + Supabase 기반의 개인 사용자용 스토리 구성 웹앱입니다.

## 🎯 특징

- **개인 맞춤형**: 계정 기반으로 어디서든 작업 가능
- **AI 도우미**: 스토리 아이디어, 이미지 생성 지원 (예정)
- **승인 시스템**: MVP는 자유 가입, 정식은 관리자 승인제
- **클라우드 저장**: Supabase를 통한 안전한 데이터 저장

## 🛠️ 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel (예정)

## 📁 프로젝트 구조

```
personal-app/
├── src/
│   ├── components/     # 재사용 컴포넌트
│   ├── hooks/          # 커스텀 훅
│   ├── lib/            # 유틸리티, 설정
│   ├── pages/          # 페이지 컴포넌트
│   │   ├── admin/      # 관리자 페이지
│   │   └── ...
│   ├── types/          # TypeScript 타입
│   └── App.tsx         # 라우터
├── supabase/
│   └── migrations/     # DB 마이그레이션
└── public/             # 정적 파일
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 Supabase 정보를 입력:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AUTO_APPROVE_USERS=true
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_initial.sql` 실행
3. Authentication > Providers에서 Google OAuth 설정 (선택)

### 4. 개발 서버 실행

```bash
npm run dev
```

## 📊 Supabase 스키마

### users

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK, auth.users 참조 |
| email | text | 이메일 (unique) |
| nickname | text | 닉네임 |
| status | text | pending/approved/rejected/suspended |
| role | text | user/admin |

### works

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| user_id | uuid | 작성자 |
| title | text | 제목 |
| step | int | 진행 단계 (1-3) |
| panels | jsonb | 4컷 패널 데이터 |
| status | text | draft/complete |

## 🔐 승인 시스템

### MVP 단계 (현재)
- `VITE_AUTO_APPROVE_USERS=true`
- 회원가입 시 자동 승인

### 정식 단계 (미래)
- `VITE_AUTO_APPROVE_USERS=false`
- 관리자가 `/admin/users`에서 승인

## 📝 라이선스

MIT License
