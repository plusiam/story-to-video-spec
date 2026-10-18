/**
 * 프로젝트 저장소 계층
 *
 * 화면은 ProjectStore 인터페이스만 사용한다.
 * - 지금(M1): 브라우저 저장(localStorage). 로그인 없이 바로 쓸 수 있다.
 * - 다음: Supabase(projects 테이블 + assets 버킷). supabase/migrations/001_projects.sql 참조.
 *   Supabase 프로젝트 자리가 정해지면 같은 인터페이스로 supabaseStore를 추가해 교체한다.
 */
import type { Project, ProjectSummary } from '@/types/project';

export interface ProjectStore {
  /** 저장 방식 이름 (화면 표시용) */
  readonly label: string;
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

const INDEX_KEY = 'yetiyagi:index';
const projectKey = (id: string) => `yetiyagi:project:${id}`;

/** localStorage는 사생활 보호 창 등에서 예외를 던질 수 있으므로 모두 감싼다 */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('[storage] localStorage 쓰기 실패', err);
    throw new Error(
      '브라우저 저장 공간에 쓰지 못했습니다. 저장 공간이 가득 찼거나 사생활 보호 창일 수 있습니다. JSON 백업을 먼저 내려받으세요.',
    );
  }
}

function toSummary(p: Project): ProjectSummary {
  return {
    id: p.id,
    title: p.title,
    updatedAt: p.updatedAt,
    completedSteps: Object.keys(p.progress).length,
  };
}

export const localStore: ProjectStore = {
  label: '이 브라우저에 저장',

  async list() {
    const index = readJson<ProjectSummary[]>(INDEX_KEY, []);
    return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id) {
    return readJson<Project | null>(projectKey(id), null);
  },

  async save(project) {
    writeJson(projectKey(project.id), project);
    const index = readJson<ProjectSummary[]>(INDEX_KEY, []).filter((s) => s.id !== project.id);
    writeJson(INDEX_KEY, [...index, toSummary(project)]);
  },

  async remove(id) {
    try {
      window.localStorage.removeItem(projectKey(id));
    } catch {
      /* 무시: 읽기 전용 환경 */
    }
    writeJson(
      INDEX_KEY,
      readJson<ProjectSummary[]>(INDEX_KEY, []).filter((s) => s.id !== id),
    );
  },
};

/** 앱 전체가 쓰는 저장소. Supabase 연결 시 이 한 줄만 바꾼다 */
export const store: ProjectStore = localStore;
