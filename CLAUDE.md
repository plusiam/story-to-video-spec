# 옛이야기 영상 공방 — 개발 지침

옛이야기 한 편을 시니어용 유튜브 영상 재료로 만드는 1인 제작 웹도구. 운영자(채널 작가)와 AI 브라우저 도구가 같은 화면을 쓴다. 전체 소개와 단계·주소·이름표 규칙은 README.md에 있다.

## 기술 스택

React 18 + TypeScript + Vite + Tailwind CSS 3 + React Router 6. 서버 없이 동작한다: 프로젝트 JSON은 localStorage(`src/lib/storage.ts`), 파일은 운영자가 연결한 작업 폴더(`src/lib/folder.ts`, File System Access API). 배포는 Vercel(정적). `api/gemini.ts`는 2차 API 연동 때 쓸 서버 함수로 남겨 둔다.

## 에이전트 친화 설계 원칙 (모든 화면의 완료 기준)

1. 조작 가능한 모든 요소(button, input, textarea, select, a[href])에 `data-testid`를 붙인다. 규칙은 `src/lib/testid.ts`.
2. 모든 입력칸은 보이는 한글 라벨과 `<label>`로 연결한다.
3. 단계와 장면마다 고유 주소를 준다.
4. 「다음 할 일」 문장은 `src/lib/steps.ts`의 `nextAction()` 하나에서만 만든다. 띠·브리핑이 같은 문장을 쓴다.
5. 알림(토스트)을 쓰지 않는다. 결과는 작업 기록(`project.log`)에 남긴다.
6. `/p/:id/brief` 하나로 전체 지침과 상태를 읽을 수 있어야 한다.
7. 드래그만으로 되는 조작을 만들지 않는다(위·아래 버튼 함께).
8. 프롬프트 옆에는 `CopyButton`을 둔다(3초간 "복사됨").
9. 외부 AI 결과는 붙여넣기 칸 하나로 받고, 형식 오류를 글로 알려 준다.
10. 호버 전용 메뉴, 시간 제한 팝업, 무한 스크롤, `window.confirm`/`alert`를 쓰지 않는다.
11. 단계 완료 버튼은 품질 점검을 통과해야 열리고, 잠긴 이유를 글로 보여 준다.
12. 비밀번호·결제·API 키를 화면에서 다루지 않는다.

`tests/e2e/`가 1·2·11번을 자동 검사한다(`helpers.ts`의 `missingTestIds`, `unlabeledInputs`). 새 화면을 만들면 같은 검사를 그 화면에도 돌린다. 테스트에서 폴더 선택 창은 OPFS로 바꿔 끼운다.

외부 AI 결과는 `src/components/AiAssist.tsx`(요청문 복사 + 붙여넣기 + 검사)로 받는다. 검사 함수는 `src/lib/aiRequests.ts`에 둔다.

## 지침 수정 규칙

- 단계 지침 문구는 `src/guides/index.ts`에만 있다. 고치면 그 지침의 `version`을 올린다.
- 단계 화면을 구현하면 그 지침의 `implemented`를 `true`로 바꾸고, `src/lib/steps.ts`의 `checksFor()`에 점검을 추가한다.
- 프로젝트 JSON 구조를 바꾸면 `src/types/project.ts`의 `SCHEMA_VERSION`을 올리고 불러오기 변환을 추가한다.

## 하지 말 것

- 학생용 기능(승인, 심사위원, 게스트, 학급 모드) 되살리기
- 특정 스튜디오·작가 이름을 화풍 프리셋으로 쓰기
- 시판 그림책 문장·그림을 쓰는 흐름 만들기

## 확인 명령

```bash
npm run build && npm run lint && npm run test:e2e
```


## M2 대화형 일괄 입력·인계 (2026-10-19)

- 0~3단계에는 폴더 연결이 필수가 아니다. 미연결이면 브라우저 저장 + JSON 백업을 안내한다.
- 단계별 JSON 입력은 batchInput.ts와 aiRequests.ts에서 검증한다. 승인·확인·완료 값은 넣지 않는다.
- project JSON은 앱 복원용, handoff.json은 콘텐츠 인계용이다. 둘을 혼동하지 않는다. 형식은 docs/aside-handoff.md 참고.
- 내용 변경 시 invalidateEditedSteps를 통해 관련 확인과 후속 완료를 해제한다. nextAction과 handoff의 판정이 서로 모순되면 안 된다.
- 앱이 실제 생성·비용 지출·게시를 자동 실행하지 않는다. handoff의 ready도 비용 지출 허가가 아니다.
- 운영 브랜치는 feat/m2-text-steps. main을 변경하지 않는다. 공개 반영은 운영자 확인 후 수행한다.


## 원문·회차 작업 확장

- authoring(version 1.0)은 Project 1.1의 선택 확장이다. 이전 백업을 임의로 재작성하지 않는다.
- PDF 바이트는 IndexedDB, 페이지/검토문/분석은 authoring에 둔다. 원문과 분석을 제작 원고에 자동 반영하지 않는다.
- 원문 낭독의 새 권리 기록은 기존 handoff 1.0에 표현되지 않아 인계 상태를 draft로 유지한다. producer 소비자 계약은 미검증이다.
- 시리즈 기록은 serial.ts/serialFolder.ts, 다음 회 생성은 nextEpisode.ts. 원고·기록 불변 판본과 상태 포인터 마지막 갱신, 취소/복구/전체 ZIP 경계를 유지한다.
- 스냅샷은 확정 당시 말투·화풍·음성을 포함한다. 다른 프로젝트 설정을 다음 회에 섞지 않으며 권리·완료·이미지 승인을 이어받지 않는다.
- 사용 절차/검사: docs/authoring-records.md, npm run test:unit. 원문 소설·개인자료를 Git에 넣지 않는다.
- 그림 꾸러미: gensparkCard.ts(카드 생성), mediaRules.ts(형식 검사·승인 해제, 순환 방지를 위해 다른 lib을 가져오지 않음), pages/ImagesPage.tsx. 생성·결제·자동 조작 금지. 기준 이미지가 있는 인물은 외모를 글로 다시 쓰지 않는다. handoff 1.0 불변.


## 오디오 우선 제작 순서 (2026-10-20)

- 제작 순서: 원고 → 성우·내레이션(4) → 기준 이미지(5) → 필요한 구간의 장면 이미지(6) → 점검·내보내기(7). 4~7단계 완료 화면은 아직 구현되지 않았고 오디오 화면(/p/:id/audio)과 그림 꾸러미가 기록용으로 먼저 있다.
- 오디오·그림 기록은 authoring.audio·authoring.media에만 둔다. scenes·target·progress를 고치면 2·3단계 완료가 풀리므로 측정 길이를 거기에 쓰지 않는다. 낭독 블록은 장면 범위와 낭독문 해시로 연결한다.
- 장면 수는 그림 수가 아니다. 새 그림이 필요한 장면만 컷 카드를 만든다.
- 사람 청취·잠금·기준 이미지 확인은 사람 전용이다. AI나 앱이 자동으로 채우지 않는다.
