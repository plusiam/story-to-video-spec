# 개발 계획 v2: 프롬프트 & 문서 최적화 중심

> **작성일**: 2026-01-19
> **버전**: 2.0 (방향성 전환)
> **핵심 가치**: AI 도구를 위한 최적의 입력물(프롬프트/문서) 생성

---

## 📋 서비스 방향성 재정의

### 🎯 핵심 철학

```
"AI가 이미지/영상을 만드는 시대,
 우리는 AI에게 '무엇을 만들어야 하는지' 잘 알려주는 도구를 만든다."
```

### 기존 vs 새로운 방향

| 항목 | 기존 계획 | 새로운 방향 |
|------|----------|------------|
| AI 이미지 | 직접 생성 (API 연동) | ❌ **제외** |
| API 키 관리 | 사용자 입력 필요 | ❌ **불필요** |
| 서버 비용 | 프록시 서버 필요 | ✅ **Zero** |
| 핵심 산출물 | 완성된 그림책 | ✅ **최적화된 프롬프트 & 문서** |

### 왜 이 방향인가?

1. **보안**: 사용자 API 키 관리 불필요 → 보안 이슈 원천 차단
2. **비용**: 서버 비용 Zero → 지속 가능한 무료 서비스
3. **교육적 가치**: 학생들이 직접 AI 도구에 프롬프트를 넣어보는 경험
4. **유연성**: 어떤 AI 서비스든 호환 (Gemini, DALL-E, Midjourney, Sora...)
5. **차별화**: "스토리 구조화 + 프롬프트 최적화" 전문 도구

---

## 🎯 Phase 1: 프롬프트 최적화 시스템 강화

### 1.1 목표
각 AI 서비스에 최적화된 고품질 프롬프트 자동 생성

### 1.2 지원 AI 서비스별 프롬프트 포맷

#### 이미지 생성 AI
| 서비스 | 프롬프트 특징 | 최적화 포인트 |
|--------|-------------|--------------|
| Google Gemini (Imagen 3) | 한글 지원 우수, 자연어 | 상세 묘사, 감정 표현 |
| OpenAI DALL-E 3 | 영어 권장, 구조화 | 스타일 키워드, 구도 지정 |
| Midjourney | 파라미터 문법 (`--ar`, `--style`) | 아트 스타일, 비율 |
| Stable Diffusion | 태그 기반, 네거티브 프롬프트 | 품질 태그, 제외 요소 |

#### 영상 생성 AI
| 서비스 | 프롬프트 특징 | 최적화 포인트 |
|--------|-------------|--------------|
| Google Vids | 스토리보드 JSON | 장면 전환, 나레이션 |
| Sora (OpenAI) | 영어, 동작 묘사 중심 | 카메라 움직임, 시간 흐름 |
| Runway Gen-3 | 영어, 짧은 클립 | 단일 동작, 분위기 |
| Pika Labs | 간결한 묘사 | 핵심 동작만 |

### 1.3 구현 계획

#### 파일 구조
```
src/
├── lib/
│   └── prompts/
│       ├── index.ts              # 프롬프트 생성 진입점
│       ├── types.ts              # 프롬프트 관련 타입
│       ├── generators/
│       │   ├── imagePrompt.ts    # 이미지 AI용 프롬프트
│       │   ├── videoPrompt.ts    # 영상 AI용 프롬프트
│       │   └── documentPrompt.ts # 문서 생성용
│       ├── templates/
│       │   ├── gemini.ts         # Gemini 최적화 템플릿
│       │   ├── dalle.ts          # DALL-E 최적화 템플릿
│       │   ├── midjourney.ts     # Midjourney 템플릿
│       │   ├── sora.ts           # Sora 템플릿
│       │   └── vids.ts           # Google Vids 템플릿
│       └── utils/
│           ├── translator.ts     # 한영 변환 (필요시)
│           └── optimizer.ts      # 프롬프트 최적화
├── components/
│   └── export/
│       ├── PromptExporter.tsx    # 프롬프트 내보내기 UI
│       ├── ServiceSelector.tsx   # AI 서비스 선택
│       ├── PromptPreview.tsx     # 프롬프트 미리보기
│       └── BulkCopyModal.tsx     # 일괄 복사 모달
└── hooks/
    └── usePromptGenerator.ts     # 프롬프트 생성 훅
```

