/**
 * 단계별 AI 작업지침 (v1.0)
 *
 * 개발 방향서의 「단계별 AI 작업지침」을 옮긴 것이다.
 * 문구를 고치면 해당 지침의 version을 올린다. 작업 기록에 지침 번호와 버전이 남는다.
 */
import type { StepNo } from '@/types/project';
import type { Guide } from './types';

export const GUIDES: Record<StepNo, Guide> = {
  0: {
    id: 'GUIDE-S0',
    version: '1.0',
    step: 0,
    title: '프로젝트 설정',
    purpose: '이야기의 출처와 영상 길이를 정해, 저작권과 분량 기준을 먼저 세운다.',
    inputs: ['운영자가 고른 옛이야기 또는 창작 아이디어'],
    actions: [
      { text: '영상 제목을 입력한다', testid: 's0-title' },
      { text: '원작 유형을 고른다: 전래 민담(줄거리만 사용) 또는 순수 창작', testid: 's0-source-type' },
      { text: '줄거리를 어디서 알게 되었는지 출처 메모를 적는다', testid: 's0-source-note' },
      { text: '시판 그림책의 문장과 그림을 쓰지 않는다는 확인란에 체크한다', testid: 's0-no-commercial-book' },
      { text: '목표 길이(분)를 확인한다. 기본 6분', testid: 's0-duration-min' },
      { text: '시리즈 이름이 있으면 적는다', testid: 's0-series' },
      { text: '점검표가 모두 통과하면 완료 버튼을 누른다', testid: 's0-complete' },
    ],
    quality: {
      auto: ['제목 있음', '원작 유형 선택됨', '출처 메모 10자 이상', '시판 그림책 미사용 확인', '목표 길이 3~15분'],
      visual: ['출처 메모에 특정 출판사의 그림책 제목이 들어 있지 않은지 읽어 본다'],
    },
    avoid: [
      '시판 그림책을 원작으로 고르기',
      '출처를 모른 채 "전래 민담"으로 표시하기',
      '실존 인물의 일화를 허락 없이 쓰기',
    ],
    doneSignal: '설정 완료',
    implemented: true,
  },

  1: {
    id: 'GUIDE-S1',
    version: '1.0',
    step: 1,
    title: '이야기 다시 쓰기',
    purpose: '한기쌤의 문장으로 다시 쓴 내레이션 원고 한 편을 확정한다.',
    inputs: ['0단계 출처 메모', '목표 길이'],
    actions: [
      { text: '기승전결 뼈대를 한 줄씩 4줄로 쓴다', testid: 's1-outline-01 ~ s1-outline-04' },
      { text: '뼈대를 바탕으로 전체 내레이션 원고를 쓴다', testid: 's1-full-text' },
      { text: '화면에 표시되는 글자 수가 목표 분량 범위에 드는지 확인한다', testid: 's1-length-meter' },
      { text: '점검표가 모두 통과하면 원고를 확정한다', testid: 's1-complete' },
    ],
    quality: {
      auto: ['1분당 약 250자 기준 목표 분량 ±15%', '한 문장 40자 이하', '어려운 한자어·외래어 표시'],
      visual: ['원작 문장을 그대로 옮긴 곳이 없는지', '시니어가 귀로 듣기에 쉬운 말인지'],
    },
    avoid: ['원작 문장 베끼기', '건강·금융 조언 끼워 넣기', '한 문장에 두 가지 이상의 사건 넣기'],
    doneSignal: '원고 확정',
    implemented: false,
  },

  2: {
    id: 'GUIDE-S2',
    version: '1.0',
    step: 2,
    title: '장면 나누기',
    purpose: '원고를 8~15초짜리 장면으로 잘라 장면표를 만든다.',
    inputs: ['1단계 확정 원고'],
    actions: [
      { text: '원고를 장면 단위로 자른다', testid: 's2-split' },
      { text: '장면마다 내레이션, 화면 설명, 장소, 등장인물, 감정을 채운다', testid: 's2-scene-NN-*' },
      { text: '순서는 위·아래 버튼으로 바꾼다', testid: 's2-scene-NN-up / s2-scene-NN-down' },
      { text: '점검표가 모두 통과하면 장면표를 확정한다', testid: 's2-complete' },
    ],
    quality: {
      auto: ['6분 기준 장면 24~45개', '장면당 내레이션 60자 이하', '모든 장면에 장소·인물 지정'],
      visual: ['한 장면에 그림 한 장으로 보여 줄 수 있는 내용만 있는지'],
    },
    avoid: ['한 장면에 장소 두 곳 넣기', '내레이션 없는 장면 남기기'],
    doneSignal: '장면표 확정',
    implemented: false,
  },

  3: {
    id: 'GUIDE-S3',
    version: '1.0',
    step: 3,
    title: '비주얼 DNA',
    purpose: '화풍, 인물 카드, 장소 카드를 정해 모든 그림의 기준을 세운다.',
    inputs: ['2단계 장면표의 인물·장소 목록'],
    actions: [
      { text: '화풍 프리셋을 고른다: 민화풍, 수묵담채, 그림책 수채화', testid: 's3-style-preset' },
      { text: '인물 카드마다 나이, 얼굴, 머리, 옷, 소품, 대표 색 3개를 채운다', testid: 's3-character-NN-*' },
      { text: '장소 카드를 채운다', testid: 's3-location-NN-*' },
      { text: '금지 요소(글자, 워터마크, 사실적인 사람 얼굴)를 확인한다', testid: 's3-negatives' },
      { text: '점검표가 모두 통과하면 DNA를 확정한다', testid: 's3-complete' },
    ],
    quality: {
      auto: ['장면표의 모든 인물·장소가 카드로 등록됨', '인물마다 대표 색 3개'],
      visual: ['인물끼리 옷 색과 실루엣이 확실히 구분되는지'],
    },
    avoid: ['특정 스튜디오·작가 이름으로 화풍 지정하기', '유명 캐릭터를 닮게 묘사하기'],
    doneSignal: 'DNA 확정',
    implemented: false,
  },

  4: {
    id: 'GUIDE-S4',
    version: '1.0',
    step: 4,
    title: '기준 이미지',
    purpose: '인물마다 기준 시트(정면, 옆면, 표정 3종)를 만들어 승인한다.',
    inputs: ['3단계 인물 카드'],
    actions: [
      { text: '인물 기준 시트 프롬프트를 복사한다', testid: 's4-character-NN-copy-prompt' },
      { text: '이미지 AI(Gemini 앱) 새 대화에 붙여 넣어 생성한다' },
      { text: '결과 1장을 내려받아 업로드한다', testid: 's4-character-NN-upload' },
      { text: '운영자에게 승인을 요청한다. 승인은 운영자만 누른다', testid: 's4-character-NN-approve' },
    ],
    quality: {
      auto: ['모든 인물에 승인된 시트가 있어야 다음 단계가 열림'],
      visual: ['정면·옆면·표정이 한 장에 같은 인물로 그려졌는지', '그림 안에 글자가 없는지'],
    },
    avoid: ['한 대화에서 여러 인물을 함께 생성하기', '운영자 승인 없이 넘어가기'],
    doneSignal: '기준 시트 승인',
    implemented: false,
  },

  5: {
    id: 'GUIDE-S5',
    version: '1.0',
    step: 5,
    title: '장면 이미지',
    purpose: '모든 장면에 기준 시트와 일관된 그림을 1장씩 붙인다.',
    inputs: ['4단계 승인된 기준 시트', '2단계 장면표'],
    actions: [
      { text: '"다음 할 일" 띠가 가리키는 장면을 연다', testid: 's5-scene-NN' },
      { text: '프롬프트를 복사한다', testid: 's5-scene-NN-copy-prompt' },
      { text: '이미지 AI 새 대화에 기준 시트 이미지를 첨부하고 프롬프트를 붙여 넣는다' },
      { text: '결과 1장을 내려받아 업로드한다', testid: 's5-scene-NN-upload' },
      { text: '점검표 5개를 확인하고 체크한다', testid: 's5-scene-NN-check-1 ~ 5' },
      { text: '핵심 장면 1~3개만 움직임 클립 프롬프트를 만든다(선택)', testid: 's5-scene-NN-motion' },
    ],
    quality: {
      auto: ['16:9 비율', '장면마다 이미지 1장'],
      visual: ['얼굴형, 머리, 옷 색, 화풍이 기준 시트와 같음', '그림 안에 글자 없음'],
    },
    avoid: ['기준 시트 없이 생성하기', '한 장면에 여러 장 업로드하기', '실존 인물·유명 캐릭터를 닮게 만들기'],
    doneSignal: '장면 이미지 모두 완료',
    implemented: false,
  },

  6: {
    id: 'GUIDE-S6',
    version: '1.0',
    step: 6,
    title: '내레이션 음성',
    purpose: '장면마다 차분한 내레이션 음성 파일을 붙이고 실제 길이를 잰다.',
    inputs: ['2단계 장면별 내레이션'],
    actions: [
      { text: '음성용 원고를 복사한다(숫자는 한글로, 쉼표 보강됨)', testid: 's6-scene-NN-copy-narration' },
      { text: '타입캐스트 설정값을 확인한다: 중저음 차분한 목소리, 0.9배속, 문장 사이 쉼 0.6초', testid: 's6-voice-settings' },
      { text: '타입캐스트에서 음성을 만들고 내려받는다' },
      { text: '음성 파일을 업로드한다. 길이는 자동으로 잰다', testid: 's6-scene-NN-upload' },
    ],
    quality: {
      auto: ['전체 길이가 목표 ±10%', '모든 장면에 음성 있음'],
      visual: ['발음이 틀린 고유명사가 없는지 한 번 들어 본다'],
    },
    avoid: ['장면마다 다른 목소리 쓰기', '배경음악을 음성 파일에 섞기'],
    doneSignal: '음성 완료',
    implemented: false,
  },

  7: {
    id: 'GUIDE-S7',
    version: '1.0',
    step: 7,
    title: '점검·내보내기',
    purpose: '자막, 편집 순서표, 유튜브 설명문을 만들고 정책 점검을 통과해 묶음을 내려받는다.',
    inputs: ['모든 장면의 이미지·음성', '0단계 출처 메모'],
    actions: [
      { text: 'SRT 자막을 만든다(한 줄 15자)', testid: 's7-make-srt' },
      { text: '유튜브 제목·설명·태그·AI 사용 안내문을 확인한다', testid: 's7-publish-*' },
      { text: '정책 점검표를 모두 체크한다', testid: 's7-policy-*' },
      { text: '묶음(ZIP)을 내려받는다', testid: 's7-download-zip' },
    ],
    quality: {
      auto: ['자막 한 줄 15자 이하', '원작 출처 표기 있음', 'AI 콘텐츠 공개 체크'],
      visual: ['설명문에 건강·금융 조언이 없는지'],
    },
    avoid: ['AI 사용 공개를 빼고 올리기', '출처 표기 없이 올리기'],
    doneSignal: '묶음 내려받기',
    implemented: false,
  },
};

export * from './types';
