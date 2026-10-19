import type { Project } from './project';

/** 선택형 작가 작업 확장. 기존 프로젝트 1.1과 handoff 1.0의 필수 필드는 유지한다. */
export type RightsStatus = 'unknown' | 'own_work' | 'permission_documented' | 'license_checked' | 'public_domain_checked';
export interface SourcePage { page: number; text: string }
export interface SourceMaterial {
  id: string; revision: number; fileName: string; byteSize: number; pageCount: number; sha256: string | null;
  importedAt: string; pages: SourcePage[]; reviewedText: string;
  reviewConfirmed: boolean; reviewedAt: string | null; originalBlobKey: string | null;
}
export type FindingKind = 'source' | 'character_claim' | 'memory' | 'interpretation' | 'proposal';
export interface AnalysisFinding { id: string; kind: FindingKind; text: string; page: number | null; quote: string }
export interface AnalysisDraft {
  sourceId: string; sourceRevision: number; sourceSha256: string | null; status: 'draft';
  centralChange: string; segments: { label: string; summary: string; fromPage: number | null; toPage: number | null }[];
  findings: AnalysisFinding[]; characters: { name: string; description: string }[];
  locations: { name: string; description: string }[]; questions: string[];
}
export interface EpisodeWorkingNotes {
  summary: string; events: string; characterStates: string; knowledgeStates: string;
  openThreads: string; visualContinuity: string; nextEpisode: string; changeReason: string;
}
export interface AuthoringData {
  version: '1.0'; scriptMode: 'adaptation' | 'original_narration';
  rights: { status: RightsStatus; basis: string; confirmed: boolean; confirmedAt: string | null };
  material: SourceMaterial | null; analysis: AnalysisDraft | null;
  guidelinePath: string;
  episode: { seriesId: string; episodeNo: number; basedOnSeriesRevision: number; notes: EpisodeWorkingNotes };
}
export interface ConfirmedEpisode {
  format: 'writer-kit.episode-record'; formatVersion: '1.0'; recordStatus: 'author_confirmed';
  seriesId: string; episodeId: string; episodeNo: number; title: string; projectId: string;
  revision: number; basedOnSeriesRevision: number; scriptText: string; scriptSha256: string | null;
  notes: EpisodeWorkingNotes; confirmedBy: string; confirmedAt: string;
  guidelinePath: string; characterCards: unknown[]; locationCards: unknown[];
  styleSnapshot?: { tone: string; visualStyle: Pick<Project['visualDNA'], 'stylePreset' | 'customStyle' | 'negatives'>; voice: Project['voice']; durationSec: number };
  needsReview: boolean;
  authoringContext?: { scriptMode: AuthoringData['scriptMode']; rights: AuthoringData['rights']; sourceId: string | null; sourceRevision: number | null; sourceSha256: string | null };
}
export interface SeriesState {
  format: 'writer-kit.series-state'; formatVersion: '1.0'; seriesId: string; title: string;
  revision: number; updatedAt: string; latestConfirmedEpisodeId: string | null;
  episodeIndex: { episodeId: string; episodeNo: number; revision: number; title: string; recordPath: string; projectId: string; needsReview: boolean }[];
  currentNotes: EpisodeWorkingNotes; guidelinePath: string;
}
export interface EpisodeCommit {
  format: 'writer-kit.episode-commit'; formatVersion: '1.0'; id: string;
  previousState: SeriesState | null; nextState: SeriesState; episode: ConfirmedEpisode;
}
