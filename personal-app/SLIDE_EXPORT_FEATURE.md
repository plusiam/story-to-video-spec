# 슬라이드 내보내기 기능

4컷 스토리를 16:9 슬라이드 이미지로 변환하여 PNG/ZIP으로 저장하는 기능입니다.

## 📋 기능 개요

### ✨ 주요 기능

- **자동 슬라이드 생성**: 4컷 스토리(기승전결) → 16:9 슬라이드로 자동 변환
- **미리보기 모달**: 모든 슬라이드를 스크롤하며 확인
- **개별 다운로드**: 각 슬라이드를 개별 PNG 파일로 저장
- **일괄 다운로드**: 모든 슬라이드를 ZIP 파일로 저장
- **고해상도 출력**: 1280×720 픽셀 (pixelRatio: 2)

### 🎨 디자인 특징

| 요소 | 설명 |
|------|------|
| **패널 색상** | 기(파랑), 승(초록), 전(주황), 결(보라) |
| **제목 슬라이드** | 중앙 정렬 + 컬러 구분선 |
| **장면 슬라이드** | 스테이지 뱃지 + 본문 + 자막 + 슬라이드 번호 |
| **타이포그래피** | -apple-system 시스템 폰트, 최적화된 행간 |

## 🚀 사용 방법

### 1. 슬라이드 미리보기 열기

1. 작품 편집 페이지에서 스토리 작성
2. 하단 "내보내기" 섹션으로 스크롤
3. **"슬라이드 미리보기 / PNG 저장"** 버튼 클릭

### 2. 슬라이드 다운로드

#### 개별 슬라이드 저장
- 각 슬라이드 우측의 **"PNG 저장"** 버튼 클릭
- 파일명: `slide_01.png`, `slide_02.png`, ...

#### 전체 ZIP 저장
- 모달 상단의 **"전체 ZIP 저장"** 버튼 클릭
- 진행률 표시와 함께 모든 슬라이드 처리
- 파일명: `{작품제목}_슬라이드.zip`

### 3. 모달 닫기
- 우측 상단 X 버튼 클릭
- 또는 **ESC 키** 누르기

## 📂 파일 구조

```
personal-app/src/
├── lib/
│   └── slideExport.ts               # 변환 + 다운로드 로직
└── components/
    └── slide/
        ├── SlideCard.tsx             # 슬라이드 렌더링 컴포넌트
        ├── SlidePreviewModal.tsx     # 미리보기 모달
        └── index.ts                  # 내보내기
```

## 🔧 기술 스택

| 패키지 | 용도 |
|--------|------|
| `html-to-image` | DOM 요소를 PNG로 변환 |
| `jszip` | ZIP 파일 생성 |
| `file-saver` | 파일 다운로드 |

## 🎯 슬라이드 변환 로직

### 데이터 우선순위

**Scene 데이터가 있을 때** (Step 2 장면 확장 완료):
- 각 Scene → 개별 슬라이드 생성
- 본문 우선순위: `narration` > `dialogue` > `action` > `setting`
- 자막: `subtitle` 필드 사용

**Scene 데이터가 없을 때** (Step 1 4컷만 작성):
- 각 패널 → 슬라이드 1개 생성
- 본문: 패널 텍스트 그대로 사용

### 슬라이드 구성

1. **슬라이드 1번**: 제목 슬라이드 (작품 제목)
2. **슬라이드 2~N**: 각 패널/장면별 슬라이드 (기승전결 순서)

## 📱 모바일 최적화

- 반응형 레이아웃 (화면 크기에 따라 조정)
- 터치 스크롤 지원
- 작은 화면에서 버튼 텍스트 축약

## ⚙️ 개발자 가이드

### SlideData 타입

```typescript
interface SlideData {
  id: string;
  index: number;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol' | 'title';
  type: 'title' | 'panel' | 'scene';
  stageLabel: string;       // '기', '승', '전', '결'
  stageSubtitle: string;    // '시작', '전개', '위기', '결말'
  title: string;            // 슬라이드 소제목
  content: string;          // 본문
  subtitle?: string;        // 하단 자막 (선택)
  bgColor: string;          // 배경색 hex
  accentColor: string;      // 강조색 hex
}
```

### 주요 함수

