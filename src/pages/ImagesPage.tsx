import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CopyButton } from '@/components/CopyButton';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { useProject } from '@/hooks/useProject';
import { GENSPARK_MODELS, buildShotCard, editReference, emptyShot, isResultStale, makeResult, mediaOf, modelInfo, patchMedia, shotOf, suggestedRefName } from '@/lib/gensparkCard';
import { newId } from '@/lib/project';
import { pad2 } from '@/lib/testid';
import type { GensparkModel, MediaReference, ShotPlacement, ShotPlan } from '@/types/authoring';
import { PANEL_LABEL, type Project, type SceneRecord } from '@/types/project';
import { LoadingOrError } from './LoadingOrError';

/**
 * 그림 꾸러미 (Genspark용)
 * 앱은 글과 첨부 순서만 만든다. Genspark 접속·생성·결제는 하지 않고, 작가가 직접 붙여 넣고 결과를 고른다.
 */
export function ImagesPage() {
  const { id } = useParams();
  const api = useProject(id);
  const [onlyNeeded, setOnlyNeeded] = useState(true);
  const p = api.project;
  if (!p) return <LoadingOrError error={api.loadError} />;
  const media = mediaOf(p);
  const info = modelInfo(media.model);
  const update = (fn: (cur: Project) => Project) => api.update(fn);
  const placementOf = (sceneId: string): ShotPlacement => shotOf(media, sceneId).placement ?? 'undecided';
  const counts = { undecided: 0, new: 0, reuse: 0, crop: 0, title: 0 } as Record<ShotPlacement, number>;
  for (const sc of p.scenes) counts[placementOf(sc.id)]++;

  return (
    <div className="min-h-screen">
      <AppHeader project={p} saveState={api.saveState} />
      <NextActionBar project={p} viewing={null} />
      <main className="mx-auto max-w-[960px] space-y-8 px-4 py-8 lg:px-6" data-testid="app-images-page">
        <header>
          <h1 className="text-[28px]" data-testid="app-images-heading">그림 꾸러미 · Genspark</h1>
          <p className="mt-2 text-sm text-ink-soft">
            장면마다 Genspark에 붙여 넣을 컷 카드와 첨부할 기준 이미지 순서를 만듭니다. 이 앱은 Genspark에 접속하거나 생성·결제하지 않습니다.
            작가가 직접 붙여 넣어 생성하고(크레딧 사용), 고른 결과를 여기에 기록합니다. 단계 완료와 인계 파일(handoff)은 바꾸지 않습니다.
            장면 수가 그림 수는 아닙니다. 오디오 길이가 나온 뒤 장면마다 새 그림이 필요한지 정하고, 필요한 장면만 카드를 만드세요(<Link className="text-jjok hover:underline" to={`/p/${p.id}/audio`} data-testid="app-images-audio-link">오디오 화면</Link>).
          </p>
        </header>

        <section className="space-y-3 rounded-lg border border-paper-line p-4" aria-labelledby="img-setup-heading">
          <h2 id="img-setup-heading" className="text-xl">1. Genspark에서 먼저 맞출 것</h2>
          <label htmlFor="img-model" className="field-label">사용할 모델</label>
          <select id="img-model" className="input" data-testid="app-images-model" value={media.model}
            onChange={(e) => update((cur) => patchMedia(cur, (m) => ({ ...m, model: e.target.value as GensparkModel })))}>
            {GENSPARK_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <p className="text-sm text-ink-soft" data-testid="app-images-model-info">
            참조 이미지 한도: {info.refLimit === null ? '확인되지 않음 (첨부가 거부되면 Nano Banana Pro처럼 한도가 확인된 모델로 바꾸세요)' : `${info.refLimit}장`} · {info.cost}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm" data-testid="app-images-setup-list">
            <li>Genspark 「AI 이미지」 화면 왼쪽 아래에서 위와 같은 모델을 고릅니다. 기본으로 선택된 Flash Lite는 참조 이미지를 4장까지만 받습니다.</li>
            <li>「설정」 → 종횡비 <strong>16:9</strong>를 고릅니다. 기본값 「자동 크기」는 비율이 바뀔 수 있습니다.</li>
            <li>「<strong>자동 프롬프트</strong>」를 끕니다. 켜져 있으면 생성 전에 카드 문장을 다시 써서 의도가 흐려집니다.</li>
            <li>「자동 스타일」도 끕니다. 화풍은 카드의 [화풍] 줄이 정합니다.</li>
            <li>생성 횟수(1·2·4장)는 자유입니다. 장수만큼 크레딧이 듭니다.</li>
          </ol>
          <p className="text-xs text-ink-soft">2026-10-19 Genspark 화면 기준입니다. 메뉴 이름·모델·한도는 바뀔 수 있습니다.</p>
        </section>

        <ReferencesSection p={p} update={update} />

        <section className="space-y-4" aria-labelledby="img-shots-heading">
          <h2 id="img-shots-heading" className="text-xl">3. 컷 카드</h2>
          <p className="text-sm text-ink-soft">
            카드의 [첨부 순서]대로 이미지를 올리고 카드 전체를 붙여 넣으세요. 기준 이미지가 있는 인물은 외모를 글로 다시 설명하지 않습니다(글과 이미지가 어긋나면 오히려 흔들립니다).
            장면의 감정·내레이션은 작가 참고용이며 카드에 넣지 않습니다. 생성기에는 눈에 보이는 말만 보냅니다.
          </p>
          {p.scenes.length === 0 ? (
            <p className="text-sm" data-testid="app-images-no-scenes">2단계 장면표가 비어 있습니다. <Link className="text-jjok hover:underline" to={`/p/${p.id}/step/2`}>2단계로 가기</Link></p>
          ) : (
            <>
              <div className="rounded-md border border-paper-line p-3 text-sm" data-testid="app-images-placement-summary">
                <p>
                  새 그림 {counts.new}장면 · 미정 {counts.undecided}장면 · 기존 그림 유지 {counts.reuse}장면 · 크롭·느린 이동 {counts.crop}장면 · 제목·전환 {counts.title}장면
                </p>
                <label className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={onlyNeeded} onChange={(e) => setOnlyNeeded(e.target.checked)} data-testid="app-images-only-needed" />
                  새 그림이 필요하거나 아직 정하지 않은 장면만 보기
                </label>
                <p className="mt-1 text-xs text-ink-soft">장면마다 「이 장면의 화면」을 정하는 이유는 그림이 필요 없는 장면의 컷 카드를 만들지 않으려는 것입니다. 정하지 않은 장면은 기존처럼 모두 보입니다.</p>
              </div>
              {p.scenes.map((sc, i) => (onlyNeeded && ['reuse', 'crop', 'title'].includes(placementOf(sc.id)) ? null : <ShotCardView key={sc.id} p={p} scene={sc} n={i + 1} update={update} />))}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

type Update = (fn: (cur: Project) => Project) => boolean;

function ReferencesSection({ p, update }: { p: Project; update: Update }) {
  const media = mediaOf(p);
  const targets: { kind: MediaReference['kind']; name: string }[] = [
    ...p.visualDNA.characters.map((c) => ({ kind: 'character' as const, name: c.name })),
    ...p.visualDNA.locations.map((l) => ({ kind: 'location' as const, name: l.name })),
  ].filter((t) => t.name.trim());
  const setRefs = (fn: (refs: MediaReference[]) => MediaReference[]) => update((cur) => patchMedia(cur, (m) => ({ ...m, references: fn(m.references) })));
  const addRef = (kind: MediaReference['kind'], name: string) => setRefs((refs) => [...refs, { id: newId('ref'), kind, name, angle: kind === 'character' ? '정면' : '전경', file: '', version: 1, approved: false }]);
  const known = new Set(targets.map((t) => `${t.kind}:${t.name}`));
  const orphans = media.references.filter((r) => !known.has(`${r.kind}:${r.name}`));

  return (
    <section className="space-y-4 rounded-lg border border-paper-line p-4" aria-labelledby="img-refs-heading">
      <h2 id="img-refs-heading" className="text-xl">2. 기준 이미지</h2>
      <p className="text-sm text-ink-soft">
        Genspark에는 인물을 이름으로 등록해 두는 기능이 없어 매번 같은 기준 이미지를 첨부해야 합니다. 인물은 각도가 다른 2~3장(정면·옆·3/4)을 권장합니다.
        파일은 작업 폴더에 두고 여기에는 이름만 적습니다. 파일·각도를 바꾸면 판본이 오르고 확인이 풀립니다. 인물 카드 외모나 화풍이 바뀌어도 확인이 풀립니다.
      </p>
      {targets.length === 0 && <p className="text-sm" data-testid="app-images-no-cards">3단계 인물·장소 카드가 없습니다. <Link className="text-jjok hover:underline" to={`/p/${p.id}/step/3`}>3단계로 가기</Link></p>}
      {targets.map((t, ti) => {
        const card = t.kind === 'character' ? p.visualDNA.characters.find((c) => c.name === t.name) : undefined;
        const refs = media.references.filter((r) => r.kind === t.kind && r.name === t.name);
        return (
          <div key={`${t.kind}:${t.name}`} className="rounded-md border border-paper-line p-3" data-testid={`app-images-target-${pad2(ti + 1)}`}>
            <p className="font-semibold">{t.kind === 'character' ? '인물' : '장소'} 「{t.name}」</p>
            {card?.refSheet.approved && card.refSheet.file && <p className="text-sm text-ink-soft">3단계 기준 시트 {card.refSheet.file}(승인됨)도 첫 첨부로 함께 씁니다.</p>}
            {refs.map((r) => <RefRow key={r.id} r={r} setRefs={setRefs} />)}
            <button type="button" className="btn-quiet mt-2" data-testid={`app-images-target-${pad2(ti + 1)}-add`} onClick={() => addRef(t.kind, t.name)}>기준 이미지 추가</button>
          </div>
        );
      })}
      {orphans.length > 0 && (
        <div className="rounded-md border border-danger/40 p-3" role="alert" data-testid="app-images-orphans">
          <p className="text-sm">카드에 없는 이름의 기준 이미지가 있습니다(카드 이름을 바꿨거나 지웠을 수 있습니다). 컷 카드에는 쓰이지 않습니다.</p>
          {orphans.map((r) => <RefRow key={r.id} r={r} setRefs={setRefs} />)}
        </div>
      )}
    </section>
  );
}

function RefRow({ r, setRefs }: { r: MediaReference; setRefs: (fn: (refs: MediaReference[]) => MediaReference[]) => boolean }) {
  const edit = (patch: Partial<Pick<MediaReference, 'angle' | 'file'>>) => setRefs((refs) => refs.map((x) => (x.id === r.id ? editReference(x, patch) : x)));
  const suggestion = suggestedRefName(r.name, r.angle, r.version);
  return (
    <div className="mt-2 grid gap-2 rounded border border-paper-line p-2 text-sm sm:grid-cols-[8rem_1fr]" data-testid={`app-images-ref-${r.id}`}>
      <label className="field-label" htmlFor={`${r.id}-angle`}>각도·용도</label>
      <input id={`${r.id}-angle`} className="input" value={r.angle} onChange={(e) => edit({ angle: e.target.value })} data-testid={`app-images-ref-${r.id}-angle`} />
      <label className="field-label" htmlFor={`${r.id}-file`}>파일 이름</label>
      <div>
        <input id={`${r.id}-file`} className="input w-full" value={r.file} placeholder={suggestion} onChange={(e) => edit({ file: e.target.value })} data-testid={`app-images-ref-${r.id}-file`} />
        {!r.file && <button type="button" className="btn-quiet mt-1" onClick={() => edit({ file: suggestion })} data-testid={`app-images-ref-${r.id}-suggest`}>추천 이름 넣기</button>}
      </div>
      <span className="text-ink-soft">판본 v{r.version}</span>
      <div className="flex flex-wrap items-center gap-3">
        <label><input type="checkbox" checked={r.approved} disabled={!r.file.trim()} onChange={(e) => { const v = e.target.checked; setRefs((refs) => refs.map((x) => (x.id === r.id ? { ...x, approved: v } : x))); }} data-testid={`app-images-ref-${r.id}-approve`} /> 작가가 기준 이미지로 확인함</label>
        <button type="button" className="btn-quiet" onClick={() => { if (window.confirm('이 기준 이미지 기록을 지울까요? 작업 폴더의 파일은 지우지 않습니다.')) setRefs((refs) => refs.filter((x) => x.id !== r.id)); }} data-testid={`app-images-ref-${r.id}-remove`}>기록 지우기</button>
      </div>
    </div>
  );
}

function ShotCardView({ p, scene, n, update }: { p: Project; scene: SceneRecord; n: number; update: Update }) {
  const media = mediaOf(p);
  const shot = shotOf(media, scene.id);
  const card = buildShotCard(p, scene, media);
  const stale = isResultStale(p, scene, media);
  const t = (item: string) => `app-images-shot-${pad2(n)}-${item}`;
  const setShot = (patch: Partial<ShotPlan>) => update((cur) => patchMedia(cur, (m) => ({ ...m, shots: { ...m.shots, [scene.id]: { ...(m.shots[scene.id] ?? emptyShot()), ...patch } } })));
  const [file, setFile] = useState(shot.result?.file ?? '');
  const [attempt, setAttempt] = useState(String(shot.result?.attempt ?? 1));
  const [reason, setReason] = useState(shot.result?.reason ?? '');
  const attemptNo = Number(attempt);
  const canRecord = file.trim().length > 0 && Number.isInteger(attemptNo) && attemptNo >= 1;

  const field = (key: 'pose' | 'light' | 'composition' | 'avoid', label: string, hint: string) => (
    <div>
      <label className="field-label" htmlFor={`${scene.id}-${key}`}>{label}</label>
      <input id={`${scene.id}-${key}`} className="input w-full" value={shot[key]} placeholder={hint} onChange={(e) => setShot({ [key]: e.target.value })} data-testid={t(key)} />
    </div>
  );

  return (
    <article className="space-y-3 rounded-lg border border-paper-line p-4" data-testid={t('card')} aria-labelledby={`${scene.id}-h`}>
      <h3 id={`${scene.id}-h`} className="text-lg font-semibold">
        장면 {pad2(n)} · {PANEL_LABEL[scene.panel]} · {scene.location || '장소 미정'} · {scene.characters || '인물 없음'}
      </h3>
      <div className="rounded bg-paper p-3 text-sm" data-testid={t('intent')}>
        <p className="font-semibold">작가 참고 (카드에 넣지 않음)</p>
        <p>감정: {scene.emotion || '(비어 있음)'}</p>
        <p className="text-ink-soft">내레이션: {scene.narration.slice(0, 120) || '(비어 있음)'}{scene.narration.length > 120 ? '…' : ''}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
        <label className="field-label" htmlFor={`${scene.id}-placement`}>이 장면의 화면</label>
        <select id={`${scene.id}-placement`} className="input" value={shot.placement ?? 'undecided'} onChange={(e) => setShot({ placement: e.target.value as ShotPlacement })} data-testid={t('placement')}>
          <option value="undecided">아직 정하지 않음</option>
          <option value="new">새 그림이 필요함</option>
          <option value="reuse">기존 그림 유지</option>
          <option value="crop">크롭·느린 이동</option>
          <option value="title">제목·전환 카드</option>
        </select>
        {(shot.placement === 'reuse' || shot.placement === 'crop') && (
          <>
            <label className="field-label" htmlFor={`${scene.id}-reuse`}>쓰는 그림의 장면</label>
            <select id={`${scene.id}-reuse`} className="input" value={shot.reuseOfSceneId ?? ''} onChange={(e) => setShot({ reuseOfSceneId: e.target.value })} data-testid={t('reuse-of')}>
              <option value="">장면을 고르세요</option>
              {p.scenes.filter((x) => x.id !== scene.id).map((x) => <option key={x.id} value={x.id}>장면 {p.scenes.indexOf(x) + 1}</option>)}
            </select>
          </>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field('pose', '표정·몸짓', '예: 놀라서 손을 입에 댄다')}
        {field('light', '빛·계절', '예: 늦가을 오후, 비스듬한 햇빛')}
        {field('composition', '구도', '예: 중간 거리, 인물이 화면 왼쪽')}
        {field('avoid', '이 컷에서 더 넣지 말 것', '예: 다른 사람, 현대 건물')}
      </div>
      {card.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-danger" data-testid={t('warnings')}>
          {card.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <div>
        <div className="flex items-center justify-between">
          <p className="field-label">컷 카드 (Genspark에 붙여 넣기)</p>
          <CopyButton text={card.text} label="카드 복사" testid={t('copy')} />
        </div>
        <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-paper-line bg-white p-3 text-sm" data-testid={t('text')}>{card.text}</pre>
      </div>
      <div className="space-y-2 rounded-md border border-paper-line p-3">
        <p className="font-semibold">고른 결과 기록</p>
        {shot.result && (
          <p className={`text-sm ${stale ? 'text-danger' : 'text-ink-soft'}`} data-testid={t('result')} role={stale ? 'alert' : undefined}>
            기록됨: {shot.result.file} · {shot.result.model} · {shot.result.attempt}번째 시도 · {new Date(shot.result.recordedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' })}
            {shot.result.reason && ` · 이유: ${shot.result.reason}`}
            {stale && ' · 기록한 뒤 이 컷의 기준 이미지가 바뀌었습니다. 다시 확인하세요.'}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
          <div>
            <label className="field-label" htmlFor={`${scene.id}-rfile`}>고른 이미지 파일 이름</label>
            <input id={`${scene.id}-rfile`} className="input w-full" value={file} placeholder={`장면${pad2(n)}_v1.png`} onChange={(e) => setFile(e.target.value)} data-testid={t('result-file')} />
          </div>
          <div>
            <label className="field-label" htmlFor={`${scene.id}-rattempt`}>몇 번째 시도</label>
            <input id={`${scene.id}-rattempt`} className="input w-full" type="number" min={1} value={attempt} onChange={(e) => setAttempt(e.target.value)} data-testid={t('result-attempt')} />
          </div>
        </div>
        <label className="field-label" htmlFor={`${scene.id}-rreason`}>고른 이유 (한 줄)</label>
        <input id={`${scene.id}-rreason`} className="input w-full" value={reason} onChange={(e) => setReason(e.target.value)} data-testid={t('result-reason')} />
        <div className="flex gap-2">
          <button type="button" className="btn-quiet" disabled={!canRecord} data-testid={t('result-save')}
            onClick={() => update((cur) => {
              const m = mediaOf(cur);
              const sc = cur.scenes.find((s) => s.id === scene.id) ?? scene;
              const result = makeResult(cur, sc, m, { file, attempt: attemptNo, reason });
              return patchMedia(cur, (mm) => ({ ...mm, shots: { ...mm.shots, [scene.id]: { ...(mm.shots[scene.id] ?? emptyShot()), result } } }));
            })}>
            {shot.result ? '결과 다시 기록' : '결과 기록'}
          </button>
          {shot.result && <button type="button" className="btn-quiet" data-testid={t('result-clear')} onClick={() => setShot({ result: null })}>기록 비우기</button>}
        </div>
        <p className="text-xs text-ink-soft">결과 기록은 작가가 고른 것을 남기는 메모입니다. 5단계 장면 이미지 완료나 게시 승인이 아닙니다.</p>
      </div>
    </article>
  );
}
