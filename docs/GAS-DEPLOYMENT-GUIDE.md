# 📚 스토리 크리에이터 v2 - Google Apps Script 배포 가이드

## 🎯 개요

이 가이드는 **교사가 직접** Google Apps Script를 통해 스토리 크리에이터를 배포하고, 학생 데이터를 관리하는 방법을 설명합니다.

### 장점
- ✅ **무료** - Google 계정만 있으면 사용 가능
- ✅ **데이터 소유권** - 학생 데이터가 교사의 구글 드라이브에 저장
- ✅ **쉬운 공유** - URL 하나로 학생들에게 배포
- ✅ **커스터마이징** - 필요에 따라 수정 가능

---

## 🚀 빠른 시작 (5분)

### 1단계: Google Apps Script 프로젝트 생성

1. [Google Apps Script](https://script.google.com) 접속
2. **새 프로젝트** 클릭
3. 프로젝트 이름을 "스토리 크리에이터 v2"로 변경

### 2단계: 파일 추가

#### Code.gs (메인 스크립트)

기존 `Code.gs` 내용을 지우고 아래 코드 붙여넣기:

```javascript
/**
 * 스토리 크리에이터 v2 - Google Apps Script 백엔드
 *
 * 이 파일은 웹앱 서빙과 데이터 저장을 담당합니다.
 */

// 설정
const CONFIG = {
  SPREADSHEET_NAME: '스토리크리에이터_데이터',
  SHEETS: {
    USERS: '사용자',
    STORIES: '스토리',
    CLASSES: '수업'
  }
};

/**
 * 웹앱 진입점 - HTML 페이지 서빙
 */
function doGet(e) {
  const page = e.parameter.page || 'index';

  try {
    const template = HtmlService.createTemplateFromFile(page);
    return template.evaluate()
      .setTitle('스토리 크리에이터 v2')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    // 페이지가 없으면 기본 페이지로
    const template = HtmlService.createTemplateFromFile('index');
    return template.evaluate()
      .setTitle('스토리 크리에이터 v2')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

/**
 * POST 요청 처리 - API 엔드포인트
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;

    switch (action) {
      case 'saveStory':
        result = saveStory(data);
        break;
      case 'loadStory':
        result = loadStory(data);
        break;
      case 'registerUser':
        result = registerUser(data);
        break;
      case 'getStories':
        result = getStoriesByUser(data);
        break;
      default:
        result = { success: false, error: '알 수 없는 액션' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 스프레드시트 가져오기 (없으면 생성)
 */
function getOrCreateSpreadsheet() {
  const files = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);

  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }

  // 새 스프레드시트 생성
  const ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);

  // 시트 초기화
  const userSheet = ss.getSheetByName('시트1');
  userSheet.setName(CONFIG.SHEETS.USERS);
  userSheet.appendRow(['userId', 'name', 'schoolCode', 'pin', 'createdAt']);

  const storySheet = ss.insertSheet(CONFIG.SHEETS.STORIES);
  storySheet.appendRow(['storyId', 'userId', 'title', 'data', 'createdAt', 'updatedAt']);

  const classSheet = ss.insertSheet(CONFIG.SHEETS.CLASSES);
  classSheet.appendRow(['classCode', 'className', 'teacherId', 'createdAt', 'status']);

  return ss;
}

/**
 * 사용자 등록/로그인
 */
function registerUser(data) {
  const ss = getOrCreateSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();

  const schoolCode = data.schoolCode;
  const name = data.name;
  const pin = data.pin;

  // 기존 사용자 확인
  for (let i = 1; i < values.length; i++) {
    if (values[i][2] === schoolCode) {
      // PIN 확인
      if (values[i][3] === pin) {
        return {
          success: true,
          userId: values[i][0],
          name: values[i][1],
          isExisting: true
        };
      } else {
        return { success: false, error: 'PIN이 올바르지 않습니다' };
      }
    }
  }

  // 새 사용자 등록
  const userId = 'U' + Date.now();
  sheet.appendRow([userId, name, schoolCode, pin, new Date().toISOString()]);

  return {
    success: true,
    userId: userId,
    name: name,
    isExisting: false
  };
}

/**
 * 스토리 저장
 */
function saveStory(data) {
  const ss = getOrCreateSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STORIES);
  const values = sheet.getDataRange().getValues();

  const userId = data.userId;
  const storyData = JSON.stringify(data.story);
  const title = data.story.metadata?.title || '제목 없음';
  const now = new Date().toISOString();

  // 기존 스토리 확인 (userId + title로 식별)
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === userId && values[i][2] === title) {
      // 업데이트
      sheet.getRange(i + 1, 4).setValue(storyData);
      sheet.getRange(i + 1, 6).setValue(now);
      return { success: true, storyId: values[i][0], updated: true };
    }
  }

  // 새 스토리 생성
  const storyId = 'S' + Date.now();
  sheet.appendRow([storyId, userId, title, storyData, now, now]);

  return { success: true, storyId: storyId, created: true };
}

/**
 * 스토리 불러오기
 */
function loadStory(data) {
  const ss = getOrCreateSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STORIES);
  const values = sheet.getDataRange().getValues();

  const storyId = data.storyId;
  const userId = data.userId;

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === storyId ||
        (userId && values[i][1] === userId)) {
      return {
        success: true,
        storyId: values[i][0],
        title: values[i][2],
        data: JSON.parse(values[i][3]),
        createdAt: values[i][4],
        updatedAt: values[i][5]
      };
    }
  }

  return { success: false, error: '스토리를 찾을 수 없습니다' };
}

/**
 * 사용자별 스토리 목록
 */
function getStoriesByUser(data) {
  const ss = getOrCreateSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STORIES);
  const values = sheet.getDataRange().getValues();

  const userId = data.userId;
  const stories = [];

  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === userId) {
      stories.push({
        storyId: values[i][0],
        title: values[i][2],
        createdAt: values[i][4],
        updatedAt: values[i][5]
      });
    }
  }

  return { success: true, stories: stories };
}

/**
 * HTML 파일 포함 헬퍼
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

### 3단계: HTML 파일 추가

1. 파일 → 새로 만들기 → HTML 파일 → "index" 입력
2. `story-creator-v2.html` 내용 전체를 붙여넣기

### 4단계: 웹앱 배포

1. **배포** → **새 배포** 클릭
2. 유형 선택: **웹 앱**
3. 설정:
   - 설명: "스토리 크리에이터 v2"
   - 다음 사용자 인증정보로 실행: **나** (교사 계정)
   - 액세스 권한: **모든 사용자**
4. **배포** 클릭
5. 권한 승인 (최초 1회)
6. **URL 복사** → 학생들에게 공유!

---

## 📊 데이터 관리

### 데이터 확인하기

1. Google 드라이브에서 "스토리크리에이터_데이터" 스프레드시트 열기
2. 시트별 데이터:
   - **사용자**: 학생 정보
   - **스토리**: 저장된 스토리 (JSON)
   - **수업**: 수업 정보

### 데이터 내보내기

스프레드시트에서 직접 CSV/Excel로 내보내기 가능

---

## 🔧 커스터마이징

### 테마 색상 변경

`index.html`의 `:root` 섹션에서 색상 수정:

```css
:root {
  --primary: #4A90D9;  /* 메인 색상 */
  --secondary: #00B894;  /* 보조 색상 */
  --accent: #FF6B6B;  /* 강조 색상 */
}
```

### 스토리 구조 추가

`STRUCTURES` 객체에 새 구조 추가:

```javascript
'my-structure': {
  name: '나만의 구조',
  stages: [
    { id: 'stage1', name: '1', title: '첫 번째 단계', desc: '설명', tip: '팁' },
    // ...
  ]
}
```

---

## 🔗 다른 교사에게 공유하기

### 방법 1: 템플릿으로 공유

1. Apps Script 프로젝트에서 **설정**(톱니바퀴) 클릭
2. **사본 만들기 링크 표시** 체크
3. 링크 복사하여 공유

### 방법 2: 스크립트 파일 공유

1. 이 저장소의 파일들을 공유
2. 위 가이드대로 직접 설정하도록 안내

---

## ❓ 자주 묻는 질문

### Q: 학생 데이터는 어디에 저장되나요?
A: 교사의 Google 드라이브에 스프레드시트 형태로 저장됩니다. 외부 서버를 사용하지 않아 안전합니다.

### Q: 비용이 드나요?
A: 아니요! Google Apps Script는 무료입니다. 일일 할당량이 있지만 일반적인 학급 규모에서는 충분합니다.

### Q: 학생들이 로그인 없이 사용할 수 있나요?
A: 네, 로컬 저장 모드로 사용 가능합니다. 다만 기기를 바꾸면 데이터가 유지되지 않습니다.

### Q: 모바일에서도 되나요?
A: 네, 반응형으로 제작되어 모바일에서도 사용 가능합니다.

---

## 📞 지원

문제가 있으시면:
1. GitHub Issues에 문의
2. 코드 수정 필요시 PR 환영

---

**만든이**: 스토리 크리에이터 팀
**버전**: 2.0
**최종 업데이트**: 2025년 1월
