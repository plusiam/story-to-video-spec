import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CopyButton } from '@/components/CopyButton';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { useProject } from '@/hooks/useProject';
import { audioOf, formatSec, masterProblem, newBlock, newCue, patchAudio, rebaseBlock, stageChangeProblem } from '@/lib/audioPlan';
import { AUDIO_STAGES, blockView, coverageOf, stageLabel, suggestRanges } from '@/lib/audioRules';
import { pad2 } from '@/lib/testid';
import type { AudioBlock, AudioStage, SoundCue } from '@/types/authoring';
import type { Project } from '@/types/project';
import { LoadingOrError } from './LoadingOrError';

type Update = (fn: (cur: Project) => Project) => boolean;

/** 외부 음성 서비스에 붙여 넣을 요청문. 규칙을 매번 다시 적지 않게 하려는 복사용 글이다 */
function requestText(p: Project, b: AudioBlock, text: string): string {
  const v = audioOf(p).voice;
  return [
    '비공개 제작용 한국어 원문 낭독입니다. 아래 낭독문 하나를 MP3 한 개로 만들어 주세요.',
    `모델은 ${v.model || '(사용할 모델 이름)'} 한 개만 쓰고 자동 모델 선택·여러 모델 동시 생성·목소리 복제는 하지 마세요.`,
    `목소리: ${v.voiceName || '(고른 목소리 이름)'}${v.settings ? ` / 설정: ${v.settings}` : ''}.`,
    '낭독문 내용만 원문 그대로 읽습니다. 요약·단어 변경·없는 도입부와 마무리·효과음·음악을 넣지 마세요.',
    '요청 개수와 화면의 생성 개수가 다르거나 예상 비용을 알 수 없으면 실행하지 말고 먼저 알려 주세요.',
    '',
    `[${b.label}]`,
    text,
  ].join('\n');
}

/**
 * 오디오 · 성우와 내레이션 (Genspark 등 외부 서비스용 기록)
 * 앱은 음성을 만들거나 재생하지 않는다. 작가가 외부 서비스에서 만든 파일 이름과 실측 길이를 기록하고,
 * 그 길이가 나온 뒤에 그림이 정말 필요한 구간만 그림 꾸러미에서 만든다.
 */
