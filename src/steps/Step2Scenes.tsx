import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AiAssist } from '@/components/AiAssist';
import type { ProjectApi } from '@/hooks/useProject';
import { parseScenes, sceneSplitRequest } from '@/lib/aiRequests';
import { appendLog } from '@/lib/project';
import { pad2, tid } from '@/lib/testid';
import {
  SCENE_NARRATION_MAX,
  autoSplitScenes,
  characterNames,
  emptyScene,
  estimateSec,
  namesInScenes,
  sceneCountRange,
  sentenceLength,
} from '@/lib/text';
import { PANEL_KEYS, PANEL_LABEL, type PanelKey, type Project, type SceneRecord } from '@/types/project';

const GUIDE = 'GUIDE-S2 v1.3';

/** 2단계 장면 나누기 */
export function Step2Scenes({ project, api }: { project: Project; api: ProjectApi }) {
  const p = project;
  const locked = Boolean(p.progress[2]);
  const [params] = useSearchParams();
  const focus = Number(params.get('scene')) || null;
  const [confirmSplit, setConfirmSplit] = useState(false);

  // ?scene=NN 으로 들어오면 그 장면으로 스크롤 (원칙 3번)
  useEffect(() => {
    if (!focus) return;
    document.getElementById(`scene-${pad2(focus)}`)?.scrollIntoView({ block: 'start' });
  }, [focus]);

  const setScenes = (fn: (scenes: SceneRecord[]) => SceneRecord[], event?: string) =>
    api.update((cur) => {
      const next = { ...cur, scenes: fn(cur.scenes) };
      return event ? appendLog(next, event, GUIDE) : next;
    });

  const patchScene = (i: number, patch: Partial<SceneRecord>) =>
    setScenes((list) =>
      list.map((sc, j) => (j !== i ? sc : { ...sc, ...patch, ...(patch.narration !== undefined ? { durationSec: estimateSec(patch.narration) } : {}) })),
    );

  const move = (i: number, d: -1 | 1) =>
    setScenes((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    }, `${i + 1}번 장면을 ${d < 0 ? '위' : '아래'}로 옮겼습니다`);

  const split = () => {
    const scenes = autoSplitScenes(p.script.fullText);
    setScenes(() => scenes, `원고를 장면 ${scenes.length}개로 나눴습니다`);
    setConfirmSplit(false);
  };

  const { min, max } = sceneCountRange(p.target.durationSec);
  const totalSec = p.scenes.reduce((a, s) => a + s.durationSec, 0);
  const names = namesInScenes(p.scenes);
  const countOf = (name: string, kind: 'c' | 'l') =>
    p.scenes.filter((s) => (kind === 'c' ? characterNames(s).includes(name) : s.location.trim() === name)).length;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-paper-line bg-paper p-4" aria-labelledby="s2-summary-heading">
        <h2 id="s2-summary-heading" className="sr-only">
          장면표 요약
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" data-testid={tid(2, 'summary')}>
          <span>
            장면 <strong className={p.scenes.length >= min && p.scenes.length <= max ? 'text-celadon' : 'text-ocher'}>{p.scenes.length}개</strong>
            <span className="text-ink-soft"> (권장 {min}~{max}개)</span>
          </span>
          <span>
            예상 길이 <strong>{Math.floor(totalSec / 60)}분 {totalSec % 60}초</strong>
            <span className="text-ink-soft"> (목표 {Math.round(p.target.durationSec / 60)}분)</span>
          </span>
        </div>
        {(names.characters.length > 0 || names.locations.length > 0) && (
          <p className="mt-2 text-[13px] text-ink-soft" data-testid={tid(2, 'names')}>
            인물: {names.characters.map((n) => `${n}(${countOf(n, 'c')})`).join(', ') || '없음'} · 장소:{' '}
            {names.locations.map((n) => `${n}(${countOf(n, 'l')})`).join(', ') || '없음'}
            <span className="block">같은 인물·장소가 다른 이름으로 적히면 그림이 달라집니다. 이름이 한 번만 나오면 오타인지 확인하세요.</span>
          </p>
        )}
        {!locked && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {p.scenes.length > 0 && confirmSplit ? (
              <>
                <span className="text-sm text-ocher">지금 장면 {p.scenes.length}개를 지우고 원고에서 다시 나눕니다.</span>
                <button type="button" className="btn-danger" onClick={split} data-testid={tid(2, 'split-confirm')}>
                  지우고 다시 나누기
                </button>
                <button type="button" className="btn-quiet" onClick={() => setConfirmSplit(false)} data-testid={tid(2, 'split-cancel')}>
                  취소
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={!p.script.fullText.trim()}
                onClick={() => (p.scenes.length ? setConfirmSplit(true) : split())}
                data-testid={tid(2, 'split')}
              >
                원고에서 장면 나누기
              </button>
            )}
            <span className="text-[13px] text-ink-soft">문장을 이어 붙여 장면당 {SCENE_NARRATION_MAX}자 이하로 자릅니다. 화면 설명·장소·인물은 직접 또는 외부 AI로 채웁니다.</span>
          </div>
        )}
      </section>

      {!locked && (
        <AiAssist
          prefix="s2"
          title="외부 AI로 장면표 만들기"
          note="원고를 장면으로 나누고 화면 설명·장소·인물·분위기까지 채운 JSON을 받아, 지금 장면표를 통째로 바꿉니다."
          request={sceneSplitRequest(p)}
          pasteLabel="외부 AI가 준 장면표 JSON을 붙여 넣으세요 (지금 장면표를 바꿉니다)"
          applyLabel="장면표에 반영"
          onApply={(text) => {
            const { scenes, errors } = parseScenes(text);
            if (!scenes) return errors;
            setScenes(() => scenes, `외부 AI 장면표를 반영했습니다 (장면 ${scenes.length}개)`);
            return null;
          }}
        />
      )}

      <datalist id="s2-location-options">
        {names.locations.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <ol className="space-y-4" data-testid={tid(2, 'scene-list')}>
        {p.scenes.map((sc, i) => (
          <SceneCard
            key={sc.id}
            no={i + 1}
            scene={sc}
            total={p.scenes.length}
            locked={locked}
            focused={focus === i + 1}
            onPatch={(patch) => patchScene(i, patch)}
            onMove={(d) => move(i, d)}
            onAddAfter={() =>
              setScenes((list) => [...list.slice(0, i + 1), emptyScene(sc.panel), ...list.slice(i + 1)], `${i + 1}번 장면 뒤에 빈 장면을 추가했습니다`)
            }
            onDelete={() => setScenes((list) => list.filter((_, j) => j !== i), `${i + 1}번 장면을 삭제했습니다`)}
          />
        ))}
      </ol>

      {!locked && p.scenes.length > 0 && (
        <button
          type="button"
          className="btn-quiet"
          onClick={() => setScenes((list) => [...list, emptyScene(list[list.length - 1]?.panel ?? 'gyeol')], '맨 끝에 빈 장면을 추가했습니다')}
          data-testid={tid(2, 'add-scene')}
        >
          맨 끝에 장면 추가
        </button>
      )}
    </div>
  );
}