#### 핵심 타입 정의
```typescript
// lib/prompts/types.ts

// 지원 AI 서비스
export type ImageAIService = 'gemini' | 'dalle' | 'midjourney' | 'stable-diffusion';
export type VideoAIService = 'google-vids' | 'sora' | 'runway' | 'pika';
export type AIService = ImageAIService | VideoAIService;

// 프롬프트 설정
export interface PromptConfig {
  service: AIService;
  language: 'ko' | 'en' | 'auto';
  includeStyle: boolean;
  includeNegative: boolean;  // 네거티브 프롬프트 포함
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
}

// 생성된 프롬프트
export interface GeneratedPrompt {
  service: AIService;
  sceneId: string;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  sceneIndex: number;
  mainPrompt: string;
  negativePrompt?: string;
  parameters?: Record<string, string>;  // Midjourney 파라미터 등
  usage: string;  // 사용 방법 안내
}

// 일괄 내보내기 결과
export interface PromptExportBundle {
  title: string;
  service: AIService;
  prompts: GeneratedPrompt[];
  metadata: {
    totalScenes: number;
    exportedAt: Date;
    visualDNA: VisualDNA;
  };
}
```

### 1.4 UI 개선

#### 프롬프트 내보내기 화면
```
┌─────────────────────────────────────────────────┐
│  🎨 AI 프롬프트 내보내기                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  사용할 AI 서비스를 선택하세요:                  │
│                                                 │
│  [이미지 생성]                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Gemini  │ │ DALL-E  │ │Midjourney│          │
│  │   🌟    │ │         │ │         │          │
│  │  추천   │ │         │ │         │          │
│  └─────────┘ └─────────┘ └─────────┘          │
│                                                 │
│  [영상 생성]                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Google   │ │  Sora   │ │ Runway  │          │
│  │ Vids    │ │         │ │         │          │
│  └─────────┘ └─────────┘ └─────────┘          │
│                                                 │
│  ☑ 한글 프롬프트  ☐ 영어 번역 포함              │
│  ☑ 스타일 가이드 포함  ☐ 네거티브 프롬프트       │
│                                                 │
│  [전체 프롬프트 미리보기] [일괄 복사] [파일 저장] │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 프롬프트 미리보기 (서비스별)
```
┌─────────────────────────────────────────────────┐
│  장면 1 - 기(시작)                    [복사 📋]  │
├─────────────────────────────────────────────────┤
│  🎯 Gemini / DALL-E용                           │
│  ┌─────────────────────────────────────────┐   │
│  │ 밝은 아침 햇살이 비치는 작은 마을,        │   │
│  │ 빨간 모자를 쓴 7살 소녀가 바구니를 들고   │   │
│  │ 숲으로 향하는 길을 걷고 있다.            │   │
│  │ 동화책 일러스트 스타일, 따뜻한 색감,      │   │
│  │ 부드러운 수채화 느낌                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🎯 Midjourney용                       [복사 📋]  │
│  ┌─────────────────────────────────────────┐   │
│  │ A 7-year-old girl with red hood walking  │   │
│  │ toward forest, carrying basket, morning  │   │
│  │ sunlight, small village background,      │   │
│  │ children's book illustration style,      │   │
│  │ warm colors, soft watercolor --ar 16:9   │   │
│  │ --style raw --v 6                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 1.5 개발 작업 목록

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 1-1 | 프롬프트 타입 정의 (`lib/prompts/types.ts`) | 1h | - |
| 1-2 | Gemini 템플릿 구현 | 2h | 1-1 |
| 1-3 | DALL-E 템플릿 구현 | 2h | 1-1 |
| 1-4 | Midjourney 템플릿 구현 (파라미터 포함) | 3h | 1-1 |
| 1-5 | Stable Diffusion 템플릿 (네거티브 포함) | 2h | 1-1 |
| 1-6 | 영상 AI 템플릿 (Sora, Vids, Runway) | 4h | 1-1 |
| 1-7 | 프롬프트 생성기 통합 | 2h | 1-2~1-6 |
| 1-8 | `usePromptGenerator` 훅 | 2h | 1-7 |
| 1-9 | AI 서비스 선택 UI | 3h | - |
| 1-10 | 프롬프트 미리보기 컴포넌트 | 3h | 1-8, 1-9 |
| 1-11 | 일괄 복사 기능 | 2h | 1-10 |
| 1-12 | 파일 내보내기 (TXT, JSON) | 2h | 1-10 |
| 1-13 | 테스트 & 버그 수정 | 3h | 전체 |