export function AudioPage() {
  const { id } = useParams();
  const api = useProject(id);
  const p = api.project;
  if (!p) return <LoadingOrError error={api.loadError} />;
  const audio = audioOf(p);
  const update: Update = (fn) => api.update(fn);
  const cov = coverageOf(p.scenes, audio.blocks);
  const set = (fn: Parameters<typeof patchAudio>[1]) => update((cur) => patchAudio(cur, fn));

  return (
    <div className="min-h-screen">
      <AppHeader project={p} saveState={api.saveState} />
      <NextActionBar project={p} viewing={null} />
      <main className="mx-auto max-w-[960px] space-y-8 px-4 py-8 lg:px-6" data-testid="app-audio-page">
        <header>
          <h1 className="text-[28px]" data-testid="app-audio-heading">오디오 · 성우와 내레이션</h1>
          <p className="mt-2 text-sm text-ink-soft">
            이 도구의 제작 순서는 <strong>원고 확정 → 성우·내레이션 → 효과음·음악과 오디오 마스터 → 그림(필요한 구간만) → 영상</strong>입니다.
            음성은 화면 없이 들어도 인물·시간·장소가 이해되도록 먼저 완성합니다. 이 앱은 음성을 만들거나 재생하지 않고, 외부 서비스에서 작가가 만든 파일 이름과 실측 길이를 기록합니다.
            단계 완료·장면표·handoff는 바꾸지 않습니다.
          </p>
        </header>

        <VoiceSection p={p} set={set} />
        <BlocksSection p={p} update={update} />

        <section className="space-y-2 rounded-lg border border-paper-line p-4" aria-labelledby="aud-cov-heading" data-testid="app-audio-coverage">
          <h2 id="aud-cov-heading" className="text-xl">3. 블록이 장면을 덮은 정도</h2>
          <p className="text-sm" data-testid="app-audio-coverage-line">
            장면 {p.scenes.length}개 · 블록 {audio.blocks.length}개 · 잠금·최신 블록 {cov.lockedBlocks}개{cov.staleBlocks > 0 && ` · 다시 확인할 블록 ${cov.staleBlocks}개`}
          </p>
          <p className="text-sm text-ink-soft">
            실측 길이 합 {cov.measuredSec > 0 ? formatSec(cov.measuredSec) : '아직 없음'} · 잠금 블록 길이 합 {cov.lockedSec > 0 ? formatSec(cov.lockedSec) : '아직 없음'}
            {p.target.durationSec > 0 && ` · 목표 ${formatSec(p.target.durationSec)}(참고)`}
          </p>
          {cov.uncovered.length > 0 && <p className="text-sm text-danger" data-testid="app-audio-uncovered">블록에 들어가지 않은 장면: {cov.uncovered.length > 12 ? `${cov.uncovered.slice(0, 12).join(', ')} 외 ${cov.uncovered.length - 12}개` : cov.uncovered.join(', ')}</p>}
          {cov.overlapping.length > 0 && <p className="text-sm text-danger" data-testid="app-audio-overlap">여러 블록에 들어간 장면: {cov.overlapping.slice(0, 12).join(', ')}</p>}
        </section>

        <CuesSection p={p} update={update} />
        <MasterSection p={p} update={update} />

        <section className="space-y-2 rounded-lg border border-paper-line p-4" aria-labelledby="aud-next-heading">
          <h2 id="aud-next-heading" className="text-xl">6. 다음: 필요한 그림만</h2>
          <p className="text-sm text-ink-soft">
            오디오 길이가 나온 뒤 <Link className="font-semibold text-jjok hover:underline" to={`/p/${p.id}/images`} data-testid="app-audio-images-link">그림 꾸러미</Link>에서 장면마다 「새 그림 / 기존 그림 유지 / 크롭·느린 이동 / 제목·전환」을 정하고 새 그림이 필요한 곳만 만듭니다. 장면 수가 그림 수는 아닙니다.
          </p>
        </section>
      </main>
    </div>
  );
}

function VoiceSection({ p, set }: { p: Project; set: (fn: Parameters<typeof patchAudio>[1]) => boolean }) {
  const v = audioOf(p).voice;
  const edit = (patch: Partial<typeof v>) => set((a) => ({ ...a, voice: { ...a.voice, ...patch } }));
  return (
    <section className="space-y-3 rounded-lg border border-paper-line p-4" aria-labelledby="aud-voice-heading">
      <h2 id="aud-voice-heading" className="text-xl">1. 성우와 모델</h2>
      <p className="text-sm text-ink-soft">
        같은 목소리·같은 모델·같은 설정으로 모든 블록을 만듭니다. 서비스의 「모델 자동 선택」은 여러 모델로 동시에 만들어 크레딧을 여러 번 쓸 수 있으니 한 모델을 이름으로 고르세요.
        새 대화를 열면 설정이 초기화될 수 있어 아래 값을 요청문에 매번 넣습니다. 확인창의 생성 개수가 요청 개수와 다르거나 예상 크레딧이 보이지 않으면 실행 전에 멈춥니다.
      </p>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
        <label className="field-label" htmlFor="aud-voice-tool">서비스</label>
        <select id="aud-voice-tool" className="input" value={v.tool} onChange={(e) => edit({ tool: e.target.value as 'genspark' | 'other' })} data-testid="app-audio-voice-tool">
          <option value="genspark">Genspark</option>
          <option value="other">기타 서비스</option>
        </select>
        <label className="field-label" htmlFor="aud-voice-model">모델</label>
        <input id="aud-voice-model" className="input" value={v.model} placeholder="예: MiniMax TTS (한 개만)" onChange={(e) => edit({ model: e.target.value })} data-testid="app-audio-voice-model" />
        <label className="field-label" htmlFor="aud-voice-name">목소리 이름</label>
        <input id="aud-voice-name" className="input" value={v.voiceName} placeholder="서비스 목소리 목록에 보이는 이름" onChange={(e) => edit({ voiceName: e.target.value })} data-testid="app-audio-voice-name" />
        <label className="field-label" htmlFor="aud-voice-settings">속도·쉼 설정</label>
        <input id="aud-voice-settings" className="input" value={v.settings} placeholder="예: 속도 1.0, 문장 사이 0.5초" onChange={(e) => edit({ settings: e.target.value })} data-testid="app-audio-voice-settings" />
        <label className="field-label" htmlFor="aud-voice-note">고른 이유·청취 메모</label>
        <textarea id="aud-voice-note" className="input min-h-[4rem]" value={v.note} onChange={(e) => edit({ note: e.target.value })} data-testid="app-audio-voice-note" />
      </div>
    </section>
  );
}

