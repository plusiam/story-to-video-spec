/**
 * 영상 제작 인계 문서 (story-to-video handoff)
 *
 * 0~3단계에서 정한 이야기·장면·비주얼 DNA를 특정 도구에 묶이지 않은 JSON 한 덩어리로 정리한다.
 * - 실행 코드, 토큰, API 키는 넣지 않는다.
 * - 작업 기록(log)이나 외부 AI와 나눈 대화는 넣지 않는다.
 * - 장면 길이는 글자 수로 계산한 추정치만 넣는다. 녹음·측정한 값처럼 보이게 쓰지 않는다.
 * - 이 함수는 프로젝트(p)를 고치지 않는다. 돌려주는 값은 모두 새로 만든 복사본이다.
 * - 이 문서는 제작 계획일 뿐, 유료 생성 실행 허가가 아니다.
 */
import { GUIDES } from '@/guides';
import { characterSheetPrompt, scenePrompt } from '@/lib/imagePrompt';
import { checksFor, completionOrderIssue } from '@/lib/steps';
import { characterNames, estimateSec } from '@/lib/text';
import {
  PANEL_LABEL,
  type CharacterCard,
  type LocationCard,
  type PanelKey,
  type Project,
  type SceneRecord,
  type StepNo,
  type StylePreset,
} from '@/types/project';

export const HANDOFF_KIND = 'story-to-video-handoff' as const;
export const HANDOFF_VERSION = '1.0' as const;

/** 인계 준비 판정에 쓰는 단계: 0 설정, 1 원고, 2 장면표, 3 비주얼 DNA */
const READINESS_STEPS: StepNo[] = [0, 1, 2, 3];

/** JSON으로 옮길 수 있는 값만 남긴 깊은 복사. 원본과 참조를 나누지 않게 한다 */
function jsonCopy<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export type HandoffCharacter = Omit<CharacterCard, 'elementName'> & { elementName: string | null };
export type HandoffLocation = Omit<LocationCard, 'elementName'> & { elementName: string | null };

export interface HandoffScene {
  id: string;
  /** 1부터 시작하는 장면 순서 */
  order: number;
  panel: PanelKey;
  panelLabel: string;
  narration: string;
  visual: string;
  location: string;
  /** 장면표에 적힌 그대로 (쉼표 구분, 인물이 없으면 "없음") */
  characters: string;
  /** characters를 이름 목록으로 나눈 것. "없음"이면 빈 목록 */
  characterList: string[];
  emotion: string;
  motionClip: boolean;
  /** 내레이션 글자 수로 계산한 예상 길이(초). 녹음·측정값이 아니다 */
  estimatedDurationSec: number;
}

export interface StoryToVideoHandoff {
  kind: typeof HANDOFF_KIND;
  handoffVersion: typeof HANDOFF_VERSION;
  project: { id: string; title: string; schemaVersion: string; updatedAt: string };
  source: Project['source'];
  target: Project['target'];
  script: { outline: [string, string, string, string]; tone: string; fullText: string };
  visualDNA: {
    stylePreset: StylePreset | null;
    customStyle: string;
    negatives: string;
    characters: HandoffCharacter[];
    locations: HandoffLocation[];
  };
  scenes: HandoffScene[];
  timing: { basis: 'estimate-from-narration-length'; estimatedTotalSec: number; note: string };
  /** 사람이 직접 체크한 확인란. 원래 값을 그대로 옮긴다 */
  humanConfirmations: {
    noCommercialBookConfirmed: boolean;
    ownWordingConfirmed: boolean;
    characterSheetsApproved: { characterId: string; name: string; approved: boolean }[];
  };
  readiness: { status: 'draft' | 'ready'; pendingSteps: number[]; issues: string[] };
  prompts: {
    characterSheets: { characterId: string; name: string; elementName: string | null; prompt: string }[];
    scenes: { sceneId: string; order: number; prompt: string }[];
  };
  productionInstructions: string[];
}

function elementNameOf(card: { elementName?: string }): string | null {
  return typeof card.elementName === 'string' ? card.elementName : null;
}

function handoffCharacter(c: CharacterCard): HandoffCharacter {
  return { ...jsonCopy(c), elementName: elementNameOf(c) };
}

function handoffLocation(l: LocationCard): HandoffLocation {
  return { ...jsonCopy(l), elementName: elementNameOf(l) };
}

function handoffScene(sc: SceneRecord, i: number): HandoffScene {
  const narration = str(sc.narration);
  const panel = sc.panel ?? 'ki';
  return {
    id: str(sc.id),
    order: i + 1,
    panel,
    panelLabel: PANEL_LABEL[panel] ?? '',
    narration,
    visual: str(sc.visual),
    location: str(sc.location),
    characters: str(sc.characters),
    characterList: characterNames({ characters: str(sc.characters) }),
    emotion: str(sc.emotion),
    motionClip: Boolean(sc.motionClip),
    estimatedDurationSec: narration.trim() ? estimateSec(narration) : 0,
  };
}

/** 0~3단계 완료 기록과 품질 점검으로 인계 준비 상태를 판정한다 */
function readinessOf(p: Project): StoryToVideoHandoff['readiness'] {
  const pending: number[] = [];
  const issues: string[] = [];
  for (const step of READINESS_STEPS) {
    const title = GUIDES[step]?.title ?? '';
    const head = `${step}단계 「${title}」`;
    let stepOk = true;
    if (!p.progress?.[step]?.completedAt) {
      stepOk = false;
      issues.push(`${head}: 완료 기록이 없습니다.`);
    }
    const orderIssue = completionOrderIssue(step, p);
    if (orderIssue) { stepOk = false; issues.push(head + ': ' + orderIssue); }
    try {
      for (const c of checksFor(step, p, { folder: null })) {
        if (!c.ok) {
          stepOk = false;
          issues.push(`${head}: ${c.label} — ${c.fix}`);
        }
      }
    } catch {
      stepOk = false;
      issues.push(`${head}: 점검을 실행하지 못했습니다. 프로젝트 내용을 확인하세요.`);
    }
    if (!stepOk) pending.push(step);
  }
  return { status: pending.length === 0 ? 'ready' : 'draft', pendingSteps: pending, issues };
}

