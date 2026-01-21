# Story Creator - Claude 컨텍스트

> **⚠️ 중요**: 이 프로젝트 작업 시 반드시 `MASTER_PLAN.md`를 먼저 읽으세요!

---

## 📖 문서 우선순위

```
1️⃣ MASTER_PLAN.md     ← 최우선! 전체 전략 및 로드맵
2️⃣ CLAUDE.md          ← 이 파일 (프로젝트 컨텍스트)
3️⃣ docs/              ← 상세 기획 문서
4️⃣ docs/history/      ← 과거 문서 (참고용, 폐기된 계획 포함)
```

---

## 🎯 프로젝트 한 줄 요약

**Ttori Storyteller(AI 아이디어) + Story Worksheet(제작 도구) 통합 플랫폼**

---

## 📁 프로젝트 구조

```
story-creator/
├── MASTER_PLAN.md        # ⭐ 최우선 참조 - 전체 전략
├── CLAUDE.md             # 이 파일
├── README.md             # 프로젝트 개요
│
├── personal-app/         # 개인 모드 (React + Supabase)
│   ├── src/
│   │   ├── components/   # UI 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── hooks/        # 커스텀 훅
│   │   ├── lib/          # 유틸리티
│   │   └── types/        # TypeScript 타입
│   └── supabase/         # DB 마이그레이션
│
├── landing/              # 통합 랜딩 페이지
│
├── classroom-gas/        # 학급 모드 참조 (별도 저장소로 분리됨)
│
└── docs/
    ├── (기획 문서들)
    └── history/          # ❌ 폐기된 문서 (참조 금지)
```

---

## 🔗 연관 시스템

| 시스템 | 역할 | 위치 |
|--------|------|------|
| **Ttori Storyteller** | AI 대화로 스토리 아이디어 생성 | Google Opal |
| **Story Worksheet Personal** | 개인용 제작 도구 | 이 저장소 |
| **Story Worksheet Classroom** | 학급용 제작 도구 | 별도 저장소 (GAS) |

---

## 🔧 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 18 + TypeScript + Vite |
| 스타일링 | Tailwind CSS |
| 상태관리 | Zustand |
| 백엔드 | Supabase (Auth + DB + Storage) |
| 배포 | Vercel (story-worksheet.vercel.app) |

---

## ✅ 해야 할 것

- `MASTER_PLAN.md`의 로드맵 따르기
- Ttori ↔ Worksheet 연동 개발
- 한글 UI/프롬프트 우선
- JSON 데이터 표준 형식 준수

## ❌ 하지 말아야 할 것

- `docs/history/` 문서 참조 (폐기된 계획)
- 레거시 story-maker 저장소 코드 사용
- API 키 입력/관리 기능 (보안 이슈)

---

## 💡 핵심 원칙

1. **Ttori = 아이디어 씨앗** (저장 없음, 빠른 생성)
2. **Worksheet = 완성 도구** (DB 저장, 편집, 공유)
3. **JSON = 연결 고리** (두 시스템 간 데이터 표준)
4. **한글 우선** (초등학생 대상)
5. **무료 우선** (교육 접근성)

---

**문서 버전**: 3.0
**최종 수정**: 2026-01-21
