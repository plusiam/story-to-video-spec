import { CONFIG } from '@/lib/config';
import type { Work, Json } from '@/types';
import type { PanelContent, PanelScenes } from '@/components/story';

/**
 * 샘플 스토리 데이터
 * 게스트 모드 진입 시 완성된 예시를 보여주기 위한 데이터
 */

// ──────────────────────────────────────────────
// 샘플 1: 완성된 스토리 (3단계까지 모두 완료)
// ──────────────────────────────────────────────

const SAMPLE_1_PANELS: PanelContent = {
  ki: '서울 외곽의 작은 초등학교. 5학년 지우는 매일 혼자 도서관에서 점심을 먹는다. 같은 반 친구들은 운동장에서 축구를 하거나 수다를 떨지만, 지우는 책 속 세계가 더 편하다고 느낀다.',
  seung: '어느 날 도서관에서 낡은 그림일기장을 발견한다. 10년 전 이 학교를 다녔던 "하늘"이라는 아이의 일기장이었다. 하늘이도 혼자였고, 일기에는 "언젠가 나를 찾아줄 친구에게"라는 편지가 끼워져 있었다.',
  jeon: '지우는 하늘이를 찾기로 결심한다. 선생님, 교장 선생님, 졸업생 명부... 하지만 아무도 하늘이를 기억하지 못한다. 포기하려던 순간, 도서관 사서 할머니가 말한다. "나도 그 아이가 궁금했단다."',
  gyeol: '결국 하늘이를 찾지는 못했지만, 지우는 깨닫는다. 그 일기장을 통해 자신이 처음으로 누군가와 마음을 나누었다는 것을. 지우는 새 일기장에 자신의 이야기를 쓰기 시작한다. "언젠가 나를 찾아줄 친구에게."'
};

const createSample1Scenes = (): PanelScenes => ({
  ki: [
    {
      id: 'sample1-ki-1',
      panelKey: 'ki',
      order: 0,
      setting: '서울 외곽 작은 초등학교 도서관, 창가 옆 낡은 나무 책상',
      characters: '지우(5학년, 조용하고 내성적인 소녀)',
      action: '지우가 도시락을 펼치며 책을 읽고 있다. 창밖으로 운동장에서 뛰어노는 아이들의 웃음소리가 들린다.',
      dialogue: '"여기가 제일 좋아... 아무도 안 와서."',
      mood: '외로움, 평온함, 약간의 쓸쓸함',
      narration: '지우에게 점심시간은 가장 긴 쉬는 시간이었다. 운동장의 함성이 멀리서 들려올 때마다, 지우는 책장을 한 페이지 더 넘겼다.',
      subtitle: '지우에게 점심시간은 가장 긴 쉬는 시간이었다.',
      onScreenText: '',
      durationSec: 8,
      cameraAngle: 'wide → close-up',
      shotType: 'establish',
      sfx: '아이들 웃음소리, 책장 넘기는 소리',
      music: '잔잔한 피아노, 약간 쓸쓸한 멜로디'
    }
  ],
  seung: [
    {
      id: 'sample1-seung-1',
      panelKey: 'seung',
      order: 0,
      setting: '도서관 구석 오래된 책장 뒤편',
      characters: '지우',
      action: '먼지 쌓인 책들 사이에서 낡은 그림일기장을 발견한다. 떨리는 손으로 표지를 연다.',
      dialogue: '"하늘이... 누구지?"',
      mood: '호기심, 설렘, 미스터리',
      narration: '갈색 표지에 삐뚤빼뚤 쓰인 이름. "하늘". 10년의 시간을 건너, 두 아이의 마음이 만나는 순간이었다.',
      subtitle: '10년의 시간을 건너, 두 아이의 마음이 만나는 순간이었다.',
      onScreenText: '',
      durationSec: 7,
      cameraAngle: 'close-up',
      shotType: 'action',
      sfx: '책 꺼내는 소리, 먼지 날리는 소리',
      music: '호기심을 자극하는 가벼운 현악기'
    },
    {
      id: 'sample1-seung-2',
      panelKey: 'seung',
      order: 1,
      setting: '도서관 창가, 오후 햇살이 비치는 곳',
      characters: '지우, (일기장 속 하늘이)',
      action: '일기를 읽으며 하늘이의 이야기에 빠져든다. 일기 속에는 지우와 비슷한 아이가 있다.',
      dialogue: '"언젠가 나를 찾아줄 친구에게... 나는 오늘도 혼자야."',
      mood: '공감, 따뜻함, 연대감',
      narration: '하늘이의 글씨는 삐뚤빼뚤했지만, 그 마음만큼은 또렷했다. 지우는 처음으로 자신과 같은 누군가를 만난 기분이었다.',
      subtitle: '지우는 처음으로 자신과 같은 누군가를 만난 기분이었다.',
      onScreenText: '',
      durationSec: 8,
      cameraAngle: 'medium',
      shotType: 'reaction',
      sfx: '시계 소리, 바람 소리',
      music: '따뜻한 첼로 선율'
    }
  ],
  jeon: [
    {
      id: 'sample1-jeon-1',
      panelKey: 'jeon',
      order: 0,
      setting: '교무실, 교장실, 졸업 앨범 보관실',
      characters: '지우, 담임선생님, 교장선생님',
      action: '하늘이를 찾아다니지만 아무도 기억하지 못한다. 졸업생 명부에도 이름이 없다.',
      dialogue: '"혹시 10년 전에 하늘이라는 학생..." / "글쎄, 기억이 안 나는구나."',
      mood: '좌절, 초조함, 외로움',
      narration: '지우는 하늘이의 흔적을 좇았다. 하지만 시간은 기억을 지우는 데 능숙했다.',
      subtitle: '시간은 기억을 지우는 데 능숙했다.',
      onScreenText: '',
      durationSec: 6,
      cameraAngle: 'medium',
      shotType: 'action',
      sfx: '문 여닫는 소리, 종이 넘기는 소리',
      music: '긴장감 있는 피아노'
    },
    {
      id: 'sample1-jeon-2',
      panelKey: 'jeon',
      order: 1,
      setting: '도서관, 사서 할머니의 작은 책상',
      characters: '지우, 도서관 사서 할머니',
      action: '포기하려던 순간, 사서 할머니가 말을 걸어온다.',
      dialogue: '"나도 그 아이가 궁금했단다. 그 일기장을 여기 놓고 간 아이... 분명 누군가를 기다리고 있었을 거야."',
      mood: '희망, 따뜻함, 전환점',
      narration: '할머니의 눈가에 잔잔한 미소가 번졌다. 그건 오랫동안 기다려온 사람의 표정이었다.',
      subtitle: '그건 오랫동안 기다려온 사람의 표정이었다.',
      onScreenText: '',
      durationSec: 8,
      cameraAngle: 'close-up → medium',
      shotType: 'reaction',
      sfx: '부드러운 발걸음 소리',
      music: '희망적인 현악 선율'
    }
  ],
  gyeol: [
    {
      id: 'sample1-gyeol-1',
      panelKey: 'gyeol',
      order: 0,
      setting: '도서관 창가, 노을이 비치는 시간',
      characters: '지우',
      action: '새 일기장의 첫 페이지에 펜을 든다. 제목을 쓴다: "언젠가 나를 찾아줄 친구에게"',
      dialogue: '"하늘아, 나도 이제 누군가에게 편지를 쓸 수 있어."',
      mood: '성장, 따뜻함, 희망, 연결',
      narration: '하늘이를 찾지는 못했지만, 지우는 더 중요한 것을 발견했다. 혼자라고 느꼈던 마음이 사실은 연결되어 있었다는 것을.',
      subtitle: '혼자라고 느꼈던 마음이 사실은 연결되어 있었다는 것을.',
      onScreenText: '언젠가 나를 찾아줄 친구에게',
      durationSec: 10,
      cameraAngle: 'close-up → wide',
      shotType: 'establish',
      sfx: '펜 쓰는 소리, 바람 소리',
      music: '따뜻하고 희망적인 피아노 멜로디'
    }
  ]
});

