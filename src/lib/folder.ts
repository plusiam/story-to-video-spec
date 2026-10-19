/**
 * 작업 폴더 연결 (크롬·엣지의 File System Access API)
 *
 * 운영자가 컴퓨터의 폴더 하나를 "작업 폴더"로 연결하면, 프로젝트마다 하위 폴더를 만들어
 *   {작업 폴더}/{프로젝트ID}_{제목}/project.json   ← 저장할 때마다 덮어쓴다
 *   {작업 폴더}/{프로젝트ID}_{제목}/script.txt     ← 1단계 원고
 *   {작업 폴더}/{프로젝트ID}_{제목}/images/, audio/ ← 4~6단계 파일 (M3)
 * 를 둔다. 편집 프로그램(캡컷·브루)에서 이 폴더를 그대로 열면 된다.
 *
 * 폴더 선택 창과 권한 허용 창은 브라우저가 띄우는 창이라 브라우저 AI가 누를 수 없다.
 * 연결과 다시 허용은 운영자가 한다.
 */

// ---------- 폴더 핸들 보관 (IndexedDB) ----------
// 폴더 핸들은 localStorage에 넣을 수 없어 IndexedDB 한 칸에 보관한다.

const DB_NAME = 'yetiyagi';
const STORE = 'kv';
const HANDLE_KEY = 'workspace-folder';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- 권한·상태 ----------

/** 표준 타입에 아직 없는 권한 메서드 */
interface PermissionHandle extends FileSystemDirectoryHandle {
  queryPermission(desc: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(desc: { mode: 'readwrite' }): Promise<PermissionState>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (opts?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<FileSystemDirectoryHandle>;
  }
}

export type FolderState =
  /** 이 브라우저는 폴더 연결을 지원하지 않는다 (크롬·엣지가 아님) */
  | { kind: 'unsupported' }
  /** 아직 연결한 적 없음 */
  | { kind: 'none' }
  /** 연결했지만 이번 방문에서 다시 허용이 필요함 */
  | { kind: 'needs-permission'; name: string }
  | { kind: 'ready'; name: string };

export const FOLDER_STATE_TEXT: Record<FolderState['kind'], string> = {
  unsupported: '이 브라우저는 작업 폴더 연결을 지원하지 않습니다. 크롬이나 엣지에서 여세요.',
  none: '작업 폴더가 연결되지 않았습니다.',
  'needs-permission': '작업 폴더 사용을 다시 허용해야 합니다.',
  ready: '작업 폴더 연결됨',
};

export const isFolderSupported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

let cached: PermissionHandle | null = null;

async function storedHandle(): Promise<PermissionHandle | null> {
  if (cached) return cached;
  try {
    cached = ((await kvGet<FileSystemDirectoryHandle>(HANDLE_KEY)) as PermissionHandle | undefined) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

async function permissionOf(h: PermissionHandle): Promise<PermissionState> {
  return typeof h.queryPermission === 'function' ? h.queryPermission({ mode: 'readwrite' }) : 'granted';
}

export async function getFolderState(): Promise<FolderState> {
  if (!isFolderSupported()) return { kind: 'unsupported' };
  const h = await storedHandle();
  if (!h) return { kind: 'none' };
  return (await permissionOf(h)) === 'granted' ? { kind: 'ready', name: h.name } : { kind: 'needs-permission', name: h.name };
}

/** 폴더 고르기 (운영자 클릭으로만 호출) */
export async function connectFolder(): Promise<FolderState> {
  if (!window.showDirectoryPicker) return { kind: 'unsupported' };
  const h = (await window.showDirectoryPicker({ id: 'yetiyagi-workspace', mode: 'readwrite' })) as PermissionHandle;
  await kvSet(HANDLE_KEY, h);
  cached = h;
  return getFolderState();
}

/** 저장해 둔 폴더를 다시 허용 (운영자 클릭으로만 호출) */
export async function reauthorizeFolder(): Promise<FolderState> {
  const h = await storedHandle();
  if (!h) return { kind: 'none' };
  if (typeof h.requestPermission === 'function') await h.requestPermission({ mode: 'readwrite' });
  return getFolderState();
}

async function readyRoot(): Promise<PermissionHandle | null> {
  const h = await storedHandle();
  if (!h || (await permissionOf(h)) !== 'granted') return null;
  return h;
}

// ---------- 프로젝트 폴더 ----------

/** 폴더 이름에 쓸 수 없는 글자를 지운다 */
export function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** 프로젝트 하위 폴더. 이름이 "{id}"로 시작하는 폴더가 있으면 그것을 쓴다(제목이 바뀌어도 같은 폴더) */
async function projectDir(root: FileSystemDirectoryHandle, id: string, title: string): Promise<FileSystemDirectoryHandle> {
  for await (const [name, handle] of root as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (handle.kind === 'directory' && (name === id || name.startsWith(`${id}_`))) return handle as FileSystemDirectoryHandle;
  }
  const t = safeName(title);
  return root.getDirectoryHandle(t ? `${id}_${t}` : id, { create: true });
}

async function writeText(dir: FileSystemDirectoryHandle, name: string, text: string): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const w = await file.createWritable();
  await w.write(text);
  await w.close();
}

/**
 * 프로젝트를 작업 폴더에 거울처럼 쓴다. 폴더가 준비되지 않았으면 아무것도 하지 않고 false.
 * 쓰기 실패는 예외로 올린다(화면의 저장 상태에 문장으로 보여 준다).
 */
export async function mirrorProject(p: { id: string; title: string; script: { fullText: string } }): Promise<{ written: boolean; folder?: string }> {
  const root = await readyRoot();
  if (!root) return { written: false };
  const dir = await projectDir(root, p.id, p.title);
  await writeText(dir, 'project.json', JSON.stringify(p, null, 2));
  if (p.script.fullText.trim()) await writeText(dir, 'script.txt', p.script.fullText);
  return { written: true, folder: `${root.name}/${dir.name}` };
}

/** 작업 폴더 안의 project.json을 모두 읽는다 (다른 기기에서 옮겨 온 프로젝트 불러오기용) */
export async function scanFolderProjects(): Promise<{ folder: string; json: string }[]> {
  const root = await readyRoot();
  if (!root) return [];
  const found: { folder: string; json: string }[] = [];
  for await (const [name, handle] of root as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (handle.kind !== 'directory') continue;
    try {
      const fh = await (handle as FileSystemDirectoryHandle).getFileHandle('project.json');
      found.push({ folder: name, json: await (await fh.getFile()).text() });
    } catch {
      /* project.json 없는 폴더는 건너뛴다 */
    }
  }
  return found;
}

/** 사용자가 연결·허용한 작업 폴더만 반환한다. 권한 창을 자동으로 열지 않는다. */
export async function getReadyWorkspaceRoot(): Promise<FileSystemDirectoryHandle | null> { return readyRoot(); }
