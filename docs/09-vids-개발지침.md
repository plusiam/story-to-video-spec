# Google Vids 기반 개발 지침

개인 앱을 Google Vids 제작 플로우에 맞게 확장하기 위한 설계 가이드입니다.  
목표는 “씬 카드/스크립트/자막”을 Vids에 바로 옮길 수 있는 데이터와 내보내기를 제공하는 것입니다.

## 1) 목표와 범위

- **핵심 목표**: 씬 단위 스토리 데이터를 Vids 제작 입력물로 변환
- **범위**: 스토리 구조, 씬 데이터 모델, 내보내기 포맷, 나레이션 톤
- **제약**: Vids 공개 API가 제한적이므로 1차는 “복사/붙여넣기” 중심

## 2) Vids 필수 산출물

아래 4종이 최소 구성입니다.

1. **Storyboard(씬 카드)**: 장면 번호, 나레이션, 화면 텍스트, 비주얼 지시, 길이, 오디오
2. **스크립트**: 전체 나레이션(문장 단위), 대사 포함 여부 선택
3. **자막**: SRT/VTT 형식 또는 문장 단위 타이밍 리스트
4. **자산 목록**: 이미지/캐릭터/배경 참조, Visual DNA 요약

## 3) 씬 데이터 모델(확장 가이드)

현재 `Scene`에 아래 필드를 추가하는 것을 표준으로 합니다.

- `narration`: 나레이션 텍스트 (Vids 내레이터 톤 기준)
- `subtitle`: 자막 텍스트 (기본은 narration과 동일)
- `onScreenText`: 화면 표시 텍스트(타이틀/키워드)
- `durationSec`: 씬 길이(초)
- `cameraAngle`: wide/medium/close-up/low-angle 등
- `shotType`: establish/insert/action/reaction 등(선택)
- `sfx`: 효과음
- `music`: 배경음 분위기

기존 필드(배경/인물/행동/대사/분위기/이미지 프롬프트)는 유지합니다.

## 4) 나레이션 톤(기본 내레이터 기준)

Vids 기본 내레이터 톤을 기준으로 다음 원칙을 권장합니다.

- **문장 길이**: 1문장 15~25자 내외(짧고 명확하게)
- **말투**: 정보 전달형, 과장/슬랭 최소화
- **호흡**: 문장 사이 0.3~0.6초 간격 전제
- **시점**: 3인칭 설명형 기본(필요 시 대화형 선택)

## 5) 자동 길이 산정(가이드)

`durationSec`가 비어있으면 다음 규칙으로 추정합니다.

- **기본 추정**: `ceil(문자수 / 12)` 초
- **최소 길이**: 4초
- **문장 간 여유**: 문장 수 × 0.5초 추가

전체 길이를 지정한 경우에는 씬 비율에 맞춰 스케일링할 수 있습니다.

## 6) 내보내기 포맷(권장)

### 6.1 VidsStoryboard.json
- 씬 카드 1건당 1 오브젝트
- 포함: `sceneNumber`, `narration`, `subtitle`, `onScreenText`, `durationSec`, `cameraAngle`, `shotType`, `sfx`, `music`, `imagePrompt`

### 6.2 VidsScript.txt
- 전체 나레이션을 문장 단위로 출력
- 장면 번호를 헤더로 표기

### 6.3 captions.srt
- `durationSec`와 `narration` 기반으로 타임라인 생성
- 자막 텍스트는 `subtitle` 우선, 없으면 `narration`

## 7) Visual DNA(캐릭터 바이블)

Visual DNA는 다음 원칙을 따릅니다.

- 캐릭터는 **ID 기반**으로 씬에서 참조
- 씬마다 캐릭터/배경 묘사가 과도하게 달라지지 않도록 통제
- 이미지 프롬프트는 “씬 정보 + Visual DNA” 조합으로 생성

## 8) 우선순위 로드맵

1. **씬 모델 확장** 및 입력 UI 추가
2. **Vids 내보내기 3종**(Storyboard/Script/SRT) 구현
3. **자동 길이 산정** 및 씬 비율 스케일링 옵션
4. **Visual DNA ↔ 씬 캐릭터 연결** 강화
5. **자산 관리**(이미지/참조) 고도화

## 9) 확장 고려(워크북/퀴즈/챗봇)

Vids 외 확장을 위해 아래 필드를 추가 고려합니다.

- 워크북: `learningObjectives`, `vocab`, `discussionQuestions`
- 퀴즈: `quizItems`(객관식/단답형/선택지/정답/해설)
- 챗봇: `storySummary`, `characterBible`, `styleGuide`

---

이 문서는 `docs/story-schema.json`을 기준으로 확장되며,  
앱 구현 시에는 `Scene` 모델과 내보내기 로직이 핵심 변경점입니다.
