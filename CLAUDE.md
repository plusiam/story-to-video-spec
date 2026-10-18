# 옛이야기 영상 공방 — 개발 지침

옛이야기 한 편을 시니어용 유튜브 영상 재료로 만드는 1인 제작 웹도구. 운영자(한기쌤)와 AI 브라우저 도구가 같은 화면을 쓴다. 전체 소개와 단계·주소·이름표 규칙은 README.md에 있다.

## 기술 스택

React 18 + TypeScript + Vite + Tailwind CSS 3 + React Router 6. 저장은 지금 localStorage(`src/lib/storage.ts`), 다음에 Supabase. 배포는 Vercel. `api/gemini.ts`는 Vercel 서버 함수(M2에서 원고 다듬기에 사용).

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

`tests/e2e/m1.spec.ts`가 1·2·11번을 자동 검사한다. 새 화면을 만들면 같은 검사를 그 화면에도 돌린다.

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
