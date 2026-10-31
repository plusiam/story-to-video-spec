import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderStatus } from '@/components/FolderStatus';
import { AppHeader } from '@/components/StudioLayout';
import { useFolder } from '@/hooks/useFolder';
import { scanFolderProjects } from '@/lib/folder';
import { clock, createEmptyProject, validateProjectJson } from '@/lib/project';
import { store } from '@/lib/storage';
import { appTid } from '@/lib/testid';
import type { ProjectSummary } from '@/types/project';

/** /projects — 프로젝트 목록, 새로 만들기, JSON 불러오기 */
export function ProjectsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    store.list().then(setItems).catch((e) => setError(String(e)));
  }, []);
  useEffect(refresh, [refresh]);

  const create = async () => {
    const p = createEmptyProject();
    try {
      await store.save(p);
      navigate(`/p/${p.id}/step/0`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[960px] px-4 py-10 lg:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] leading-tight">옛이야기 한 편을 영상 재료로</h1>
            <p className="mt-1 max-w-prose text-ink-soft">
              원고, 장면표, 일관된 그림, 내레이션, 자막을 여덟 단계로 만듭니다. 단계마다 오른쪽 작업지침을 따라가면 됩니다.
            </p>
          </div>
          <button type="button" className="btn-primary px-5 py-2.5 text-[15px]" onClick={create} data-testid={appTid('new-project')}>
            새 프로젝트 만들기
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-danger-tint px-3 py-2 text-sm text-danger" role="alert" data-testid={appTid('error')}>
            {error}
          </p>
        )}

        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="mb-3 font-sans text-sm font-bold text-ink-soft">
            프로젝트 {items ? `${items.length}개` : ''}
          </h2>
          {items && items.length === 0 && (
            <p className="rounded-lg border border-dashed border-paper-line bg-paper px-5 py-8 text-ink-soft" data-testid={appTid('project-list-empty')}>
              아직 프로젝트가 없습니다. 「새 프로젝트 만들기」로 첫 옛이야기를 시작하세요.
            </p>
          )}
          {items && items.length > 0 && (
            <ul className="divide-y divide-paper-line overflow-hidden rounded-lg border border-paper-line bg-paper" data-testid={appTid('project-list')}>
              {items.map((it) => (
                <ProjectRow key={it.id} item={it} onRemoved={refresh} />
              ))}
            </ul>
          )}
        </section>

        <FolderSection known={items?.map((i) => i.id) ?? []} onImported={(id) => navigate(`/p/${id}`)} />

        <ImportBox onImported={(id) => navigate(`/p/${id}`)} />
      </main>
    </div>
  );
}

function ProjectRow({ item, onRemoved }: { item: ProjectSummary; onRemoved: () => void }) {
  // 삭제는 두 번 눌러 확인한다. 브라우저 대화상자·시간 제한 없이(원칙 10번)
  const [confirming, setConfirming] = useState(false);
  const date = item.updatedAt.slice(0, 10);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" data-testid={appTid(`project-${item.id}`)}>
      <Link to={`/p/${item.id}`} className="min-w-0 flex-1 font-serif text-lg text-ink hover:text-jjok" data-testid={appTid(`project-open-${item.id}`)}>
        {item.title}
      </Link>
      <span className="text-sm tabular-nums text-ink-faint">
        {item.completedSteps}/8단계 · {date} {clock(item.updatedAt)}
      </span>
      {confirming ? (
        <span className="flex gap-2">
          <button
            type="button"
            className="btn-danger px-2.5 py-1 text-xs"
            onClick={async () => {
              await store.remove(item.id);
              onRemoved();
            }}
            data-testid={appTid(`project-delete-confirm-${item.id}`)}
          >
            정말 삭제
          </button>
          <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={() => setConfirming(false)} data-testid={appTid(`project-delete-cancel-${item.id}`)}>
            취소
          </button>
        </span>
      ) : (
        <button type="button" className="text-xs text-ink-faint hover:text-danger" onClick={() => setConfirming(true)} data-testid={appTid(`project-delete-${item.id}`)}>
          삭제
        </button>
      )}
    </li>
  );
}