```typescript
// 스토리 → 슬라이드 데이터 변환
storyToSlides(workTitle: string, panels: PanelContent, scenes: PanelScenes): SlideData[]

// 단건 PNG 다운로드
downloadSingleSlide(element: HTMLElement, filename: string): Promise<void>

// 전체 ZIP 다운로드
downloadAllSlidesAsZip(elements: HTMLElement[], workTitle: string): Promise<void>
```

### 커스터마이징

#### 색상 변경
`src/lib/slideExport.ts`의 `PANEL_COLOR_MAP` 수정:

```typescript
const PANEL_COLOR_MAP = {
  ki: { bg: '#EFF6FF', accent: '#3B82F6' },    // 파랑
  seung: { bg: '#F0FDF4', accent: '#22C55E' }, // 초록
  jeon: { bg: '#FFF7ED', accent: '#F97316' },  // 주황
  gyeol: { bg: '#FAF5FF', accent: '#A855F7' }  // 보라
};
```

#### 레이아웃 변경
`src/components/slide/SlideCard.tsx`의 인라인 스타일 수정:

```typescript
// 제목 폰트 크기
fontSize: '52px'

// 본문 폰트 크기
fontSize: '24px'

// 패딩
padding: '48px'
```

## 🐛 문제 해결

### 슬라이드가 비어있음
- Step 1에서 4컷 스토리를 작성했는지 확인
- 각 패널에 텍스트가 입력되어 있는지 확인

### ZIP 다운로드가 느림
- 슬라이드 개수에 비례하여 시간 소요
- 진행률 표시 확인 (예: 생성 중 50%)

### 모바일에서 레이아웃 깨짐
- 브라우저 호환성 확인 (Chrome, Safari 권장)
- 화면 회전 시 새로고침

## 📊 성능 최적화

- **메모이제이션**: `useMemo`로 슬라이드 데이터 캐싱
- **Lazy Import**: 큰 라이브러리는 필요 시 동적 로드
- **진행률 표시**: 긴 작업 중 사용자 피드백 제공

## 🎬 프레젠테이션 모드 (Phase 3)

### 기능 개요

전체화면으로 슬라이드를 발표할 수 있는 프레젠테이션 모드가 추가되었습니다!

### 주요 기능

| 기능 | 설명 |
|------|------|
| **전체화면 발표** | 슬라이드를 전체화면으로 표시 |
| **키보드 제어** | 방향키, 스페이스바로 슬라이드 이동 |
| **진행률 표시** | 하단에 진행률 바 표시 |
| **자동 컨트롤 숨김** | 마우스 움직임 없으면 3초 후 컨트롤 숨김 |
| **시작 지점 선택** | 특정 슬라이드부터 발표 시작 가능 |

### 사용 방법

#### 발표 모드 시작

1. **처음부터 시작**: 상단 "발표 모드" 버튼 클릭
2. **중간부터 시작**: 각 슬라이드의 "발표" 버튼 클릭

#### 키보드 단축키

| 키 | 동작 |
|-----|------|
| `→` 또는 `Space` | 다음 슬라이드 |
| `←` | 이전 슬라이드 |
| `Home` | 첫 슬라이드로 |
| `End` | 마지막 슬라이드로 |
| `F` | 전체화면 토글 |
| `ESC` | 전체화면 해제 또는 발표 종료 |

#### 마우스 제어

- **좌우 클릭 영역**: 화면 좌우 가장자리 클릭으로 이동 (데스크톱)
- **하단 컨트롤**: 이전/다음 버튼, 진행률, 전체화면, 닫기

### 프레젠테이션 모드 컴포넌트

```typescript
// src/components/slide/SlidePresentationMode.tsx
interface SlidePresentationModeProps {
  slides: SlideData[];
  onClose: () => void;
  initialSlideIndex?: number;
}
```

## 🎓 향후 개선 가능 사항

- [ ] 슬라이드 텍스트 인라인 편집
- [ ] 슬라이드 배경색 커스터마이징 고급 UI
- [ ] 슬라이드 순서 변경 (드래그 앤 드롭)
- [ ] 슬라이드 노트 기능
- [ ] 타이머 및 발표 시간 측정
- [ ] MP4 영상 내보내기 (Remotion 연동)
- [ ] 레이저 포인터 효과
- [ ] 슬라이드 전환 애니메이션

---

**개발 완료일**: 2026-03-13
**Phase**: MVP (Phase 1) ✅ + 완성도 향상 (Phase 2) ✅ + 프레젠테이션 모드 (Phase 3) ✅
