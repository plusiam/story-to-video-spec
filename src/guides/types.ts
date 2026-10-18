import type { StepNo } from '@/types/project';

/** 지침 속 행동 한 줄. 눌러야 할 이름표가 있으면 함께 적는다 */
export interface GuideAction {
  text: string;
  testid?: string;
}

/**
 * AI 작업지침 카드 — 모든 단계가 같은 7칸 양식을 쓴다.
 * 양식이 같아야 브라우저 AI가 어느 단계에서든 같은 방식으로 읽고 움직인다.
 */
export interface Guide {
  /** 지침 번호, 예: "GUIDE-S5" */
  id: string;
  /** 지침 버전. 문구를 고치면 올린다 */
  version: string;
  step: StepNo;
  title: string;
  /** 1. 목적: 이 단계가 남길 산출물 한 문장 */
  purpose: string;
  /** 2. 입력: 이전 단계에서 가져올 것 */
  inputs: string[];
  /** 3. 해야 할 일: 순서대로 */
  actions: GuideAction[];
  /** 4. 품질 기준: 화면이 자동 검사하는 것 / AI가 눈으로 확인할 것 */
  quality: { auto: string[]; visual: string[] };
  /** 5. 하지 말 것 */
  avoid: string[];
  /** 6. 완료 신호: 이 문장이 "다음 할 일" 띠에 뜨면 다음 단계로 간다 */
  doneSignal: string;
  /** 이 단계 화면이 구현되었는지. false면 AI는 이 단계에서 멈추고 운영자에게 알린다 */
  implemented: boolean;
}

export const guideLabel = (g: Guide) => `${g.id} v${g.version}`;
