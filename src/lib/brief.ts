/**
 * 브라우저 AI용 작업 브리핑 (에이전트 친화 원칙 6번)
 * 전체 지침 + 진행 상태 + 다음 할 일을 글 한 덩어리로 만든다. 브리핑 페이지의 "전체 복사"가 이 글을 복사한다.
 */
import { GUIDES, guideLabel } from '@/guides';
import { STATUS_LABEL, blockReason, nextAction, stepStatus } from '@/lib/steps';
import { STEP_NUMBERS, type Project } from '@/types/project';

export const WORK_RULES = [
  '작업을 시작할 때 이 브리핑부터 읽고, 「다음 할 일」 문장이 가리키는 단계만 작업한다.',
  '요소는 data-testid 이름표로 찾는다. 이름표가 없으면 화면에 보이는 한글 라벨로 찾는다.',
  '길을 잃으면 단계 주소(/p/{프로젝트ID}/step/{단계번호})로 돌아온다.',
  '알림은 사라지므로 결과는 화면 아래 「작업 기록」에서 확인한다.',
  '완료 버튼이 잠겨 있으면 버튼 아래 사유를 읽고 그것부터 고친다.',
  '「화면 준비 중」 단계에 도착하면 작업을 멈추고 운영자에게 알린다.',
  '비밀번호, 결제, API 키는 다루지 않는다. 외부 서비스는 운영자가 미리 로그인해 둔 상태에서만 쓴다.',
  '운영자 승인 버튼(기준 시트 승인 등)은 누르지 않는다. 승인을 요청하고 기다린다.',
];

export function buildBriefMarkdown(p: Project, origin: string): string {
  const next = nextAction(p);
  const lines: string[] = [];
  lines.push(`# 작업 브리핑: ${p.title}`);
  lines.push('');
  lines.push(`- 프로젝트 ID: ${p.id}`);
  lines.push(`- 브리핑 주소: ${origin}/p/${p.id}/brief`);
  lines.push(`- 마지막 저장: ${p.updatedAt}`);
  lines.push('');
  lines.push('## 다음 할 일');
  lines.push(next.text);
  if (next.step !== null) lines.push(`작업 주소: ${origin}/p/${p.id}/step/${next.step}`);
  lines.push('');
  lines.push('## 진행 상태');
  for (const n of STEP_NUMBERS) {
    const reason = blockReason(n, p);
    const status = STATUS_LABEL[stepStatus(n, p)];
    lines.push(`- ${n}단계 ${GUIDES[n].title}: ${status}${status === '막힘' && reason ? ` (${reason})` : ''}`);
  }
  lines.push('');
  lines.push('## 작업 규칙');
  WORK_RULES.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  lines.push('');
  lines.push('## 단계별 지침');
  for (const n of STEP_NUMBERS) {
    const g = GUIDES[n];
    lines.push('');
    lines.push(`### [${guideLabel(g)}] ${n}단계 ${g.title}${g.implemented ? '' : ' (화면 준비 중)'}`);
    lines.push(`목적: ${g.purpose}`);
    lines.push(`입력: ${g.inputs.join(' / ')}`);
    lines.push('해야 할 일:');
    g.actions.forEach((a, i) => lines.push(`${i + 1}. ${a.text}${a.testid ? ` (${a.testid})` : ''}`));
    lines.push(`품질 기준(자동): ${g.quality.auto.join(' / ')}`);
    lines.push(`품질 기준(눈으로): ${g.quality.visual.join(' / ')}`);
    lines.push(`하지 말 것: ${g.avoid.join(' / ')}`);
    lines.push(`완료 신호: ${g.doneSignal}`);
  }
  return lines.join('\n');
}
