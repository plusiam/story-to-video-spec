# Story Worksheet - Claude Code 가이드

## 프로젝트 개요
스토리 구성 웹학습지 - 기승전결 4컷 스토리 작성을 위한 개인용 웹 앱

## 기술 스택
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, RLS)
- **Deploy**: Vercel

## 프로젝트 구조
```
personal-app/
├── src/
│   ├── contexts/      # React Context (AuthContext)
│   ├── hooks/         # Custom Hooks (useWorks)
│   ├── lib/           # Utilities (supabase, config)
│   ├── pages/         # Page Components
│   │   └── admin/     # Admin Pages
│   └── types/         # TypeScript Types
├── .claude/           # Claude Code 관련 문서
│   └── verification-skills.md  # 코드 검증 스킬 가이드
└── supabase/          # Supabase 설정
```

## 주요 파일
- `src/contexts/AuthContext.tsx` - 전역 인증 상태 관리
- `src/hooks/useWorks.ts` - 작품 CRUD 훅
- `src/lib/supabase.ts` - Supabase 클라이언트
- `src/lib/config.ts` - 앱 설정

## 개발 명령어
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

## 환경변수
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ENABLE_AI_FEATURES=false
```

## 코드 검증
개발 시 코드 품질 검증을 위해 `.claude/verification-skills.md` 문서 참조

### 주요 검증 스킬
- `/supabase-patterns` - Supabase 패턴 검증
- `/react-hooks-patterns` - React 훅 검증
- `/vercel-deployment` - 배포 설정 검증
- `/typescript-best-practices` - 타입 검증

## Supabase 테이블
### users
- `id` (UUID, PK, auth.uid())
- `email`, `nickname`, `role`, `status`
- RLS: 본인만 읽기/쓰기

### works
- `id` (UUID, PK)
- `user_id` (FK → users.id)
- `title`, `step`, `panels`, `status`
- RLS: 본인 작품만 CRUD

## 주의사항
1. **useAuth 사용**: 반드시 `@/contexts/AuthContext`에서 import
2. **RLS 정책**: 새 테이블 생성 시 반드시 RLS 정책 추가
3. **타입 안전성**: Supabase 쿼리 시 타입 명시

## 현재 알려진 이슈
- [ ] git push 네트워크 문제 (로컬 커밋 완료, 배포 대기)
- [ ] AuthContext 배포 후 검증 필요
