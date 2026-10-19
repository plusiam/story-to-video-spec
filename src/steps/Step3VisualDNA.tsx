import { useEffect, useRef, useState } from 'react';
import { AiAssist } from '@/components/AiAssist';
import { CopyButton } from '@/components/CopyButton';
import type { ProjectApi } from '@/hooks/useProject';
import { dnaRequest, parseDna, syncCards } from '@/lib/aiRequests';
import { STYLE_PRESETS, characterSheetPrompt, scenePrompt } from '@/lib/imagePrompt';
import { parseVisualOptions } from '@/lib/batchInput';
import { appendLog, DEFAULT_NEGATIVES } from '@/lib/project';
import { tid } from '@/lib/testid';
import { characterNames, namesInScenes } from '@/lib/text';
import type { CharacterCard, LocationCard, Project, StylePreset } from '@/types/project';

const GUIDE = 'GUIDE-S3 v1.2';

const CHARACTER_FIELDS: { key: keyof Pick<CharacterCard, 'age' | 'face' | 'hair' | 'outfit' | 'props' | 'elementName'>; label: string; placeholder: string }[] = [
  { key: 'age', label: '나이대', placeholder: '예: 서른 살 남짓' },
  { key: 'face', label: '얼굴', placeholder: '예: 둥근 얼굴, 순한 눈매, 그을린 피부' },
  { key: 'hair', label: '머리', placeholder: '예: 상투를 틀고 흰 머리띠' },
  { key: 'outfit', label: '옷', placeholder: '예: 해진 흰 저고리와 회색 바지, 짚신' },
  { key: 'props', label: '소품', placeholder: '예: 지게, 도끼 (없으면 비워 둠)' },
  { key: 'elementName', label: '힉스필드 Element 이름 (선택)', placeholder: '등록한 이름만 입력. 아직 없으면 비워 둡니다' },
];

