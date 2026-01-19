# 개발 계획: 미완료 기능 구현

> **작성일**: 2026-01-19
> **대상**: AI 이미지 생성, 그림책 내보내기, 개인 모드 MVP
> **우선순위**: AI 이미지 → 그림책 → 개인모드

---

## 📋 개요

### 현재 상태
- ✅ 4컷 스토리 작성 (기-승-전-결)
- ✅ 장면 확장 (Step 2)
- ✅ 비주얼 DNA 설정 + 프롬프트 생성 (Step 3-A, 3-B)
- ✅ 텍스트/JSON/SRT 내보내기
- ⬜ AI 이미지 직접 생성
- ⬜ 그림책 내보내기 (PDF/이미지)
- ⬜ 개인 모드 MVP (간소화된 회원가입)

### 기술 결정 사항
| 항목 | 결정 |
|------|------|
| AI 이미지 서비스 | 사용자 API 키 입력 방식 |
| 그림책 내보내기 | PDF + 이미지 ZIP 모두 지원 |
| 개인 모드 | 간소화된 회원가입 (이메일만) |

---

## 🎯 Phase 1: AI 이미지 생성 기능

### 1.1 목표
사용자가 자신의 API 키로 AI 이미지를 직접 생성하여 장면에 적용

### 1.2 지원 서비스
| 서비스 | API | 특징 |
|--------|-----|------|
| **Google Gemini (Imagen 3)** | `generateImages` | 🌟 추천! 무료 티어, 한글 프롬프트 우수 |
| OpenAI DALL-E 3 | `images/generations` | 고품질, 텍스트 이해력 우수 |
| Stability AI | `text-to-image` | 스타일 다양성, 비용 효율 |
| Replicate | Flux, SDXL 등 | 다양한 모델 선택 |

#### Google Gemini (Imagen 3) 상세
- **API**: Google AI Studio의 Gemini API (`gemini-2.0-flash-exp` 모델 + 이미지 생성)
- **장점**:
  - 무료 티어 제공 (분당 15회, 일일 1,500회)
  - 한글 프롬프트 이해력 우수
  - Google 계정만 있으면 API 키 발급 가능
  - Imagen 3 기반 고품질 이미지
