# 코드 검증 스킬 가이드

> story-worksheet 프로젝트 개발 시 코드 품질 검증을 위한 Claude Code Skills 참조 문서
> 출처: https://skills.cokac.com

---

## 설치 방법

```bash
# 필요한 스킬 설치
npx skillscokac -i [스킬명]

# 예시
npx skillscokac -i supabase-patterns
npx skillscokac -i react-hooks-patterns
```

## 사용 방법 (Claude Code에서)

```
/[스킬명]
```

---

## 1. Vercel 배포 검증

### vercel-deployment
- **용도**: 배포 설정, serverless functions, edge functions, preview deployments
- **설치**: `npx skillscokac -i vercel-deployment`
- **사용**: `/vercel-deployment`

#### 체크리스트
```
### Configuration
- [ ] Project linked
- [ ] Build settings correct
- [ ] Environment variables set
- [ ] Domains configured
- [ ] Team settings if needed

### Features
- [ ] Preview deployments working
- [ ] Edge functions if needed
- [ ] Caching configured
- [ ] Analytics enabled
- [ ] Web Vitals monitored
```

#### 우리 프로젝트 적용 포인트
- `vercel.json` 설정 검증
- 환경변수 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) 설정 확인
- SPA 리다이렉트 설정 확인

---

## 2. React 패턴 검증

### react-hooks-patterns
- **용도**: 커스텀 훅, 상태관리, 라이프사이클 핸들링
- **설치**: `npx skillscokac -i react-hooks-patterns`
- **사용**: `/react-hooks-patterns`

#### 우리 프로젝트 적용 포인트
- `useAuth` (AuthContext) - 인증 상태 관리
- `useWorks` - 작품 CRUD 훅
- Effect cleanup 및 의존성 배열 검증
- 무한 루프 방지 패턴

### react-component-patterns
- **용도**: 컴포넌트 구조, composition, 성능 최적화
- **설치**: `npx skillscokac -i react-component-patterns`
- **사용**: `/react-component-patterns`

#### 우리 프로젝트 적용 포인트
- 페이지 컴포넌트 구조 (Dashboard, Login, Admin 등)
- Route Guards (ProtectedRoute, AdminRoute)
- 컴포넌트 재사용성 검증

### react-query-patterns
- **용도**: 데이터 fetching, 캐싱, optimistic updates
- **설치**: `npx skillscokac -i react-query-patterns`
- **사용**: `/react-query-patterns`

#### 우리 프로젝트 적용 포인트
- Supabase 쿼리 최적화
- 로딩/에러 상태 핸들링
- 캐싱 전략

### state-management-advisor
- **용도**: 상태 관리 솔루션 선택 가이드
- **설치**: `npx skillscokac -i state-management-advisor`
- **사용**: `/state-management-advisor`

#### 우리 프로젝트 적용 포인트
- Context API vs 다른 솔루션 비교
- 전역 상태 vs 로컬 상태 구분
- AuthContext 구조 검증

---

## 3. Supabase 패턴 검증

### supabase-patterns
- **용도**: Auth, Database, Storage, Realtime 패턴
- **설치**: `npx skillscokac -i supabase-patterns`
- **사용**: `/supabase-patterns`

#### 우리 프로젝트 적용 포인트
- **Auth**: Google OAuth 플로우, 세션 관리
- **RLS**: users, works 테이블 정책
- **Database**: 쿼리 패턴, 에러 핸들링

#### RLS 정책 체크리스트
```sql
-- users 테이블
- [ ] SELECT: auth.uid() = id
- [ ] INSERT: auth.uid() = id
- [ ] UPDATE: auth.uid() = id

-- works 테이블
- [ ] SELECT: auth.uid() = user_id
- [ ] INSERT: auth.uid() = user_id
- [ ] UPDATE: auth.uid() = user_id
- [ ] DELETE: auth.uid() = user_id
```

### database-seeding
- **용도**: Seed data, 환경별 데이터, 테스트 데이터
- **설치**: `npx skillscokac -i database-seeding`
- **사용**: `/database-seeding`

#### 우리 프로젝트 적용 포인트
- 개발환경 테스트 데이터
- 관리자 계정 초기 설정

---

## 4. TypeScript 검증

### typescript-best-practices
- **용도**: 타입 안전성, 제네릭, 유틸리티 타입, 공통 패턴
- **설치**: `npx skillscokac -i typescript-best-practices`
- **사용**: `/typescript-best-practices`

#### 우리 프로젝트 적용 포인트
- `src/types/index.ts` 타입 정의 검증
- Supabase 타입 (`Database`, `Json`)
- 컴포넌트 Props 타입

### typescript-advanced
- **용도**: 조건부 타입, 유틸리티 타입, 고급 패턴
- **설치**: `npx skillscokac -i typescript-advanced`
- **사용**: `/typescript-advanced`

---

## 5. 스타일링 검증

### tailwindcss-patterns
- **용도**: 유틸리티 클래스, 반응형 디자인, 컴포넌트 패턴
- **설치**: `npx skillscokac -i tailwindcss-patterns`
- **사용**: `/tailwindcss-patterns`

#### 우리 프로젝트 적용 포인트
- `tailwind.config.js` 설정
- 커스텀 테마 (primary 색상 등)
- 반응형 디자인 검증

---

## 검증 워크플로우

### 새 기능 개발 시
1. 기능 구현
2. `/react-hooks-patterns` - 훅 패턴 검증
3. `/typescript-best-practices` - 타입 검증
4. `/supabase-patterns` - DB 쿼리 검증

### 배포 전
1. `/vercel-deployment` - 배포 설정 확인
2. 환경변수 확인
3. 빌드 테스트

### 문제 발생 시
1. 콘솔 에러 확인
2. 관련 스킬로 패턴 검증
3. 수정 후 재테스트

---

## 빠른 참조 명령어

```bash
# 스킬 설치
npx skillscokac -i supabase-patterns
npx skillscokac -i react-hooks-patterns
npx skillscokac -i react-component-patterns
npx skillscokac -i vercel-deployment
npx skillscokac -i typescript-best-practices
npx skillscokac -i tailwindcss-patterns

# 스킬 제거
npx skillscokac -r [스킬명]
```

---

## 현재 프로젝트 주요 이슈 및 관련 스킬

| 이슈 | 관련 스킬 |
|------|-----------|
| AuthContext 무한 루프 | react-hooks-patterns |
| RLS 정책 오류 | supabase-patterns |
| 작품 생성 실패 | supabase-patterns |
| 배포 후 로딩 문제 | vercel-deployment |
| 타입 에러 | typescript-best-practices |

---

*마지막 업데이트: 2025-01-18*
