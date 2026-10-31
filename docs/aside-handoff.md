# M2: Aside 대화 → 단계별 일괄 입력 → 제작 인계

## 역할과 범위

- Aside와 사람은 원고·장면·캐릭터를 대화로 정리한다.
- 앱은 입력 형식, 분량, 장면 일치, 카드 누락을 검사하고 저장한다.
- 출처·원고 확인과 단계 완료는 사람이 판단한다. 입력 JSON에 승인·완료 기록을 넣지 않는다.
- 작업 폴더는 선택 사항이다. 미연결이면 브라우저 자동 저장과 JSON 백업으로 쓴다.
- 이 변경은 M2(0~3단계)이다. 이미지·영상·음성 생성, 결제, 렌더링, 게시 자동화는 포함하지 않는다.

## 입력 형식

0단계 설정:

```json
{"title":"은혜 갚은 까치","sourceType":"folktale","sourceNote":"실제 줄거리 출처를 본인의 문장으로 적습니다","durationMin":6,"series":"시리즈 이름"}
```

`sourceType`은 `folktale` 또는 `original`, `durationMin`은 숫자 3~15이다. `sourceNote`는 10자 이상이다.

1단계 스토리:

```json
{"outline":["시작","전개","위기","맺음"],"tone":"다정하고 차분한 말투","fullText":"대화에서 완성한 원고 전문. 실제 원고는 공백 제외 100자 이상이어야 합니다."}
```

원고 본문만 붙여 넣는 기존 방식도 유지한다. JSON의 `outline`과 `tone`은 선택 항목이다. `outline`을 넣으면 비어 있지 않은 문자열 4개가 필요하다.

2단계 장면표: 기존 배열 형식을 유지한다.

```json
[{"panel":"ki","narration":"최신 원고에서 그대로 나눈 문장","visual":"누가 어디서 어떤 동작과 표정인지","location":"산길","characters":"돌쇠","emotion":"평온"}]
```

실제 장면 수는 목표 분량에 맞춘다. 장면 내레이션을 순서대로 이은 문장이 원고와 일치해야 한다(공백 차이는 무시).

3단계 화풍·카드:

```json
{"stylePreset":"minhwa","characters":[{"name":"돌쇠","age":"서른 살","face":"둥근 얼굴","hair":"상투","outfit":"갈색 바지","props":"지게","colors":["#7A4B2A","#E9DCC4","#3F5E4A"],"elementName":"dolsoe_A"}],"locations":[{"name":"산길","desc":"가을 숲길, 소나무와 아침 햇살","elementName":"mountain_A"}]}
```

- 캐릭터·장소 이름은 현재 장면표와 맞아야 한다. 알 수 없는 이름은 거부한다.
- `elementName`은 외부 제작 도구에 등록한 참조 이름이며 선택 항목이다. 없어도 진행한다. 빈 AI 값은 기존 이름을 지우지 않는다. 지우려면 카드 입력칸에서 직접 지운다.
- `stylePreset`은 `minhwa`, `sumuk`, `picturebook-watercolor`, `custom`이다. `custom`이면 `customStyle`을 넣는다.
- 설정·화풍 JSON은 전문 또는 `json` 코드 블록 하나를 받는다. 형식이 잘못되면 기존 데이터는 보존한다.
- 승인·확인·완료 키는 받을 수 없다. 카드에 중첩한 승인 키도 거부한다.

## 두 가지 출력

### 프로젝트 백업 JSON

앱 복원용이다. 내보내기에서 전문 읽기·복사·내려받기가 가능하다. 프로젝트 목록의 백업 불러오기로 복원한다. 기존 schemaVersion 1.0/1.1 불러오기 경로는 유지한다.

### 제작 인계 handoff.json

`kind: story-to-video-handoff`, `handoffVersion: 1.0`.

주요 항목: `project`, `source`, `target`, `script`, `visualDNA`, `scenes`, `timing`, `humanConfirmations`, `readiness`, `prompts`, `productionInstructions`.

- 원고, 장면, 인물·장소 카드, 화풍, 선택 참조 이름, 인물 기준 시트 및 장면 그림 프롬프트를 담는다.
- 0~3단계의 완료 기록, 완료 순서, 현재 품질 점검이 모두 맞으면 `readiness.status=ready`이다.
- 미완료 파일도 보관할 수 있다. 이 경우 `draft`와 `pendingSteps`, `issues`가 붙는다.
- 내용 수정 시 관련 확인과 이후 완료 기록을 해제한다. 원고·장면 내용이나 완료 순서가 다른 구버전 백업도 자동으로 준비 완료로 보지 않는다.
- `estimatedDurationSec`은 원고 길이에서 계산한 추정치다. 음성 측정값이나 최종 자막 타이밍이 아니다.
- 하류 Claude Code가 실제 제작 시간표 `spec.json`을 맡는다. 앱은 이를 생성·실행하지 않는다.
- `ready`는 내용 인계 준비 상태이지 유료 생성·게시 허가가 아니다.

## 이름표

기존 이름표는 유지한다. 추가된 주요 이름표:

- `s0-paste`, `s0-paste-apply`, `s0-copy-request`
- `s3-character-01-elementName`, `s3-location-01-elementName`
- `app-handoff-status`, `app-handoff-issues`, `app-handoff-text`, `app-handoff-copy`, `app-handoff-download`
- `app-export-json-text`, `app-export-copy-json` (백업 내려받기 `app-export-json` 유지)
- `app-brief-batch-examples`, `app-brief-copy-batch`

## 시험

```sh
npm run lint
npm run build
npx playwright test tests/e2e/batch-handoff.spec.ts
npm run test:e2e
```

`batch-handoff.spec.ts`는 브라우저 실행 없는 파서·판정 회귀 시험이다. 기존 M1·M2 UI 시험은 실제 Chromium이 필요하다. 설치된 Chrome은 `CHROMIUM_PATH`로 지정할 수 있다.