/** 3단계 비주얼 DNA */
export function Step3VisualDNA({ project, api }: { project: Project; api: ProjectApi }) {
  const p = project;
  const dna = p.visualDNA;
  const locked = Boolean(p.progress[3]);
  const names = namesInScenes(p.scenes);
  const missing = names.characters.filter((n) => !dna.characters.some((c) => c.name === n)).length + names.locations.filter((n) => !dna.locations.some((l) => l.name === n)).length;
  const [previewScene, setPreviewScene] = useState(1);

  const setDna = (patch: Partial<Project['visualDNA']>, event?: string) =>
    api.update((cur) => {
      const next = { ...cur, visualDNA: { ...cur.visualDNA, ...patch } };
      return event ? appendLog(next, event, GUIDE) : next;
    });

  const sync = () => setDna(syncCards(p), '장면표에 맞춰 인물·장소 카드를 맞췄습니다');

  // 처음 들어왔을 때 카드가 빠져 있으면 한 번 맞춘다 (있는 카드는 그대로 둔다)
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current && !locked && missing > 0) {
      synced.current = true;
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카드 수정은 항상 최신 상태 위에서 한다 (빠르게 입력해도 앞 글자가 사라지지 않게)
  const patchCharacter = (id: string, patch: Partial<CharacterCard>) =>
    api.update((cur) => ({
      ...cur,
      visualDNA: { ...cur.visualDNA, characters: cur.visualDNA.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) },
    }));
  const patchLocation = (id: string, patch: Partial<LocationCard>) =>
    api.update((cur) => ({
      ...cur,
      visualDNA: { ...cur.visualDNA, locations: cur.visualDNA.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)) },
    }));

  const sceneUses = (name: string) => p.scenes.filter((s) => characterNames(s).includes(name)).length;
  const locationUses = (name: string) => p.scenes.filter((s) => s.location.trim() === name).length;
  const previewIdx = Math.min(Math.max(previewScene, 1), Math.max(p.scenes.length, 1)) - 1;
  const firstCharacter = dna.characters.find((c) => sceneUses(c.name) > 0);

  return (
    <div className="space-y-8">
      <fieldset disabled={locked} className="max-w-prose">
        <legend className="mb-2 font-sans text-sm font-bold">화풍</legend>
        <div role="radiogroup" aria-label="화풍" className="grid gap-2 sm:grid-cols-2" data-testid={tid(3, 'style-preset')}>
          {[...STYLE_PRESETS, { value: 'custom' as const, label: '직접 쓰기', hint: '재료와 기법으로 묘사합니다', prompt: '' }].map((o) => {
            const checked = dna.stylePreset === o.value;
            return (
              <label key={o.value} className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 ${checked ? 'border-jjok bg-jjok-tint' : 'border-paper-line bg-white hover:border-ink-faint'}`}>
                <input
                  type="radio"
                  name="s3-style-preset"
                  value={o.value}
                  checked={checked}
                  onChange={() => setDna({ stylePreset: o.value as StylePreset }, `화풍을 「${o.label}」으로 정했습니다`)}
                  className="mt-1 accent-[#26407A]"
                  data-testid={tid(3, 'style-preset', undefined, o.value)}
                />
                <span>
                  <span className="block font-semibold">{o.label}</span>
                  <span className="block text-[13px] text-ink-soft">{o.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
        {dna.stylePreset === 'custom' && (
          <div className="mt-3">
            <label htmlFor="s3-custom-style" className="field-label">
              화풍 설명 <span className="font-normal text-ink-faint">특정 작가·스튜디오 이름 대신 재료와 기법으로</span>
            </label>
            <textarea id="s3-custom-style" rows={2} className="input" value={dna.customStyle} onChange={(e) => setDna({ customStyle: e.target.value })} placeholder="예: 판화 느낌의 굵은 선, 종이를 오려 붙인 듯한 색면" data-testid={tid(3, 'custom-style')} />
          </div>
        )}
      </fieldset>

      {!locked && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-paper-line bg-paper p-4">
          <button type="button" className="btn-quiet" onClick={sync} data-testid={tid(3, 'sync-cards')}>
            장면표에서 카드 맞추기
          </button>
          <span className="text-[13px] text-ink-soft" data-testid={tid(3, 'sync-state')}>
            {missing === 0 ? `장면표의 인물 ${names.characters.length}명, 장소 ${names.locations.length}곳이 모두 카드로 있습니다.` : `카드가 없는 이름이 ${missing}개 있습니다.`} 이름을 바꾸려면 2단계 장면표에서 고칩니다.
          </span>
        </section>
      )}

      {!locked && (
        <AiAssist
          prefix="s3"
          title="외부 AI로 카드 채우기"
          note="장면표의 인물·장소 이름을 그대로 쓰게 합니다. 이름이 다르면 반영하지 않고 알려 줍니다."
          request={dnaRequest(p)}
          pasteLabel="외부 AI가 준 카드 JSON을 붙여 넣으세요 (같은 이름의 카드 내용을 바꿉니다)"
          applyLabel="카드에 반영"
          onApply={(text) => {
            const options = parseVisualOptions(text);
            if (!options.value) return options.errors;
            const r = parseDna(text, { characters: dna.characters, locations: dna.locations });
            if (r.errors.length) return r.errors;
            if (r.unknownNames.length)
              return [`장면표에 없는 이름이 있습니다: ${r.unknownNames.join(', ')}. 외부 AI에게 장면표의 이름을 그대로 쓰라고 다시 요청하세요.`];
            setDna({ ...options.value, characters: r.characters, locations: r.locations }, '대화에서 정한 화풍·카드 내용을 반영했습니다');
            return null;
          }}
        />
      )}

      <section aria-labelledby="s3-characters-heading">
        <h2 id="s3-characters-heading" className="mb-3 text-xl">
          인물 카드
        </h2>
        {dna.characters.length === 0 && <p className="text-sm text-ink-soft">장면표에 등장인물이 없습니다. 2단계에서 인물 이름을 적으면 여기에 카드가 생깁니다.</p>}
        <ol className="grid gap-4 xl:grid-cols-2" data-testid={tid(3, 'character-list')}>
          {dna.characters.map((c, i) => {
            const id = (f: string) => tid(3, 'character', i + 1, f);
            const uses = sceneUses(c.name);
            return (
              <li key={c.id} className="rounded-lg border border-paper-line bg-paper p-4" data-testid={tid(3, 'character', i + 1)}>
                <fieldset disabled={locked}>
                  <legend className="flex w-full items-center gap-2">
                    <span className="font-serif text-lg">{c.name}</span>
                    {uses > 0 ? (
                      <span className="text-[13px] text-ink-soft">장면 {uses}곳</span>
                    ) : (
                      <span className="rounded bg-ocher-tint px-1.5 py-0.5 text-xs font-semibold text-ocher">장면에 없음</span>
                    )}
                  </legend>
                  <div className="mt-3 space-y-2.5">
                    {CHARACTER_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label htmlFor={id(f.key)} className="field-label">
                          {f.label}
                        </label>
                        <input id={id(f.key)} className="input" value={c[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => patchCharacter(c.id, { [f.key]: e.target.value })} data-testid={id(f.key)} />
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold">대표 색</span>
                      {c.colors.map((col, k) => (
                        <label key={k} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                          <input
                            type="color"
                            value={col}
                            onChange={(e) => {
                              const colors = [...c.colors] as CharacterCard['colors'];
                              colors[k] = e.target.value;
                              patchCharacter(c.id, { colors });
                            }}
                            className="h-8 w-10 cursor-pointer rounded border border-paper-line bg-white"
                            data-testid={id(`color-${k + 1}`)}
                          />
                          {k === 0 ? '첫째(옷)' : k === 1 ? '둘째' : '셋째'} <code className="text-[12px]">{col}</code>
                        </label>
                      ))}
                    </div>
                    {uses === 0 && (
                      <button type="button" className="text-xs text-danger" onClick={() => setDna({ characters: dna.characters.filter((x) => x.id !== c.id) }, `장면에 없는 인물 카드 「${c.name}」을 지웠습니다`)} data-testid={id('remove')}>
                        이 카드 지우기
                      </button>
                    )}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="s3-locations-heading">
        <h2 id="s3-locations-heading" className="mb-3 text-xl">
          장소 카드
        </h2>
        <ol className="grid gap-4 xl:grid-cols-2" data-testid={tid(3, 'location-list')}>
          {dna.locations.map((l, i) => {
            const id = (f: string) => tid(3, 'location', i + 1, f);
            const uses = locationUses(l.name);
            return (
              <li key={l.id} className="rounded-lg border border-paper-line bg-paper p-4" data-testid={tid(3, 'location', i + 1)}>
                <label htmlFor={id('desc')} className="mb-1 flex items-center gap-2">
                  <span className="font-serif text-lg">{l.name}</span>
                  {uses > 0 ? <span className="text-[13px] text-ink-soft">장면 {uses}곳</span> : <span className="rounded bg-ocher-tint px-1.5 py-0.5 text-xs font-semibold text-ocher">장면에 없음</span>}
                </label>
                <textarea
                  id={id('desc')}
                  rows={2}
                  disabled={locked}
                  className="input"
                  value={l.desc}
                  placeholder="시대, 계절, 주요 사물, 빛 (예: 늦가을 깊은 산속 오솔길, 붉게 물든 단풍과 바위, 오후의 비스듬한 햇살)"
                  onChange={(e) => patchLocation(l.id, { desc: e.target.value })}
                  data-testid={id('desc')}
                />
                <label htmlFor={id('element-name')} className="field-label mt-3">힉스필드 Element 이름 (선택)</label>
                <input id={id('element-name')} disabled={locked} className="input" value={l.elementName ?? ''} placeholder="등록 전에는 비워 둡니다" onChange={(e) => patchLocation(l.id, { elementName: e.target.value })} data-testid={id('element-name')} />
                {uses === 0 && !locked && (
                  <button type="button" className="mt-1 text-xs text-danger" onClick={() => setDna({ locations: dna.locations.filter((x) => x.id !== l.id) }, `장면에 없는 장소 카드 「${l.name}」을 지웠습니다`)} data-testid={id('remove')}>
                    이 카드 지우기
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="max-w-prose">
        <label htmlFor="s3-negatives" className="field-label">
          그림에 넣지 않을 것
        </label>
        <textarea id="s3-negatives" rows={2} disabled={locked} className="input" value={dna.negatives} onChange={(e) => setDna({ negatives: e.target.value })} data-testid={tid(3, 'negatives')} />
        {dna.negatives !== DEFAULT_NEGATIVES && !locked && (
          <button type="button" className="mt-1 text-xs text-ink-faint hover:text-jjok" onClick={() => setDna({ negatives: DEFAULT_NEGATIVES })} data-testid={tid(3, 'negatives-reset')}>
            기본값으로 되돌리기
          </button>
        )}
      </div>

      <section aria-labelledby="s3-preview-heading" className="rounded-lg border border-paper-line bg-paper p-4" data-testid={tid(3, 'preview')}>
        <h2 id="s3-preview-heading" className="font-sans text-sm font-bold">
          프롬프트 미리보기
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft">4·5단계에서 이미지 AI에 보낼 글입니다. 어색한 곳은 위 카드에서 고칩니다.</p>

        {firstCharacter && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">인물 기준 시트 — {firstCharacter.name}</span>
              <CopyButton text={characterSheetPrompt(p, firstCharacter)} testid={tid(3, 'preview-copy-sheet')} />
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-paper-line bg-white px-3 py-2 font-sans text-[13px] leading-relaxed" data-testid={tid(3, 'preview-sheet')}>
              {characterSheetPrompt(p, firstCharacter)}
            </pre>
          </div>
        )}

        {p.scenes.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="s3-preview-scene" className="text-[13px] font-semibold">
                장면 그림 — 장면 번호
              </label>
              <input
                id="s3-preview-scene"
                type="number"
                min={1}
                max={p.scenes.length}
                value={previewIdx + 1}
                onChange={(e) => setPreviewScene(Number(e.target.value))}
                className="w-20 rounded-md border border-paper-line bg-white px-2 py-1 text-sm tabular-nums"
                data-testid={tid(3, 'preview-scene')}
              />
              <CopyButton text={scenePrompt(p, p.scenes[previewIdx])} testid={tid(3, 'preview-copy-scene')} />
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-paper-line bg-white px-3 py-2 font-sans text-[13px] leading-relaxed" data-testid={tid(3, 'preview-scene-text')}>
              {scenePrompt(p, p.scenes[previewIdx])}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