**Phase 1 총 예상 시간: ~31h (약 4일)**

---

## 🎯 Phase 2: 문서 내보내기 강화

### 2.1 목표
다양한 AI 도구와 용도에 맞는 전문 문서 생성

### 2.2 내보내기 형식

#### 📝 텍스트 기반
| 형식 | 용도 | 포함 내용 |
|------|------|----------|
| 나레이션 스크립트 | 영상 나레이션, TTS | 장면별 대사, 타이밍 |
| 시나리오 대본 | 영상 촬영, 연기 | 지문, 대사, 감정 |
| 스토리보드 텍스트 | 기획 문서 | 장면 설명, 카메라 앵글 |

#### 📊 구조화 데이터
| 형식 | 용도 | 포함 내용 |
|------|------|----------|
| Google Vids JSON | Google Vids 임포트 | 장면, 나레이션, 타이밍 |
| 스토리보드 JSON | 개발자용, 연동 | 전체 구조화 데이터 |
| 자막 SRT | 영상 자막 | 타임코드, 텍스트 |
| 자막 VTT | 웹 영상 자막 | 타임코드, 스타일 |

#### 📄 문서
| 형식 | 용도 | 포함 내용 |
|------|------|----------|
| 스토리보드 PDF | 인쇄, 공유 | 장면 구조 (이미지 자리 포함) |
| 프롬프트 가이드 PDF | AI 사용 가이드 | 서비스별 프롬프트 + 사용법 |
| 캐릭터 시트 PDF | 일관성 유지 | 캐릭터 설정, 비주얼 DNA |

### 2.3 구현 계획

#### 파일 구조
```
src/
├── lib/
│   └── export/
│       ├── index.ts              # 내보내기 진입점
│       ├── types.ts              # 내보내기 타입
│       ├── generators/
│       │   ├── textExport.ts     # 텍스트 형식
│       │   ├── jsonExport.ts     # JSON 형식
│       │   ├── subtitleExport.ts # 자막 형식
│       │   └── pdfExport.ts      # PDF 형식
│       └── templates/
│           ├── storyboard.ts     # 스토리보드 템플릿
│           ├── screenplay.ts     # 시나리오 템플릿
│           ├── promptGuide.ts    # 프롬프트 가이드
│           └── characterSheet.ts # 캐릭터 시트
├── components/
│   └── export/
│       ├── ExportHub.tsx         # 내보내기 허브
│       ├── FormatSelector.tsx    # 형식 선택
│       ├── ExportPreview.tsx     # 미리보기
│       └── DownloadButton.tsx    # 다운로드 버튼
```

### 2.4 개발 작업 목록

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 2-1 | 내보내기 타입 정의 | 1h | - |
| 2-2 | 나레이션 스크립트 생성기 | 2h | 2-1 |
| 2-3 | 시나리오 대본 생성기 | 2h | 2-1 |
| 2-4 | Google Vids JSON 개선 | 2h | 2-1 |
| 2-5 | VTT 자막 형식 추가 | 1h | 2-1 |
| 2-6 | jsPDF + 한글 폰트 설정 | 3h | - |
| 2-7 | 스토리보드 PDF 템플릿 | 4h | 2-6 |
| 2-8 | 프롬프트 가이드 PDF | 3h | 2-6, Phase 1 |
| 2-9 | 캐릭터 시트 PDF | 3h | 2-6 |
| 2-10 | 내보내기 허브 UI | 3h | - |
| 2-11 | 미리보기 기능 | 3h | 2-7~2-9 |
| 2-12 | 테스트 & 버그 수정 | 3h | 전체 |

**Phase 2 총 예상 시간: ~30h (약 4일)**

---

