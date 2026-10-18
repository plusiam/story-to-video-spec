/**
 * 외부 AI(Claude, Gemini 등) 대화창에 붙여 넣을 요청문과, 그 답을 받아 검사하는 도구.
 * 흐름: 요청문 복사 → 외부 AI에 붙여넣기 → 답 전체 복사 → 결과 붙여넣기 칸 → 검사 → 반영
 * (에이전트 친화 원칙 9번: 형식이 틀리면 틀린 곳을 글로 알려 준다)
 */
import { emptyScene, estimateSec, sceneCountRange, targetRange, SCENE_NARRATION_MAX, SENTENCE_MAX, namesInScenes } from '@/lib/text';
import { newId } from '@/lib/project';
import { STYLE_PRESETS } from '@/lib/imagePrompt';
import { PANEL_KEYS, type CharacterCard, type LocationCard, type PanelKey, type Project, type SceneRecord } from '@/types/project';

// ---------------- 요청문 ----------------

export function rewriteRequest(p: Project): string {
  const { target, min, max } = targetRange(p.target.durationSec);
  const [ki, seung, jeon, gyeol] = p.script.outline;
  const draft = p.script.fullText.trim();
  return [
    '당신은 시니어 시청자를 위한 옛이야기 낭독 원고 작가입니다. 아래 조건으로 내레이션 원고 한 편을 써 주세요.',
    '',
    `제목: ${p.title}`,
    `원작 유형: ${p.source.type === 'original' ? '순수 창작' : '전래 민담 (줄거리만 사용)'}`,
    `출처 메모: ${p.source.note}`,
    '',
    '기승전결 뼈대',
    `- 기: ${ki}`,
    `- 승: ${seung}`,
    `- 전: ${jeon}`,
    `- 결: ${gyeol}`,
    ...(draft ? ['', '지금까지 쓴 원고 (이것을 조건에 맞게 다듬어 주세요)', draft] : []),
    '',
    '조건',
    `1. 분량: 공백 빼고 ${min}~${max}자 (목표 ${target}자, 약 ${Math.round(p.target.durationSec / 60)}분 낭독).`,
    `2. 한 문장은 공백 포함 ${SENTENCE_MAX}자 이하. 한 문장에 사건 하나만.`,
    `3. 말투: ${p.script.tone}`,
    '4. 귀로 듣는 글입니다. 어려운 한자어와 외래어 대신 쉬운 우리말을 쓰고, 숫자와 영어는 한글로 씁니다(예: 3마리 → 세 마리).',
    '5. 출판된 책의 문장을 옮기지 말고 새 문장으로 씁니다.',
    '6. 건강·의료·돈에 관한 조언을 넣지 않습니다.',
    '7. 문단은 장면이 바뀌는 곳에서 나눕니다.',
    '',
    '출력: 제목이나 설명 없이 원고 본문만 출력하세요.',
  ].join('\n');
}

export function sceneSplitRequest(p: Project): string {
  const { min, max } = sceneCountRange(p.target.durationSec);
  return [
    '아래 낭독 원고를 영상 장면표로 나눠 주세요. 장면마다 그림 한 장이 들어갑니다.',
    '',
    '조건',
    `1. 장면 수: ${min}~${max}개.`,
    `2. narration: 원고 문장을 순서대로 그대로 나눠 담습니다(고쳐 쓰지 않음). 장면당 공백 포함 ${SCENE_NARRATION_MAX}자 이하.`,
    '3. visual: 그림 한 장으로 보여 줄 장면을 구체적으로(누가, 어디서, 무엇을, 어떤 자세·표정으로). 글자나 말풍선은 넣지 않습니다.',
    '4. location: 장소 이름 하나. 같은 장소는 장면마다 똑같은 이름으로 씁니다(예: "산길").',
    '5. characters: 등장인물 이름을 쉼표로. 같은 인물은 늘 같은 이름. 인물이 없으면 "없음".',
    '6. emotion: 분위기나 감정 한두 낱말.',
    '7. panel: 기승전결 중 하나를 "ki", "seung", "jeon", "gyeol"로.',
    '',
    '출력: 아래 형식의 JSON 배열만 출력하세요. 설명 글은 쓰지 마세요.',
    '[{"panel":"ki","narration":"…","visual":"…","location":"…","characters":"…","emotion":"…"}]',
    '',
    '원고',
    p.script.fullText.trim(),
  ].join('\n');
}