function SceneCard({
  no,
  scene: sc,
  total,
  locked,
  focused,
  onPatch,
  onMove,
  onAddAfter,
  onDelete,
}: {
  no: number;
  scene: SceneRecord;
  total: number;
  locked: boolean;
  focused: boolean;
  onPatch: (patch: Partial<SceneRecord>) => void;
  onMove: (d: -1 | 1) => void;
  onAddAfter: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = (field: string) => tid(2, 'scene', no, field);
  const len = sentenceLength(sc.narration);
  const over = len > SCENE_NARRATION_MAX;

  return (
    <li
      id={`scene-${pad2(no)}`}
      className={`scroll-mt-4 rounded-lg border bg-paper p-4 ${focused ? 'border-jjok ring-2 ring-jjok/20' : 'border-paper-line'}`}
      data-testid={tid(2, 'scene', no)}
    >
      <fieldset disabled={locked}>
        <legend className="sr-only">장면 {no}</legend>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-serif text-lg text-jjok">장면 {pad2(no)}</span>
          <label className="sr-only" htmlFor={id('panel')}>
            장면 {no} 기승전결
          </label>
          <select
            id={id('panel')}
            className="rounded-md border border-paper-line bg-white px-2 py-1 text-sm"
            value={sc.panel}
            onChange={(e) => onPatch({ panel: e.target.value as PanelKey })}
            data-testid={id('panel')}
          >
            {PANEL_KEYS.map((k) => (
              <option key={k} value={k}>
                {PANEL_LABEL[k]}
              </option>
            ))}
          </select>
          <span className="text-[13px] tabular-nums text-ink-soft">약 {sc.durationSec}초</span>
          <span className="ml-auto flex flex-wrap gap-1">
            <button type="button" className="btn-quiet px-2 py-1 text-xs" disabled={no === 1} onClick={() => onMove(-1)} data-testid={id('up')} aria-label={`장면 ${no} 위로`}>
              위로
            </button>
            <button type="button" className="btn-quiet px-2 py-1 text-xs" disabled={no === total} onClick={() => onMove(1)} data-testid={id('down')} aria-label={`장면 ${no} 아래로`}>
              아래로
            </button>
            <button type="button" className="btn-quiet px-2 py-1 text-xs" onClick={onAddAfter} data-testid={id('add-after')}>
              아래에 추가
            </button>
            {confirmDelete ? (
              <>
                <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={onDelete} data-testid={id('delete-confirm')}>
                  정말 삭제
                </button>
                <button type="button" className="btn-quiet px-2 py-1 text-xs" onClick={() => setConfirmDelete(false)} data-testid={id('delete-cancel')}>
                  취소
                </button>
              </>
            ) : (
              <button type="button" className="btn-quiet px-2 py-1 text-xs text-danger" onClick={() => setConfirmDelete(true)} data-testid={id('delete')}>
                삭제
              </button>
            )}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor={id('narration')} className="field-label">
              내레이션 <span className={`font-normal tabular-nums ${over ? 'text-ocher' : 'text-ink-faint'}`}>{len}/{SCENE_NARRATION_MAX}자</span>
            </label>
            <textarea id={id('narration')} rows={3} className="input font-serif" value={sc.narration} onChange={(e) => onPatch({ narration: e.target.value })} data-testid={id('narration')} />
          </div>
          <div>
            <label htmlFor={id('visual')} className="field-label">
              화면 설명 <span className="font-normal text-ink-faint">그림 한 장으로 보여 줄 장면</span>
            </label>
            <textarea id={id('visual')} rows={3} className="input" value={sc.visual} onChange={(e) => onPatch({ visual: e.target.value })} placeholder="누가, 어디서, 무엇을, 어떤 표정으로" data-testid={id('visual')} />
          </div>
          <div>
            <label htmlFor={id('location')} className="field-label">
              장소
            </label>
            <input id={id('location')} list="s2-location-options" className="input" value={sc.location} onChange={(e) => onPatch({ location: e.target.value })} placeholder="예: 산길" data-testid={id('location')} />
          </div>
          <div>
            <label htmlFor={id('characters')} className="field-label">
              등장인물 <span className="font-normal text-ink-faint">쉼표로 구분, 없으면 "없음"</span>
            </label>
            <input id={id('characters')} className="input" value={sc.characters} onChange={(e) => onPatch({ characters: e.target.value })} placeholder="예: 나무꾼, 까치" data-testid={id('characters')} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor={id('emotion')} className="field-label">
              분위기·감정
            </label>
            <input id={id('emotion')} className="input" value={sc.emotion} onChange={(e) => onPatch({ emotion: e.target.value })} placeholder="예: 평온, 긴장" data-testid={id('emotion')} />
          </div>
        </div>
      </fieldset>
    </li>
  );
}