function BlocksSection({ p, update }: { p: Project; update: Update }) {
  const audio = audioOf(p);
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('1');
  const [label, setLabel] = useState('');
  const fromIdx = Number(from) - 1, toIdx = Number(to) - 1;
  const canAdd = p.scenes.length > 0 && Number.isInteger(fromIdx) && Number.isInteger(toIdx) && fromIdx >= 0 && toIdx >= fromIdx && toIdx < p.scenes.length;
  const addBlock = () => update((cur) => {
    const b = newBlock(cur, fromIdx, toIdx, label.trim() || `장면 ${from}–${to}`);
    return b ? patchAudio(cur, (a) => ({ ...a, blocks: [...a.blocks, b] })) : cur;
  });
  const suggest = () => update((cur) => {
    const used = new Set<string>();
    for (const b of audioOf(cur).blocks) { const v = blockView(cur.scenes, b); if (!v.missing && v.fromNo && v.toNo) for (let i = v.fromNo; i <= v.toNo; i++) used.add(cur.scenes[i - 1].id); }
    const added: AudioBlock[] = [];
    for (const r of suggestRanges(cur.scenes)) {
      // 이미 블록이 덮은 장면은 건드리지 않고, 남은 연속 구간만 새 블록으로 만든다
      let s = r.fromIdx;
      while (s <= r.toIdx) {
        if (used.has(cur.scenes[s].id)) { s++; continue; }
        let e = s;
        while (e + 1 <= r.toIdx && !used.has(cur.scenes[e + 1].id)) e++;
        const b = newBlock(cur, s, e, r.label);
        if (b) added.push(b);
        s = e + 1;
      }
    }
    return added.length ? patchAudio(cur, (a) => ({ ...a, blocks: [...a.blocks, ...added] })) : cur;
  });
  return (
    <section className="space-y-4 rounded-lg border border-paper-line p-4" aria-labelledby="aud-blocks-heading">
      <h2 id="aud-blocks-heading" className="text-xl">2. 낭독 블록</h2>
      <p className="text-sm text-ink-soft">
        장면 하나씩 따로 녹음하면 억양이 끊기므로, 이어서 읽을 장면 범위를 블록으로 묶어 녹음합니다. 블록 수와 길이는 정해 둔 값이 없습니다.
        낭독 문장은 장면표의 내레이션 그대로이며 이 화면에서 고치지 않습니다. 원고·장면표가 나중에 바뀌면 그 블록에 「다시 확인」이 뜹니다.
      </p>
      {p.scenes.length === 0 ? (
        <p className="text-sm" data-testid="app-audio-no-scenes">2단계 장면표가 비어 있습니다. <Link className="text-jjok hover:underline" to={`/p/${p.id}/step/2`}>2단계로 가기</Link></p>
      ) : (
        <div className="space-y-2 rounded-md border border-paper-line p-3">
          <div className="grid gap-2 sm:grid-cols-[6rem_6rem_1fr_auto]">
            <div><label className="field-label" htmlFor="aud-add-from">시작 장면</label><input id="aud-add-from" className="input w-full" type="number" min={1} max={p.scenes.length} value={from} onChange={(e) => setFrom(e.target.value)} data-testid="app-audio-add-from" /></div>
            <div><label className="field-label" htmlFor="aud-add-to">끝 장면</label><input id="aud-add-to" className="input w-full" type="number" min={1} max={p.scenes.length} value={to} onChange={(e) => setTo(e.target.value)} data-testid="app-audio-add-to" /></div>
            <div><label className="field-label" htmlFor="aud-add-label">블록 이름</label><input id="aud-add-label" className="input w-full" value={label} placeholder="예: 시청역 첫 장면" onChange={(e) => setLabel(e.target.value)} data-testid="app-audio-add-label" /></div>
            <div className="self-end"><button type="button" className="btn-quiet" disabled={!canAdd} onClick={addBlock} data-testid="app-audio-add">블록 추가</button></div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-quiet" onClick={suggest} data-testid="app-audio-suggest">장소가 바뀌는 곳마다 나누어 제안받기</button>
            <span className="text-xs text-ink-soft">블록을 하나씩 만드는 수고를 줄이려는 시작 제안입니다. 이미 블록이 덮은 장면은 건드리지 않고, 만들어진 뒤에 범위를 자유롭게 고칠 수 있습니다.</span>
          </div>
        </div>
      )}
      {audio.blocks.map((b, i) => <BlockCard key={b.id} p={p} b={b} n={i + 1} update={update} />)}
    </section>
  );
}

