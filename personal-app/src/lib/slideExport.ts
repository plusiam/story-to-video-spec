/**
 * 슬라이드 내보내기 로직
 * 4컷 스토리를 16:9 슬라이드 PNG로 변환하고 다운로드
 */

import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { PanelContent } from '@/components/story/storyPanelConfig';
import type { PanelScenes, Scene } from '@/components/story/sceneConfig';

/**
 * 슬라이드 데이터 타입
 */
export interface SlideData {
  id: string;
  index: number;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol' | 'title';
  type: 'title' | 'panel' | 'scene';
  stageLabel: string;       // '기', '승', '전', '결'
  stageSubtitle: string;    // '시작', '전개', '위기', '결말'
  title: string;            // 슬라이드 소제목
  content: string;          // 본문 (나레이션 > 대사 > 행동 순)
  subtitle?: string;        // 하단 자막 (선택)
  bgColor: string;          // 배경색 hex (폴백용)
  bgGradient?: string;      // 배경 그라데이션 CSS (시네마틱 효과)
  accentColor: string;      // 강조색 hex
  accentDark?: string;      // 강조색 어두운 버전 (클랩보드용)
}

/**
 * 패널 키에 따른 색상 매핑 (시네마틱 그라데이션)
 * 기(Ki): 새벽의 푸른 빛 - 시작의 느낌
 * 승(Seung): 햇살의 초록빛 - 성장의 느낌
 * 전(Jeon): 석양의 주황빛 - 긴장의 느낌
 * 결(Gyeol): 밤하늘의 보라빛 - 완성의 느낌
 */
const PANEL_COLOR_MAP: Record<'ki' | 'seung' | 'jeon' | 'gyeol', {
  bg: string;
  bgGradient: string;
  accent: string;
  accentDark: string;
}> = {
  ki: {
    bg: '#EFF6FF',
    bgGradient: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)',
    accent: '#3B82F6',
    accentDark: '#1E40AF'
  },
  seung: {
    bg: '#F0FDF4',
    bgGradient: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 50%, #86EFAC 100%)',
    accent: '#22C55E',
    accentDark: '#15803D'
  },
  jeon: {
    bg: '#FFF7ED',
    bgGradient: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 50%, #FDBA74 100%)',
    accent: '#F97316',
    accentDark: '#C2410C'
  },
  gyeol: {
    bg: '#FAF5FF',
    bgGradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 50%, #D8B4FE 100%)',
    accent: '#A855F7',
    accentDark: '#7E22CE'
  }
};

/**
 * 패널 라벨 매핑
 */
const PANEL_LABEL_MAP: Record<'ki' | 'seung' | 'jeon' | 'gyeol', { label: string; subtitle: string }> = {
  ki: { label: '기', subtitle: '시작' },
  seung: { label: '승', subtitle: '전개' },
  jeon: { label: '전', subtitle: '위기' },
  gyeol: { label: '결', subtitle: '결말' }
};

/**
 * Scene 데이터에서 본문 텍스트 추출
 * 우선순위: narration > dialogue > action > setting
 */
function extractSceneContent(scene: Scene): string {
  if (scene.narration && scene.narration.trim()) {
    return scene.narration.trim();
  }
  if (scene.dialogue && scene.dialogue.trim()) {
    return scene.dialogue.trim();
  }
  if (scene.action && scene.action.trim()) {
    return scene.action.trim();
  }
  if (scene.setting && scene.setting.trim()) {
    return scene.setting.trim();
  }
  return '';
}

/**
 * Scene 데이터가 유효한지 확인 (내용이 있는지)
 */
function isValidScene(scene: Scene): boolean {
  return extractSceneContent(scene).length > 0;
}

/**
 * 4컷 스토리를 슬라이드 데이터로 변환
 *
 * @param workTitle - 작품 제목
 * @param panels - 4컷 패널 텍스트
 * @param scenes - 장면 확장 데이터
 * @returns 슬라이드 데이터 배열
 */
