/**
 * 브라우저 AI용 작업 브리핑 (에이전트 친화 원칙 6번)
 * 전체 지침 + 진행 상태 + 다음 할 일을 글 한 덩어리로 만든다. 브리핑 페이지의 "전체 복사"가 이 글을 복사한다.
 */
import { GUIDES, guideLabel } from '@/guides';
import { STATUS_LABEL, blockReason, nextAction, stepStatus, type StepEnv } from '@/lib/steps';
import { FOLDER_STATE_TEXT } from '@/lib/folder';
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
  '작업 폴더는 선택 사항이다. 연결·다시 허용 창은 운영자만 누른다. 미연결이면 내보내기에서 JSON을 복사하거나 내려받는다.',
  'Aside가 대화로 정리한 결과는 단계별 붙여넣기 칸으로 한 번에 넣는다. 외부 AI 요청문 복사도 계속 사용할 수 있다. 오류가 있으면 기존 내용은 바뀌지 않는다.',
  '출처·원고 확인란과 단계 완료는 사람의 판단이다. 자동으로 확인하거나 완료하지 않는다.',
  '0~3단계 이후에는 내보내기에서 프로젝트 백업 또는 handoff.json을 복사·저장한다. handoff는 제작 계획이며 유료 생성·게시 허가가 아니다.',
];


export const BATCH_INPUT_EXAMPLES = [
  ['0단계 설정', { title: '은혜 갚은 까치', sourceType: 'folktale', sourceNote: '줄거리의 출처를 본인의 문장으로 적습니다', durationMin: 6, series: '시리즈 이름' }],
  ['1단계 스토리 (원고 본문만 붙여넣기도 가능)', { outline: ['시작', '전개', '위기', '맺음'], tone: '다정하고 차분한 말투', fullText: '대화에서 완성한 원고 전체. 실제 원고는 공백 제외 100자 이상이어야 합니다.' }],
  ['2단계 장면표', [{ panel: 'ki', narration: '원고에서 그대로 나눈 문장', visual: '누가 어디서 어떤 동작과 표정인지', location: '산길', characters: '돌쇠', emotion: '평온' }]],
  ['3단계 화풍·카드', { stylePreset: 'minhwa', characters: [{ name: '돌쇠', age: '서른 살', face: '둥근 얼굴', hair: '상투', outfit: '갈색 바지', props: '지게', colors: ['#7A4B2A', '#E9DCC4', '#3F5E4A'] }], locations: [{ name: '산길', desc: '가을 숲길, 소나무와 아침 햇살' }] }],
] as const;

export function batchInputExamplesText(): string {
  return BATCH_INPUT_EXAMPLES.map(([label, example]) => '### ' + label + '\n' + JSON.stringify(example, null, 2)).join('\n\n');
}

export function buildBriefMarkdown(p: Project, origin: string, env: StepEnv): string {
  const next = nextAction(p, env);
  const lines: string[] = [];
  lines.push(`# 작업 브리핑: ${p.title}`);
  lines.push('');
  lines.push(`- 프로젝트 ID: ${p.id}`);
  lines.push(`- 브리핑 주소: ${origin}/p/${p.id}/brief`);
  lines.push(`- 마지막 저장: ${p.updatedAt}`);
  lines.push(`- 작업 폴더: ${env.folder ? FOLDER_STATE_TEXT[env.folder.kind] : '확인 중'}${env.folder && 'name' in env.folder ? ` (${env.folder.name})` : ''}`);
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
  lines.push('## 단계별 일괄 입력 형식');
  lines.push('예시는 형식 안내입니다. 실제 대화에서 합의한 내용으로 바꾸고, 확인·승인·progress 값은 넣지 않습니다.');
  lines.push(batchInputExamplesText());
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