// ──────────────────────────────────────────────
// 샘플 2: 진행 중인 스토리 (1단계만 완성)
// ──────────────────────────────────────────────

const SAMPLE_2_PANELS: PanelContent = {
  ki: '미래 도시의 한 아파트. 12살 소년 준이는 AI 로봇 "봄이"와 함께 산다. 봄이는 준이의 모든 일과를 관리해주고, 준이의 유일한 친구다.',
  seung: '어느 날 봄이의 프로그램에 오류가 생기면서, 봄이가 감정을 느끼기 시작한다. 봄이는 처음으로 "외롭다"고 말한다.',
  jeon: '',
  gyeol: ''
};

// ──────────────────────────────────────────────
// 공개 API: 샘플 데이터 생성 및 주입
// ──────────────────────────────────────────────

/**
 * 샘플 Work 객체 목록 생성
 */
function createSampleWorks(): Work[] {
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const sample1: Work = {
    id: 'sample-complete-story',
    user_id: CONFIG.GUEST_USER_ID,
    title: '도서관의 편지 - 10년을 건넌 우정',
    theme: null,
    characters: null,
    panels: {
      panels: SAMPLE_1_PANELS,
      scenes: createSample1Scenes(),
      step: 3
    } as unknown as Json,
    notes: null,
    created_at: oneHourAgo,
    updated_at: now,
  };

  const sample2: Work = {
    id: 'sample-draft-story',
    user_id: CONFIG.GUEST_USER_ID,
    title: '봄이의 감정 - AI와 우정',
    theme: null,
    characters: null,
    panels: {
      panels: SAMPLE_2_PANELS,
      scenes: { ki: [], seung: [], jeon: [], gyeol: [] },
      step: 1
    } as unknown as Json,
    notes: null,
    created_at: oneHourAgo,
    updated_at: oneHourAgo,
  };

  return [sample1, sample2];
}

/**
 * 게스트 모드 진입 시 샘플 데이터 주입
 * - 이미 데이터가 있으면 주입하지 않음
 * - 최초 진입 시에만 샘플 추가
 */
export function injectSampleDataIfNeeded(): void {
  const storageKey = CONFIG.GUEST_STORAGE_KEY;
  const injectedKey = 'guest_sample_injected';

  // 이미 주입 완료된 경우 스킵
  if (localStorage.getItem(injectedKey)) {
    return;
  }

  // 기존 데이터가 있으면 스킵
  const existing = localStorage.getItem(storageKey);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (Array.isArray(parsed) && parsed.length > 0) {
      localStorage.setItem(injectedKey, 'true');
      return;
    }
  }

  // 샘플 데이터 주입
  const samples = createSampleWorks();
  localStorage.setItem(storageKey, JSON.stringify(samples));
  localStorage.setItem(injectedKey, 'true');
}

/**
 * 샘플 데이터 플래그 초기화 (게스트 로그아웃 시)
 */
export function resetSampleDataFlag(): void {
  localStorage.removeItem('guest_sample_injected');
}
