import { AiAssist } from '@/components/AiAssist';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CopyButton } from '@/components/CopyButton';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { useFolder } from '@/hooks/useFolder';
import { useProject } from '@/hooks/useProject';
import { authoringOf, emptyAuthoring, patchAuthoring, parseEpisodeNotesInput } from '@/lib/authoring';
import { buildNextEpisodeProject } from '@/lib/nextEpisode';
import * as serial from '@/lib/serial';
import { store } from '@/lib/storage';
import { appTid } from '@/lib/testid';
import type { AuthoringData, ConfirmedEpisode, EpisodeCommit, EpisodeWorkingNotes, SeriesState } from '@/types/authoring';
import { LoadingOrError } from './LoadingOrError';

/**
 * /p/:id/serial — 연재(시리즈) 회차 기록
 *
 * - 회차 작업 노트는 사람이 확정하기 전까지 모두 「제안」이다.
 * - 기존 시리즈를 읽어도 이번 회차 노트를 덮어쓰지 않는다. 빈 칸에만 채우는 버튼을 따로 둔다.
 * - 확정은 미리보기 → 사람 확인 체크 → 확정 버튼 순서로만 된다. 프로젝트가 바뀌면 체크가 풀린다.
 * - 이 화면은 단계 완료(progress)·권리·원문 확인 값을 바꾸지 않고, 그림·음성 생성도 하지 않는다.
 */

const NOTE_FIELDS: { key: keyof EpisodeWorkingNotes; label: string; hint: string }[] = [
  { key: 'summary', label: '회차 요약', hint: '이번 회에 일어난 일을 몇 문장으로 적습니다.' },
  { key: 'events', label: '주요 사건', hint: '다음 회가 알아야 할 사건을 순서대로 적습니다.' },
  { key: 'characterStates', label: '인물 상태', hint: '회차가 끝났을 때 인물의 처지·마음·관계.' },
  { key: 'knowledgeStates', label: '누가 무엇을 아는가', hint: '인물별로 알게 된 사실과 아직 모르는 사실.' },
  { key: 'openThreads', label: '열린 이야기 줄기', hint: '아직 풀리지 않은 질문·복선.' },
  { key: 'visualContinuity', label: '그림 이어짐', hint: '옷차림·소품·상처·계절처럼 다음 회 그림에서 이어져야 할 것.' },
  { key: 'nextEpisode', label: '다음 회 메모', hint: '다음 회에서 이어 갈 방향(제안).' },
  { key: 'changeReason', label: '고친 이유', hint: '이미 확정한 회차를 다시 확정할 때 무엇을 왜 고쳤는지 적습니다.' },
];

const CONFIRM_LABEL = '원고·회차 기록·현재 상태 변경안을 확인했습니다';