export function dnaRequest(p: Project): string {
  const { characters, locations } = namesInScenes(p.scenes);
  const sceneLines = p.scenes.map((s, i) => `${i + 1}. [${s.location}] [${s.characters}] ${s.visual}`).join('\n');
  return [
    '옛이야기 영상의 그림 일관성을 위해 인물 카드와 장소 카드를 채워 주세요.',
    `화풍: ${p.visualDNA.stylePreset === 'custom' ? p.visualDNA.customStyle : STYLE_PRESETS.find((x) => x.value === p.visualDNA.stylePreset)?.prompt ?? '아직 정하지 않음'}`,
    '',
    `인물 이름(이 이름 그대로 쓰기): ${characters.join(', ') || '없음'}`,
    `장소 이름(이 이름 그대로 쓰기): ${locations.join(', ') || '없음'}`,
    '',
    '조건',
    '1. 인물: age(나이대), face(얼굴형·눈·표정 특징), hair(머리 모양·색), outfit(옷 종류·색, 시대에 맞게), props(늘 지니는 소품, 없으면 빈 글), colors(대표 색 3개, #RRGGBB).',
    '2. 인물끼리 옷 색과 실루엣이 확실히 구분되게 합니다.',
    '3. 실존 인물이나 유명 캐릭터를 닮게 하지 않습니다.',
    '4. 장소: desc(시대, 계절, 주요 사물, 빛) 한두 문장.',
    '',
    '출력: 아래 형식의 JSON만 출력하세요.',
    '{"characters":[{"name":"…","age":"…","face":"…","hair":"…","outfit":"…","props":"…","colors":["#…","#…","#…"]}],"locations":[{"name":"…","desc":"…"}]}',
    '',
    '참고: 장면표',
    sceneLines,
  ].join('\n');
}

// ---------------- 답 검사 ----------------

