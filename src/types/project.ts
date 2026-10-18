/**
 * 옛이야기 영상 공방 — 프로젝트 데이터 모델 (schemaVersion 1.0)
 *
 * 프로젝트 하나 = JSON 문서 하나.
 * 모든 화면이 이 문서를 읽고 쓰며, 외부 AI에게 "이 형식으로 답하라"고 줄 때도 같은 구조를 쓴다.
 * 이미지·음성 파일 자체는 저장소(Storage)에 두고, 여기에는 assetId만 적는다.
 */

export const SCHEMA_VERSION = '1.0' as const;

/** 단계 번호 0~7 */
export type StepNo = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const STEP_NUMBERS: StepNo[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** 원작 유형: 줄거리만 빌린 전래 민담 / 순수 창작 */
export type SourceType = 'folktale' | 'original';

/** 화풍 프리셋 (특정 스튜디오·작가 이름은 쓰지 않는다) */
export type StylePreset = 'minhwa' | 'sumuk' | 'picturebook-watercolor' | 'custom';

/** 기승전결 패널 키 (기존 sceneConfig와 같은 키) */
export type PanelKey = 'ki' | 'seung' | 'jeon' | 'gyeol';

export interface CharacterCard {
  id: string;
  name: string;
  age: string;
  face: string;
  hair: string;
  outfit: string;
  props: string;
  /** 대표 색 3개 (#RRGGBB) */
  colors: string[];
  refSheet: { assetId: string | null; approved: boolean };
}

export interface LocationCard {
  id: string;
  name: string;
  desc: string;
  refImage: string | null;
}

export interface SceneRecord {
  id: string;
  order: number;
  panel: PanelKey;
  narration: string;
  visual: string;
  locationId: string | null;
  characterIds: string[];
  emotion: string;
  durationSec: number;
  motionClip: boolean;
  image: { assetId: string | null; checks: boolean[] };
  audio: { assetId: string | null; measuredSec: number | null };
  status: 'todo' | 'doing' | 'done';
}

export interface LogEntry {
  /** ISO 시각 (한국 시간 오프셋 포함) */
  at: string;
  /** 어떤 지침으로 작업했는지, 예: "GUIDE-S0 v1.0" */
  guide: string | null;
  event: string;
}

export interface Project {
  schemaVersion: typeof SCHEMA_VERSION;
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

  script: { outline: [string, string, string, string]; fullText: string; status: 'draft' | 'locked' };

  visualDNA: {
    stylePreset: StylePreset | null;
    customStyle: string;
    negatives: string[];
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
