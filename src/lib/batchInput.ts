/**
 * Aside 일괄 입력 파서 (0단계 설정 · 1단계 원고 · 3단계 화풍)
 *
 * 외부(Aside 등)에서 만든 글을 붙여 넣을 때 쓰는 엄격한 파서다.
 * - 오류가 하나라도 있으면 value는 null이다. 호출한 쪽은 지금 데이터를 그대로 두면 된다(덮어쓰지 않음).
 * - 던지지 않는다. 빈 글, null, 숫자, 배열 같은 엉뚱한 값도 오류 목록으로 돌려준다.
 * - 정해진 항목 밖의 키는 받지 않는다. 특히 승인·완료 기록(progress, approvals, …Confirmed 등)과
 *   참/거짓(boolean) 값은 막는다. 사람이 화면에서 직접 확인해야 하는 것을 붙여 넣기로 건너뛰지 못하게 하기 위해서다.
 * - aiRequests.extractJson처럼 글 속에서 중괄호를 찾아 잘라 내지 않는다. 코드 블록 하나 또는 글 전체가 JSON이어야 한다.
 * - 문장 길이(40자) 같은 품질 점검은 여기서 하지 않는다. 그건 단계 점검표가 맡는다.
 */
import type { Project, SourceType, StylePreset } from '@/types/project';
import { charCount } from '@/lib/text';

export interface ParseResult<T> {
  value: T | null;
  errors: string[];
}

export interface SettingsInput {
  title: string;
  sourceType: SourceType;
  sourceNote: string;
  durationMin: number;
  series?: string;
}

export interface StoryInput {
  fullText: string;
  outline?: [string, string, string, string];
  tone?: string;
}

export interface VisualOptionsInput {
  stylePreset?: Project['visualDNA']['stylePreset'];
  customStyle?: string;
  negatives?: string;
}

/* ───────────── 공통 도우미 ───────────── */

type Obj = Record<string, unknown>;

const SOURCE_TYPES: readonly SourceType[] = ['folktale', 'original'];
const STYLE_PRESET_OPTIONS = ['minhwa', 'sumuk', 'picturebook-watercolor', 'custom'] as const satisfies readonly StylePreset[];
// StylePreset에 값이 늘면 여기서 타입 오류가 나도록 한다.
type _MissingPreset = Exclude<StylePreset, (typeof STYLE_PRESET_OPTIONS)[number]>;
const _presetExhaustive: _MissingPreset extends never ? true : false = true;
void _presetExhaustive;

const DURATION_MIN = 3;
const DURATION_MAX = 15;
const SOURCE_NOTE_MIN = 10;
const STORY_MIN_CHARS = 100;

/** 승인·완료·확인 기록으로 보이는 키. 붙여 넣기로 들여오지 않는다 */
const APPROVAL_KEYS = new Set([
  'progress',
  'approvals',
  'approval',
  'approved',
  'confirmed',
  'confirmations',
  'completed',
  'completedat',
  'nocommercialbookconfirmed',
  'ownwordingconfirmed',
  'aidisclosure',
  'policychecks',
  'checks',
  'log',
]);
const APPROVAL_PATTERN = /confirm|approv|progress|complete|policycheck/i;

const isApprovalKey = (k: string) => APPROVAL_KEYS.has(k.toLowerCase()) || APPROVAL_PATTERN.test(k);

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function typeName(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return '배열';
  switch (typeof v) {
    case 'string':
      return '글자';
    case 'number':
      return '숫자';
    case 'boolean':
      return '참/거짓(boolean)';
    case 'object':
      return '객체';
    default:
      return typeof v;
  }
}

const isPlainObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 객체에 허용하지 않은 키가 있으면 오류를 쌓는다 */
function checkKeys(obj: Obj, root: string, allowed: readonly string[], errors: string[]) {
  for (const k of Object.keys(obj)) {
    if (allowed.includes(k)) continue;
    if (isApprovalKey(k)) {
      errors.push(`${root}.${k}: 승인·완료·확인 기록은 붙여 넣기로 가져올 수 없습니다. 사람이 화면에서 직접 확인해야 합니다.`);
    } else {
      errors.push(`${root}.${k}: 알 수 없는 항목입니다. 쓸 수 있는 항목은 ${allowed.join(', ')}입니다.`);
    }
  }
}

