/**
 * data-testid 이름표 규칙 (에이전트 친화 설계 원칙 1번)
 *
 * 단계 안의 요소:  s{단계}-{대상}[-{번호}][-{항목}]
 *   예) s0-title, s5-scene-12-upload, s6-scene-03-narration
 * 화면 공통 요소:  app-{대상}[-{항목}]
 *   예) app-next-action, app-nav-step-3, app-guide-panel
 *
 * 번호는 두 자리로 맞춘다(01, 02 …). 이름표는 한 번 정하면 바꾸지 않는다.
 * 바꿔야 하면 지침 버전을 올리고 README의 이름표 목록도 고친다.
 */

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 단계 요소 이름표: tid(5, 'scene', 12, 'upload') → "s5-scene-12-upload" */
export function tid(step: number, target: string, num?: number, item?: string): string {
  return [`s${step}`, target, num === undefined ? null : pad2(num), item ?? null]
    .filter((v) => v !== null)
    .join('-');
}

/** 공통 요소 이름표: appTid('nav-step', 3) → "app-nav-step-3" */
export function appTid(target: string, num?: number): string {
  return num === undefined ? `app-${target}` : `app-${target}-${num}`;
}