/** AI 답에서 JSON 부분만 꺼낸다 (```json 울타리, 앞뒤 설명 글 제거) */
export function extractJson(text: string): { value: unknown; error: string | null } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start < 0) return { value: null, error: 'JSON을 찾지 못했습니다. 답 전체를 복사했는지 확인하세요.' };
  const open = body[start];
  const end = body.lastIndexOf(open === '[' ? ']' : '}');
  if (end < start) return { value: null, error: 'JSON이 중간에 끊겼습니다. 답이 끝까지 나왔는지 확인하세요.' };
  try {
    return { value: JSON.parse(body.slice(start, end + 1)), error: null };
  } catch (e) {
    return { value: null, error: `JSON 문법 오류: ${e instanceof Error ? e.message : String(e)}` };
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function parseScenes(text: string): { scenes: SceneRecord[] | null; errors: string[] } {
  const { value, error } = extractJson(text);
  if (error) return { scenes: null, errors: [error] };
  const arr = Array.isArray(value) ? value : (value as { scenes?: unknown })?.scenes;
  if (!Array.isArray(arr)) return { scenes: null, errors: ['JSON 배열([ … ])이어야 합니다.'] };
  if (arr.length === 0) return { scenes: null, errors: ['장면이 하나도 없습니다.'] };
  const errors: string[] = [];
  const scenes = arr.map((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const no = i + 1;
    const panel = str(r.panel) as PanelKey;
    if (!PANEL_KEYS.includes(panel)) errors.push(`${no}번 장면: panel은 ki, seung, jeon, gyeol 중 하나여야 합니다(받은 값 "${str(r.panel)}").`);
    if (!str(r.narration)) errors.push(`${no}번 장면: narration이 비었습니다.`);
    if (!str(r.visual)) errors.push(`${no}번 장면: visual이 비었습니다.`);
    if (!str(r.location)) errors.push(`${no}번 장면: location이 비었습니다.`);
    const sc = emptyScene(PANEL_KEYS.includes(panel) ? panel : 'ki');
    sc.narration = str(r.narration);
    sc.visual = str(r.visual);
    sc.location = str(r.location);
    sc.characters = Array.isArray(r.characters) ? r.characters.map(str).join(', ') : str(r.characters) || '없음';
    sc.emotion = str(r.emotion);
    sc.durationSec = estimateSec(sc.narration);
    return sc;
  });
  return errors.length ? { scenes: null, errors } : { scenes, errors };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseDna(
  text: string,
  existing: { characters: CharacterCard[]; locations: LocationCard[] },
): { characters: CharacterCard[]; locations: LocationCard[]; errors: string[]; unknownNames: string[] } {
  const fail = (errors: string[]) => ({ characters: existing.characters, locations: existing.locations, errors, unknownNames: [] });
  const { value, error } = extractJson(text);
  if (error) return fail([error]);
  const v = value as { characters?: unknown; locations?: unknown };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(['{"characters":[…],"locations":[…]} 형식의 객체여야 합니다.']);
  const errors: string[] = [];
  const unknownNames: string[] = [];

  const characters = existing.characters.map((c) => ({ ...c }));
  for (const [i, raw] of (Array.isArray(v.characters) ? v.characters : []).entries()) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = str(r.name);
    const card = characters.find((c) => c.name === name);
    if (!card) {
      unknownNames.push(name || `${i + 1}번 인물(이름 없음)`);
      continue;
    }
    const colors = Array.isArray(r.colors) ? r.colors.map(str) : [];
    if (colors.length !== 3 || !colors.every((c) => HEX.test(c))) {
      errors.push(`${name}: colors는 #RRGGBB 형식 3개여야 합니다.`);
    }
    Object.assign(card, {
      age: str(r.age) || card.age,
      face: str(r.face) || card.face,
      hair: str(r.hair) || card.hair,
      outfit: str(r.outfit) || card.outfit,
      props: str(r.props) || card.props,
      colors: colors.length === 3 && colors.every((c) => HEX.test(c)) ? (colors as [string, string, string]) : card.colors,
    });
  }

  const locations = existing.locations.map((l) => ({ ...l }));
  for (const [i, raw] of (Array.isArray(v.locations) ? v.locations : []).entries()) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = str(r.name);
    const card = locations.find((l) => l.name === name);
    if (!card) {
      unknownNames.push(name || `${i + 1}번 장소(이름 없음)`);
      continue;
    }
    card.desc = str(r.desc) || card.desc;
  }

  if (errors.length) return { ...fail(errors), unknownNames };
  return { characters, locations, errors, unknownNames };
}

/** 장면표 이름에 맞춰 카드 목록을 맞춘다. 있는 카드는 내용 유지, 새 이름은 빈 카드 추가 */
export function syncCards(p: Project): { characters: CharacterCard[]; locations: LocationCard[] } {
  const { characters, locations } = namesInScenes(p.scenes);
  const palette: [string, string, string][] = [
    ['#7A4B2A', '#E9DCC4', '#3F5E4A'],
    ['#2F4A7A', '#F1E6D2', '#A3352B'],
    ['#6B6B2F', '#EADFC8', '#5A3A5E'],
  ];
  return {
    characters: [
      ...characters.map(
        (name, i) =>
          p.visualDNA.characters.find((c) => c.name === name) ?? {
            id: newId('ch'),
            name,
            age: '',
            face: '',
            hair: '',
            outfit: '',
            props: '',
            colors: palette[i % palette.length],
            refSheet: { file: null, approved: false },
          },
      ),
      // 장면에 없는 기존 카드는 지우지 않고 뒤에 남긴다(화면에서 "장면에 없음"으로 표시)
      ...p.visualDNA.characters.filter((c) => !characters.includes(c.name)),
    ],
    locations: [
      ...locations.map(
        (name) => p.visualDNA.locations.find((l) => l.name === name) ?? { id: newId('lo'), name, desc: '', refImage: null },
      ),
      ...p.visualDNA.locations.filter((l) => !locations.includes(l.name)),
    ],
  };
}