/** 프로젝트 JSON 붙여넣기 칸 (원칙 9번). 형식이 틀리면 틀린 곳을 글로 알려 준다 */
function ImportBox({ onImported }: { onImported: (id: string) => void }) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const submit = async (raw: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setErrors([`JSON 문법 오류: ${e instanceof Error ? e.message : String(e)}`]);
      return;
    }
    const { project, errors } = validateProjectJson(parsed);
    if (!project) {
      setErrors(errors);
      return;
    }
    if (await store.get(project.id)) {
      setErrors([`같은 ID(${project.id})의 프로젝트가 이미 있습니다. 기존 프로젝트를 삭제하거나 JSON의 id를 바꾸세요.`]);
      return;
    }
    await store.save(project);
    setErrors([]);
    onImported(project.id);
  };

  return (
    <section aria-labelledby="import-heading" className="mt-12">
      <h2 id="import-heading" className="mb-1 font-sans text-sm font-bold text-ink-soft">
        백업 JSON 불러오기
      </h2>
      <p className="mb-3 text-[13px] text-ink-soft">내보내기에서 받은 프로젝트 JSON을 붙여 넣거나 파일로 고릅니다.</p>
      <label htmlFor="import-text" className="sr-only">
        프로젝트 JSON
      </label>
      <textarea
        id="import-text"
        rows={4}
        className="input font-mono text-[13px]"
        placeholder='{ "schemaVersion": "1.0", "id": "proj_…", … }'
        value={text}
        onChange={(e) => setText(e.target.value)}
        data-testid={appTid('import-text')}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-quiet" disabled={!text.trim()} onClick={() => submit(text)} data-testid={appTid('import-submit')}>
          붙여 넣은 JSON 불러오기
        </button>
        <label className="btn-quiet cursor-pointer">
          파일 고르기
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await submit(await f.text());
              e.target.value = '';
            }}
            data-testid={appTid('import-file')}
          />
        </label>
      </div>
      {errors.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 rounded-md bg-danger-tint py-2 pl-8 pr-3 text-sm text-danger" role="alert" data-testid={appTid('import-errors')}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 작업 폴더 상태와, 폴더에는 있지만 이 브라우저에는 없는 프로젝트 불러오기
 * (다른 컴퓨터에서 작업 폴더째 옮겨 왔을 때)
 */
function FolderSection({ known, onImported }: { known: string[]; onImported: (id: string) => void }) {
  const { state } = useFolder();
  const [found, setFound] = useState<{ folder: string; json: string; id: string; title: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const knownKey = known.join(',');

  useEffect(() => {
    if (state?.kind !== 'ready') {
      setFound([]);
      return;
    }
    let alive = true;
    scanFolderProjects()
      .then((list) => {
        if (!alive) return;
        const parsed = list.flatMap((f) => {
          try {
            const j = JSON.parse(f.json) as { id?: string; title?: string };
            return j.id && !knownKey.split(',').includes(j.id) ? [{ ...f, id: j.id, title: j.title ?? f.folder }] : [];
          } catch {
            return [];
          }
        });
        setFound(parsed);
      })
      .catch((e) => alive && setErrors([String(e)]));
    return () => {
      alive = false;
    };
  }, [state, knownKey]);

  const importOne = async (f: { json: string; folder: string }) => {
    const { project, errors } = validateProjectJson(JSON.parse(f.json));
    if (!project) {
      setErrors(errors.map((e) => `${f.folder}: ${e}`));
      return;
    }
    await store.save(project);
    onImported(project.id);
  };

  return (
    <section aria-labelledby="folder-heading" className="mt-12 rounded-lg border border-paper-line bg-paper p-4">
      <h2 id="folder-heading" className="mb-2 font-sans text-sm font-bold text-ink-soft">
        작업 폴더
      </h2>
      <p className="mb-3 text-[13px] text-ink-soft">
        프로젝트마다 하위 폴더를 만들어 project.json과 원고를 저장합니다. 4~6단계의 그림과 음성도 이 폴더에 쌓이고, 편집 프로그램에서 그대로 엽니다.
      </p>
      <FolderStatus />
      {found.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">폴더에는 있지만 이 브라우저에 없는 프로젝트</p>
          <ul className="space-y-1.5" data-testid={appTid('folder-projects')}>
            {found.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-serif">{f.title}</span>
                <span className="text-ink-faint">{f.folder}</span>
                <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={() => void importOne(f)} data-testid={appTid(`folder-import-${f.id}`)}>
                  불러오기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <ul className="mt-2 list-disc pl-6 text-sm text-danger" role="alert" data-testid={appTid('folder-import-errors')}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