function BlockCard({ p, b, n, update }: { p: Project; b: AudioBlock; n: number; update: Update }) {
  const v = blockView(p.scenes, b);
  const t = (item: string) => `app-audio-block-${pad2(n)}-${item}`;
  const [problem, setProblem] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const edit = (patch: Partial<AudioBlock>) => update((cur) => patchAudio(cur, (a) => ({ ...a, blocks: a.blocks.map((x) => (x.id === b.id ? { ...x, ...patch } : x)) })));
  const setStage = (next: AudioStage) => {
    const why = stageChangeProblem(p, b, next);
    setProblem(why);
    if (!why) edit({ stage: next });
  };
  const moveRange = (fromNo: number, toNo: number) => update((cur) => {
    const cb = audioOf(cur).blocks.find((x) => x.id === b.id);
    const nb = cb && rebaseBlock(cur, cb, fromNo - 1, toNo - 1);
    return nb ? patchAudio(cur, (a) => ({ ...a, blocks: a.blocks.map((x) => (x.id === b.id ? nb : x)) })) : cur;
  });
  const fromNo = v.fromNo ?? 1, toNo = v.toNo ?? fromNo;
  return (
    <article className="space-y-3 rounded-md border border-paper-line p-3" data-testid={t('card')} aria-labelledby={`${b.id}-h`}>
      <h3 id={`${b.id}-h`} className="text-lg font-semibold">블록 {pad2(n)} · {b.label} · {v.missing ? '장면 범위를 찾을 수 없음' : `장면 ${v.fromNo}–${v.toNo}`} · {stageLabel(b.stage)}</h3>
      {(v.stale || v.missing) && (
        <p className="text-sm text-danger" role="alert" data-testid={t('stale')}>
          {v.missing ? '이 블록의 장면 범위를 찾을 수 없습니다(장면표가 다시 만들어졌을 수 있습니다).' : '낭독문이 블록을 만든 뒤 바뀌었습니다. 새로 녹음해야 할 수 있습니다.'} 범위를 확인하고 「지금 글로 다시 맞추기」를 누르면 사람 청취·잠금은 풀립니다.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-[6rem_6rem_1fr]">
        <div><label className="field-label" htmlFor={`${b.id}-from`}>시작 장면</label><input id={`${b.id}-from`} className="input w-full" type="number" min={1} max={p.scenes.length} value={fromNo} onChange={(e) => moveRange(Number(e.target.value), Math.max(Number(e.target.value), toNo))} data-testid={t('from')} /></div>
        <div><label className="field-label" htmlFor={`${b.id}-to`}>끝 장면</label><input id={`${b.id}-to`} className="input w-full" type="number" min={1} max={p.scenes.length} value={toNo} onChange={(e) => moveRange(Math.min(fromNo, Number(e.target.value)), Number(e.target.value))} data-testid={t('to')} /></div>
        <div><label className="field-label" htmlFor={`${b.id}-label`}>블록 이름</label><input id={`${b.id}-label`} className="input w-full" value={b.label} onChange={(e) => edit({ label: e.target.value })} data-testid={t('label')} /></div>
      </div>
      {v.text && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="field-label">낭독문 ({v.text.replace(/\s/g, '').length}자)</p>
            <div className="flex gap-2">
              <CopyButton text={v.text} label="낭독문 복사" testid={t('copy-text')} />
              <CopyButton text={requestText(p, b, v.text)} label="요청문 복사" testid={t('copy-request')} />
            </div>
          </div>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-paper-line bg-white p-3 text-sm" data-testid={t('text')}>{v.text}</pre>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-quiet" onClick={() => moveRange(fromNo, toNo)} data-testid={t('rebase')}>지금 글로 다시 맞추기</button>
        {!asking ? (
          <button type="button" className="btn-quiet" onClick={() => setAsking(true)} data-testid={t('remove')}>기록 지우기</button>
        ) : (
          <span className="flex items-center gap-2 text-sm">
            이 블록 기록만 지웁니다(작업 폴더의 음성 파일은 지우지 않음).
            <button type="button" className="btn-quiet" onClick={() => update((cur) => patchAudio(cur, (a) => ({ ...a, blocks: a.blocks.filter((x) => x.id !== b.id) })))} data-testid={t('remove-confirm')}>지우기 확인</button>
            <button type="button" className="btn-quiet" onClick={() => setAsking(false)} data-testid={t('remove-cancel')}>취소</button>
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_7rem]">
        <div><label className="field-label" htmlFor={`${b.id}-file`}>음성 파일 이름</label><input id={`${b.id}-file`} className="input w-full" value={b.file} placeholder={`NB_${pad2(n)}.mp3`} onChange={(e) => edit({ file: e.target.value })} data-testid={t('file')} /></div>
        <div><label className="field-label" htmlFor={`${b.id}-sec`}>실측 길이(초)</label><input id={`${b.id}-sec`} className="input w-full" type="number" min={0} step="0.1" value={b.measuredSec ?? ''} onChange={(e) => edit({ measuredSec: e.target.value === '' ? null : Number(e.target.value) })} data-testid={t('sec')} /></div>
        <div><label className="field-label" htmlFor={`${b.id}-cr`}>표시된 크레딧</label><input id={`${b.id}-cr`} className="input w-full" type="number" min={0} value={b.creditsShown ?? ''} onChange={(e) => edit({ creditsShown: e.target.value === '' ? null : Number(e.target.value) })} data-testid={t('credits')} /></div>
      </div>
      <div>
        <label className="field-label" htmlFor={`${b.id}-stage`}>상태</label>
        <select id={`${b.id}-stage`} className="input" value={b.stage} onChange={(e) => setStage(e.target.value as AudioStage)} data-testid={t('stage')}>
          {AUDIO_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <p className="mt-1 text-xs text-ink-soft">{AUDIO_STAGES.find((s) => s.value === b.stage)?.who} · 「사람 청취」는 사람이 직접 듣고 고르는 상태이며 앱이나 AI가 대신 지정하지 않습니다.</p>
        {problem && <p className="text-sm text-danger" role="alert" data-testid={t('stage-problem')}>{problem}</p>}
      </div>
      <label className="field-label" htmlFor={`${b.id}-note`}>메모(발음·쉼·재녹음 이유)</label>
      <input id={`${b.id}-note`} className="input w-full" value={b.note} onChange={(e) => edit({ note: e.target.value })} data-testid={t('note')} />
    </article>
  );
}

function CuesSection({ p, update }: { p: Project; update: Update }) {
  const audio = audioOf(p);
  const edit = (id: string, patch: Partial<SoundCue>) => update((cur) => patchAudio(cur, (a) => ({ ...a, cues: a.cues.map((c) => (c.id === id ? { ...c, ...patch } : c)) })));
  return (
    <section className="space-y-3 rounded-lg border border-paper-line p-4" aria-labelledby="aud-cues-heading">
      <h2 id="aud-cues-heading" className="text-xl">4. 효과음·음악 큐</h2>
      <p className="text-sm text-ink-soft">
        내레이션 블록을 잠근 뒤에 얹습니다. 원문에 나오는 소리와 장소·회상 전환 신호만 적고, 내레이션이 묻히지 않게 아주 조금만 씁니다.
        출처가 분명한 라이브러리를 먼저 쓰고, 파일마다 출처와 이용 조건 메모를 남깁니다. Genspark 웹에서 효과음을 만들 수 있는지는 확인되지 않았으므로 소규모로 먼저 시험하세요.
      </p>
      {audio.cues.map((c, i) => {
        const t = (item: string) => `app-audio-cue-${pad2(i + 1)}-${item}`;
        return (
          <div key={c.id} className="grid gap-2 rounded-md border border-paper-line p-3 sm:grid-cols-[8rem_1fr]" data-testid={t('card')}>
            <label className="field-label" htmlFor={`${c.id}-kind`}>종류</label>
            <select id={`${c.id}-kind`} className="input" value={c.kind} onChange={(e) => edit(c.id, { kind: e.target.value as SoundCue['kind'] })} data-testid={t('kind')}>
              <option value="ambience">장소 배경음</option><option value="point">포인트 효과음</option><option value="music">음악</option>
            </select>
            <label className="field-label" htmlFor={`${c.id}-anchor`}>붙는 장면</label>
            <select id={`${c.id}-anchor`} className="input" value={c.anchorSceneId} onChange={(e) => edit(c.id, { anchorSceneId: e.target.value })} data-testid={t('anchor')}>
              {p.scenes.map((s, si) => <option key={s.id} value={s.id}>장면 {si + 1}{s.location ? ` · ${s.location}` : ''}</option>)}
            </select>
            <label className="field-label" htmlFor={`${c.id}-desc`}>어떤 소리</label>
            <input id={`${c.id}-desc`} className="input" value={c.description} placeholder="예: 시청역 통로 구두·운동화 소리" onChange={(e) => edit(c.id, { description: e.target.value })} data-testid={t('desc')} />
            <label className="field-label" htmlFor={`${c.id}-src`}>출처 종류</label>
            <select id={`${c.id}-src`} className="input" value={c.sourceKind} onChange={(e) => edit(c.id, { sourceKind: e.target.value as SoundCue['sourceKind'] })} data-testid={t('source-kind')}>
              <option value="library">효과음 라이브러리</option><option value="genspark">Genspark로 생성</option><option value="other">기타</option>
            </select>
            <label className="field-label" htmlFor={`${c.id}-srcnote`}>출처 메모(이름·ID)</label>
            <input id={`${c.id}-srcnote`} className="input" value={c.sourceNote} onChange={(e) => edit(c.id, { sourceNote: e.target.value })} data-testid={t('source-note')} />
            <label className="field-label" htmlFor={`${c.id}-lic`}>이용 조건 메모</label>
            <input id={`${c.id}-lic`} className="input" value={c.licenseNote} onChange={(e) => edit(c.id, { licenseNote: e.target.value })} data-testid={t('license')} />
            <label className="field-label" htmlFor={`${c.id}-file`}>파일 이름</label>
            <input id={`${c.id}-file`} className="input" value={c.file} onChange={(e) => edit(c.id, { file: e.target.value })} data-testid={t('file')} />
            {c.file.trim() && !c.licenseNote.trim() && <p className="text-sm text-danger sm:col-span-2" data-testid={t('license-warning')}>파일은 있는데 이용 조건 메모가 비어 있습니다.</p>}
            <div className="sm:col-span-2"><button type="button" className="btn-quiet" onClick={() => update((cur) => patchAudio(cur, (a) => ({ ...a, cues: a.cues.filter((x) => x.id !== c.id) })))} data-testid={t('remove')}>큐 기록 지우기</button></div>
          </div>
        );
      })}
      <button type="button" className="btn-quiet" disabled={p.scenes.length === 0} onClick={() => update((cur) => patchAudio(cur, (a) => ({ ...a, cues: [...a.cues, newCue(cur)] })))} data-testid="app-audio-cue-add">큐 추가</button>
    </section>
  );
}

function MasterSection({ p, update }: { p: Project; update: Update }) {
  const m = audioOf(p).master;
  const [problem, setProblem] = useState<string | null>(null);
  const edit = (patch: Partial<typeof m>) => update((cur) => patchAudio(cur, (a) => ({ ...a, master: { ...a.master, ...patch } })));
  const setStage = (next: AudioStage) => { const why = masterProblem(p, next); setProblem(why); if (!why) edit({ stage: next }); };
  return (
    <section className="space-y-3 rounded-lg border border-paper-line p-4" aria-labelledby="aud-master-heading">
      <h2 id="aud-master-heading" className="text-xl">5. 오디오 마스터</h2>
      <p className="text-sm text-ink-soft">
        내레이션·효과음·음악을 섞은 파일입니다. Genspark AI Audio는 여러 트랙을 섞어 내보내는 기능이 확인되지 않아 별도 편집기에서 섞습니다. 내레이션·효과음·음악 원본은 따로 보관하세요.
        화면을 끄고 휴대폰 스피커로 들어도 인물·관계·장소 이동·회상·결말을 이해할 수 있는지 사람이 확인합니다. 음량 측정은 앱이 하지 않습니다.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
        <div><label className="field-label" htmlFor="aud-master-file">마스터 파일 이름</label><input id="aud-master-file" className="input w-full" value={m.file} onChange={(e) => edit({ file: e.target.value })} data-testid="app-audio-master-file" /></div>
        <div><label className="field-label" htmlFor="aud-master-sec">실측 길이(초)</label><input id="aud-master-sec" className="input w-full" type="number" min={0} step="0.1" value={m.measuredSec ?? ''} onChange={(e) => edit({ measuredSec: e.target.value === '' ? null : Number(e.target.value) })} data-testid="app-audio-master-sec" /></div>
      </div>
      <label className="field-label" htmlFor="aud-master-loud">음량 메모(측정한 편집기·수치)</label>
      <input id="aud-master-loud" className="input w-full" value={m.loudnessNote} onChange={(e) => edit({ loudnessNote: e.target.value })} data-testid="app-audio-master-loudness" />
      <label className="field-label" htmlFor="aud-master-listen">화면 없이 들은 확인 메모</label>
      <textarea id="aud-master-listen" className="input min-h-[5rem] w-full" value={m.listeningNote} placeholder="누가 말하는지 · 언제인지 · 어디인지가 귀로 구분되었는가" onChange={(e) => edit({ listeningNote: e.target.value })} data-testid="app-audio-master-listening" />
      <div>
        <label className="field-label" htmlFor="aud-master-stage">상태</label>
        <select id="aud-master-stage" className="input" value={m.stage} onChange={(e) => setStage(e.target.value as AudioStage)} data-testid="app-audio-master-stage">
          {AUDIO_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {problem && <p className="text-sm text-danger" role="alert" data-testid="app-audio-master-problem">{problem}</p>}
        <p className="mt-1 text-xs text-ink-soft">마스터의 「사람 청취」·「잠금」은 모든 장면이 잠금·최신 블록에 덮여 있어야 고를 수 있습니다.</p>
      </div>
    </section>
  );
}
