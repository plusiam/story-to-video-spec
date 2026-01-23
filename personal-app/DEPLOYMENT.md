# 배포 가이드

## 📋 배포 전 체크리스트

### 1. Supabase 설정

#### 1.1 프로젝트 생성
- [ ] [Supabase](https://supabase.com)에서 새 프로젝트 생성
- [ ] 프로젝트 이름: `story-creator-personal`
- [ ] 리전: `Northeast Asia (ap-northeast-1)` 권장

#### 1.2 데이터베이스 스키마 적용
```bash
cd personal-app/supabase
```

SQL Editor에서 다음 파일들을 순서대로 실행:

1. **테이블 생성** (`schema.sql`)
```sql
-- users 테이블
-- works 테이블
-- visual_dnas 테이블
```

2. **Row Level Security (RLS) 정책** (`policies.sql`)
```sql
-- users 정책
-- works 정책
-- visual_dnas 정책
```

#### 1.3 Google OAuth 설정
1. Supabase Dashboard → Authentication → Providers
2. Google OAuth 활성화
3. Google Cloud Console에서:
   - OAuth 2.0 클라이언트 ID 생성
   - 승인된 리디렉션 URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Client ID와 Client Secret을 Supabase에 입력

#### 1.4 환경 변수 확인
Supabase Dashboard → Settings → API에서:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public key` → `VITE_SUPABASE_ANON_KEY`

---

### 2. Vercel 배포 설정

#### 2.1 프로젝트 연결
```bash
# Vercel CLI 설치 (선택사항)
npm i -g vercel

# GitHub에 푸시 후 Vercel에서 Import
```

#### 2.2 환경 변수 설정
Vercel Dashboard → Settings → Environment Variables:

**Production 환경**:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Preview 환경** (선택사항):
- 동일한 값 또는 별도 Supabase 프로젝트 사용

#### 2.3 빌드 설정
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 2.4 배포
```bash
git push origin main
# Vercel이 자동으로 배포 시작
```

---

### 3. Google Apps Script (학급 모드) 배포

#### 3.1 스프레드시트 생성
1. Google Drive에서 새 스프레드시트 생성
2. 이름: `스토리 구성 학습지 - 학급 모드`

#### 3.2 Apps Script 프로젝트 생성
1. 스프레드시트 → 확장 프로그램 → Apps Script
2. 프로젝트 이름: `story-worksheet-classroom`

#### 3.3 코드 배포
**방법 1: 수동 복사**
```
story-worksheet-classroom/ 폴더의 모든 파일을:
- *.gs 파일 → Apps Script Editor에 추가
- *.html 파일 → Apps Script Editor에 HTML 파일로 추가
```

**방법 2: clasp CLI (권장)**
```bash
# clasp 설치
npm install -g @google/clasp

# 로그인
clasp login

# 프로젝트 연결
cd story-worksheet-classroom
clasp create --type standalone --title "Story Worksheet Classroom"

# 푸시
clasp push
```

#### 3.4 Script Properties 설정
Apps Script Editor → 프로젝트 설정 → Script Properties:

```
GEMINI_API_KEY = your-gemini-api-key (선택사항)
```

#### 3.5 웹 앱 배포
1. Apps Script Editor → 배포 → 새 배포
2. 유형: 웹 앱
3. 설정:
   - 실행 계정: **나**
   - 액세스 권한: **모든 사람** (학급 사용)
4. 배포 → URL 복사

#### 3.6 스프레드시트 시트 설정
다음 시트를 생성:
- `학생목록` (A열: 이름, B열: 번호, C열: PIN)
- `작품목록` (A열: 학생이름, B열: 번호, C열: 단계, D열: 작품데이터)

---

### 4. 보안 체크

#### 4.1 환경 변수 누출 방지
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] GitHub에 환경 변수가 커밋되지 않았는지 확인
- [ ] API 키가 코드에 하드코딩되지 않았는지 확인

#### 4.2 Supabase RLS 검증
```sql
-- users 테이블: 본인 정보만 조회/수정 가능
-- works 테이블: 본인 작품만 조회/수정/삭제 가능
-- visual_dnas 테이블: 본인 데이터만 조회/수정 가능
```

테스트:
1. 다른 사용자로 로그인
2. 타인의 작품 조회 시도 → 실패 확인
3. 타인의 작품 수정 시도 → 실패 확인

#### 4.3 Google Apps Script 권한
- [ ] 스프레드시트 접근 권한 검증
- [ ] 웹 앱 액세스 권한 확인 (모든 사람 vs 조직 내)
- [ ] Script Properties의 API 키 보안 확인

---

### 5. 성능 최적화 검증

#### 5.1 Lighthouse 테스트
```bash
# Chrome DevTools → Lighthouse
# 또는
npx lighthouse https://your-app.vercel.app --view
```

목표:
- **Performance**: >90
- **Accessibility**: >90
- **Best Practices**: >90
- **SEO**: >80

#### 5.2 번들 크기 확인
```bash
cd personal-app
npm run build

# dist 폴더 크기 확인
du -sh dist
```

목표:
- 총 번들 크기: <500KB (gzip)
- 개별 청크: <200KB (gzip)

---

### 6. 기능 테스트

#### 6.1 개인 모드 (personal-app)
- [ ] Google 로그인 성공
- [ ] 작품 생성/수정/삭제 동작
- [ ] 4-패널 스토리 편집 정상 동작
- [ ] Step 2 장면 확장 정상 동작
- [ ] Step 3 AI 완성 기능 동작 (API 키 필요)
- [ ] 프롬프트 내보내기 (TXT, JSON, PDF) 정상 동작
- [ ] 온보딩 튜토리얼 표시 및 스킵 기능

#### 6.2 학급 모드 (classroom-gas)
- [ ] 학생 로그인 (이름 + 번호 + PIN)
- [ ] Step 1: 이야기 구상하기
- [ ] Step 2: 장면 확장하기 (드래그앤드롭)
- [ ] Step 3: 내 그림으로 완성하기
- [ ] AI 그림 힌트 기능
- [ ] HTML 다운로드 (인쇄 가능)
- [ ] 작품 저장/불러오기

#### 6.3 크로스 브라우저 테스트
- [ ] Chrome (최신)
- [ ] Safari (최신)
- [ ] Firefox (최신)
- [ ] Edge (최신)
- [ ] 모바일 Safari (iOS)
- [ ] 모바일 Chrome (Android)

---

### 7. 모니터링 설정

#### 7.1 Vercel Analytics (선택사항)
```bash
npm i @vercel/analytics
```

`src/main.tsx`:
```typescript
import { inject } from '@vercel/analytics';
inject();
```

#### 7.2 Error Tracking (선택사항)
Sentry 또는 다른 에러 트래킹 도구 설정

---

## 🚀 배포 후 체크리스트

### 즉시 확인
- [ ] 프로덕션 URL 접속 확인
- [ ] Google OAuth 로그인 테스트
- [ ] 작품 CRUD 동작 확인
- [ ] 에러 로그 확인 (Vercel Dashboard)

### 24시간 내 확인
- [ ] 실제 사용자 피드백 수집
- [ ] 성능 메트릭 확인 (Vercel Analytics)
- [ ] 에러 리포트 검토
- [ ] 사용량 확인 (Supabase Dashboard)

### 1주일 내 확인
- [ ] 데이터베이스 백업 설정
- [ ] 정기 모니터링 루틴 구축
- [ ] 사용자 가이드/FAQ 작성

---

## 🔧 문제 해결

### Supabase 연결 실패
1. 환경 변수 확인 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
2. Supabase 프로젝트 상태 확인 (Dashboard)
3. RLS 정책 확인

### Google OAuth 실패
1. Redirect URI 확인 (Supabase와 Google Cloud Console 일치)
2. OAuth Client ID/Secret 확인
3. Supabase Authentication 설정 확인

### Apps Script 배포 오류
1. Script Properties 확인
2. 스프레드시트 시트 이름 확인
3. 권한 설정 확인 (실행 계정, 액세스 권한)

### 빌드 실패
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 타입 체크
npm run build
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues: https://github.com/plusiam/story-worksheet/issues
2. 에러 로그 첨부
3. 재현 단계 상세 기술

---

**최종 업데이트**: 2026-01-23