/** 폴더 이름으로 쓸 수 있는 시리즈 ID인지 검사한다. 문제가 없으면 null */
function seriesIdProblem(raw: string): string | null {
  const s = raw.trim();
  if (!s) return '시리즈 ID를 적으세요. 작업 폴더의 시리즈 폴더 이름으로 쓰입니다.';
  if (s !== raw) return '시리즈 ID 앞뒤에 띄어쓰기를 넣지 마세요.';
  if (!serial.safeSeriesId(s)) return '시리즈 ID는 한글·영문·숫자로 시작하고 한글·영문·숫자·밑줄(_)·붙임표(-)만 80자 이하로 씁니다. 띄어쓰기, / \\ : * ? " < > | 와 CON·NUL 같은 예약 이름은 쓸 수 없습니다.';
  return null;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function notesText(n: EpisodeWorkingNotes): string {
  return NOTE_FIELDS.map((f) => `### ${f.label}\n${n[f.key].trim() || '(비어 있음)'}`).join('\n\n');
}

/** 다음 회차를 맡을 AI·사람이 읽을 시리즈 맥락 글 */
function seriesContextText(state: SeriesState, last: ConfirmedEpisode | null): string {
  const lines = [
    `# 시리즈 맥락: ${state.title || state.seriesId}`,
    `- 시리즈 ID: ${state.seriesId}`,
    `- 시리즈 상태 revision: ${state.revision} (갱신 ${state.updatedAt})`,
    `- 작가 지침 파일: ${state.guidelinePath || '(없음)'}`,
    `- 마지막 확정 회차: ${last ? `${last.episodeNo}회 「${last.title}」 revision ${last.revision}, ${last.confirmedBy} 확정 ${last.confirmedAt}` : '(없음)'}`,
    '',
    '## 회차 목록',
    ...(state.episodeIndex.length
      ? state.episodeIndex.map((e) => `- ${e.episodeNo}회 「${e.title}」 revision ${e.revision}${e.needsReview ? ' · 다시 검토 필요' : ''} · ${e.recordPath}`)
      : ['- (아직 없음)']),
    '',
    '## 현재 상태 (마지막 확정 기준)',
    notesText(state.currentNotes),
  ];
  if (last) {
    lines.push('', '## 마지막 확정 회차 원고', last.scriptText || '(비어 있음)');
  }
  lines.push('', '주의: 위 내용은 확정 기록입니다. 다음 회차 제안은 이 기록을 덮어쓰지 말고 새 회차 노트로 따로 적으세요.');
  return lines.join('\n');
}

const readFolderSeries: ((id: string) => Promise<SeriesState | null>) | undefined = serial.readFolderSeries;

export function SerialPage() {
  const { id } = useParams();
  const api = useProject(id);
  const { state: folder } = useFolder();
  const navigate = useNavigate();
  const p = api.project;
  const a = p ? authoringOf(p) : emptyAuthoring();
  const seriesId = a.episode.seriesId.trim();
  const fingerprint = p ? JSON.stringify(p) : '';
  const latestFingerprint = useRef(fingerprint);
  latestFingerprint.current = fingerprint;
  const preparedFingerprint = useRef('');

  // 목록·읽기 상태 (원본 기록을 바꾸지 않는다)
  const [refreshKey, setRefreshKey] = useState(0);
  const [pickId, setPickId] = useState('');
  const [viewState, setViewState] = useState<SeriesState | null>(null);
  const [viewSource, setViewSource] = useState<'browser' | 'folder' | null>(null);
  const [viewEpisode, setViewEpisode] = useState<ConfirmedEpisode | null>(null);
  const [readMsg, setReadMsg] = useState('');
  const [readError, setReadError] = useState('');
  const [missingRecord, setMissingRecord] = useState<{ sid: string; episodeId: string; revision: number } | null>(null);

  // 확정 흐름
  const [actor, setActor] = useState('');
  const [prepared, setPrepared] = useState<EpisodeCommit | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<'' | 'prepare' | 'commit' | 'zip' | 'next' | 'folder' | 'cancel' | 'series-zip' | 'import-zip' | 'recover'>('');
  const [commitError, setCommitError] = useState('');
  const [committed, setCommitted] = useState<{ commit: EpisodeCommit; folderWritten: boolean; folderPath?: string; state: SeriesState } | null>(null);
  const [zipMsg, setZipMsg] = useState('');
  const [nextError, setNextError] = useState('');

  // 미완료 요청 취소·전체 백업·폴더 복구 (모두 사람이 누를 때만 실행)
  const [cancelChecked, setCancelChecked] = useState<Record<string, boolean>>({});
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [seriesZipMsg, setSeriesZipMsg] = useState('');
  const [seriesZipError, setSeriesZipError] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipImportMsg, setZipImportMsg] = useState('');
  const [zipImportError, setZipImportError] = useState('');
  const [recoverChecked, setRecoverChecked] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState('');
  const [recoverError, setRecoverError] = useState('');

  // 가져오기
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importMsg, setImportMsg] = useState('');

  const seriesList = useMemo(() => {
    void refreshKey;
    try {
      return { list: serial.listSeries(), error: '' };
    } catch (e) {
      return { list: [] as SeriesState[], error: errText(e) };
    }
  }, [refreshKey]);

  const currentSeries = useMemo(() => {
    void refreshKey;
    if (!seriesId || seriesIdProblem(seriesId)) return null;
    try {
      return serial.loadSeries(seriesId);
    } catch {
      return null;
    }
  }, [seriesId, refreshKey]);

  const recoveryNotes = useMemo(() => {
    void refreshKey;
    const ids = new Set<string>();
    if (seriesId && !seriesIdProblem(seriesId)) ids.add(seriesId);
    if (viewState) ids.add(viewState.seriesId);
    const out: { sid: string; notes: string[] }[] = [];
    for (const sid of ids) {
      try {
        const notes = serial.getRecoveryNotes(sid);
        if (notes.length) out.push({ sid, notes });
      } catch (e) {
        out.push({ sid, notes: [`복구 안내를 읽지 못했습니다 (${errText(e)})`] });
      }
    }
    return out;
  }, [seriesId, viewState, refreshKey]);

  const lastConfirmed = useMemo(() => {
    const st = viewState;
    if (!st?.latestConfirmedEpisodeId) return null;
    try {
      return serial.loadEpisode(st.seriesId, st.latestConfirmedEpisodeId);
    } catch {
      return null;
    }
  }, [viewState]);

  // 다음 회 프로젝트의 기준: 방금 확정한 상태가 있으면 그것, 아니면 읽어 온 상태
  const nextBase = useMemo(() => {
    if (committed) return { state: committed.state, last: committed.commit.episode };
    if (viewState && lastConfirmed) return { state: viewState, last: lastConfirmed };
    return null;
  }, [committed, viewState, lastConfirmed]);

  // 프로젝트가 바뀌면 미리보기와 사람 확인 체크를 푼다 (확정한 결과·ZIP은 남긴다)
  useEffect(() => {
    setPrepared(null);
    setChecked(false);
  }, [p]);

  // 다음 회 프로젝트로 옮겨 가면(같은 화면, 다른 id) 이전 프로젝트의 화면 상태를 비운다
  useEffect(() => {
    setViewState(null);
    setViewSource(null);
    setViewEpisode(null);
    setPickId('');
    setMissingRecord(null);
    setReadMsg('');
    setReadError('');
    setCommitted(null);
    setCommitError('');
    setZipMsg('');
    setNextError('');
    setImportMsg('');
    setImportError('');
    setCancelChecked({});
    setCancelMsg('');
    setCancelError('');
    setSeriesZipMsg('');
    setSeriesZipError('');
    setZipFile(null);
    setZipImportMsg('');
    setZipImportError('');
    setRecoverChecked(false);
    setRecoverMsg('');
    setRecoverError('');
  }, [id]);

  // 폴더 복구 대상 시리즈가 바뀌면 복구 확인 체크를 푼다
  const viewedSeriesId = viewState?.seriesId ?? '';
  useEffect(() => {
    setRecoverChecked(false);
  }, [viewedSeriesId, pickId, seriesId]);

  const updateEpisode = useCallback(
    (patch: Partial<AuthoringData['episode']>) => {
      api.update((cur) => {
        const ca = authoringOf(cur);
        return patchAuthoring(cur, { episode: { ...ca.episode, ...patch } });
      });
    },
    [api],
  );

  if (!p) return <LoadingOrError error={api.loadError} />;

  const idProblem = seriesIdProblem(a.episode.seriesId);
  const existingSame = currentSeries?.episodeIndex.find((e) => e.episodeNo === a.episode.episodeNo) ?? null;
  const laterEpisodes = currentSeries?.episodeIndex.filter((e) => e.episodeNo > a.episode.episodeNo) ?? [];
  const revisionDrift = currentSeries ? currentSeries.revision !== a.episode.basedOnSeriesRevision : a.episode.basedOnSeriesRevision !== 0;
  const saveBlocked = api.saveState.kind === 'error' ? `저장 실패 상태에서는 확정할 수 없습니다: ${api.saveState.message}` : api.saveState.kind === 'pending' ? '아직 저장 중입니다. 「지금 저장」을 누르거나 저장이 끝난 뒤 다시 시도하세요.' : '';
  const prechecks: string[] = [];
  if (idProblem) prechecks.push(idProblem);
  if (!actor.trim()) prechecks.push('확정하는 사람 이름(별칭)을 적으세요.');
  if (p.script.fullText.trim().length < 100) prechecks.push('원고 본문이 100자 이상이어야 회차 기록으로 확정할 수 있습니다(1단계 원고).');
  if (!a.episode.notes.summary.trim()) prechecks.push('회차 요약을 적으세요.');
  if (!p.title.trim()) prechecks.push('회차 제목(프로젝트 제목)을 적으세요.');
  if (a.scriptMode === 'original_narration') {
    if (!a.rights.confirmed || a.rights.status === 'unknown' || !a.rights.basis.trim()) prechecks.push('원작 낭독 모드에서는 권리 상태·근거 입력과 권리 확인이 먼저 필요합니다(원문 화면).');
  } else if (!p.source.type || !p.source.note.trim() || !p.source.noCommercialBookConfirmed || !p.script.ownWordingConfirmed) {
    prechecks.push('각색 모드에서는 0단계 출처·시판 그림책 미사용 확인과 1단계 새 문장 작성 확인이 먼저 필요합니다.');
  }
  if (existingSame && !a.episode.notes.changeReason.trim()) prechecks.push(`${existingSame.episodeNo}회는 이미 확정되어 있습니다. 다시 확정하려면 「고친 이유」를 적으세요.`);

  const contextState = viewState ?? currentSeries;
  // 노트 칸 옆에 늘 보여 줄 이전 확정 상태: 이번 회차가 연결된 시리즈가 우선, 없으면 읽어 온 시리즈
  const notesBase = currentSeries ?? viewState;
  const contextLast = viewState ? lastConfirmed : (() => {
    if (!currentSeries?.latestConfirmedEpisodeId) return null;
    try {
      return serial.loadEpisode(currentSeries.seriesId, currentSeries.latestConfirmedEpisodeId);
    } catch {
      return null;
    }
  })();
  const contextText = contextState ? seriesContextText(contextState, contextLast) : '';
  // 전체 백업 대상: 읽어 온 시리즈가 우선, 없으면 이번 회차가 연결된 시리즈(브라우저에 있는 것만)
  const backupTarget = (viewState && viewSource === 'browser' ? viewState : null) ?? currentSeries ?? (viewState ? (() => { try { return serial.loadSeries(viewState.seriesId); } catch { return null; } })() : null);
  // 폴더 복구 대상과 브라우저의 지금 revision (복구 함수의 기대값)
  const recoverTarget = viewState?.seriesId || pickId || (seriesId && !idProblem ? seriesId : '');
  const recoverExpected = (() => {
    if (!recoverTarget) return 0;
    try {
      return serial.loadSeries(recoverTarget)?.revision ?? 0;
    } catch {
      return 0;
    }
  })();

  const pickSeries = (sid: string) => {
    setReadError('');
    setReadMsg('');
    setViewEpisode(null);
    try {
      const st = serial.loadSeries(sid);
      if (!st) {
        setReadError(`시리즈 ${sid}의 상태를 찾지 못했습니다.`);
        return;
      }
      setViewState(st);
      setViewSource('browser');
      setReadMsg(`시리즈 ${st.seriesId} revision ${st.revision}을 읽었습니다. 이번 회차 노트는 바꾸지 않았습니다.`);
    } catch (e) {
      setReadError(`시리즈를 읽지 못했습니다: ${errText(e)}`);
    }
  };

  const readFromFolder = async () => {
    if (!readFolderSeries) return;
    const sid = pickId || seriesId;
    if (!sid) {
      setReadError('폴더에서 읽을 시리즈 ID를 먼저 고르거나 적으세요.');
      return;
    }
    setBusy('folder');
    setReadError('');
    setReadMsg('');
    try {
      const st = await readFolderSeries(sid);
      if (!st) setReadError(`작업 폴더에서 시리즈 ${sid}를 찾지 못했습니다.`);
      else {
        setViewState(st);
        setViewSource('folder');
        setViewEpisode(null);
        setReadMsg(`작업 폴더에서 시리즈 ${st.seriesId} revision ${st.revision}을 읽었습니다(화면에만 표시, 브라우저 기록은 바꾸지 않음).`);
      }
    } catch (e) {
      setReadError(`작업 폴더에서 읽지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const linkToViewed = () => {
    if (!viewState) return;
    updateEpisode({ seriesId: viewState.seriesId, basedOnSeriesRevision: viewState.revision });
    if (!a.guidelinePath.trim() && viewState.guidelinePath) {
      api.update((cur) => patchAuthoring(cur, { guidelinePath: viewState.guidelinePath }));
    }
    api.log(`시리즈 ${viewState.seriesId} revision ${viewState.revision}을 이번 회차의 기준으로 연결했습니다`);
    setReadMsg(`이번 회차를 시리즈 ${viewState.seriesId} revision ${viewState.revision} 기준으로 연결했습니다. 노트는 바꾸지 않았습니다.`);
  };

  const fillEmptyNotes = (from: SeriesState | null) => {
    if (!from) return;
    const src = from.currentNotes;
    const fillable = (n: EpisodeWorkingNotes, f: (typeof NOTE_FIELDS)[number]) => f.key !== 'changeReason' && !n[f.key].trim() && !!src[f.key].trim();
    const filled = NOTE_FIELDS.filter((f) => fillable(a.episode.notes, f)).map((f) => f.label);
    if (!filled.length) {
      setReadMsg('채울 빈 칸이 없거나 이전 상태가 비어 있어 바꾼 칸이 없습니다.');
      return;
    }
    api.update((cur) => {
      const ca = authoringOf(cur);
      const notes = { ...ca.episode.notes };
      for (const f of NOTE_FIELDS) {
        if (fillable(notes, f)) notes[f.key] = src[f.key].replace(/^(?:\[이전 확정 상태 참고 · 제안\]\s*)+/, '');
      }
      return patchAuthoring(cur, { episode: { ...ca.episode, notes } });
    });
    setReadMsg(`빈 칸에만 이전 상태를 참고로 채웠습니다: ${filled.join(', ')}. 이미 적은 칸은 그대로입니다.`);
  };

  const viewEpisodeRecord = (sid: string, episodeId: string, revision: number) => {
    setReadError('');
    setMissingRecord(null);
    try {
      const ep = serial.loadEpisode(sid, episodeId, revision);
      if (!ep) {
        setReadError(`이 브라우저에 회차 기록 ${episodeId} revision ${revision}이 없습니다. 작업 폴더가 연결되어 있으면 폴더에서 복구할 수 있습니다.`);
        setMissingRecord({ sid, episodeId, revision });
      }
      setViewEpisode(ep);
    } catch (e) {
      setReadError(`회차 기록을 읽지 못했습니다: ${errText(e)}`);
    }
  };

  /** 브라우저에 없는 회차 기록을 작업 폴더에서 읽어 브라우저 기록에 더한다(기존 기록은 바꾸지 않는다) */
  const recoverRecord = async () => {
    if (!missingRecord) return;
    setBusy('folder');
    setReadError('');
    try {
      const ep = await serial.recoverEpisodeFromFolder(missingRecord.sid, missingRecord.episodeId, missingRecord.revision);
      if (!ep) setReadError('작업 폴더에서도 이 회차 기록을 찾지 못했습니다.');
      else {
        setViewEpisode(ep);
        setMissingRecord(null);
        setReadMsg(`작업 폴더에서 ${ep.episodeNo}회 revision ${ep.revision} 기록을 읽어 브라우저 기록에 더했습니다.`);
      }
    } catch (e) {
      setReadError(`작업 폴더에서 복구하지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const prepare = async () => {
    setCommitError('');
    setChecked(false);
    setPrepared(null);
    if (idProblem) {
      setCommitError(idProblem);
      return;
    }
    setBusy('prepare');
    try {
      const value = await serial.prepareEpisodeCommit(p, actor.trim(), a.episode.basedOnSeriesRevision);
      if (latestFingerprint.current !== fingerprint) throw new Error('미리보기 준비 중 프로젝트가 바뀌었습니다. 다시 미리보기를 만드세요.');
      preparedFingerprint.current = fingerprint;
      setPrepared(value);
    } catch (e) {
      setCommitError(`확정 미리보기를 만들지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const confirmCommit = async () => {
    setCommitError('');
    if (saveBlocked) {
      setCommitError(saveBlocked);
      return;
    }
    if (preparedFingerprint.current !== latestFingerprint.current) { setCommitError('프로젝트가 바뀌었습니다. 새 미리보기를 확인하세요.'); setChecked(false); return; }
    if (!prepared || !checked || !actor.trim()) {
      setCommitError('미리보기를 만들고, 사람 확인 칸에 체크하고, 확정하는 사람 이름을 적어야 합니다.');
      return;
    }
    setBusy('commit');
    try {
      // 미리보기로 보여 준 바로 그 확정 요청을 저장한다. 실패하면 같은 요청으로 다시 시도할 수 있다
      const fresh = prepared;
      const res = await serial.commitEpisode(fresh);
      setCommitted({ commit: fresh, folderWritten: res.folderWritten, folderPath: res.folderPath, state: res.state });
      setZipMsg('');
      setRefreshKey((k) => k + 1);
      updateEpisode({ basedOnSeriesRevision: res.state.revision });
      api.log(
        `${fresh.episode.episodeNo}회 회차 기록 revision ${fresh.episode.revision}을 ${fresh.episode.confirmedBy} 이름으로 확정했습니다 (시리즈 ${res.state.seriesId} revision ${fresh.previousState?.revision ?? 0} → ${res.state.revision}, ${res.folderWritten ? `작업 폴더 ${res.folderPath ?? ''}` : '브라우저 기록만'})`,
      );
    } catch (e) {
      setCommitError(`확정하지 못했습니다. 입력한 내용은 그대로 있습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const downloadZip = async () => {
    if (!committed) return;
    setBusy('zip');
    setZipMsg('');
    try {
      const blob = await serial.buildEpisodeZip(committed.commit);
      const ep = committed.commit.episode;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ep.seriesId}_${String(ep.episodeNo).padStart(2, '0')}회_r${ep.revision}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setZipMsg('확정 묶음 ZIP 내려받기를 요청했습니다. 브라우저 다운로드 목록을 확인하세요.');
    } catch (e) {
      setZipMsg(`ZIP을 만들지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const makeNextProject = async () => {
    if (!nextBase) return;
    setNextError('');
    setBusy('next');
    try {
      // 이 프로젝트의 남은 변경을 먼저 저장한 뒤 새 프로젝트로 옮겨 간다
      if (api.saveState.kind === 'error' || (api.saveState.kind === 'pending' && !(await api.flush()))) throw new Error('현재 프로젝트를 저장하지 못했습니다. 백업 후 오류를 확인하세요.');
      if (!serial.sameJson(serial.loadSeries(nextBase.state.seriesId), nextBase.state)) throw new Error('시리즈 기록이 갱신되었습니다. 최신 상태를 다시 읽으세요.');
      const np = buildNextEpisodeProject(nextBase.state, nextBase.last);
      await store.save(np);
      navigate(`/p/${np.id}/serial`);
    } catch (e) {
      setNextError(`다음 회 프로젝트를 만들지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  /** 미리보기와 확인 체크를 푼다: 시리즈 기록이 바뀌어 기준 revision이 달라졌을 수 있다 */
  const dropPrepared = () => {
    setPrepared(null);
    setChecked(false);
    preparedFingerprint.current = '';
  };

  const cancelPending = async (sid: string) => {
    if (!cancelChecked[sid]) return;
    setBusy('cancel');
    setCancelMsg('');
    setCancelError('');
    try {
      await serial.cancelPendingCommit(sid);
      dropPrepared();
      setCancelChecked((c) => ({ ...c, [sid]: false }));
      setRefreshKey((k) => k + 1);
      setCancelMsg(`시리즈 ${sid}의 미완료 확정 요청을 취소했습니다. 작업 폴더에 이미 쓴 파일은 지우지 않았습니다. 필요하면 미리보기를 다시 만드세요.`);
      api.log(`시리즈 ${sid}의 미완료 확정 요청을 취소했습니다(폴더 파일은 그대로 둠)`);
    } catch (e) {
      setCancelError(`미완료 요청을 취소하지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const downloadSeriesZip = async (sid: string) => {
    setBusy('series-zip');
    setSeriesZipMsg('');
    setSeriesZipError('');
    try {
      const blob = await serial.buildSeriesZip(sid);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sid}_전체시리즈_백업.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSeriesZipMsg('전체 시리즈 백업 ZIP 내려받기를 요청했습니다. 브라우저 다운로드 목록을 확인하세요.');
    } catch (e) {
      setSeriesZipError(`전체 시리즈 ZIP을 만들지 못했습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const importZip = async () => {
    setZipImportMsg('');
    setZipImportError('');
    if (!zipFile) {
      setZipImportError('가져올 전체 시리즈 백업 ZIP 파일을 고르세요.');
      return;
    }
    setBusy('import-zip');
    try {
      const st = await serial.importSeriesZip(zipFile);
      setRefreshKey((k) => k + 1);
      setPickId(st.seriesId);
      setViewState(st);
      setViewSource('browser');
      setViewEpisode(null);
      if (st.seriesId === seriesId) dropPrepared();
      setZipImportMsg(`전체 시리즈 백업에서 시리즈 ${st.seriesId} revision ${st.revision}(${st.episodeIndex.length}개 회차)을 가져와 위에 표시했습니다. 이번 회차와 연결하려면 「이 시리즈 기준으로 연결」을 누르세요.`);
    } catch (e) {
      setZipImportError(`가져오지 못했습니다. 브라우저 기록은 바꾸지 않았습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const recoverFromFolder = async (sid: string, expected: number) => {
    if (!recoverChecked) return;
    setBusy('recover');
    setRecoverMsg('');
    setRecoverError('');
    try {
      const st = await serial.recoverSeriesFromFolder(sid, expected);
      dropPrepared();
      setRecoverChecked(false);
      setRefreshKey((k) => k + 1);
      setPickId(st.seriesId);
      setViewState(st);
      setViewSource('browser');
      setViewEpisode(null);
      setRecoverMsg(`작업 폴더의 기록으로 브라우저의 시리즈 ${sid}를 revision ${expected}에서 ${st.revision}으로 복구했습니다. 이번 회차의 기준 revision은 직접 다시 연결하세요.`);
      api.log(`작업 폴더 기록으로 시리즈 ${sid}를 revision ${expected} → ${st.revision}으로 복구했습니다`);
    } catch (e) {
      setRecoverError(`복구하지 못했습니다. 브라우저 기록은 바꾸지 않았습니다: ${errText(e)}`);
    } finally {
      setBusy('');
    }
  };

  const doImport = () => {
    setImportError('');
    setImportMsg('');
    if (!importText.trim()) {
      setImportError('가져올 시리즈 상태 JSON을 붙여 넣으세요.');
      return;
    }
    try {
      const st = serial.importSeriesState(importText);
      setImportMsg(`시리즈 ${st.seriesId} revision ${st.revision}을 가져왔습니다. 이번 회차와 연결하려면 위 목록에서 고른 뒤 「이 시리즈 기준으로 연결」을 누르세요.`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setImportError(`가져오지 못했습니다. 붙여 넣은 글은 그대로 두었습니다: ${errText(e)}`);
    }
  };

  const prev = prepared?.previousState ?? null;
  const changedNoteKeys = prepared
    ? NOTE_FIELDS.filter((f) => (prev?.currentNotes[f.key] ?? '') !== prepared.nextState.currentNotes[f.key]).map((f) => f.label)
    : [];
  const currentNotesKept = !!prepared && !!prev && JSON.stringify(prepared.nextState.currentNotes) === JSON.stringify(prev.currentNotes) && JSON.stringify(prepared.episode.notes) !== JSON.stringify(prev.currentNotes);
  const droppedKeys = prepared && prev
    ? NOTE_FIELDS.filter((f) => f.key !== 'changeReason' && prev.currentNotes[f.key].trim() && !prepared.episode.notes[f.key].trim()).map((f) => f.label)
    : [];
  const preparedIndex = prepared?.nextState.episodeIndex.find((e) => e.episodeId === prepared.episode.episodeId && e.revision === prepared.episode.revision);

  return (
    <div className="min-h-screen">
      <AppHeader project={p} saveState={api.saveState} />
      <NextActionBar project={p} viewing={null} />
      <main className="mx-auto max-w-[960px] px-4 py-8 lg:px-6" data-testid={appTid('serial')}>
        <p className="text-sm text-ink-soft">연재 회차 기록 · 프로젝트 ID {p.id}</p>
        <h1 className="text-[28px] leading-tight">시리즈 회차 기록</h1>
        <p className="mt-2 text-sm text-ink-soft">
          이번 회차의 원고와 작업 노트를 시리즈 기록으로 확정합니다. 확정 전 노트는 모두 제안입니다. 이 화면은 단계 완료·권리 확인을 바꾸지 않고, 그림·음성 생성도 하지 않습니다.
        </p>

        {recoveryNotes.length > 0 && (
          <section className="mt-4 rounded-lg border border-ocher/40 bg-paper p-4 text-sm" data-testid={appTid('serial-recovery')} role="alert">
            <h2 className="font-sans text-sm font-bold text-ocher">복구·검토 안내</h2>
            {recoveryNotes.map(({ sid, notes }) => (
              <div key={sid} className="mt-2" data-testid={appTid(`serial-recovery-${sid}`)}>
                <p className="font-semibold">시리즈 {sid}</p>
                <ul className="mt-1 list-disc pl-5">
                  {notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
                <div className="mt-2 flex items-start gap-2">
                  <input
                    id={`serial-cancel-confirm-${sid}`}
                    type="checkbox"
                    className="mt-1"
                    checked={!!cancelChecked[sid]}
                    onChange={(e) => setCancelChecked((c) => ({ ...c, [sid]: e.target.checked }))}
                    data-testid={appTid(`serial-cancel-confirm-${sid}`)}
                  />
                  <label htmlFor={`serial-cancel-confirm-${sid}`}>
                    미완료 요청만 취소하고, 작업 폴더에 이미 쓴 회차 파일(기존 revision 포함)은 지우지 않는다는 것을 확인했습니다
                  </label>
                </div>
                <button type="button" className="btn-quiet mt-2" disabled={!cancelChecked[sid] || busy !== ''} onClick={() => void cancelPending(sid)} data-testid={appTid(`serial-cancel-pending-${sid}`)}>
                  {busy === 'cancel' ? '취소하는 중…' : '미완료 요청 취소'}
                </button>
              </div>
            ))}
            <p className="field-hint">같은 원고로 다시 확정하면 미완료 요청을 이어서 마칠 수 있습니다. 취소는 그 요청을 버릴 때만 누르세요.</p>
          </section>
        )}
        {cancelError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-cancel-error')}>{cancelError}</p>}
        {cancelMsg && <p role="status" className="mt-2 text-sm text-celadon" data-testid={appTid('serial-cancel-status')}>{cancelMsg}</p>}

        {/* 1. 이번 회차 설정 */}
        <section aria-labelledby="serial-setup-heading" className="mt-6 rounded-lg border border-paper-line bg-paper p-5">
          <h2 id="serial-setup-heading" className="font-sans text-lg font-bold">이번 회차</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_140px]">
            <div>
              <label htmlFor="serial-series-id" className="field-label">시리즈 ID</label>
              <input
                id="serial-series-id"
                className="input"
                value={a.episode.seriesId}
                onChange={(e) => updateEpisode({ seriesId: e.target.value })}
                placeholder="예: 해님달님"
                data-testid={appTid('serial-series-id')}
              />
              <p className={`field-hint ${idProblem && a.episode.seriesId ? 'text-danger' : ''}`} data-testid={appTid('serial-series-id-hint')}>
                {idProblem ?? '작업 폴더의 시리즈 폴더 이름으로 쓰입니다.'}
              </p>
            </div>
            <div>
              <label htmlFor="serial-episode-no" className="field-label">회차 번호</label>
              <input
                id="serial-episode-no"
                type="number"
                min={1}
                className="input"
                value={a.episode.episodeNo}
                onChange={(e) => updateEpisode({ episodeNo: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                data-testid={appTid('serial-episode-no')}
              />
            </div>
          </div>
          <label htmlFor="serial-guideline-path" className="field-label mt-4">작가 지침 파일 경로</label>
          <input
            id="serial-guideline-path"
            className="input"
            value={a.guidelinePath}
            onChange={(e) => api.update((cur) => patchAuthoring(cur, { guidelinePath: e.target.value }))}
            placeholder="예: series/해님달님/guideline.md"
            data-testid={appTid('serial-guideline-path')}
          />
          <p className="mt-3 text-sm" data-testid={appTid('serial-based-on')} data-revision={a.episode.basedOnSeriesRevision}>
            기준 시리즈 revision: <strong>{a.episode.basedOnSeriesRevision}</strong>
            {currentSeries ? ` · 저장된 시리즈 최신 revision ${currentSeries.revision}` : seriesId && !idProblem ? ' · 이 ID로 저장된 시리즈가 아직 없습니다(첫 회차)' : ''}
          </p>
          {revisionDrift && currentSeries && (
            <p className="mt-1 text-sm font-semibold text-ocher" data-testid={appTid('serial-revision-drift')}>
              기준 revision과 저장된 시리즈 revision이 다릅니다. 아래 「기존 시리즈 읽기」에서 최신 상태를 읽고 「이 시리즈 기준으로 연결」을 누르세요.
            </p>
          )}
          {existingSame && (
            <p className="mt-1 text-sm font-semibold text-ocher" data-testid={appTid('serial-revise-warning')}>
              {existingSame.episodeNo}회는 이미 revision {existingSame.revision}로 확정되어 있습니다. 다시 확정하면 새 revision으로 고쳐 씁니다.
              {laterEpisodes.length > 0 && ` 뒤 회차(${laterEpisodes.map((e) => `${e.episodeNo}회`).join(', ')})는 다시 검토 필요로 표시될 수 있습니다.`}
            </p>
          )}
        </section>

        {/* 2. 회차 작업 노트 (제안) */}
        <section aria-labelledby="serial-notes-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-notes')}>
          <h2 id="serial-notes-heading" className="font-sans text-lg font-bold">회차 작업 노트 <span className="text-sm font-semibold text-ocher">제안 · 사람 확정 전</span></h2>
          <p className="mt-1 text-sm text-ink-soft">AI와 나눈 대화에서 정리한 내용을 적습니다. 아래 확정 절차를 거치기 전에는 시리즈 기록이 아닙니다.</p>
          <p className="mt-1 text-sm font-semibold text-ocher">
            확정하면 이 노트가 시리즈의 「현재 상태」를 통째로 대신합니다. 이번에 새로 생긴 일만 적지 말고, 이어 갈 과거 설정·인물 상태·아직 열린 질문도 함께 적으세요.
          </p>
          {notesBase ? (
            <div className="mt-3 rounded-md border border-paper-line bg-white p-3 text-sm" data-testid={appTid('serial-prev-notes')} data-series={notesBase.seriesId} data-revision={notesBase.revision}>
              <p className="font-semibold">이전 확정 현재 상태 · 시리즈 {notesBase.seriesId} revision {notesBase.revision} (읽기 전용)</p>
              <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-prev-notes-text')}>
                {notesText(notesBase.currentNotes)}
              </pre>
              <button type="button" className="btn-quiet mt-2" onClick={() => fillEmptyNotes(notesBase)} data-testid={appTid('serial-prev-notes-fill')}>
                이전 현재 상태를 빈 칸에만 복사
              </button>
              <p className="field-hint">비어 있는 노트 칸에만 복사하며 화면의 제안 상태를 유지합니다. 이미 적은 칸과 「고친 이유」는 건드리지 않습니다. 복사한 뒤 이번 회에 맞게 고치세요.</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft" data-testid={appTid('serial-prev-notes-empty')}>연결된 시리즈의 이전 확정 상태가 없습니다(첫 회차이거나 아직 시리즈를 연결하지 않았습니다).</p>
          )}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {NOTE_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`serial-note-${f.key}`} className="field-label">{f.label} <span className="font-normal text-ink-faint">(제안)</span></label>
                <textarea
                  id={`serial-note-${f.key}`}
                  rows={3}
                  className="input"
                  value={a.episode.notes[f.key]}
                  onChange={(e) => {
                    const v = e.target.value;
                    api.update((cur) => {
                      const ca = authoringOf(cur);
                      return patchAuthoring(cur, { episode: { ...ca.episode, notes: { ...ca.episode.notes, [f.key]: v } } });
                    });
                  }}
                  data-testid={appTid(`serial-note-${f.key}`)}
                />
                <p className="field-hint">{f.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <AiAssist prefix="app-serial-notes" title="대화에서 정한 회차 노트 한 번에 넣기" note="아래 JSON은 작업 노트 초안만 바꿉니다. 시리즈 확정·승인·권리·회차 번호는 가져오지 않습니다. 기존 노트를 교체하므로 반영 전 확인하세요. 요청문을 외부 AI에 복사할 때 비공개 노트 전송 범위도 확인하세요." request={'대화에서 합의한 회차 노트를 아래 키 8개만 가진 JSON으로 정리하세요. 모든 값은 문자열이며 미정인 내용은 미정이라고 적으세요. 원문 사실·인물 주장·해석·새 제안을 구분하고 작가 확정을 대신하지 마세요. 승인이나 진행 키는 넣지 마세요.\n' + JSON.stringify(a.episode.notes, null, 2)} pasteLabel="회차 노트 JSON" applyLabel="노트 초안에 반영" onApply={text => { if (api.saveState.kind === 'error') return ['프로젝트 저장 오류를 먼저 확인하세요. 현재 노트는 유지했습니다.']; const parsed = parseEpisodeNotesInput(text); if (!parsed.value) return parsed.errors; updateEpisode({ notes: parsed.value }); return null; }} />

        {/* 3. 기존 시리즈 읽기 */}
        <section aria-labelledby="serial-read-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-read')}>
          <h2 id="serial-read-heading" className="font-sans text-lg font-bold">기존 시리즈 읽기</h2>
          <p className="mt-1 text-sm text-ink-soft">읽기만 해서는 이번 회차가 바뀌지 않습니다. 연결과 노트 채우기는 버튼으로 따로 합니다.</p>
          {seriesList.error && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-list-error')}>시리즈 목록을 읽지 못했습니다: {seriesList.error}</p>}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label htmlFor="serial-pick" className="field-label">저장된 시리즈</label>
              <select id="serial-pick" className="input" value={pickId} onChange={(e) => setPickId(e.target.value)} data-testid={appTid('serial-pick')}>
                <option value="">{seriesList.list.length ? '시리즈를 고르세요' : '이 브라우저에 저장된 시리즈가 없습니다'}</option>
                {seriesList.list.map((s) => (
                  <option key={s.seriesId} value={s.seriesId}>
                    {s.title || s.seriesId} ({s.seriesId}) · revision {s.revision} · {s.episodeIndex.length}개 회차
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-quiet" disabled={!pickId} onClick={() => pickSeries(pickId)} data-testid={appTid('serial-load')}>
              읽기
            </button>
            {readFolderSeries && (
              <button
                type="button"
                className="btn-quiet"
                disabled={folder?.kind !== 'ready' || busy === 'folder' || !(pickId || seriesId)}
                onClick={() => void readFromFolder()}
                data-testid={appTid('serial-read-folder')}
              >
                작업 폴더에서 읽기
              </button>
            )}
            <button type="button" className="btn-quiet" onClick={() => setRefreshKey((k) => k + 1)} data-testid={appTid('serial-refresh')}>
              목록 새로 고침
            </button>
          </div>
          {readFolderSeries && folder?.kind !== 'ready' && <p className="field-hint">작업 폴더가 연결되어 있을 때만 폴더에서 읽을 수 있습니다.</p>}
          {readError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-read-error')}>{readError}</p>}
          {missingRecord && (
            <button type="button" className="btn-quiet mt-2" disabled={folder?.kind !== 'ready' || busy !== ''} onClick={() => void recoverRecord()} data-testid={appTid('serial-recover-record')}>
              작업 폴더에서 회차 기록 복구
            </button>
          )}
          {readMsg && <p role="status" className="mt-2 text-sm text-celadon" data-testid={appTid('serial-read-status')}>{readMsg}</p>}

          {viewState && (
            <div className="mt-4 rounded-md border border-paper-line bg-white p-4 text-sm" data-testid={appTid('serial-view')} data-series={viewState.seriesId} data-revision={viewState.revision}>
              <p className="font-semibold">
                {viewState.title || viewState.seriesId} · revision {viewState.revision} · 갱신 {viewState.updatedAt}
                {viewSource === 'folder' ? ' · 작업 폴더에서 읽음' : ' · 브라우저 기록'}
              </p>
              <p className="mt-1 text-ink-soft">
                마지막 확정 회차: {lastConfirmed ? `${lastConfirmed.episodeNo}회 「${lastConfirmed.title}」 revision ${lastConfirmed.revision} · ${lastConfirmed.confirmedBy} · ${lastConfirmed.confirmedAt}` : '없음'}
                {viewState.guidelinePath ? ` · 지침 ${viewState.guidelinePath}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={linkToViewed} data-testid={appTid('serial-link-series')}>
                  이 시리즈 기준으로 연결
                </button>
                <button type="button" className="btn-quiet" onClick={() => fillEmptyNotes(viewState)} data-testid={appTid('serial-fill-notes')}>
                  현재 상태를 빈 노트 칸에만 참고로 채우기
                </button>
              </div>
              <p className="field-hint">「연결」은 시리즈 ID와 기준 revision만 바꿉니다. 「채우기」는 비어 있는 칸만 채우고, 이미 적은 제안은 덮어쓰지 않습니다.</p>

              <h3 className="mt-4 font-sans text-sm font-bold">현재 상태 (마지막 확정 기준)</h3>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-current-notes')}>
                {notesText(viewState.currentNotes)}
              </pre>

              <h3 className="mt-4 font-sans text-sm font-bold">회차 목록</h3>
              {viewState.episodeIndex.length === 0 ? (
                <p className="text-ink-soft">확정된 회차가 없습니다.</p>
              ) : (
                <table className="mt-1 w-full border-collapse text-sm" data-testid={appTid('serial-episode-list')}>
                  <thead>
                    <tr className="border-b border-paper-line text-left text-ink-soft">
                      <th className="py-1.5 pr-3 font-semibold">회차</th>
                      <th className="py-1.5 pr-3 font-semibold">제목</th>
                      <th className="py-1.5 pr-3 font-semibold">revision</th>
                      <th className="py-1.5 pr-3 font-semibold">상태</th>
                      <th className="py-1.5 pr-3 font-semibold">기록 파일</th>
                      <th className="py-1.5 font-semibold">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...viewState.episodeIndex].sort((x, y) => x.episodeNo - y.episodeNo || x.revision - y.revision).map((e) => (
                      <tr key={`${e.episodeId}-${e.revision}`} className="border-b border-paper-line/70" data-testid={appTid(`serial-episode-${e.episodeNo}`)} data-needs-review={e.needsReview ? 'true' : 'false'}>
                        <td className="py-1.5 pr-3">{e.episodeNo}회</td>
                        <td className="py-1.5 pr-3">{e.title}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{e.revision}</td>
                        <td className={`py-1.5 pr-3 ${e.needsReview ? 'font-semibold text-ocher' : ''}`}>{e.needsReview ? '다시 검토 필요' : '확정'}</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{e.recordPath}</td>
                        <td className="py-1.5">
                          <button type="button" className="btn-quiet" onClick={() => viewEpisodeRecord(viewState.seriesId, e.episodeId, e.revision)} data-testid={appTid(`serial-episode-view-${e.episodeNo}`)}>
                            기록 보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {viewState.episodeIndex.some((e) => e.needsReview) && (
                <p className="mt-2 text-sm font-semibold text-ocher" data-testid={appTid('serial-needs-review')}>
                  앞 회차가 고쳐져서 다시 검토가 필요한 회차가 있습니다. 해당 회차 프로젝트에서 내용을 확인하고 다시 확정하세요.
                </p>
              )}

              {viewEpisode && (
                <div className="mt-4 rounded-md border border-paper-line p-3" data-testid={appTid('serial-episode-record')} data-episode={viewEpisode.episodeId} data-revision={viewEpisode.revision}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {viewEpisode.episodeNo}회 「{viewEpisode.title}」 revision {viewEpisode.revision} · {viewEpisode.confirmedBy} 확정 {viewEpisode.confirmedAt}
                      {viewEpisode.needsReview ? ' · 다시 검토 필요' : ''}
                    </p>
                    <button type="button" className="btn-quiet" onClick={() => setViewEpisode(null)} data-testid={appTid('serial-episode-record-close')}>
                      기록 닫기
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">읽기 전용입니다. 원래 기록은 바뀌지 않습니다. 기준 시리즈 revision {viewEpisode.basedOnSeriesRevision}.</p>
                  <h4 className="mt-2 text-sm font-bold">원고</h4>
                  <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-episode-script')}>
                    {viewEpisode.scriptText || '(비어 있음)'}
                  </pre>
                  <h4 className="mt-2 text-sm font-bold">회차 노트 (확정본)</h4>
                  <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-episode-notes')}>
                    {notesText(viewEpisode.notes)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 4. 다음 AI에게 넘길 시리즈 맥락 */}
        <section aria-labelledby="serial-context-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-context')}>
          <h2 id="serial-context-heading" className="font-sans text-lg font-bold">시리즈 맥락 복사</h2>
          <p className="mt-1 text-sm text-ink-soft">다음 회차를 함께 쓸 AI에게 붙여 넣을 확정 기록 요약입니다. {viewState ? '위에서 읽은 시리즈' : '이번 회차에 연결된 시리즈'} 기준입니다.</p>
          {contextText ? (
            <>
              <div className="mt-3">
                <CopyButton text={contextText} label="시리즈 맥락 복사" testid={appTid('serial-context-copy')} />
              </div>
              <label htmlFor="serial-context-text" className="field-label mt-3">시리즈 맥락 (읽기 전용)</label>
              <textarea id="serial-context-text" readOnly rows={6} className="input font-mono text-xs" value={contextText} data-testid={appTid('serial-context-text')} />
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft" data-testid={appTid('serial-context-empty')}>아직 읽거나 연결한 시리즈 기록이 없습니다.</p>
          )}
        </section>

        {/* 5. 확정 */}
        <section aria-labelledby="serial-commit-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-commit')}>
          <h2 id="serial-commit-heading" className="font-sans text-lg font-bold">회차 확정</h2>
          <p className="mt-1 text-sm text-ink-soft">
            작가 검토 단계의 확정입니다. 그림·음성 생성이나 게시 허가가 아닙니다. 미리보기를 만든 뒤 프로젝트를 고치면 확인 체크가 풀립니다.
          </p>
          <label htmlFor="serial-actor" className="field-label mt-3">확정하는 사람 이름(별칭)</label>
          <input id="serial-actor" className="input max-w-sm" value={actor} onChange={(e) => { setActor(e.target.value); setChecked(false); setPrepared(null); }} placeholder="예: 작가 필명" data-testid={appTid('serial-actor')} />
          {prechecks.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-ocher" data-testid={appTid('serial-prechecks')}>
              {prechecks.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="btn-quiet" disabled={busy !== '' || !!idProblem || !actor.trim()} onClick={() => void prepare()} data-testid={appTid('serial-prepare')}>
              {busy === 'prepare' ? '미리보기 만드는 중…' : '확정 미리보기 만들기'}
            </button>
            {api.saveState.kind === 'pending' && (
              <button type="button" className="btn-quiet" onClick={() => void api.flush()} data-testid={appTid('serial-flush')}>
                지금 저장
              </button>
            )}
          </div>
          {saveBlocked && <p className="mt-2 text-sm font-semibold text-danger" data-testid={appTid('serial-save-blocked')}>{saveBlocked}</p>}

          {prepared && (
            <div className="mt-4 rounded-md border border-paper-line bg-white p-4 text-sm" data-testid={appTid('serial-preview')} data-episode={prepared.episode.episodeId} data-revision={prepared.episode.revision}>
              <h3 className="font-sans text-sm font-bold">확정 미리보기 · 작가 검토 단계</h3>
              <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-ink-soft">시리즈</dt>
                <dd>{prepared.nextState.title || prepared.nextState.seriesId} ({prepared.nextState.seriesId})</dd>
                <dt className="font-semibold text-ink-soft">시리즈 revision</dt>
                <dd data-testid={appTid('serial-preview-revision')}>{prev ? prev.revision : '없음(새 시리즈)'} → {prepared.nextState.revision}</dd>
                <dt className="font-semibold text-ink-soft">회차</dt>
                <dd>{prepared.episode.episodeNo}회 「{prepared.episode.title}」 · 회차 기록 revision {prepared.episode.revision}{prepared.episode.revision > 1 ? ' (이전 확정본 고쳐 쓰기)' : ''}</dd>
                <dt className="font-semibold text-ink-soft">확정하는 사람</dt>
                <dd>{prepared.episode.confirmedBy}</dd>
                <dt className="font-semibold text-ink-soft">바뀌는 기록</dt>
                <dd data-testid={appTid('serial-preview-scope')}>
                  <ul className="list-disc pl-5">
                    <li>회차 기록 파일 {preparedIndex?.recordPath ?? prepared.episode.episodeId} (새로 추가, 이전 revision은 남김)</li>
                    <li>시리즈 현재 상태 (revision {prepared.nextState.revision}로 갱신)</li>
                    <li>현재 상태에서 바뀌는 항목: {changedNoteKeys.length ? changedNoteKeys.join(', ') : '없음'}</li>
                    {prepared.nextState.episodeIndex.filter((e) => e.needsReview).length > 0 && (
                      <li className="font-semibold text-ocher">
                        다시 검토 필요로 표시될 회차: {prepared.nextState.episodeIndex.filter((e) => e.needsReview).map((e) => `${e.episodeNo}회`).join(', ')}
                      </li>
                    )}
                  </ul>
                </dd>
                <dt className="font-semibold text-ink-soft">원고 길이</dt>
                <dd>{prepared.episode.scriptText.length}자</dd>
              </dl>
              <p className="mt-3 rounded-md border border-ocher/40 p-3 text-sm font-semibold text-ocher" role="note" data-testid={appTid('serial-preview-cumulative-warning')}>
                누적 상태 갱신: {currentNotesKept
                  ? '뒤 회차가 이미 있어 시리즈 현재 상태는 바뀌지 않고 이번 회차 기록만 고쳐 씁니다. 뒤 회차를 다시 검토하세요.'
                  : '확정하면 아래 「이번 회차 노트」가 시리즈 현재 상태를 통째로 대신합니다. 이어 갈 과거 설정·인물 상태·열린 질문을 포함했는지, 없어지는 항목은 의도한 것인지 확인하세요.'}
              </p>
              {droppedKeys.length > 0 && !currentNotesKept && (
                <p className="mt-2 text-sm font-semibold text-danger" data-testid={appTid('serial-preview-dropped')}>
                  이전 상태에는 있었지만 이번 노트에서 비어 있어 사라질 항목: {droppedKeys.join(', ')}
                </p>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2" data-testid={appTid('serial-preview-compare')}>
                <div>
                  <h4 className="text-sm font-bold">이전 현재 상태 {prev ? `(revision ${prev.revision})` : '(없음 · 첫 확정)'}</h4>
                  <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-preview-prev-notes')}>
                    {prev ? notesText(prev.currentNotes) : '(없음)'}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-bold">이번 회차 노트 (확정될 내용)</h4>
                  <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-preview-notes')}>
                    {notesText(prepared.episode.notes)}
                  </pre>
                </div>
              </div>
              <h4 className="mt-3 text-sm font-bold">확정될 원고 (앞부분)</h4>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line p-3 text-xs" data-testid={appTid('serial-preview-script')}>
                {prepared.episode.scriptText.slice(0, 600)}{prepared.episode.scriptText.length > 600 ? '\n…(이하 생략, 1단계 원고 전문 참고)' : ''}
              </pre>

              <div className="mt-4 flex items-start gap-2">
                <input id="serial-human-confirm" type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} data-testid={appTid('serial-human-confirm')} />
                <label htmlFor="serial-human-confirm" className="text-sm font-semibold">{CONFIRM_LABEL}</label>
              </div>
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={!checked || !actor.trim() || busy !== '' || !!saveBlocked}
                onClick={() => void confirmCommit()}
                data-testid={appTid('serial-confirm')}
              >
                {busy === 'commit' ? '확정하는 중…' : '이 내용으로 회차 확정'}
              </button>
            </div>
          )}
          {commitError && <p role="alert" className="mt-3 text-sm font-semibold text-danger" data-testid={appTid('serial-commit-error')}>{commitError}</p>}

          {committed && (
            <div className="mt-4 rounded-md border border-celadon/40 bg-white p-4 text-sm" data-testid={appTid('serial-commit-result')} data-folder-written={committed.folderWritten ? 'true' : 'false'} data-revision={committed.state.revision}>
              <p className="font-semibold text-celadon">
                {committed.commit.episode.episodeNo}회 revision {committed.commit.episode.revision}을 확정했습니다 · 시리즈 revision {committed.state.revision}
              </p>
              {committed.folderWritten ? (
                <p className="mt-1" data-testid={appTid('serial-commit-folder')}>작업 폴더에 저장했습니다: {committed.folderPath ?? '(경로 정보 없음)'}</p>
              ) : (
                <p className="mt-1 font-semibold text-ocher" data-testid={appTid('serial-commit-local')}>
                  브라우저 기록에만 저장했습니다. 작업 폴더가 연결되지 않았거나 폴더에 쓰지 않았습니다. 이동·보관에는 아래 전체 시리즈 ZIP을 내려받으세요.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className="btn-quiet" disabled={busy !== ''} onClick={() => void downloadZip()} data-testid={appTid('serial-zip')}>
                  {busy === 'zip' ? 'ZIP 만드는 중…' : '확정 묶음 ZIP 내려받기'}
                </button>
              </div>
              <p className="field-hint">이 회차 하나의 확정 묶음(이번 원고·회차 기록·시리즈 현재 상태)입니다. 지난 회차 원고와 전체 상태 이력이 포함된 백업은 아닙니다. 전체 백업은 아래 「전체 시리즈 백업」에서 내려받으세요.</p>
              {zipMsg && <p role="status" className="mt-2 text-sm" data-testid={appTid('serial-zip-status')}>{zipMsg}</p>}
            </div>
          )}
        </section>

        {/* 6. 다음 회 프로젝트 */}
        <section aria-labelledby="serial-next-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-next')}>
          <h2 id="serial-next-heading" className="font-sans text-lg font-bold">다음 회 프로젝트 만들기</h2>
          <p className="mt-1 text-sm text-ink-soft">
            마지막 확정 회차의 인물·장소 카드와 그 회차의 확정 당시 말투·화풍·음성 스냅샷을 이어 받은 새 프로젝트를 만듭니다. 단계 완료, 권리·원문 확인, 참조 그림 승인은 이어 받지 않습니다.
          </p>
          {nextBase ? (
            <p className="mt-2 text-sm" data-testid={appTid('serial-next-base')}>
              기준: 시리즈 {nextBase.state.seriesId} revision {nextBase.state.revision} · {nextBase.last.episodeNo}회 확정 기록
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-soft" data-testid={appTid('serial-next-unavailable')}>회차를 확정하거나, 확정 회차가 있는 시리즈를 위에서 읽으면 만들 수 있습니다.</p>
          )}
          <button type="button" className="btn-quiet mt-3" disabled={!nextBase || busy !== ''} onClick={() => void makeNextProject()} data-testid={appTid('serial-next-create')}>
            {busy === 'next' ? '만드는 중…' : '다음 회 프로젝트 만들기'}
          </button>
          {nextError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-next-error')}>{nextError}</p>}
        </section>

        {/* 7. 전체 시리즈 백업·복구 */}
        <section aria-labelledby="serial-backup-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-backup')}>
          <h2 id="serial-backup-heading" className="font-sans text-lg font-bold">전체 시리즈 백업·복구</h2>

          <h3 className="mt-3 font-sans text-sm font-bold">전체 시리즈 ZIP 내려받기</h3>
          <p className="mt-1 text-sm text-ink-soft">
            이 브라우저에 있는 시리즈 상태의 모든 revision과 모든 회차의 모든 revision(원고·회차 기록)을 SHA-256 목록과 함께 묶습니다. 다른 브라우저로 옮기거나 보관할 때 씁니다.
          </p>
          {backupTarget ? (
            <>
              <p className="mt-2 text-sm" data-testid={appTid('serial-series-zip-target')}>
                대상: 시리즈 {backupTarget.seriesId} · 상태 revision 1~{backupTarget.revision} · 회차 {backupTarget.episodeIndex.length}개
              </p>
              <button type="button" className="btn-quiet mt-2" disabled={busy !== ''} onClick={() => void downloadSeriesZip(backupTarget.seriesId)} data-testid={appTid('serial-series-zip')}>
                {busy === 'series-zip' ? 'ZIP 만드는 중…' : '전체 시리즈 ZIP 내려받기'}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft" data-testid={appTid('serial-series-zip-unavailable')}>위에서 시리즈를 읽거나 이번 회차를 저장된 시리즈에 연결하면 내려받을 수 있습니다.</p>
          )}
          {seriesZipError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-series-zip-error')}>{seriesZipError}</p>}
          {seriesZipMsg && <p role="status" className="mt-2 text-sm text-celadon" data-testid={appTid('serial-series-zip-status')}>{seriesZipMsg}</p>}

          <h3 className="mt-5 font-sans text-sm font-bold">전체 시리즈 ZIP 가져오기</h3>
          <p className="mt-1 text-sm text-ink-soft">
            「전체 시리즈 ZIP 내려받기」로 만든 파일만 받습니다(회차 확정 묶음 ZIP은 안 됩니다). 이 브라우저에 없는 시리즈이거나 지금 상태와 똑같은 시리즈일 때만 빠진 기록을 채우고, 다른 상태는 덮어쓰지 않고 거부합니다.
          </p>
          <label htmlFor="serial-zip-file" className="field-label mt-2">전체 시리즈 백업 ZIP 파일</label>
          <input
            id="serial-zip-file"
            type="file"
            accept=".zip,application/zip"
            className="input"
            onChange={(e) => { setZipFile(e.target.files?.[0] ?? null); setZipImportError(''); setZipImportMsg(''); }}
            data-testid={appTid('serial-zip-file')}
          />
          <button type="button" className="btn-quiet mt-2" disabled={!zipFile || busy !== ''} onClick={() => void importZip()} data-testid={appTid('serial-zip-import')}>
            {busy === 'import-zip' ? '검사하는 중…' : '전체 시리즈 ZIP 가져오기'}
          </button>
          {zipImportError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-zip-import-error')}>{zipImportError}</p>}
          {zipImportMsg && <p role="status" className="mt-2 text-sm text-celadon" data-testid={appTid('serial-zip-import-status')}>{zipImportMsg}</p>}

          <h3 className="mt-5 font-sans text-sm font-bold">작업 폴더의 앞선 상태로 브라우저 복구</h3>
          {folder?.kind !== 'ready' ? (
            <p className="mt-1 text-sm text-ink-soft" data-testid={appTid('serial-recover-unavailable')}>작업 폴더가 연결되어 있을 때만 쓸 수 있습니다.</p>
          ) : !recoverTarget ? (
            <p className="mt-1 text-sm text-ink-soft" data-testid={appTid('serial-recover-unavailable')}>복구할 시리즈를 위에서 고르거나 이번 회차의 시리즈 ID를 적으세요.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                다른 창·기기에서 확정해 작업 폴더가 브라우저보다 앞서 있을 때 씁니다. 폴더 이력이 브라우저의 지금 상태를 그대로 이어받은 경우에만 앞으로 갱신하고, 이력이 갈라졌으면 거부합니다.
              </p>
              <p className="mt-2 text-sm" data-testid={appTid('serial-recover-target')} data-expected-revision={recoverExpected}>
                대상: 시리즈 {recoverTarget} · 브라우저의 지금 revision {recoverExpected}{recoverExpected === 0 ? ' (브라우저에 기록 없음)' : ''}
              </p>
              <div className="mt-2 flex items-start gap-2">
                <input id="serial-recover-confirm" type="checkbox" className="mt-1" checked={recoverChecked} onChange={(e) => setRecoverChecked(e.target.checked)} data-testid={appTid('serial-recover-confirm')} />
                <label htmlFor="serial-recover-confirm" className="text-sm">
                  브라우저의 이전 상태는 이력으로 남고, 같은 이력에서 앞선 폴더 상태로만 갱신되며, 폴더 파일은 바뀌지 않는다는 것을 확인했습니다
                </label>
              </div>
              <button type="button" className="btn-quiet mt-2" disabled={!recoverChecked || busy !== ''} onClick={() => void recoverFromFolder(recoverTarget, recoverExpected)} data-testid={appTid('serial-recover-series')}>
                {busy === 'recover' ? '복구하는 중…' : '폴더의 앞선 상태로 브라우저 복구'}
              </button>
            </>
          )}
          {recoverError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-recover-error')}>{recoverError}</p>}
          {recoverMsg && <p role="status" className="mt-2 text-sm text-celadon" data-testid={appTid('serial-recover-status')}>{recoverMsg}</p>}
        </section>

        {/* 8. 시리즈 상태 가져오기 */}
        <section aria-labelledby="serial-import-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('serial-import')}>
          <h2 id="serial-import-heading" className="font-sans text-lg font-bold">시리즈 상태 JSON 가져오기</h2>
          <p className="mt-1 text-sm text-ink-soft">
            다른 브라우저에서 만든 series-state JSON을 이 브라우저에 들입니다. 같은 ID의 시리즈가 이미 있으면 덮어쓰지 않고 거부합니다. 가져와도 이번 회차·확인 값은 바뀌지 않습니다.
            {folder?.kind === 'ready' ? ' 작업 폴더가 연결되어 있으면 위 「작업 폴더에서 읽기」로 폴더 기록을 따로 확인하세요.' : ''}
          </p>
          <label htmlFor="serial-import-text" className="field-label mt-3">시리즈 상태 JSON</label>
          <textarea id="serial-import-text" rows={5} className="input font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} data-testid={appTid('serial-import-text')} />
          <button type="button" className="btn-quiet mt-3" onClick={doImport} data-testid={appTid('serial-import-submit')}>
            가져오기
          </button>
          {importError && <p role="alert" className="mt-2 text-sm text-danger" data-testid={appTid('serial-import-error')}>{importError}</p>}
          {importMsg && <p role="status" className="mt-2 text-sm text-celadon" data-testid={appTid('serial-import-status')}>{importMsg}</p>}
        </section>

        <p className="mt-6 text-sm">
          <Link to={`/p/${p.id}/step/1`} className="text-jjok hover:underline" data-testid={appTid('serial-to-script')}>1단계 원고로 가기</Link>
        </p>
      </main>
    </div>
  );
}
