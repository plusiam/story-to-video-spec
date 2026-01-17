# 스토리 구성 웹학습지

초등학생을 위한 4컷 스토리 구성 웹학습지

---

## 서비스 소개

**하나의 서비스, 두 가지 모드**

| 모드 | 대상 | 특징 |
|------|------|------|
| 🏫 **학급 모드** | 교사 + 학급 학생 | 교사별 독립 운영, AI 지원 배포 |
| 🎨 **개인 모드** | 개인 사용자 | 계정 기반, AI 기능 예정 |

```
          ┌─────────────────────────────────┐
          │      📱 통합 랜딩 페이지        │
          │     story-worksheet.github.io   │
          └───────────────┬─────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
    ┌───────────┐                  ┌───────────┐
    │ 🏫 학급   │                  │ 🎨 개인   │
    │  모드     │                  │  모드     │
    └───────────┘                  └───────────┘
    별도 저장소                    이 저장소
```

---

## 저장소 구조

이 프로젝트는 **두 개의 GitHub 저장소**로 운영됩니다:

### 📦 story-worksheet (이 저장소)

```
story-worksheet/
├── landing/              # 통합 랜딩 페이지 (GitHub Pages)
├── personal-app/         # 개인 모드 (React + Supabase)
├── docs/                 # 기획 문서 아카이브
├── README.md             # 이 파일
├── HISTORY.md            # 개발 히스토리
└── DEVELOPMENT_STRATEGY.md  # 개발 전략
```

### 📦 [story-worksheet-classroom](https://github.com/plusiam/story-worksheet-classroom)

학급 모드 전용 저장소 (GAS 코드)

- 교사가 AI에게 저장소 보여주고 설치 요청 가능
- 자세한 내용은 해당 저장소 참조

---

## 빠른 시작

### 학급 모드

**[story-worksheet-classroom 저장소](https://github.com/plusiam/story-worksheet-classroom)** 참조

```
1. 템플릿 스프레드시트 접속
2. 파일 > 사본 만들기
3. 확장 프로그램 > Apps Script > 배포 > 새 배포
4. 웹앱 URL 접속 → 초기 설정 마법사 완료
```

💡 **AI 도움받기**: 저장소의 `SETUP-WITH-AI.md` 가이드 참조

### 개인 모드

```bash
cd personal-app
npm install
cp .env.example .env.local   # Supabase 정보 입력
npm run dev
```

---

## 기술 스택

| 모드 | 기술 |
|------|------|
| 학급 모드 | Google Apps Script + Spreadsheet |
| 개인 모드 | React + TypeScript + Supabase + Vercel |
| 랜딩 페이지 | HTML + CSS (GitHub Pages) |

---

## 개발 현황

| 상태 | 항목 |
|:----:|------|
| ✅ | 학급 모드 MVP |
| ✅ | 개인 모드 프로젝트 구조 |
| ✅ | 개인 모드 Supabase 스키마 |
| ✅ | 통합 랜딩 페이지 |
| ✅ | 저장소 분리 |
| ⬜ | 개인 모드 MVP 구현 |
| ⬜ | AI 이미지 생성 (개인 모드) |
| ⬜ | 그림책 내보내기 |

---

## 문서

| 문서 | 내용 |
|------|------|
| [HISTORY.md](./HISTORY.md) | 개발 히스토리 (과거 논의) |
| [DEVELOPMENT_STRATEGY.md](./DEVELOPMENT_STRATEGY.md) | 저장소 분리 전략 |
| [personal-app/README.md](./personal-app/README.md) | 개인 모드 상세 |
| [docs/](./docs/) | 기획 문서 아카이브 |

---

## 기여하기

### 개인 모드 관련
이 저장소에 이슈/PR 등록

### 학급 모드 관련
[story-worksheet-classroom](https://github.com/plusiam/story-worksheet-classroom) 저장소에 이슈/PR 등록

---

**버전**: 3.0.0
**최종 수정**: 2026-01-17