export function storyToSlides(
  workTitle: string,
  panels: PanelContent,
  scenes: PanelScenes
): SlideData[] {
  const slides: SlideData[] = [];
  let slideIndex = 1;

  // 1. 제목 슬라이드
  slides.push({
    id: 'title',
    index: slideIndex++,
    panelKey: 'title',
    type: 'title',
    stageLabel: '',
    stageSubtitle: '',
    title: workTitle,
    content: '',
    bgColor: '#FFFFFF',
    accentColor: '#3B82F6'
  });

  // 2. 각 패널별 슬라이드 생성
  const panelKeys: Array<'ki' | 'seung' | 'jeon' | 'gyeol'> = ['ki', 'seung', 'jeon', 'gyeol'];

  panelKeys.forEach((panelKey) => {
    const panelScenes = scenes[panelKey];
    const panelText = panels[panelKey];
    const colors = PANEL_COLOR_MAP[panelKey];
    const labels = PANEL_LABEL_MAP[panelKey];

    // scenes 있을 때: 각 Scene을 개별 슬라이드로 생성
    if (panelScenes && panelScenes.length > 0) {
      panelScenes.forEach((scene, sceneIndex) => {
        const content = extractSceneContent(scene);

        // 내용이 없는 Scene은 건너뛰기
        if (!isValidScene(scene)) {
          return;
        }

        slides.push({
          id: scene.id,
          index: slideIndex++,
          panelKey,
          type: 'scene',
          stageLabel: labels.label,
          stageSubtitle: labels.subtitle,
          title: `${labels.label} - ${sceneIndex + 1}`,
          content,
          subtitle: scene.subtitle && scene.subtitle.trim() ? scene.subtitle.trim() : undefined,
          bgColor: colors.bg,
          bgGradient: colors.bgGradient,
          accentColor: colors.accent,
          accentDark: colors.accentDark
        });
      });
    }
    // scenes 없을 때: panels 텍스트로 슬라이드 한 장 생성
    else if (panelText && panelText.trim()) {
      slides.push({
        id: `${panelKey}-panel`,
        index: slideIndex++,
        panelKey,
        type: 'panel',
        stageLabel: labels.label,
        stageSubtitle: labels.subtitle,
        title: `${labels.label} (${labels.subtitle})`,
        content: panelText.trim(),
        bgColor: colors.bg,
        bgGradient: colors.bgGradient,
        accentColor: colors.accent,
        accentDark: colors.accentDark
      });
    }
  });

  return slides;
}

/**
 * 단건 슬라이드를 PNG로 다운로드
 *
 * @param element - 슬라이드 DOM 요소
 * @param filename - 저장할 파일명
 */
export async function downloadSingleSlide(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,  // 고해상도 (1280×720 출력)
      width: 640,
      height: 360
    });

    // Blob으로 변환 후 다운로드
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    saveAs(blob, filename);
  } catch (error) {
    console.error('슬라이드 PNG 다운로드 실패:', error);
    throw error;
  }
}

/**
 * 모든 슬라이드를 ZIP으로 다운로드
 *
 * @param elements - 슬라이드 DOM 요소 배열
 * @param workTitle - 작품 제목 (파일명에 사용)
 */
export async function downloadAllSlidesAsZip(
  elements: HTMLElement[],
  workTitle: string
): Promise<void> {
  try {
    const zip = new JSZip();

    // 각 슬라이드를 PNG로 변환하여 ZIP에 추가
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const filename = `slide_${String(i + 1).padStart(2, '0')}.png`;

      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        width: 640,
        height: 360
      });

      // Data URL을 Base64로 변환
      const base64Data = dataUrl.split(',')[1];
      zip.file(filename, base64Data, { base64: true });
    }

    // ZIP 파일 생성 및 다운로드
    const blob = await zip.generateAsync({ type: 'blob' });
    const zipFilename = `${workTitle}_슬라이드.zip`;
    saveAs(blob, zipFilename);
  } catch (error) {
    console.error('슬라이드 ZIP 다운로드 실패:', error);
    throw error;
  }
}
