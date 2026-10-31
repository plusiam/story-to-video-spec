/**
 * 그림 프롬프트 만들기 (Gemini 앱 기준, 한글 프롬프트)
 *
 * 화풍은 특정 스튜디오·작가 이름 대신 재료와 기법으로 묘사한다.
 * 일관성은 글 설명 + 4단계 기준 시트 이미지 첨부로 지킨다.
 */
import type { CharacterCard, LocationCard, Project, SceneRecord, StylePreset } from '@/types/project';
import { characterNames } from '@/lib/text';

export const STYLE_PRESETS: { value: Exclude<StylePreset, 'custom'>; label: string; hint: string; prompt: string }[] = [
  {
    value: 'minhwa',
    label: '민화풍',
    hint: '굵은 먹선, 평면 구도, 차분한 오방색',
    prompt:
      '조선 민화풍 그림. 굵고 단정한 먹선 윤곽, 평면적이고 장식적인 구도, 채도를 낮춘 오방색(붉은색·푸른색·노란색·흰색·검은색), 한지 질감 바탕',
  },
  {
    value: 'sumuk',
    label: '수묵담채',
    hint: '먹의 번짐과 여백, 연한 채색',
    prompt: '수묵담채화. 먹의 짙고 옅음으로 그린 선과 번짐, 연한 채색을 살짝 더함, 넉넉한 여백, 한지 질감 바탕',
  },
  {
    value: 'picturebook-watercolor',
    label: '그림책 수채화',
    hint: '부드러운 연필선, 맑고 따뜻한 수채',
    prompt: '따뜻한 그림책 수채화 일러스트. 부드러운 연필 윤곽, 맑고 따뜻한 수채 번짐, 둥글고 친근한 인물 표현, 수채 종이 질감',
  },
];

/** 시니어 시청자를 위한 공통 화면 규칙 */
const SENIOR_FRAMING = '16:9 가로 화면. 인물을 크게, 배경은 단순하게, 밝고 대비가 분명하게.';

export function styleText(p: Project): string {
  const { stylePreset, customStyle } = p.visualDNA;
  if (stylePreset === 'custom') return customStyle.trim();
  return STYLE_PRESETS.find((s) => s.value === stylePreset)?.prompt ?? '';
}

export function describeCharacter(c: CharacterCard): string {
  const parts = [
    c.age && `${c.age}`,
    c.face && `얼굴: ${c.face}`,
    c.hair && `머리: ${c.hair}`,
    c.outfit && `옷: ${c.outfit}`,
    c.props && `소품: ${c.props}`,
    `대표 색: ${c.colors.join(', ')}`,
  ].filter(Boolean);
  return `${c.name}(${parts.join(' / ')})`;
}

const describeLocation = (l: LocationCard | undefined, name: string) => (l?.desc ? `${name} — ${l.desc}` : name);

/** 4단계: 인물 기준 시트 프롬프트 */
export function characterSheetPrompt(p: Project, c: CharacterCard): string {
  return [
    `[인물 기준 시트] ${styleText(p)}.`,
    `한 장 안에 같은 인물을 나란히 그린다: 정면 전신, 옆모습 전신, 표정 세 가지(웃는 얼굴, 놀란 얼굴, 슬픈 얼굴) 상반신.`,
    `바탕은 깨끗한 흰색, 배경 소품 없음.`,
    `인물: ${describeCharacter(c)}.`,
    `그림 안에 넣지 말 것: ${p.visualDNA.negatives}.`,
  ].join('\n');
}

/** 5단계: 장면 그림 프롬프트 */
export function scenePrompt(p: Project, sc: SceneRecord): string {
  const names = characterNames(sc);
  const cast = names
    .map((n) => p.visualDNA.characters.find((c) => c.name === n))
    .filter((c): c is CharacterCard => Boolean(c));
  const loc = p.visualDNA.locations.find((l) => l.name === sc.location.trim());
  return [
    `${styleText(p)}. ${SENIOR_FRAMING}`,
    `장면: ${sc.visual}`,
    `장소: ${describeLocation(loc, sc.location.trim() || '정하지 않음')}`,
    cast.length
      ? `등장인물: ${cast.map(describeCharacter).join('; ')}. 첨부한 기준 시트와 얼굴형·머리 모양·옷 색을 똑같이 유지한다.`
      : '등장인물 없음 (풍경만).',
    sc.emotion && `분위기: ${sc.emotion}`,
    `그림 안에 넣지 말 것: ${p.visualDNA.negatives}.`,
  ]
    .filter(Boolean)
    .join('\n');
}
