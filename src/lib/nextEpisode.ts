import { emptyAuthoring, emptyEpisodeNotes } from '@/lib/authoring';
import { createEmptyProject } from '@/lib/project';
import type { AuthoringData, ConfirmedEpisode, SeriesState } from '@/types/authoring';
import type { CharacterCard, LocationCard, Project } from '@/types/project';

function isCharacterCard(v: unknown): v is CharacterCard {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.colors) && c.colors.length === 3;
}

function isLocationCard(v: unknown): v is LocationCard {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.name === 'string';
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** 다음 회 프로젝트: 말투·화풍·인물/장소 카드만 잇는다. 단계 완료·권리·원문 확인·참조 그림 승인은 잇지 않는다 */
export function buildNextEpisodeProject(state: SeriesState, last: ConfirmedEpisode): Project {
  if (state.episodeIndex.some(e => e.needsReview)) throw new Error('이전 회차 수정으로 다시 검토할 회차가 있습니다. 해당 회차를 확인·확정한 뒤 다음 회를 만드세요.');
  if (last.seriesId !== state.seriesId || !state.episodeIndex.some(e => e.episodeId === last.episodeId && e.revision === last.revision)) throw new Error('시리즈와 기준 회차가 맞지 않습니다. 최신 확정 회차를 다시 읽으세요.');
  const nextNo = Math.max(last.episodeNo, ...state.episodeIndex.map((e) => e.episodeNo)) + 1;
  const base = createEmptyProject(`${state.title || state.seriesId} ${nextNo}회`);
  const characters: CharacterCard[] = last.characterCards.filter(isCharacterCard).map((c) => ({
    id: c.id,
    name: c.name,
    age: str(c.age),
    face: str(c.face),
    hair: str(c.hair),
    outfit: str(c.outfit),
    props: str(c.props),
    elementName: c.elementName ? str(c.elementName) : undefined,
    colors: [str(c.colors[0]) || '#888888', str(c.colors[1]) || '#888888', str(c.colors[2]) || '#888888'],
    refSheet: { file: c.refSheet && typeof c.refSheet === 'object' ? (typeof c.refSheet.file === 'string' ? c.refSheet.file : null) : null, approved: false },
  }));
  const locations: LocationCard[] = last.locationCards.filter(isLocationCard).map((l) => ({
    id: l.id,
    name: l.name,
    desc: str(l.desc),
    refImage: typeof l.refImage === 'string' ? l.refImage : null,
    elementName: l.elementName ? str(l.elementName) : undefined,
  }));
  const style = last.styleSnapshot;
  const authoring: AuthoringData = {
    ...emptyAuthoring(),
    scriptMode: last.authoringContext?.scriptMode ?? 'adaptation',
    guidelinePath: state.guidelinePath || last.guidelinePath || '',
    episode: { seriesId: state.seriesId, episodeNo: nextNo, basedOnSeriesRevision: state.revision, notes: emptyEpisodeNotes() },
  };
  return {
    ...base,
    target: { ...base.target, durationSec: style?.durationSec ?? base.target.durationSec, series: state.title || state.seriesId },
    script: { ...base.script, tone: style?.tone || base.script.tone },
    visualDNA: {
      ...base.visualDNA,
      stylePreset: style ? style.visualStyle.stylePreset : base.visualDNA.stylePreset,
      customStyle: style?.visualStyle.customStyle ?? base.visualDNA.customStyle,
      negatives: style?.visualStyle.negatives ?? base.visualDNA.negatives,
      characters,
      locations,
    },
    voice: { ...(style?.voice ?? base.voice) },
    authoring,
    log: [
      ...base.log,
      {
        at: base.createdAt,
        guide: null,
        event: `시리즈 ${state.seriesId} revision ${state.revision}의 ${last.episodeNo}회 확정 기록에서 ${style ? '말투·화풍·카드' : '카드(스타일 스냅샷 없음: 기본값 확인 필요)'}를 이어 받아 ${nextNo}회 프로젝트를 만들었습니다. 단계 완료·권리·원문 확인·참조 그림 승인은 이어 받지 않았습니다.`,
      },
    ],
  };
}

