import type { AuthoringData } from './authoring';

/**
 * 옛이야기 영상 공방 — 프로젝트 데이터 모델 (schemaVersion 1.1)
 *
 * 프로젝트 하나 = JSON 문서 하나.
 * 모든 화면이 이 문서를 읽고 쓰며, 외부 AI에게 "이 형식으로 답하라"고 줄 때도 같은 구조를 쓴다.
 * 이미지·음성 파일은 연결한 작업 폴더에 두고, 여기에는 파일 이름만 적는다.
 *
 * 1.0 → 1.1 변경
 * - script.tone(말투) 추가
 * - 장면의 장소·인물을 카드 ID 대신 이름으로 적는다(location, characters).
 *   카드는 3단계에서 이름을 기준으로 만든다. 장면표를 고치기 쉽게 하기 위해서다.
 */

export const SCHEMA_VERSION = '1.1' as const;

/** 단계 번호 0~7 */
export type StepNo = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const STEP_NUMBERS: StepNo[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** 원작 유형: 줄거리만 빌린 전래 민담 / 순수 창작 */
export type SourceType = 'folktale' | 'original';

/** 화풍 프리셋 (특정 스튜디오·작가 이름은 쓰지 않는다) */
export type StylePreset = 'minhwa' | 'sumuk' | 'picturebook-watercolor' | 'custom';

/** 기승전결 패널 키 */
export type PanelKey = 'ki' | 'seung' | 'jeon' | 'gyeol';
export const PANEL_KEYS: PanelKey[] = ['ki', 'seung', 'jeon', 'gyeol'];
export const PANEL_LABEL: Record<PanelKey, string> = { ki: '기', seung: '승', jeon: '전', gyeol: '결' };

/** 인물 카드. name이 장면표의 인물 이름과 이어 주는 열쇠다 */
export interface CharacterCard {
  id: string;
  name: string;
  age: string;
  face: string;
  hair: string;
  outfit: string;
  props: string;
  /** 외부 제작 도구에 등록한 참조 이름. 등록 전에는 비워 둔다 */
  elementName?: string;
  /** 대표 색 3개 (#RRGGBB) */
  colors: [string, string, string];
  refSheet: { file: string | null; approved: boolean };
}

/** 장소 카드. name이 장면표의 장소 이름과 이어 주는 열쇠다 */
export interface LocationCard {
  id: string;
  name: string;
  desc: string;
  refImage: string | null;
  elementName?: string;
}

export interface SceneRecord {
  id: string;
  panel: PanelKey;
  /** 내레이션 (음성으로 읽을 문장) */
  narration: string;
  /** 화면 설명 (그림으로 보여 줄 장면) */
  visual: string;
  /** 장소 이름 하나 */
  location: string;
  /** 등장인물 이름. 쉼표로 구분, 인물이 없으면 "없음" */
  characters: string;
  emotion: string;
  /** 예상 길이(초). 내레이션 글자 수로 계산하고, 6단계에서 실제 음성 길이로 바뀐다 */
  durationSec: number;
  motionClip: boolean;
  image: { file: string | null; checks: boolean[] };
  audio: { file: string | null; measuredSec: number | null };
}

export interface LogEntry {
  /** ISO 시각 (한국 시간 오프셋 포함) */
  at: string;
  /** 어떤 지침으로 작업했는지, 예: "GUIDE-S0 v1.1" */
  guide: string | null;
  event: string;
}

export interface Project {
  schemaVersion: typeof SCHEMA_VERSION;
  /** 원문·분석·시리즈 작업 확장. 예전 백업에는 없어도 된다. */
  authoring?: AuthoringData;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;

  source: {
    type: SourceType | null;
    note: string;
    /** 시판 그림책의 문장·그림을 쓰지 않는다는 운영자 확인 */
    noCommercialBookConfirmed: boolean;
  };
  target: { durationSec: number; aspect: '16:9'; series: string };

  script: {
    outline: [string, string, string, string];
    fullText: string;
    tone: string;
    /** 원작 문장을 옮기지 않고 새로 썼다는 확인 */
    ownWordingConfirmed: boolean;
  };

  visualDNA: {
    stylePreset: StylePreset | null;
    customStyle: string;
    negatives: string;
    characters: CharacterCard[];
    locations: LocationCard[];
  };

  scenes: SceneRecord[];

  voice: { service: 'typecast'; voiceName: string; speed: number; pauseSec: number };

  publish: {
    youtubeTitle: string;
    description: string;
    tags: string[];
    aiDisclosure: boolean;
    policyChecks: Record<string, boolean>;
  };

  /** 단계별 완료 기록. 완료 버튼을 누르면 시각이 남는다 */
  progress: Partial<Record<StepNo, { completedAt: string }>>;

  log: LogEntry[];
}

/** 목록 화면용 요약 */
export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  completedSteps: number;
}