/** 문자열 항목 읽기. 없으면 undefined, 타입이 틀리면 오류 */
function readString(obj: Obj, key: string, path: string, errors: string[], opts: { required: boolean }): string | undefined {
  if (!hasOwn(obj, key) || obj[key] === undefined) {
    if (opts.required) errors.push(`${path}: 꼭 있어야 하는 항목이 없습니다.`);
    return undefined;
  }
  const v = obj[key];
  if (typeof v !== 'string') {
    errors.push(
      typeof v === 'boolean'
        ? `${path}: 참/거짓(boolean) 값은 받지 않습니다. 글자로 적어야 합니다.`
        : `${path}: 글자여야 합니다(받은 값: ${typeName(v)}).`,
    );
    return undefined;
  }
  return v.trim();
}

/* ───────────── JSON 꺼내기 (엄격) ───────────── */

interface Fence {
  lang: string;
  body: string;
}

const FENCE_RE = /```([^\n`]*)\n?([\s\S]*?)```/g;

/** 코드 블록 목록. 닫히지 않은 블록이 있으면 unclosed=true */
function findFences(text: string): { fences: Fence[]; unclosed: boolean } {
  const fences: Fence[] = [];
  let rest = text;
  for (const m of text.matchAll(FENCE_RE)) {
    fences.push({ lang: m[1].trim().toLowerCase(), body: m[2] });
    rest = rest.replace(m[0], '');
  }
  return { fences, unclosed: rest.includes('```') };
}

type JsonOutcome = { ok: true; value: unknown } | { ok: false; error: string };

function parseJsonStrict(body: string, root: string): JsonOutcome {
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch (e) {
    return { ok: false, error: `${root}: JSON 문법 오류입니다 — ${e instanceof Error ? e.message : String(e)}. 따옴표·쉼표·괄호를 확인하세요.` };
  }
}

/**
 * JSON만 받는 입력(설정·화풍)에서 JSON 꺼내기.
 * - 코드 블록이 하나면 그 안이 통째로 JSON이어야 한다(블록 밖 설명 글은 무시).
 * - 코드 블록이 없으면 글 전체가 JSON이어야 한다.
 */
function extractStrictJson(text: unknown, root: string): JsonOutcome {
  if (typeof text !== 'string') return { ok: false, error: `${root}: 붙여 넣은 내용이 글자가 아닙니다.` };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: `${root}: 붙여 넣은 내용이 비었습니다.` };
  const { fences, unclosed } = findFences(trimmed);
  if (unclosed) return { ok: false, error: `${root}: 코드 블록(\`\`\`)이 닫히지 않았습니다. 답이 끝까지 나왔는지 확인하세요.` };
  if (fences.length > 1) return { ok: false, error: `${root}: 코드 블록이 ${fences.length}개입니다. JSON 코드 블록 하나만 붙여 넣으세요.` };
  let body = trimmed;
  if (fences.length === 1) {
    const { lang } = fences[0];
    if (lang && lang !== 'json') return { ok: false, error: `${root}: 코드 블록 언어가 "${lang}"입니다. JSON 코드 블록이어야 합니다.` };
    body = fences[0].body.trim();
    if (!body) return { ok: false, error: `${root}: 코드 블록 안이 비었습니다.` };
  }
  return parseJsonStrict(body, root);
}

/** 최상위 값이 객체인지 확인 */
function requireObject(value: unknown, root: string): { obj: Obj } | { error: string } {
  if (isPlainObject(value)) return { obj: value };
  if (value === null) return { error: `${root}: 최상위 값이 null입니다. { … } 형식의 객체여야 합니다.` };
  return { error: `${root}: 최상위 값이 ${typeName(value)}입니다. { … } 형식의 객체여야 합니다.` };
}

/* ───────────── 0단계 설정 ───────────── */

const SETTINGS_KEYS = ['title', 'sourceType', 'sourceNote', 'durationMin', 'series'] as const;

