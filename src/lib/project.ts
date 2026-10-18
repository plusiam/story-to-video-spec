/**
 * 프로젝트 생성·시간·로그 도우미
 */
import { SCHEMA_VERSION, type Project, type LogEntry } from '@/types/project';

/** 한국 시간(+09:00) ISO 문자열. 작업 기록이 운영자 시계와 같게 보이도록 한다 */
export function nowIso(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('Z', '+09:00').replace(/\.\d{3}/, '');
}

/** "20:41" 형식 시각 */
export function clock(iso: string): string {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

/** 사람이 읽기 쉬운 짧은 ID (예: proj_k3x9a2) */
export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${rand}`;
}

export const LOG_LIMIT = 300;

export function appendLog(project: Project, event: string, guide: string | null = null): Project {
  const entry: LogEntry = { at: nowIso(), guide, event };
  return { ...project, log: [...project.log, entry].slice(-LOG_LIMIT) };
}

/** 새 프로젝트 기본값. 시니어 채널 기준값(16:9, 6분, 0.9배속, 쉼 0.6초)을 미리 넣는다 */
export function createEmptyProject(title = '제목 없는 옛이야기'): Project {
  const at = nowIso();
  const project: Project = {
    schemaVersion: SCHEMA_VERSION,
    id: newId('proj'),
    title,
    createdAt: at,
    updatedAt: at,
    source: { type: null, note: '', noCommercialBookConfirmed: false },
    target: { durationSec: 360, aspect: '16:9', series: '' },
    script: { outline: ['', '', '', ''], fullText: '', status: 'draft' },
    visualDNA: {
      stylePreset: null,
      customStyle: '',
      negatives: ['글자', '워터마크', '사실적인 사람 얼굴'],
      characters: [],
      locations: [],
    },
    scenes: [],
    voice: { service: 'typecast', voiceName: '', speed: 0.9, pauseSec: 0.6 },
    publish: { youtubeTitle: '', description: '', tags: [], aiDisclosure: true, policyChecks: {} },
    progress: {},
    log: [],
  };
  return appendLog(project, '프로젝트를 만들었습니다');
}

/**
 * 불러온 JSON 검사. 틀린 곳을 글로 돌려준다 (브라우저 AI가 읽고 고칠 수 있게).
 * 통과하면 errors가 빈 배열이다.
 */
export function validateProjectJson(raw: unknown): { project: Project | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { project: null, errors: ['JSON 최상위가 객체({ ... })가 아닙니다.'] };
  }
  const p = raw as Record<string, unknown>;
  if (p.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion이 "${SCHEMA_VERSION}"이어야 합니다. 받은 값: ${JSON.stringify(p.schemaVersion)}`);
  }
  if (typeof p.id !== 'string' || !p.id) errors.push('id(문자열)가 없습니다.');
  if (typeof p.title !== 'string') errors.push('title(문자열)이 없습니다.');
  for (const key of ['source', 'target', 'script', 'visualDNA', 'voice', 'publish', 'progress'] as const) {
    if (typeof p[key] !== 'object' || p[key] === null) errors.push(`${key}(객체)가 없습니다.`);
  }
  if (!Array.isArray(p.scenes)) errors.push('scenes(배열)가 없습니다.');
  if (!Array.isArray(p.log)) errors.push('log(배열)가 없습니다.');
  return errors.length ? { project: null, errors } : { project: raw as Project, errors };
}