function safePrompt(make: () => string): string {
  try {
    return make();
  } catch {
    return '';
  }
}

const PRODUCTION_INSTRUCTIONS: string[] = [
  '이 문서는 영상 제작 계획(설계도)입니다. 이미지·영상·음성을 유료로 생성해도 된다는 허가가 아닙니다. 비용이 드는 생성은 운영자가 따로 승인한 뒤에만 진행하세요.',
  'readiness.status가 "draft"이면 아직 초안입니다. pendingSteps와 issues에 적힌 단계를 먼저 마무리해야 합니다.',
  'visualDNA의 인물 카드(이름·나이·얼굴·머리·옷·소품·대표 색), 장소 카드 설명, 화풍(stylePreset·customStyle)을 그대로 지키세요. 임의로 바꾸거나 새 인물·장소를 더하지 마세요.',
  '작업 순서: ① 인물 기준 시트와 장면 이미지를 만든다 → ② 사람(운영자)이 이미지를 검토·승인한다 → ③ 승인된 이미지로만 영상을 만든다. 검토를 건너뛰지 마세요.',
  'prompts.characterSheets와 prompts.scenes의 문장을 그림 프롬프트로 씁니다. 장면 이미지를 만들 때는 승인된 인물 기준 시트를 함께 첨부해 얼굴형·머리 모양·옷 색을 맞추세요.',
  '생성 이미지 안에는 글자, 자막, 말풍선, 워터마크, 서명을 넣지 마세요. visualDNA.negatives도 함께 지키세요.',
  '자막과 내레이션 글자는 이미지에 그리지 않고, 하류 편집 단계에서 따로 붙입니다.',
  'scenes의 estimatedDurationSec은 내레이션 글자 수로 계산한 추정치입니다. 녹음하거나 측정한 길이가 아닙니다.',
  '실제 타임라인과 음성 길이(타이밍)는 하류의 Claude Code 작업에서 spec.json으로 정합니다. 이 문서의 시간을 확정값으로 쓰지 마세요.',
  'elementName은 외부 제작 도구에 등록한 참조 이름입니다. 비어 있거나 null이면 하류 도구에서 등록한 뒤 채워도 됩니다.',
  'humanConfirmations의 확인 값은 사람이 직접 체크한 원래 값입니다. 다른 도구나 AI가 대신 바꾸지 마세요.',
];

/**
 * 프로젝트를 도구 중립 인계 JSON으로 만든다. p는 고치지 않는다.
 * 옛 백업(elementName 등 선택 항목이 없는 문서)도 그대로 받는다.
 */
export function buildHandoff(p: Project): StoryToVideoHandoff {
  const dna = p.visualDNA ?? ({} as Partial<Project['visualDNA']>);
  const characters = Array.isArray(dna.characters) ? dna.characters : [];
  const locations = Array.isArray(dna.locations) ? dna.locations : [];
  const scenes = Array.isArray(p.scenes) ? p.scenes : [];
  const outline = Array.isArray(p.script?.outline) ? p.script.outline : [];

  const handoffScenes = scenes.map(handoffScene);

  return {
    kind: HANDOFF_KIND,
    handoffVersion: HANDOFF_VERSION,
    project: {
      id: str(p.id),
      title: str(p.title),
      schemaVersion: str(p.schemaVersion),
      updatedAt: str(p.updatedAt),
    },
    // 선택 항목까지 원래 모습 그대로 옮긴다 (초안 상태도 보존)
    source: jsonCopy(p.source),
    target: jsonCopy(p.target),
    script: {
      outline: [str(outline[0]), str(outline[1]), str(outline[2]), str(outline[3])],
      tone: str(p.script?.tone),
      fullText: str(p.script?.fullText),
    },
    visualDNA: {
      stylePreset: dna.stylePreset ?? null,
      customStyle: str(dna.customStyle),
      negatives: str(dna.negatives),
      characters: characters.map(handoffCharacter),
      locations: locations.map(handoffLocation),
    },
    scenes: handoffScenes,
    timing: {
      basis: 'estimate-from-narration-length',
      estimatedTotalSec: handoffScenes.reduce((a, s) => a + s.estimatedDurationSec, 0),
      note: '내레이션 글자 수로 계산한 추정치입니다. 실제 타임라인과 음성 길이는 하류 spec.json에서 정합니다.',
    },
    humanConfirmations: {
      noCommercialBookConfirmed: Boolean(p.source?.noCommercialBookConfirmed),
      ownWordingConfirmed: Boolean(p.script?.ownWordingConfirmed),
      characterSheetsApproved: characters.map((c) => ({
        characterId: str(c.id),
        name: str(c.name),
        approved: Boolean(c.refSheet?.approved),
      })),
    },
    readiness: readinessOf(p),
    prompts: {
      characterSheets: characters.map((c) => ({
        characterId: str(c.id),
        name: str(c.name),
        elementName: elementNameOf(c),
        prompt: safePrompt(() => characterSheetPrompt(p, c)),
      })),
      scenes: scenes.map((sc, i) => ({
        sceneId: str(sc.id),
        order: i + 1,
        prompt: safePrompt(() => scenePrompt(p, sc)),
      })),
    },
    productionInstructions: [...PRODUCTION_INSTRUCTIONS],
  };
}