export function parseSettingsInput(text: string, options: { allowLongDuration?: boolean } = {}): ParseResult<SettingsInput> {
  const root = 'settings';
  const parsed = extractStrictJson(text, root);
  if (!parsed.ok) return { value: null, errors: [parsed.error] };
  const r = requireObject(parsed.value, root);
  if ('error' in r) return { value: null, errors: [r.error] };
  const obj = r.obj;
  const errors: string[] = [];

  checkKeys(obj, root, SETTINGS_KEYS, errors);

  const title = readString(obj, 'title', `${root}.title`, errors, { required: true });
  if (title !== undefined && !title) errors.push(`${root}.title: 제목이 비었습니다.`);

  let sourceType: SourceType | undefined;
  const st = readString(obj, 'sourceType', `${root}.sourceType`, errors, { required: true });
  if (st !== undefined) {
    if ((SOURCE_TYPES as readonly string[]).includes(st)) sourceType = st as SourceType;
    else errors.push(`${root}.sourceType: folktale(전래 민담) 또는 original(창작) 중 하나여야 합니다(받은 값 "${st}").`);
  }

  const sourceNote = readString(obj, 'sourceNote', `${root}.sourceNote`, errors, { required: true });
  if (sourceNote !== undefined && sourceNote.length < SOURCE_NOTE_MIN) {
    errors.push(`${root}.sourceNote: 출처 메모는 ${SOURCE_NOTE_MIN}자 이상이어야 합니다(지금 ${sourceNote.length}자).`);
  }

  let durationMin: number | undefined;
  if (!hasOwn(obj, 'durationMin') || obj.durationMin === undefined) {
    errors.push(`${root}.durationMin: 꼭 있어야 하는 항목이 없습니다.`);
  } else {
    const d = obj.durationMin;
    if (typeof d !== 'number') {
      errors.push(`${root}.durationMin: 따옴표 없는 숫자(분)여야 합니다(받은 값: ${typeName(d)}).`);
    } else if (!Number.isFinite(d)) {
      errors.push(`${root}.durationMin: 유한한 숫자여야 합니다.`);
    } else if (options.allowLongDuration ? d <= 0 : d < DURATION_MIN || d > DURATION_MAX) {
      errors.push(options.allowLongDuration ? `${root}.durationMin: 0보다 큰 분이어야 합니다.` : `${root}.durationMin: ${DURATION_MIN}~${DURATION_MAX}분 사이여야 합니다(받은 값 ${d}).`);
    } else {
      durationMin = d;
    }
  }

  const series = readString(obj, 'series', `${root}.series`, errors, { required: false });

  if (errors.length || title === undefined || sourceType === undefined || sourceNote === undefined || durationMin === undefined) {
    return { value: null, errors };
  }
  const value: SettingsInput = { title, sourceType, sourceNote, durationMin };
  if (series !== undefined) value.series = series;
  return { value, errors };
}

/* ───────────── 1단계 원고 ───────────── */

const STORY_KEYS = ['outline', 'tone', 'fullText'] as const;

/**
 * 글이 JSON으로 쓰였는지 판단한다.
 * "{"로 시작하거나, JSON 배열처럼 보이는 "["로 시작하거나, 글 전체가 null·참/거짓·숫자·따옴표 문자열 하나면 JSON으로 본다.
 * "[기] 옛날 옛적에…"처럼 대괄호로 시작하는 보통 원고는 JSON으로 보지 않는다.
 */