- **API 키 발급**: [Google AI Studio](https://aistudio.google.com/apikey)
- **참고**: 이미지 생성은 `responseModalities: ["TEXT", "IMAGE"]` 설정 필요

### 1.3 구현 계획

#### 파일 구조
```
src/
├── lib/
│   └── ai/
│       ├── index.ts           # AI 서비스 진입점
│       ├── types.ts           # AI 관련 타입
│       ├── providers/
│       │   ├── gemini.ts      # Google Gemini (Imagen 3) ⭐
│       │   ├── openai.ts      # OpenAI DALL-E
│       │   ├── stability.ts   # Stability AI
│       │   └── replicate.ts   # Replicate
│       └── imageGenerator.ts  # 통합 이미지 생성기
├── components/
│   └── story/
│       ├── ImageGenerator.tsx      # 이미지 생성 UI
│       ├── ImagePreview.tsx        # 생성된 이미지 미리보기
│       └── ApiKeySettings.tsx      # API 키 관리 (확장)
└── hooks/
    └── useImageGeneration.ts       # 이미지 생성 훅
```

#### 핵심 타입 정의
```typescript
// lib/ai/types.ts
export type AIProvider = 'gemini' | 'openai' | 'stability' | 'replicate';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;  // Replicate용 모델 선택
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  provider: AIProvider;
  generatedAt: Date;
}

export interface GeneratedImage {
  id: string;
  sceneId: string;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  sceneIndex: number;
  imageUrl: string;
  prompt: string;
  provider: AIProvider;
  createdAt: Date;
}
```

#### API 키 저장 전략
```typescript
// 로컬 스토리지에 암호화 저장 (클라이언트 사이드)
// Supabase에는 해시만 저장 (사용 여부 확인용)

interface StoredApiKey {
  provider: AIProvider;
  encryptedKey: string;  // localStorage
  keyHash: string;       // Supabase (선택적)
  createdAt: Date;
}
```

#### UI 흐름
```
Step 3-B (현재: 프롬프트 복사만)
    ↓
[이미지 생성] 버튼 추가
    ↓
┌─────────────────────────────┐
│ API 키 입력 모달            │
│ ┌─────────────────────────┐ │
│ │ 서비스 선택:            │ │
│ │ ● Google Gemini (추천) │ │
│ │ ○ OpenAI DALL-E        │ │
│ │ ○ Stability AI         │ │
│ │ ○ Replicate            │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ API Key: ************** │ │
│ └─────────────────────────┘ │
│ [저장하기] [취소]           │
└─────────────────────────────┘
    ↓
이미지 생성 중... (로딩)
    ↓
┌─────────────────────────────┐
│ 생성된 이미지 미리보기      │
│ ┌───────────────────────┐   │
│ │        [이미지]        │   │
│ └───────────────────────┘   │
│ [적용하기] [재생성] [취소]  │
└─────────────────────────────┘
```

### 1.4 개발 작업 목록

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1-1 | AI 타입 정의 (`lib/ai/types.ts`) | 1h | - |
| 1-2 | **Google Gemini 프로바이더 구현** ⭐ | 2h | 1-1 |
| 1-3 | OpenAI 프로바이더 구현 | 2h | 1-1 |
| 1-4 | Stability AI 프로바이더 구현 | 2h | 1-1 |
| 1-5 | Replicate 프로바이더 구현 | 2h | 1-1 |
| 1-6 | 통합 이미지 생성기 | 2h | 1-2~1-5 |
| 1-7 | `useImageGeneration` 훅 | 2h | 1-6 |
| 1-8 | API 키 관리 UI 개선 | 3h | - |
| 1-9 | 이미지 생성 버튼 & 모달 | 3h | 1-7, 1-8 |
| 1-10 | 이미지 미리보기 & 적용 | 2h | 1-9 |
| 1-11 | 생성된 이미지 저장 (Supabase Storage) | 3h | 1-10 |
| 1-12 | 에러 핸들링 & 로딩 상태 | 2h | 1-9~1-11 |
| 1-13 | 테스트 & 버그 수정 | 3h | 전체 |

**Phase 1 총 예상 시간: ~29h (약 4일)**

### 1.5 보안 고려사항
- API 키는 클라이언트 localStorage에만 저장
- 서버(Supabase)에는 키 해시만 저장 (선택적 기능)
- HTTPS 필수
- API 호출 시 프록시 서버 고려 (CORS 이슈)

---

## 🎯 Phase 2: 그림책 내보내기

### 2.1 목표
완성된 스토리와 이미지를 PDF 그림책 또는 이미지 패키지로 내보내기

### 2.2 내보내기 형식

#### PDF 그림책
```
┌─────────────────────────────┐
│         제목 페이지          │
│                             │
│     "나의 첫 번째 이야기"    │
│         by 작가이름          │
│                             │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│ [기] 시작 - 장면 1          │
│ ┌───────────────────────┐   │
│ │        [이미지]        │   │
│ └───────────────────────┘   │
│                             │
│ 어느 날, 작은 마을에 한     │
│ 소녀가 살고 있었습니다...   │
│                             │
└─────────────────────────────┘
         ↓
       (반복)
```

#### 이미지 패키지 (ZIP)
```
story-export/
├── 00-cover.png          # 표지
├── 01-ki-scene1.png      # 기 - 장면1
├── 01-ki-scene2.png      # 기 - 장면2
├── 02-seung-scene1.png   # 승 - 장면1
├── ...
├── metadata.json         # 메타데이터
└── script.txt            # 전체 스크립트
```

### 2.3 구현 계획

#### 파일 구조
```
src/
├── lib/
│   └── export/
│       ├── index.ts           # 내보내기 진입점
│       ├── pdfGenerator.ts    # PDF 생성기
│       ├── zipGenerator.ts    # ZIP 생성기
│       ├── templates/
│       │   ├── picturebook.ts # 그림책 템플릿
│       │   └── storyboard.ts  # 스토리보드 템플릿
│       └── fonts/             # 한글 폰트
└── components/
    └── export/
        ├── ExportModal.tsx    # 내보내기 모달
        ├── ExportPreview.tsx  # 미리보기
        └── ExportProgress.tsx # 진행 상태
```

#### 사용 라이브러리
```json
{
  "dependencies": {
    "jspdf": "^2.5.1",           // PDF 생성
    "html2canvas": "^1.4.1",     // HTML → Canvas
    "jszip": "^3.10.1",          // ZIP 생성
    "file-saver": "^2.0.5"       // 파일 다운로드
  }
}
```

#### PDF 템플릿 옵션
```typescript
interface PdfExportOptions {
  // 페이지 설정
  pageSize: 'A4' | 'A5' | 'LETTER' | 'SQUARE';
  orientation: 'portrait' | 'landscape';

  // 레이아웃
  layout: 'full-page' | 'image-top' | 'image-left' | 'storyboard';

  // 스타일
  theme: 'classic' | 'modern' | 'kids' | 'minimal';
  fontFamily: 'nanum' | 'gothic' | 'serif';

  // 콘텐츠
  includeCover: boolean;
  includeCredits: boolean;
  includeSceneNumbers: boolean;

  // 이미지 처리
  imageQuality: 'high' | 'medium' | 'low';
  maintainAspectRatio: boolean;
}
```

### 2.4 개발 작업 목록

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 2-1 | 내보내기 타입 정의 | 1h | - |
| 2-2 | jsPDF + 한글 폰트 설정 | 3h | - |
| 2-3 | 기본 PDF 템플릿 구현 | 4h | 2-2 |
| 2-4 | 그림책 레이아웃 4종 구현 | 6h | 2-3 |
| 2-5 | 표지 페이지 생성 | 2h | 2-3 |
| 2-6 | ZIP 이미지 패키지 생성 | 3h | - |
| 2-7 | 내보내기 모달 UI | 3h | - |
| 2-8 | 미리보기 기능 | 4h | 2-4 |
| 2-9 | 진행 상태 표시 | 2h | 2-4, 2-6 |
| 2-10 | 테마 시스템 (classic, modern, kids) | 4h | 2-4 |
| 2-11 | 테스트 & 버그 수정 | 3h | 전체 |

**Phase 2 총 예상 시간: ~35h (약 4-5일)**

### 2.5 PDF 생성 핵심 로직
```typescript
// lib/export/pdfGenerator.ts (의사 코드)
export async function generatePicturebookPdf(
  work: Work,
  scenes: PanelScenes,
  images: GeneratedImage[],
  options: PdfExportOptions
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.pageSize
  });

  // 한글 폰트 추가
  pdf.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
  pdf.setFont('NanumGothic');

  // 표지 페이지
  if (options.includeCover) {
    await addCoverPage(pdf, work, options);
    pdf.addPage();
  }

  // 장면별 페이지 생성
  for (const [panelKey, panelScenes] of Object.entries(scenes)) {
    for (const scene of panelScenes) {
      const image = images.find(
        img => img.panelKey === panelKey && img.sceneIndex === scene.order
      );

      await addScenePage(pdf, scene, image, options);
      pdf.addPage();
    }
  }

  // 크레딧 페이지
  if (options.includeCredits) {
    addCreditsPage(pdf, work);
  }

  return pdf.output('blob');
}
```

---

## 🎯 Phase 3: 개인 모드 MVP

### 3.1 목표
간소화된 회원가입으로 더 쉬운 사용자 온보딩

### 3.2 현재 인증 흐름
```
Google OAuth 또는 Magic Link
    ↓
관리자 승인 대기
    ↓
승인 후 사용 가능
```

### 3.3 개선된 인증 흐름
```
이메일 입력
    ↓
Magic Link 전송 (자동 승인)
    ↓
즉시 사용 가능
```

### 3.4 변경 사항

#### AuthContext 수정
```typescript
// 기존: 관리자 승인 필요
const isApproved = user?.status === 'approved';

// 변경: 이메일 인증 완료 시 자동 승인
const isApproved = user?.email_confirmed_at != null || user?.status === 'approved';
```

#### 가입 흐름 단순화
```typescript
// pages/Login.tsx 수정
// 1. Google OAuth 버튼 유지 (선택적)
// 2. 이메일 입력 강조
// 3. 승인 대기 화면 제거 또는 간소화
```

#### Supabase 설정 변경
```sql
-- 트리거: 새 사용자 자동 승인
CREATE OR REPLACE FUNCTION auto_approve_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 이메일 인증된 사용자는 자동 승인
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.users (id, email, status, role)
    VALUES (NEW.id, NEW.email, 'approved', 'user')
    ON CONFLICT (id) DO UPDATE SET status = 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.5 UI 개선

#### 로그인 페이지 재설계
```
┌─────────────────────────────┐
│                             │
│    📖 스토리 구성 학습지     │
│                             │
│  ┌───────────────────────┐  │
│  │ 이메일 주소 입력       │  │
│  └───────────────────────┘  │
│                             │
│  [로그인 링크 받기]         │
│                             │
│  ─────── 또는 ───────       │
│                             │
│  [G] Google로 시작하기      │
│                             │
│  처음이신가요? 이메일 입력만│
│  하시면 바로 시작됩니다!    │
│                             │
└─────────────────────────────┘
```

### 3.6 개발 작업 목록

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 3-1 | Supabase 자동 승인 트리거 설정 | 2h | - |
| 3-2 | AuthContext 로직 수정 | 2h | 3-1 |
| 3-3 | Login 페이지 UI 재설계 | 3h | - |
| 3-4 | PendingApproval 페이지 수정/제거 | 1h | 3-2 |
| 3-5 | 온보딩 튜토리얼 추가 | 4h | 3-3 |
| 3-6 | 에러 메시지 개선 | 2h | 3-2 |
| 3-7 | 테스트 & 버그 수정 | 2h | 전체 |

**Phase 3 총 예상 시간: ~16h (약 2일)**

---

## 📅 전체 일정

```
Week 1-2: Phase 1 (AI 이미지 생성)
├── Day 1-2: 타입 정의 + 프로바이더 구현
├── Day 3-4: 통합 생성기 + 훅
├── Day 5-6: UI 구현
└── Day 7: 테스트 & 수정

Week 3-4: Phase 2 (그림책 내보내기)
├── Day 1-2: PDF 기본 설정 + 한글 폰트
├── Day 3-4: 템플릿 & 레이아웃
├── Day 5: ZIP 패키지
├── Day 6: UI + 미리보기
└── Day 7: 테스트 & 수정

Week 5: Phase 3 (개인 모드 MVP)
├── Day 1: Supabase 설정 + Auth 수정
├── Day 2-3: UI 재설계
└── Day 4-5: 테스트 & 배포
```

**총 예상 기간: 5주 (80h)**

---

## 🔧 기술 스택 추가

### 추가 의존성
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "openai": "^4.28.0",
    "@stability-ai/sdk": "^0.3.0",
    "replicate": "^0.25.0",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "jszip": "^3.10.1",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7"
  }
}
```

### 환경 변수
```env
# .env.local (클라이언트 사이드 - 사용자 입력)
# API 키는 사용자가 직접 입력하므로 서버 환경변수 불필요

# Supabase Storage 설정
VITE_SUPABASE_STORAGE_BUCKET=generated-images
```

---

## ✅ 성공 기준

### Phase 1 (AI 이미지)
- [ ] 3개 AI 서비스 중 1개 이상 연동 완료
- [ ] API 키 안전하게 저장/관리
- [ ] 이미지 생성 → 장면 적용 흐름 완성
- [ ] 생성된 이미지 Supabase Storage 저장

### Phase 2 (그림책)
- [ ] PDF 그림책 생성 (한글 폰트 정상 출력)
- [ ] 최소 2개 이상의 레이아웃 템플릿
- [ ] ZIP 이미지 패키지 다운로드
- [ ] 내보내기 미리보기

### Phase 3 (개인 모드)
- [ ] 이메일만으로 가입 가능
- [ ] 관리자 승인 없이 즉시 사용
- [ ] 기존 사용자 마이그레이션 문제 없음

---

## 📝 다음 단계

1. 이 문서를 기반으로 GitHub Issues 생성
2. Phase 1 첫 번째 작업 시작
3. 주간 진행 상황 체크 및 문서 업데이트

---

**문서 작성자**: Claude (AI Assistant)
**검토자**: (검토 필요)
