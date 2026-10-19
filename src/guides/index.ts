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
    version: '1.3',
    step: 0,
    title: '프로젝트 설정',
    purpose: '출처와 영상 길이를 정한다. 폴더는 선택 사항이며, 미연결이면 JSON 백업으로 보관한다.',
    inputs: ['운영자가 고른 옛이야기 또는 창작 아이디어'],
    actions: [
      { text: 'Aside와 정한 설정 JSON을 붙여 넣거나 아래 칸을 직접 채운다. 사람 확인은 JSON으로 가져오지 않는다', testid: 's0-paste / s0-paste-apply / s0-title' },
      { text: '원작 유형을 고른다: 전래 민담(줄거리만 사용) 또는 순수 창작', testid: 's0-source-type-folktale / s0-source-type-original' },
      { text: '줄거리를 어디서 알게 되었는지 출처 메모를 적는다', testid: 's0-source-note' },
      { text: '운영자가 출처를 검토하고 시판 그림책 미사용 확인란에 직접 체크한다. AI가 대신 체크하지 않는다', testid: 's0-no-commercial-book' },
      { text: '목표 길이(분)를 확인한다. 각색은 기존 범위, 원문 낭독은 원문·분석 메뉴의 권리와 양수 길이를 사용한다', testid: 's0-duration-min' },
      { text: '시리즈 이름이 있으면 적는다', testid: 's0-series' },
      { text: '작업 폴더 연결은 선택 사항이다. 폴더 없이 쓰면 내보내기에서 JSON 백업을 보관한다. 선택·권한 창은 운영자만 누른다', testid: 'app-folder-connect / app-export-link' },
      { text: '점검표 통과 후 운영자가 검토하고 완료 버튼을 누른다', testid: 's0-complete' },
    ],
    quality: {
      auto: ['제목 있음', '원작 유형 선택됨', '출처 메모 10자 이상', '시판 그림책 미사용 확인', '목표 길이 3~15분'],
      visual: ['출처 메모에 특정 출판사의 그림책 제목이 들어 있지 않은지 읽어 본다'],
    },
    avoid: [
      '시판 그림책을 원작으로 고르기',
      '출처를 모른 채 "전래 민담"으로 표시하기',
      '실존 인물의 일화를 허락 없이 쓰기',
      '브라우저 AI가 폴더 선택·권한 창을 누르려 하기',
    ],
    doneSignal: '설정 완료',
    implemented: true,
  },

  1: {
    id: 'GUIDE-S1',
    version: '1.3',
    step: 1,
    title: '스토리 만들기',
    purpose: '운영자의 문장으로 다시 쓴, 귀로 듣기 쉬운 내레이션 원고 한 편을 확정한다.',
    inputs: ['0단계 출처 메모', '목표 길이'],
    actions: [
      { text: '각색 뼈대는 기존 4칸을 쓰되 원문·연재에서는 구간 요약은 선택이고 분석 구간 수를 강제하지 않는다', testid: 's1-outline-01 ~ s1-outline-04' },
      { text: '말투를 확인한다. 기본은 할머니가 들려주는 다정한 말투', testid: 's1-tone' },
      { text: '원문 낭독은 원문·분석에서 검토한 본문을 명시적으로 복사한다. 각색은 직접 쓰거나 AI 요청문을 외부 AI에 보낸다', testid: 's1-full-text / s1-copy-request' },
      { text: '대화에서 만든 원고 본문 또는 outline·tone·fullText JSON을 붙여 넣고 반영한다. 확인·완료 값은 넣지 않는다', testid: 's1-paste / s1-paste-apply' },
      { text: '분량 계기와 문장 점검 목록을 보고, 표시된 문장을 고친다', testid: 's1-length-meter / s1-flags' },
      { text: '운영자가 원고를 읽고 원작 문장 미사용 확인란에 직접 체크한다. AI가 대신 체크하지 않는다', testid: 's1-own-wording' },
      { text: '점검표 통과 후 운영자가 검토하고 원고를 확정한다', testid: 's1-complete' },
    ],
    quality: {
      auto: ['뼈대 4줄', '분량 1분당 250자 기준 ±15% (공백 제외)', '한 문장 40자 이하', '영어·숫자 표기 없음', '원작 문장 미사용 확인'],
      visual: ['시니어가 귀로 듣기에 쉬운 말인지', '한 문장에 사건이 하나씩인지'],
    },
    avoid: ['원작 문장 베끼기', '건강·금융 조언 끼워 넣기', '외부 AI 답의 앞뒤 설명 글까지 원고에 넣기'],
    doneSignal: '원고 확정',
    implemented: true,
  },

  2: {
    id: 'GUIDE-S2',
    version: '1.3',
    step: 2,
    title: '장면 나누기',
    purpose: '원고를 8~15초짜리 장면으로 잘라, 장면마다 그림 한 장으로 보여 줄 장면표를 만든다.',
    inputs: ['1단계 확정 원고'],
    actions: [
      { text: '「원고에서 장면 나누기」를 누르거나, 장면표 요청문을 외부 AI에 보내고 답을 붙여 넣는다', testid: 's2-split / s2-copy-request / s2-paste' },
      { text: '장면마다 화면 설명, 장소, 등장인물, 분위기를 채운다. 같은 장소·인물은 늘 같은 이름으로', testid: 's2-scene-NN-visual / -location / -characters / -emotion' },
      { text: '순서는 위·아래 버튼으로 바꾸고, 빈 장면이 필요하면 아래에 추가하고, 필요 없는 장면은 삭제한다', testid: 's2-scene-NN-up / -down / -add-after / -delete' },
      { text: '특정 장면은 주소 ?scene=NN 으로 바로 연다' },
      { text: '점검표 통과 후 운영자가 검토하고 장면표를 확정한다', testid: 's2-complete' },
    ],
    quality: {
      auto: ['6분 기준 장면 24~45개', '장면당 내레이션 60자 이하', '모든 장면에 화면 설명·장소·인물', '장면 내레이션 합계가 원고와 10% 이내'],
      visual: ['한 장면에 그림 한 장으로 보여 줄 수 있는 내용만 있는지', '같은 인물이 장면마다 다른 이름으로 적히지 않았는지'],
    },
    avoid: ['한 장면에 장소 두 곳 넣기', '화면 설명에 글자·말풍선 넣기', '내레이션 문장을 고쳐 쓰기(고칠 때는 1단계로 돌아간다)'],
    doneSignal: '장면표 확정',
    implemented: true,
  },

  3: {
    id: 'GUIDE-S3',
    version: '1.3',
    step: 3,
    title: '비주얼 DNA',
    purpose: '화풍, 인물 카드, 장소 카드를 정해 모든 그림이 따를 기준을 세운다.',
    inputs: ['2단계 장면표의 인물·장소 이름'],
    actions: [
      { text: '화풍을 고른다: 민화풍, 수묵담채, 그림책 수채화, 직접 쓰기', testid: 's3-style-preset-minhwa / -sumuk / -picturebook-watercolor / -custom' },
      { text: '「장면표에서 카드 맞추기」로 인물·장소 카드를 만든다', testid: 's3-sync-cards' },
      { text: '대화에서 만든 카드 JSON을 붙여 넣거나 직접 채운다. stylePreset·customStyle·negatives도 함께 넣을 수 있다', testid: 's3-copy-request / s3-paste' },
      { text: '인물 카드마다 나이, 얼굴, 머리, 옷, 소품, 대표 색 3개를 확인한다', testid: 's3-character-NN-*' },
      { text: '장소 카드 설명을 확인한다. 외부 도구에 등록한 Element 이름이 있으면 선택 입력한다', testid: 's3-location-NN-desc / s3-location-NN-element-name' },
      { text: '금지 요소를 확인한다', testid: 's3-negatives' },
      { text: '프롬프트 미리보기를 읽고 어색한 곳을 카드에서 고친다', testid: 's3-preview' },
      { text: '점검표 통과 후 운영자가 검토하고 DNA를 확정한다', testid: 's3-complete' },
    ],
    quality: {
      auto: ['화풍 정함', '장면표의 모든 인물·장소가 카드로 있음', '인물 카드 나이·얼굴·머리·옷 채움', '인물마다 첫째 대표 색이 다름', '장소 설명 10자 이상', '금지 요소 있음'],
      visual: ['인물끼리 옷 색과 실루엣이 확실히 구분되는지', '시대와 맞지 않는 옷·소품이 없는지'],
    },
    avoid: ['특정 스튜디오·작가 이름으로 화풍 지정하기', '유명 캐릭터나 실존 인물을 닮게 묘사하기'],
    doneSignal: 'DNA 확정',
    implemented: true,
  },

  4: {
    id: 'GUIDE-S4',
    version: '2.0',
    step: 4,
    title: '내레이션 음성·오디오 마스터',
    purpose: '원고를 낭독 블록으로 묶어 성우·내레이션을 만들고, 효과음·음악을 얹은 오디오 마스터의 실측 길이를 기록한다. 그림은 이 길이가 나온 뒤에 정한다.',
    inputs: ['2단계 장면별 내레이션(원문 그대로)', '0단계 출처·권리 메모'],
    actions: [
      { text: '오디오 화면(/p/:id/audio)에서 성우·모델·목소리를 한 가지로 정한다. 서비스의 모델 자동 선택은 쓰지 않는다', testid: 'app-audio-voice-model' },
      { text: '장면 범위를 낭독 블록으로 묶는다. 블록 수·길이는 정해진 값이 없다', testid: 'app-audio-add' },
      { text: '블록의 요청문을 복사해 외부 서비스에서 한 번에 만든다. 화면의 생성 개수가 요청 개수와 다르면 실행하지 않는다', testid: 'app-audio-block-NN-copy-request' },
      { text: '파일 이름·실측 길이·표시된 크레딧을 기록하고 사람이 들어 본 뒤 상태를 올린다', testid: 'app-audio-block-NN-stage' },
      { text: '효과음·음악 큐는 내레이션 블록을 잠근 뒤 원문에 나오는 소리와 장소·회상 전환에만 적는다', testid: 'app-audio-cue-add' },
      { text: '별도 편집기에서 섞은 마스터 파일과 실측 길이를 기록하고, 화면 없이 들어도 이해되는지 사람이 확인한다', testid: 'app-audio-master-stage' },
    ],
    quality: {
      auto: ['모든 장면이 겹치지 않는 낭독 블록에 들어감', '잠금 블록은 파일·실측 길이가 있고 원고가 바뀌지 않음'],
      visual: ['원문과 낭독이 같은지(누락·추가·바뀐 낱말 없음)', '숫자·지명 발음', '휴대폰 스피커로 들었을 때 대사가 묻히지 않는지', '화면 없이 인물·시간·장소를 귀로 구분할 수 있는지'],
    },
    avoid: ['장면마다 PNG부터 만들기', '낭독 문장을 고쳐 읽히기', '서비스의 모델 자동 선택·목소리 복제를 임의로 쓰기', '내레이션을 잠그기 전에 효과음 위치를 굳히기', '사람이 듣지 않고 청취 확인으로 표시하기'],
    doneSignal: '오디오 마스터 잠금',
    implemented: false,
  },

  5: {
    id: 'GUIDE-S5',
    version: '2.0',
    step: 5,
    title: '기준 이미지',
    purpose: '오디오 길이로 필요한 그림이 정해진 인물·장소에 한해 기준 이미지를 만들고 사람이 확인한다.',
    inputs: ['3단계 인물·장소 카드', '4단계 오디오 마스터의 실측 길이'],
    actions: [
      { text: '그림 꾸러미(/p/:id/images)에서 기준 이미지 파일을 인물·장소별로 기록한다', testid: 'app-images-target-NN-add' },
      { text: '새 그림이 필요한 장면에 나오는 인물·장소부터 만든다. 기준 이미지가 이미 있으면 다시 만들지 않는다' },
      { text: '확대해서 얼굴·소품을 확인한 뒤 작가가 확인 체크를 누른다. AI가 대신 누르지 않는다', testid: 'app-images-ref-ID-approve' },
    ],
    quality: {
      auto: ['모든 참조에 파일 이름이 있음'],
      visual: ['정면·옆면이 같은 인물로 그려졌는지', '그림 안에 글자가 없는지', '핵심 소품이 원문과 맞는지'],
    },
    avoid: ['한 대화에서 여러 인물을 함께 생성하기', '작가 확인 없이 기준 이미지로 쓰기', '쓰지 않을 인물·장소까지 미리 만들기'],
    doneSignal: '기준 이미지 확인',
    implemented: false,
  },

  6: {
    id: 'GUIDE-S6',
    version: '2.0',
    step: 6,
    title: '장면 이미지(필요한 구간만)',
    purpose: '오디오 시간표 위에서 장면마다 새 그림 / 기존 그림 유지 / 크롭·느린 이동 / 제목·전환을 정하고, 새 그림이 필요한 구간만 만든다.',
    inputs: ['4단계 오디오 마스터와 블록 실측 길이', '5단계 기준 이미지', '2단계 장면표'],
    actions: [
      { text: '그림 꾸러미에서 장면마다 「이 장면의 화면」을 정한다. 장면 수가 그림 수가 아니다', testid: 'app-images-shot-NN-placement' },
      { text: '핵심 소품 상태 변화(안경·가방·사진 등)와 장소·시간 전환은 새 그림 후보로 먼저 본다' },
      { text: '새 그림이 필요한 장면의 컷 카드를 복사해 이미지 AI에 붙여 넣는다', testid: 'app-images-shot-NN-copy' },
      { text: '확대 검수 뒤 고른 결과의 파일 이름을 기록한다', testid: 'app-images-shot-NN-result-save' },
    ],
    quality: {
      auto: ['16:9 비율', '새 그림이 필요한 장면에 고른 결과가 있음'],
      visual: ['얼굴형·머리·소품 상태가 앞뒤 장면과 이어지는지', '원문보다 먼저 행동·소품이 나오지 않는지', '그림 안에 글자 없음'],
    },
    avoid: ['장면마다 한 장씩 만들기', '기준 이미지 없이 생성하기', '실존 인물·유명 캐릭터를 닮게 만들기'],
    doneSignal: '필요한 구간의 그림 완료',
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