function looksLikeJson(body: string): boolean {
  if (body.startsWith('{')) return true;
  if (/^\[\s*(?:[{["\]\d-]|true\b|false\b|null\b)/.test(body)) return true;
  if (/^(?:null|true|false|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(body)) return true;
  if (body.startsWith('"')) {
    try {
      return typeof JSON.parse(body) === 'string';
    } catch {
      return false;
    }
  }
  return false;
}

function parseStoryObject(value: unknown): ParseResult<StoryInput> {
  const root = 'story';
  const r = requireObject(value, root);
  if ('error' in r) return { value: null, errors: [r.error] };
  const obj = r.obj;
  const errors: string[] = [];

  checkKeys(obj, root, STORY_KEYS, errors);

  const fullText = readString(obj, 'fullText', `${root}.fullText`, errors, { required: true });
  if (fullText !== undefined) {
    const n = charCount(fullText);
    if (n === 0) errors.push(`${root}.fullText: 원고가 비었습니다.`);
    else if (n < STORY_MIN_CHARS) errors.push(`${root}.fullText: 원고가 너무 짧습니다(공백 뺀 ${n}자, 최소 ${STORY_MIN_CHARS}자).`);
  }

  let outline: [string, string, string, string] | undefined;
  if (hasOwn(obj, 'outline') && obj.outline !== undefined) {
    const o = obj.outline;
    if (!Array.isArray(o)) {
      errors.push(`${root}.outline: 글자 4개짜리 배열(기·승·전·결)이어야 합니다(받은 값: ${typeName(o)}).`);
    } else if (o.length !== 4) {
      errors.push(`${root}.outline: 기·승·전·결 4개여야 합니다(받은 개수 ${o.length}).`);
    } else {
      const items: string[] = [];
      o.forEach((item, i) => {
        const path = `${root}.outline[${i}]`;
        if (typeof item !== 'string') {
          errors.push(
            typeof item === 'boolean'
              ? `${path}: 참/거짓(boolean) 값은 받지 않습니다. 글자로 적어야 합니다.`
              : `${path}: 글자여야 합니다(받은 값: ${typeName(item)}).`,
          );
        } else if (!item.trim()) {
          errors.push(`${path}: 비었습니다.`);
        } else {
          items.push(item.trim());
        }
      });
      if (items.length === 4) outline = items as [string, string, string, string];
    }
  }

  const tone = readString(obj, 'tone', `${root}.tone`, errors, { required: false });
  if (tone !== undefined && !tone) errors.push(`${root}.tone: 말투가 비었습니다. 쓰지 않으려면 항목을 빼세요.`);

  if (errors.length || fullText === undefined) return { value: null, errors };
  const result: StoryInput = { fullText };
  if (outline) result.outline = outline;
  if (tone !== undefined) result.tone = tone;
  return { value: result, errors };
}

export function parseStoryInput(text: string): ParseResult<StoryInput> {
  const root = 'story';
  if (typeof text !== 'string') return { value: null, errors: [`${root}: 붙여 넣은 내용이 글자가 아닙니다.`] };
  const trimmed = text.trim();
  if (!trimmed) return { value: null, errors: [`${root}: 붙여 넣은 내용이 비었습니다.`] };

  const { fences, unclosed } = findFences(trimmed);
  const jsonFences = fences.filter((f) => f.lang === 'json' || looksLikeJson(f.body.trim()));
  if (unclosed) return { value: null, errors: [`${root}: 코드 블록이 닫히지 않았습니다. 원고는 바뀌지 않았습니다.`] };

  // JSON 원고: JSON 코드 블록이 있거나 글 전체가 JSON처럼 시작하면 엄격하게 읽는다(실패해도 보통 글로 돌리지 않음).
  if (jsonFences.length > 0 || (fences.length === 0 && looksLikeJson(trimmed))) {
    if (unclosed) return { value: null, errors: [`${root}: 코드 블록(\`\`\`)이 닫히지 않았습니다. 답이 끝까지 나왔는지 확인하세요.`] };
    if (fences.length > 1) return { value: null, errors: [`${root}: 코드 블록이 ${fences.length}개입니다. JSON 코드 블록 하나만 붙여 넣으세요.`] };
    if (fences.length === 1 && !['', 'json'].includes(fences[0].lang)) return { value: null, errors: [`${root}: JSON 코드 블록의 언어는 json으로 적으세요. 원고는 바뀌지 않았습니다.`] };
    const body = fences.length === 1 ? fences[0].body.trim() : trimmed;
    if (!body) return { value: null, errors: [`${root}: 코드 블록 안이 비었습니다.`] };
    const parsed = parseJsonStrict(body, root);
    if (!parsed.ok) return { value: null, errors: [parsed.error] };
    return parseStoryObject(parsed.value);
  }

  if (/"(?:fullText|outline|tone)"\s*:/.test(trimmed)) return { value: null, errors: [`${root}: JSON 앞뒤 설명을 빼거나 json 코드 블록 하나로 감싸세요. 원고는 바뀌지 않았습니다.`] };

  // 예전 방식: 원고 글만 붙여 넣기. JSON이 아닌 코드 블록 표시는 걷어 낸다.
  const clean = trimmed.replace(/```[^\n`]*\n?|```/g, '').trim();
  const n = charCount(clean);
  if (n === 0) return { value: null, errors: [`${root}.fullText: 원고가 비었습니다.`] };
  if (n < STORY_MIN_CHARS) {
    return { value: null, errors: [`${root}.fullText: 원고가 너무 짧습니다(공백 뺀 ${n}자, 최소 ${STORY_MIN_CHARS}자). 답 전체를 복사했는지 확인하세요.`] };
  }
  return { value: { fullText: clean }, errors: [] };
}

/* ───────────── 3단계 화풍 선택지 ───────────── */

const DNA_KEYS = ['characters', 'locations', 'stylePreset', 'customStyle', 'negatives'] as const;

/**
 * 비주얼 DNA JSON 전체를 받아 화풍 항목(stylePreset, customStyle, negatives)만 읽는다.
 * characters·locations는 허용 키로만 확인하고 내용은 parseDna가 맡는다.
 */
export function parseVisualOptions(text: string): ParseResult<VisualOptionsInput> {
  const root = 'visualDNA';
  const parsed = extractStrictJson(text, root);
  if (!parsed.ok) return { value: null, errors: [parsed.error] };
  const r = requireObject(parsed.value, root);
  if ('error' in r) return { value: null, errors: [r.error] };
  const obj = r.obj;
  const errors: string[] = [];

  checkKeys(obj, root, DNA_KEYS, errors);
  for (const field of ['characters', 'locations']) {
    const stack: Array<[unknown, string]> = [[obj[field], root + '.' + field]];
    while (stack.length) {
      const [node, path] = stack.pop()!;
      if (Array.isArray(node)) node.forEach((item, i) => stack.push([item, path + '[' + i + ']']));
      else if (isPlainObject(node)) {
        for (const [key, item] of Object.entries(node)) {
          if (isApprovalKey(key)) errors.push(path + '.' + key + ': 승인·완료·확인 기록은 가져올 수 없습니다. 사람이 화면에서 직접 확인해야 합니다.');
          else if (item && typeof item === 'object') stack.push([item, path + '.' + key]);
        }
      }
    }
  }

  for (const field of ['characters', 'locations'] as const) {
    if (hasOwn(obj, field) && !Array.isArray(obj[field])) errors.push(root + '.' + field + ': 카드 배열이어야 합니다.');
    if (Array.isArray(obj[field])) obj[field].forEach((card, i) => {
      const path = root + '.' + field + '[' + i + ']';
      if (!isPlainObject(card)) { errors.push(path + ': 카드 객체여야 합니다.'); return; }
      const fields = field === 'characters' ? ['name', 'age', 'face', 'hair', 'outfit', 'props', 'elementName'] : ['name', 'desc', 'elementName'];
      for (const key of fields) if (hasOwn(card, key) && typeof card[key] !== 'string') errors.push(path + '.' + key + ': 글자여야 합니다.');
    });
  }
  const value: VisualOptionsInput = {};

  if (hasOwn(obj, 'stylePreset') && obj.stylePreset !== undefined && obj.stylePreset !== null) {
    const sp = obj.stylePreset;
    if (typeof sp !== 'string') {
      errors.push(`${root}.stylePreset: 글자여야 합니다(받은 값: ${typeName(sp)}).`);
    } else if (!(STYLE_PRESET_OPTIONS as readonly string[]).includes(sp.trim())) {
      errors.push(`${root}.stylePreset: ${STYLE_PRESET_OPTIONS.join(', ')} 중 하나여야 합니다(받은 값 "${sp}").`);
    } else {
      value.stylePreset = sp.trim() as StylePreset;
    }
  }

  const customStyle = readString(obj, 'customStyle', `${root}.customStyle`, errors, { required: false });
  if (customStyle !== undefined) value.customStyle = customStyle;

  const negatives = readString(obj, 'negatives', `${root}.negatives`, errors, { required: false });
  if (negatives !== undefined) value.negatives = negatives;

  if (value.stylePreset === 'custom' && !customStyle) {
    errors.push(`${root}.customStyle: stylePreset이 custom이면 customStyle에 화풍을 글로 적어야 합니다.`);
  }

  return errors.length ? { value: null, errors } : { value, errors };
}
