import JSZip from 'jszip';
import type { Project } from '@/types/project';
import type { ConfirmedEpisode, EpisodeCommit, EpisodeWorkingNotes, SeriesState } from '@/types/authoring';
import { authoringOf } from './authoring';
import { getReadyWorkspaceRoot } from './folder';
import { episodeFiles, readFolderEpisode, readFolderSeries, readFolderSnapshot, bootstrapText, writeFolderCommit } from './serialFolder';

const PREFIX = 'writer-kit:series:v1:';
const PENDING = 'writer-kit:series-pending:v1:';
interface Store { format: 'writer-kit.local-series'; state: SeriesState; history: SeriesState[]; episodes: ConfirmedEpisode[]; lastCommitId?: string; folderWritten?: boolean; folderPath?: string }
interface Pending { format: 'writer-kit.pending'; commit: EpisodeCommit; note: string }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export function sameJson(a: unknown, b: unknown): boolean {
  const sorted = (v: unknown): unknown => Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)])) : v;
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}
function fail(message: string): never { throw new Error(message); }
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) fail('기록은 JSON 객체여야 합니다.'); return v as Record<string, unknown>; }
function keys(v: Record<string, unknown>, allowed: string[]): void { if (Object.keys(v).some(k => !allowed.includes(k))) fail('지원하지 않는 필드 또는 미완료 기록이 포함되어 있습니다.'); }
const isInt = (v: unknown, min = 1): v is number => Number.isSafeInteger(v) && Number(v) >= min;
const text = (v: unknown): v is string => typeof v === 'string';
const timestamp=(v:unknown):v is string => text(v) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
export function safeSeriesId(id: string): boolean { return /^[A-Za-z0-9가-힣][A-Za-z0-9가-힣_-]{0,79}$/.test(id) && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(id); }
export function episodeIdFor(no: number): string { if (!isInt(no)) fail('회차 번호는 1 이상의 정수로 입력하세요.'); return `ep-${String(no).padStart(3, '0')}`; }
export function recordPathFor(id: string, revision: number): string { return `회차/${id}/rev-${revision}/회차_기록.json`; }
function notes(v: unknown): EpisodeWorkingNotes {
  const n = object(v); const fields = ['summary','events','characterStates','knowledgeStates','openThreads','visualContinuity','nextEpisode','changeReason'];
  keys(n, fields); if (fields.some(k => !text(n[k]))) fail('회차 메모의 모든 항목은 문자열이어야 합니다.'); return n as unknown as EpisodeWorkingNotes;
}
export function validateSeriesState(raw: unknown): SeriesState {
  const s = object(raw); keys(s, ['format','formatVersion','seriesId','title','revision','updatedAt','latestConfirmedEpisodeId','episodeIndex','currentNotes','guidelinePath']);
  if (s.format !== 'writer-kit.series-state' || s.formatVersion !== '1.0') fail('지원하지 않는 시리즈 상태 형식입니다.');
  if (!text(s.seriesId) || !safeSeriesId(s.seriesId)) fail('시리즈 ID는 한글·영문·숫자·밑줄·붙임표만 사용하세요.');
  if (!isInt(s.revision) || !text(s.title) || !text(s.updatedAt) || !Number.isFinite(Date.parse(s.updatedAt)) || !text(s.guidelinePath)) fail('시리즈 제목·버전·시각·지침 경로를 확인하세요.');
  notes(s.currentNotes);
  if (!Array.isArray(s.episodeIndex) || !s.episodeIndex.length) fail('확정 회차 목록이 없습니다.');
  const ids = new Set<string>(); let maxRevision = 0;
  for (const value of s.episodeIndex) {
    const e = object(value); keys(e, ['episodeId','episodeNo','revision','title','recordPath','projectId','needsReview']);
    if (!isInt(e.episodeNo) || e.episodeId !== episodeIdFor(e.episodeNo) || !isInt(e.revision) || !text(e.title) || !text(e.projectId) || typeof e.needsReview !== 'boolean' || e.recordPath !== recordPathFor(String(e.episodeId), e.revision)) fail('회차 번호·버전·기록 경로가 올바르지 않습니다.');
    if (ids.has(String(e.episodeId))) fail('회차 ID가 중복됩니다.'); ids.add(String(e.episodeId)); maxRevision += e.revision;
  }
  if (maxRevision !== s.revision || !text(s.latestConfirmedEpisodeId) || !ids.has(s.latestConfirmedEpisodeId)) fail('시리즈 버전 또는 마지막 회차 연결이 올바르지 않습니다.');
  return clone(s as unknown as SeriesState);
}
export function validateEpisode(raw: unknown): ConfirmedEpisode {
  const e = object(raw); keys(e,['format','formatVersion','recordStatus','seriesId','episodeId','episodeNo','title','projectId','revision','basedOnSeriesRevision','scriptText','scriptSha256','notes','confirmedBy','confirmedAt','guidelinePath','characterCards','locationCards','needsReview','authoringContext','styleSnapshot']);
  if(e.format !== 'writer-kit.episode-record' || e.formatVersion !== '1.0' || e.recordStatus !== 'author_confirmed' || !text(e.seriesId) || !safeSeriesId(e.seriesId) || !isInt(e.episodeNo) || e.episodeId !== episodeIdFor(e.episodeNo) || !isInt(e.revision) || !isInt(e.basedOnSeriesRevision,0)) fail('회차 기록 형식·ID·버전이 올바르지 않습니다.');
  if (!text(e.title) || !text(e.projectId) || !text(e.scriptText) || e.scriptText.trim().length < 100 || !text(e.confirmedBy) || !e.confirmedBy.trim() || !text(e.confirmedAt) || !Number.isFinite(Date.parse(e.confirmedAt)) || !text(e.guidelinePath) || !Array.isArray(e.characterCards) || !Array.isArray(e.locationCards) || typeof e.needsReview !== 'boolean' || !(e.scriptSha256 === null || (text(e.scriptSha256) && /^[a-f0-9]{64}$/.test(e.scriptSha256)))) fail('원고·확정자·확정 시각·카드·해시를 확인하세요.');
  if(e.styleSnapshot!==undefined) { const s=object(e.styleSnapshot); keys(s,['tone','visualStyle','voice','durationSec']); const v=object(s.visualStyle), voice=object(s.voice); keys(v,['stylePreset','customStyle','negatives']); keys(voice,['service','voiceName','speed','pauseSec']); if(!text(s.tone)||!['minhwa','sumuk','picturebook-watercolor','custom',null].includes(v.stylePreset as string|null)||!text(v.customStyle)||!text(v.negatives)||voice.service!=='typecast'||!text(voice.voiceName)||typeof voice.speed!=='number'||!Number.isFinite(voice.speed)||voice.speed<=0||typeof voice.pauseSec!=='number'||!Number.isFinite(voice.pauseSec)||voice.pauseSec<0||typeof s.durationSec!=='number'||!Number.isFinite(s.durationSec)||s.durationSec<=0) fail('회차 스타일 스냅샷 형식이 맞지 않습니다.'); }
  if(e.authoringContext!==undefined) { const a=object(e.authoringContext); keys(a,['scriptMode','rights','sourceId','sourceRevision','sourceSha256']); const r=object(a.rights); keys(r,['status','basis','confirmed','confirmedAt']); if(!['adaptation','original_narration'].includes(String(a.scriptMode)) || !['unknown','own_work','permission_documented','license_checked','public_domain_checked'].includes(String(r.status)) || !text(r.basis) || typeof r.confirmed!=='boolean' || !(r.confirmedAt===null||text(r.confirmedAt)) || !(a.sourceId===null||text(a.sourceId)) || !(a.sourceRevision===null||isInt(a.sourceRevision)) || !(a.sourceSha256===null||(text(a.sourceSha256)&&/^[a-f0-9]{64}$/.test(a.sourceSha256)))) fail('저작 권리·원문 연결 메타데이터가 올바르지 않습니다.'); if(a.scriptMode==='original_narration' && (!r.confirmed || r.status==='unknown' || !String(r.basis).trim() || !timestamp(r.confirmedAt))) fail('원작 낭독 권리 확인·근거·유효한 확인 시각이 필요합니다.'); }
  if(!notes(e.notes).summary.trim()) fail('회차 요약을 입력하세요.'); return clone(e as unknown as ConfirmedEpisode);
}
function storage(): Storage { if (typeof localStorage !== 'undefined') return localStorage; if (typeof window !== 'undefined') return window.localStorage; return fail('이 환경에서는 브라우저 저장소를 사용할 수 없습니다.'); }
function readStore(id: string): Store | null {
  if (!safeSeriesId(id)) fail('안전하지 않은 시리즈 ID입니다.'); const raw = storage().getItem(PREFIX + id); if (!raw) return null;
  const s = object(JSON.parse(raw)); if(s.format !== 'writer-kit.local-series' || !Array.isArray(s.history) || !Array.isArray(s.episodes)) fail('로컬 시리즈 기록이 손상되었습니다. 먼저 백업을 복구하세요.');
  const state = validateSeriesState(s.state); if(state.seriesId !== id) fail('로컬 시리즈 ID가 맞지 않습니다.');
  return { ...s, state, history: s.history.map(validateSeriesState), episodes: s.episodes.map(validateEpisode) } as unknown as Store;
}
export function listSeries(): SeriesState[] { const result: SeriesState[] = []; const ls=storage(); for(let i=0;i<ls.length;i++){ const k=ls.key(i); if(k?.startsWith(PREFIX)) { const s=readStore(k.slice(PREFIX.length)); if(s) result.push(s.state); } } return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); }
export function loadSeries(seriesId: string): SeriesState | null { return readStore(seriesId)?.state ?? null; }
export function loadEpisode(seriesId: string, episodeId: string, revision?: number): ConfirmedEpisode | null { const s=readStore(seriesId); const rev=revision ?? s?.state.episodeIndex.find(e=>e.episodeId===episodeId)?.revision; return clone(s?.episodes.find(e=>e.episodeId===episodeId && e.revision===rev) ?? null); }
export function getRecoveryNotes(seriesId: string): string[] { const raw=storage().getItem(PENDING+seriesId); if(!raw) return []; try { const p=object(JSON.parse(raw)); if(p.format !== 'writer-kit.pending' || !text(p.note)) throw Error(); return [p.note, '같은 확정 요청을 다시 실행하면 기존 파일을 검증해 이어갑니다. 폴더 파일을 임의로 덮어쓰지 마세요.']; } catch { return ['미완료 기록의 형식을 확인할 수 없습니다. 로컬 데이터를 삭제하지 말고 백업을 복구하세요.']; } }
export function importSeriesState(input: string): SeriesState { const s=validateSeriesState(JSON.parse(input)); if(storage().getItem(PENDING+s.seriesId)) fail('미완료 저장을 먼저 복구하세요.'); const old=loadSeries(s.seriesId); if(old) { if(sameJson(old,s)) return old; fail('같은 ID의 시리즈가 이미 있습니다. 기존 버전을 덮어쓸 수 없습니다.'); } storage().setItem(PREFIX+s.seriesId,JSON.stringify({format:'writer-kit.local-series',state:s,history:[],episodes:[]})); return s; }
async function hash(script: string): Promise<string|null> { if(!globalThis.crypto?.subtle) return null; const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(script)); return Array.from(new Uint8Array(data),b=>b.toString(16).padStart(2,'0')).join(''); }
function validateCommit(raw: EpisodeCommit, requireContext=true): EpisodeCommit {
  if(raw.format !== 'writer-kit.episode-commit' || raw.formatVersion !== '1.0' || !safeSeriesId(raw.id)) fail('확정 요청 형식이 올바르지 않습니다.');
  const c=clone(raw); c.nextState=validateSeriesState(c.nextState); c.episode=validateEpisode(c.episode); c.previousState=c.previousState ? validateSeriesState(c.previousState) : null;
  const prev=c.previousState; const e=c.episode; const next=c.nextState; if(requireContext && !e.authoringContext) fail('새 확정 기록에는 원작 모드·권리 메타데이터가 필요합니다.'); const old=prev?.episodeIndex.find(x=>x.episodeId===e.episodeId);
  if(next.seriesId!==e.seriesId || (prev && prev.seriesId!==e.seriesId) || next.revision!==(prev?.revision??0)+1 || e.basedOnSeriesRevision!==(prev?.revision??0) || e.revision!==(old?.revision??0)+1 || next.latestConfirmedEpisodeId!==e.episodeId) fail('확정 요청의 시리즈 기준 버전이 맞지 않습니다.');
  const expectedIndex=(prev?.episodeIndex??[]).filter(x=>x.episodeId!==e.episodeId).map(x=>({...x,needsReview:x.needsReview || x.episodeNo>e.episodeNo})); expectedIndex.push({episodeId:e.episodeId,episodeNo:e.episodeNo,revision:e.revision,title:e.title,recordPath:recordPathFor(e.episodeId,e.revision),projectId:e.projectId,needsReview:false}); expectedIndex.sort((a,b)=>a.episodeNo-b.episodeNo);
  if(!sameJson(next.episodeIndex,expectedIndex) || !sameJson(next.currentNotes,prev?.episodeIndex.some(x=>x.episodeNo>e.episodeNo)?prev.currentNotes:e.notes) || next.guidelinePath!==e.guidelinePath || next.updatedAt!==e.confirmedAt) fail('확정 요청의 상태 연결이 변조되었습니다.'); return c;
}
export async function prepareEpisodeCommit(project: Project, confirmedBy: string, expectedSeriesRevision: number): Promise<EpisodeCommit> {
  const a=authoringOf(project); const id=a.episode.seriesId;
  if(!safeSeriesId(id)) fail('시리즈 ID를 한글·영문·숫자·밑줄·붙임표로 입력하세요.');
  const episodeId=episodeIdFor(a.episode.episodeNo); if(!confirmedBy.trim()) fail('확정자 이름을 입력하고 확인란에 체크한 뒤 확정하세요.');
  if(project.script.fullText.trim().length<100) fail('원고를 100자 이상 입력하세요.'); if(!a.episode.notes.summary.trim()) fail('회차 요약을 입력하세요.'); if(!project.title.trim()) fail('회차 제목을 입력하세요.');
  if(a.scriptMode==='original_narration') { if(!a.rights.confirmed || a.rights.status==='unknown' || !a.rights.basis.trim() || !timestamp(a.rights.confirmedAt)) fail('원작 낭독 권리 상태·근거를 입력하고 권리 확인란에 체크하세요.'); }
  else if(!project.source.type || !project.source.note.trim() || !project.source.noCommercialBookConfirmed || !project.script.ownWordingConfirmed) fail('각색 출처와 시판 그림책 미사용·새 문장 작성 확인란을 확인하세요.');
  if(a.scriptMode==='original_narration' && a.material && (!a.material.reviewConfirmed || normalizeScript(project.script.fullText)!==normalizeScript(a.material.reviewedText))) fail('PDF 추출문을 검수·확인하고 검수한 원문과 원고를 일치시키세요.');
  const previousState=loadSeries(id); if(!isInt(expectedSeriesRevision,0) || expectedSeriesRevision!==(previousState?.revision??0) || a.episode.basedOnSeriesRevision!==expectedSeriesRevision) fail('시리즈 상태가 바뀌었습니다. 최신 상태를 불러온 뒤 다시 확정하세요.');
  const old=previousState?.episodeIndex.find(e=>e.episodeId===episodeId); const at=new Date().toISOString();
  const episode: ConfirmedEpisode={format:'writer-kit.episode-record',formatVersion:'1.0',recordStatus:'author_confirmed',seriesId:id,episodeId,episodeNo:a.episode.episodeNo,title:project.title,projectId:project.id,revision:(old?.revision??0)+1,basedOnSeriesRevision:expectedSeriesRevision,scriptText:project.script.fullText,scriptSha256:await hash(project.script.fullText),notes:clone(a.episode.notes),confirmedBy:confirmedBy.trim(),confirmedAt:at,guidelinePath:a.guidelinePath,characterCards:clone(project.visualDNA.characters),locationCards:clone(project.visualDNA.locations),needsReview:false,styleSnapshot:{tone:project.script.tone,visualStyle:{stylePreset:project.visualDNA.stylePreset,customStyle:project.visualDNA.customStyle,negatives:project.visualDNA.negatives},voice:clone(project.voice),durationSec:project.target.durationSec},authoringContext:{scriptMode:a.scriptMode,rights:clone(a.rights),sourceId:a.material?.id??null,sourceRevision:a.material?.revision??null,sourceSha256:a.material?.sha256??null}};
  const index=(previousState?.episodeIndex??[]).filter(e=>e.episodeId!==episodeId).map(e=>({...e,needsReview:e.needsReview || e.episodeNo>episode.episodeNo})); index.push({episodeId,episodeNo:episode.episodeNo,revision:episode.revision,title:episode.title,recordPath:recordPathFor(episodeId,episode.revision),projectId:project.id,needsReview:false}); index.sort((a,b)=>a.episodeNo-b.episodeNo);
  const nextState:SeriesState={format:'writer-kit.series-state',formatVersion:'1.0',seriesId:id,title:previousState?.title || project.target.series || project.title,revision:expectedSeriesRevision+1,updatedAt:at,latestConfirmedEpisodeId:episodeId,episodeIndex:index,currentNotes:clone(previousState?.episodeIndex.some(x=>x.episodeNo>episode.episodeNo)?previousState.currentNotes:episode.notes),guidelinePath:a.guidelinePath};
  const candidate={format:'writer-kit.episode-commit' as const,formatVersion:'1.0' as const,id:`commit-${globalThis.crypto?.randomUUID?.()??Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}`,previousState,nextState,episode};
  const pending=storage().getItem(PENDING+id); if(pending) { const p=JSON.parse(pending) as Pending; const saved=validateCommit(p.commit); const withoutTime=(e:ConfirmedEpisode)=>({...e,confirmedAt:'',scriptSha256:null}); if(sameJson(withoutTime(saved.episode),withoutTime(episode)) && sameJson(saved.previousState,previousState)) return saved; fail('이 시리즈에 미완료 확정 요청이 있습니다. 같은 원고로 복구한 뒤 수정하세요.'); }
  return validateCommit(candidate);
}
const queues=new Map<string,Promise<unknown>>();
async function locked<T>(id:string,fn:()=>Promise<T>):Promise<T> { if(typeof navigator!=='undefined' && navigator.locks) return navigator.locks.request('writer-kit-series:'+id,fn); const previous=queues.get(id)??Promise.resolve(); const next=previous.catch(()=>{}).then(fn); queues.set(id,next); try{return await next;}finally{if(queues.get(id)===next)queues.delete(id);} }
export async function commitEpisode(input: EpisodeCommit): Promise<{state:SeriesState;folderWritten:boolean;folderPath?:string}> {
  const c=validateCommit(input); return locked(c.nextState.seriesId,async()=>{
    const id=c.nextState.seriesId; const local=readStore(id);
    if(local?.lastCommitId===c.id && sameJson(local.state,c.nextState)) return {state:clone(local.state),folderWritten:!!local.folderWritten,folderPath:local.folderPath};
    if(!sameJson(local?.state??null,c.previousState)) fail('다른 창에서 시리즈 상태를 바꿨습니다. 최신 상태를 불러오세요.');
    const pendingRaw=storage().getItem(PENDING+id); if(pendingRaw) { const p=JSON.parse(pendingRaw) as Pending; if(p.format!=='writer-kit.pending' || !sameJson(p.commit,c)) fail('다른 미완료 확정 요청을 먼저 복구하세요.'); }
    if(c.episode.scriptSha256 && await hash(c.episode.scriptText)!==c.episode.scriptSha256) fail('확정 이후 원고가 바뀌었습니다. 다시 준비하세요.');
    storage().setItem(PENDING+id,JSON.stringify({format:'writer-kit.pending',commit:c,note:'회차 저장이 시작되었으나 완료 여부를 확인하지 못했습니다. 로컬 확정 상태는 아직 변경하지 않았습니다.'}));
    try {
      if(local) await replayLocalHistory(local,c.nextState);
      const result=await writeFolderCommit(c);
      if(!sameJson(loadSeries(id),c.previousState)) fail('저장 중 다른 창에서 상태를 변경했습니다. 폴더와 로컬의 버전을 비교해 복구하세요.');
      const store:Store={format:'writer-kit.local-series',state:c.nextState,history:[...(local?.history??[]),...(c.previousState?[c.previousState]:[])],episodes:[...(local?.episodes??[]),c.episode],lastCommitId:c.id,folderWritten:result.folderWritten,folderPath:result.folderPath};
      storage().setItem(PREFIX+id,JSON.stringify(store)); storage().removeItem(PENDING+id); return {state:clone(c.nextState),...result};
    } catch(error) { const note=`저장 미완료: ${error instanceof Error?error.message:String(error)}. 폴더 일부 파일이 남았을 수 있습니다. 같은 요청으로 검증·복구하세요.`; storage().setItem(PENDING+id,JSON.stringify({format:'writer-kit.pending',commit:c,note})); throw error; }
  });
}
export async function buildEpisodeZip(input: EpisodeCommit): Promise<Blob> { const c=validateCommit(input); const zip=new JSZip(); for(const [name,content] of Object.entries(episodeFiles(c))) zip.file(`작품/${c.nextState.seriesId}/${name}`,content); return zip.generateAsync({type:'blob'}); }
function normalizeScript(s:string):string { return s.replace(/\r\n?/g,'\n').normalize('NFC').trim(); }
async function verifyHash(e:ConfirmedEpisode):Promise<void> { if(e.scriptSha256) { const actual=await hash(e.scriptText); if(!actual || actual!==e.scriptSha256) fail('원고 SHA-256 검증에 실패했습니다.'); } }
function commitFromState(previousState:SeriesState|null,nextState:SeriesState,episodes:ConfirmedEpisode[]):EpisodeCommit {
  const item=nextState.episodeIndex.find(e=>e.episodeId===nextState.latestConfirmedEpisodeId); const episode=episodes.find(e=>e.episodeId===item?.episodeId && e.revision===item?.revision); if(!episode)fail('상태 이력에 연결된 확정 회차 본문이 없습니다.');
  return validateCommit({format:'writer-kit.episode-commit',formatVersion:'1.0',id:`restore-${nextState.revision}`,previousState,nextState,episode},false);
}
async function verifyStoreChain(store:Store):Promise<void> {
  const states=[...store.history,store.state]; if(states.length!==store.state.revision)fail('시리즈 상태 이력이 완전하지 않습니다.');
  const seen=new Set<string>(); for(const e of store.episodes){ const key=e.episodeId+':'+e.revision; if(e.seriesId!==store.state.seriesId||seen.has(key))fail('시리즈 회차 본문이 중복되거나 다른 시리즈입니다.');seen.add(key);await verifyHash(e); }
  const used=new Set<string>(); for(let i=0;i<states.length;i++){ const s=states[i]; if(s.seriesId!==store.state.seriesId||s.revision!==i+1)fail('시리즈 상태 이력 순서가 다릅니다.'); const c=commitFromState(i?states[i-1]:null,s,store.episodes);used.add(c.episode.episodeId+':'+c.episode.revision); for(const item of s.episodeIndex){const e=store.episodes.find(e=>e.episodeId===item.episodeId&&e.revision===item.revision);if(!e||e.title!==item.title||e.projectId!==item.projectId||e.episodeNo!==item.episodeNo)fail('확정 회차와 상태 목록의 메타데이터가 다릅니다.');} }
  if(used.size!==store.episodes.length)fail('상태 이력에 없는 고아 회차가 포함되어 있습니다.');
}
async function replayLocalHistory(local:Store,alreadyCompleted?:SeriesState):Promise<void> {
  if(!await getReadyWorkspaceRoot())return;
  const disk=await readFolderSeries(local.state.seriesId); if(alreadyCompleted&&sameJson(disk,alreadyCompleted))return;
  const states=[...local.history,local.state]; const at=disk?states.findIndex(s=>sameJson(s,disk)):-1;
  if(disk&&at<0)fail('작업 폴더가 로컬 이력과 갈라졌거나 더 앞선 버전입니다. 미완료 요청을 취소하고 폴더 복원을 검토하세요.');
  if(at===states.length-1)return; await verifyStoreChain(local);
  for(let i=at+1;i<states.length;i++){const result=await writeFolderCommit(commitFromState(i?states[i-1]:null,states[i],local.episodes));if(!result.folderWritten)return;}
}
/** Explicit UI action only. Orphan folder files remain untouched for audit/retry. */
export async function cancelPendingCommit(seriesId:string):Promise<void> { if(!safeSeriesId(seriesId))fail('안전하지 않은 시리즈 ID입니다.'); return locked(seriesId,async()=>{storage().removeItem(PENDING+seriesId);}); }
export async function recoverEpisodeFromFolder(seriesId:string,episodeId:string,revision?:number):Promise<ConfirmedEpisode|null> {
 return locked(seriesId,async()=>{
  const initial=readStore(seriesId);if(!initial)return null; const rev=revision??initial.state.episodeIndex.find(e=>e.episodeId===episodeId)?.revision;if(!rev)return null;
  const indexed=[...initial.history,initial.state].flatMap(s=>s.episodeIndex).find(e=>e.episodeId===episodeId&&e.revision===rev);if(!indexed)fail('확정 상태 이력에 없는 회차는 복구할 수 없습니다.');
  const episode=await readFolderEpisode(seriesId,episodeId,rev);if(!episode)return null; await verifyHash(episode);
  if(episode.seriesId!==seriesId||episode.title!==indexed.title||episode.projectId!==indexed.projectId||episode.episodeNo!==indexed.episodeNo)fail('폴더 회차 메타데이터가 확정 목록과 다릅니다.');
  const latestRaw=storage().getItem(PREFIX+seriesId);const latest=readStore(seriesId);if(storage().getItem(PREFIX+seriesId)!==latestRaw)fail('복구 중 로컬 시리즈가 변경되었습니다.');if(!latest)fail('복구 중 로컬 시리즈가 사라졌습니다.');const allowed=[...latest.history,latest.state].flatMap(s=>s.episodeIndex).some(e=>e.episodeId===episodeId&&e.revision===rev&&e.title===episode.title&&e.projectId===episode.projectId);if(!allowed)fail('복구 중 시리즈 연결이 변경되었습니다.');
  const old=latest.episodes.find(e=>e.episodeId===episodeId&&e.revision===rev);if(old&&!sameJson(old,episode))fail('기존 로컬 회차와 폴더 회차가 다릅니다.');if(!old){const before=latestRaw;const next={...latest,episodes:[...latest.episodes,episode]};if(storage().getItem(PREFIX+seriesId)!==before)fail('복구 중 로컬 시리즈가 변경되었습니다.');storage().setItem(PREFIX+seriesId,JSON.stringify(next));}return episode;
 });
}
function backupFiles(store:Store):Record<string,string> {
 const files:Record<string,string>={'시리즈_현재상태.json':JSON.stringify(store.state,null,2),'00_AI_START_HERE.md':bootstrapText(store.state.seriesId)};
 for(const s of store.history)files[`상태_이전/시리즈_현재상태.rev-${s.revision}.json`]=JSON.stringify(s,null,2);
 for(const e of store.episodes){const path=`회차/${e.episodeId}/rev-${e.revision}`;files[path+'/원고.md']=e.scriptText;files[path+'/회차_기록.json']=JSON.stringify(e,null,2);}return files;
}
export async function buildSeriesZip(seriesId:string):Promise<Blob> {
 return locked(seriesId,async()=>{if(storage().getItem(PENDING+seriesId))fail('미완료 저장을 복구하거나 취소한 뒤 전체 백업하세요.');const store=readStore(seriesId);if(!store)fail('백업할 시리즈가 없습니다.');await verifyStoreChain(store);const files=backupFiles(store);const digests:Record<string,string>={};const zip=new JSZip();const root=`작품/${seriesId}/`;for(const [name,content]of Object.entries(files)){const digest=await hash(content);if(!digest)fail('전체 백업에는 SHA-256을 지원하는 안전한 브라우저가 필요합니다.');digests[name]=digest;zip.file(root+name,content);}zip.file(root+'시리즈_백업.json',JSON.stringify({format:'writer-kit.series-backup',formatVersion:'1.0',seriesId,files:digests},null,2));return zip.generateAsync({type:'blob'});});
}
export async function importSeriesZip(blob:Blob):Promise<SeriesState> {
 const zip=await JSZip.loadAsync(await blob.arrayBuffer(),{checkCRC32:true});const entries=Object.values(zip.files);const manifests=entries.filter(e=>!e.dir&&/^작품\/[^/]+\/시리즈_백업\.json$/.test(e.name));if(manifests.length!==1)fail('전체 시리즈 백업 ZIP 형식이 아닙니다.');const m=object(JSON.parse(await manifests[0].async('string')));keys(m,['format','formatVersion','seriesId','files']);if(m.format!=='writer-kit.series-backup'||m.formatVersion!=='1.0'||!text(m.seriesId)||!safeSeriesId(m.seriesId))fail('지원하지 않는 시리즈 백업입니다.');const id=m.seriesId;const root=`작품/${id}/`;const declared=object(m.files);const contents:Record<string,string>={};
 for(const entry of entries){const unsafe=(entry as unknown as {unsafeOriginalName?:string}).unsafeOriginalName;if(unsafe&&unsafe!==entry.name)fail('ZIP에 안전하지 않은 경로가 있습니다.');if(entry.dir){if(entry.name.includes('..')||entry.name.includes('\\')||(!entry.name.startsWith(root)&&entry.name!=='작품/'))fail('ZIP 폴더 경로가 올바르지 않습니다.');continue;}if(!entry.name.startsWith(root)||entry.name.includes('..')||entry.name.includes('\\'))fail('ZIP 경로가 올바르지 않습니다.');const name=entry.name.slice(root.length);if(name==='시리즈_백업.json')continue;if(!Object.prototype.hasOwnProperty.call(declared,name)||!text(declared[name])||!/^[a-f0-9]{64}$/.test(String(declared[name])))fail('ZIP 목록에 없는 파일 또는 잘못된 해시입니다.');const value=await entry.async('string');if(await hash(value)!==declared[name])fail('ZIP 파일 SHA-256 검증에 실패했습니다.');contents[name]=value;}
 if(Object.keys(contents).length!==Object.keys(declared).length)fail('ZIP 백업 파일이 누락되었습니다.');
 const state=validateSeriesState(JSON.parse(contents['시리즈_현재상태.json']??'null'));if(state.seriesId!==id)fail('ZIP 시리즈 ID가 일치하지 않습니다.');const history:SeriesState[]=[];for(let i=1;i<state.revision;i++)history.push(validateSeriesState(JSON.parse(contents[`상태_이전/시리즈_현재상태.rev-${i}.json`]??'null')));const episodes:ConfirmedEpisode[]=[];for(const [name,value]of Object.entries(contents))if(/^회차\/ep-[0-9]+\/rev-[0-9]+\/회차_기록\.json$/.test(name)){const e=validateEpisode(JSON.parse(value));if(name!==recordPathFor(e.episodeId,e.revision))fail('ZIP 회차 경로가 기록과 다릅니다.');episodes.push(e);}const imported:Store={format:'writer-kit.local-series',state,history,episodes};await verifyStoreChain(imported);const expected=backupFiles(imported);if(!sameJson(Object.keys(contents).sort(),Object.keys(expected).sort()))fail('ZIP 백업에 알 수 없는 파일이 있습니다.');for(const name of Object.keys(expected)){if(name.endsWith('.json')?!sameJson(JSON.parse(contents[name]),JSON.parse(expected[name])):contents[name]!==expected[name])fail('ZIP 원고 또는 부트스트랩 내용이 일치하지 않습니다.');}
 return locked(id,async()=>{if(storage().getItem(PENDING+id))fail('미완료 저장을 먼저 취소하거나 복구하세요.');const old=readStore(id);if(old){if(!sameJson(old.state,state))fail('같은 ID의 다른 상태를 덮어쓸 수 없습니다.');for(const h of old.history)if(!history.some(s=>sameJson(s,h)))fail('기존 상태 이력이 백업과 다릅니다.');for(const e of old.episodes)if(!episodes.some(x=>sameJson(x,e)))fail('기존 확정 회차가 백업과 다릅니다.');}storage().setItem(PREFIX+id,JSON.stringify(imported));return clone(state);});
}
export async function recoverSeriesFromFolder(seriesId:string,expectedLocalRevision:number):Promise<SeriesState> {
 return locked(seriesId,async()=>{if(storage().getItem(PENDING+seriesId))fail('미완료 저장을 먼저 취소하세요.');const initial=readStore(seriesId);if((initial?.state.revision??0)!==expectedLocalRevision)fail('로컬 상태가 변경되었습니다.');const snapshot=await readFolderSnapshot(seriesId);if(!snapshot)fail('복구할 폴더 상태가 없습니다.');const imported:Store={format:'writer-kit.local-series',...snapshot};await verifyStoreChain(imported);if(initial&&!sameJson(initial.state,imported.state)&&!imported.history.some(s=>sameJson(s,initial.state)))fail('폴더와 로컬 이력이 갈라져 자동 복원할 수 없습니다.');if(initial)for(const e of initial.episodes)if(!imported.episodes.some(x=>sameJson(x,e)))fail('로컬 회차와 폴더 이력이 다릅니다.');const latest=readStore(seriesId);if(!sameJson(latest,initial))fail('복원 중 로컬 상태가 변경되었습니다.');storage().setItem(PREFIX+seriesId,JSON.stringify(imported));return clone(imported.state);});
}
export { readFolderSeries } from './serialFolder';