## 🎯 Phase 3: 개인 모드 MVP

### 3.1 목표
간소화된 회원가입으로 쉬운 사용자 온보딩

### 3.2 변경 사항

#### 인증 흐름 단순화
```
[기존]
이메일/Google 로그인 → 관리자 승인 대기 → 사용 가능

[개선]
이메일 입력 → Magic Link → 즉시 사용 가능
```

#### Supabase 설정
```sql
-- 이메일 인증 완료 시 자동 승인
CREATE OR REPLACE FUNCTION auto_approve_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.users (id, email, status, role)
    VALUES (NEW.id, NEW.email, 'approved', 'user')
    ON CONFLICT (id) DO UPDATE SET status = 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 개발 작업 목록

| 순서 | 작업 | 예상 시간 | 의존성 |
|------|------|----------|--------|
| 3-1 | Supabase 자동 승인 트리거 | 2h | - |
| 3-2 | AuthContext 로직 수정 | 2h | 3-1 |
| 3-3 | Login 페이지 UI 재설계 | 3h | - |
| 3-4 | PendingApproval 페이지 수정 | 1h | 3-2 |
| 3-5 | 온보딩 튜토리얼 | 4h | 3-3 |
| 3-6 | 에러 메시지 개선 | 2h | 3-2 |
| 3-7 | 테스트 & 버그 수정 | 2h | 전체 |

**Phase 3 총 예상 시간: ~16h (약 2일)**

---

## 📅 전체 일정

```
Week 1-2: Phase 1 (프롬프트 최적화)
├── Day 1: 타입 정의 + Gemini/DALL-E 템플릿
├── Day 2: Midjourney + Stable Diffusion 템플릿
├── Day 3: 영상 AI 템플릿 + 통합
├── Day 4: UI 구현 + 복사/내보내기
└── Day 5: 테스트 & 수정

Week 3-4: Phase 2 (문서 내보내기)
├── Day 1-2: 텍스트/JSON 형식
├── Day 3: PDF 기본 설정 + 한글 폰트
├── Day 4-5: PDF 템플릿들
├── Day 6: UI + 미리보기
└── Day 7: 테스트 & 수정

Week 5: Phase 3 (개인 모드)
├── Day 1: Supabase 설정 + Auth 수정
├── Day 2-3: UI 재설계 + 온보딩
└── Day 4-5: 테스트 & 배포
```

**총 예상 기간: 5주 (77h)**

---

## 🔧 기술 스택

### 추가 의존성 (최소화됨)
```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7"
  }
}
```

### 제거된 의존성 (API 연동 불필요)
```json
{
  "제거": {
    "@google/generative-ai": "불필요",
    "openai": "불필요",
    "@stability-ai/sdk": "불필요",
    "replicate": "불필요"
  }
}
```

---

## ✅ 성공 기준

### Phase 1 (프롬프트 최적화)
- [ ] 4개 이상의 이미지 AI 서비스별 프롬프트 템플릿
- [ ] 3개 이상의 영상 AI 서비스별 프롬프트 템플릿
- [ ] 일괄 복사 및 파일 내보내기 기능
- [ ] 한글/영어 프롬프트 지원

### Phase 2 (문서 내보내기)
- [ ] 나레이션 스크립트, 시나리오 대본 생성
- [ ] Google Vids JSON 내보내기
- [ ] 스토리보드 PDF (한글 정상 출력)
- [ ] 프롬프트 가이드 PDF

### Phase 3 (개인 모드)
- [ ] 이메일만으로 즉시 가입
- [ ] 관리자 승인 없이 사용 가능
- [ ] 기존 사용자 마이그레이션 문제 없음

---

## 📝 핵심 메시지

> **"우리는 AI를 대신하지 않는다. AI가 최고의 결과를 낼 수 있도록 돕는다."**

이 서비스를 통해 학생들은:
1. 스토리 구조화 능력을 기른다 (기-승-전-결)
2. 장면 묘사 능력을 향상시킨다
3. AI 도구 활용 방법을 배운다
4. 자신만의 창작물을 완성한다

---

**문서 버전**: 2.0
**작성자**: Claude (AI Assistant)
**승인**: (검토 필요)
