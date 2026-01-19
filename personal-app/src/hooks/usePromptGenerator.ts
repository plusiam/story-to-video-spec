/**
 * 프롬프트 생성 훅
 * AI 서비스별 프롬프트 생성 및 내보내기 기능 제공
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  AIService,
  PromptConfig,
  GeneratedPrompt,
  PromptExportBundle,
  StoryInput,
  PromptLanguage,
  AspectRatio
} from '@/lib/prompts/types';
import {
  DEFAULT_PROMPT_CONFIG,
  IMAGE_AI_SERVICES,
  VIDEO_AI_SERVICES,
  ALL_AI_SERVICES
} from '@/lib/prompts/types';
import {
  generatePromptForScene,
  generatePromptsForStory,
  generatePromptBundle,
  promptsToText,
  promptsToJson,
  getClipboardText,
  getAllPromptsClipboardText
} from '@/lib/prompts/generators/promptGenerator';
import type { VisualDNA } from '@/types/ai';
import type { Scene, PanelScenes } from '@/components/story/sceneConfig';

interface UsePromptGeneratorOptions {
  defaultService?: AIService;
  defaultLanguage?: PromptLanguage;
}

interface UsePromptGeneratorReturn {
  // 설정
  config: PromptConfig;
  setService: (service: AIService) => void;
  setLanguage: (language: PromptLanguage) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  toggleNegativePrompt: () => void;
  toggleCharacterConsistency: () => void;

  // 서비스 정보
  currentServiceInfo: typeof ALL_AI_SERVICES[AIService];
  imageServices: typeof IMAGE_AI_SERVICES;
  videoServices: typeof VIDEO_AI_SERVICES;

  // 프롬프트 생성
  generateForScene: (
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol',
    sceneIndex: number
  ) => GeneratedPrompt;

  generateForStory: (story: StoryInput) => GeneratedPrompt[];

  generateBundle: (story: StoryInput) => PromptExportBundle;

  // 내보내기
  exportAsText: (bundle: PromptExportBundle) => string;
  exportAsJson: (bundle: PromptExportBundle) => string;

  // 복사
  copyToClipboard: (prompt: GeneratedPrompt) => Promise<boolean>;
  copyAllToClipboard: (bundle: PromptExportBundle) => Promise<boolean>;

  // 다운로드
  downloadAsText: (bundle: PromptExportBundle, filename?: string) => void;
  downloadAsJson: (bundle: PromptExportBundle, filename?: string) => void;

  // 상태
  copiedPromptId: string | null;
  setCopiedPromptId: (id: string | null) => void;
}

/**
 * 프롬프트 생성 훅
 */
export const usePromptGenerator = (
  options: UsePromptGeneratorOptions = {}
): UsePromptGeneratorReturn => {
  const {
    defaultService = 'gemini',
    defaultLanguage = 'ko'
  } = options;

  // 설정 상태
  const [config, setConfig] = useState<PromptConfig>({
    ...DEFAULT_PROMPT_CONFIG,
    service: defaultService,
    language: defaultLanguage
  });

  // 복사 상태
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // 현재 서비스 정보
  const currentServiceInfo = useMemo(
    () => ALL_AI_SERVICES[config.service],
    [config.service]
  );

  // 설정 변경 함수들
  const setService = useCallback((service: AIService) => {
    setConfig(prev => ({
      ...prev,
      service,
      // 서비스에 따라 네거티브 프롬프트 자동 설정
      includeNegativePrompt: ALL_AI_SERVICES[service].supportsNegativePrompt
    }));
  }, []);

  const setLanguage = useCallback((language: PromptLanguage) => {
    setConfig(prev => ({ ...prev, language }));
  }, []);

  const setAspectRatio = useCallback((aspectRatio: AspectRatio) => {
    setConfig(prev => ({ ...prev, aspectRatio }));
  }, []);

  const toggleNegativePrompt = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      includeNegativePrompt: !prev.includeNegativePrompt
    }));
  }, []);

  const toggleCharacterConsistency = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      includeCharacterConsistency: !prev.includeCharacterConsistency
    }));
  }, []);

  // 프롬프트 생성 함수들
  const generateForScene = useCallback((
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol',
    sceneIndex: number
  ): GeneratedPrompt => {
    return generatePromptForScene(scene, visualDNA, panelKey, sceneIndex, config);
  }, [config]);

  const generateForStory = useCallback((story: StoryInput): GeneratedPrompt[] => {
    return generatePromptsForStory(story, config);
  }, [config]);

  const generateBundle = useCallback((story: StoryInput): PromptExportBundle => {
    return generatePromptBundle(story, config);
  }, [config]);

  // 내보내기 함수들
  const exportAsText = useCallback((bundle: PromptExportBundle): string => {
    return promptsToText(bundle);
  }, []);

  const exportAsJson = useCallback((bundle: PromptExportBundle): string => {
    return promptsToJson(bundle);
  }, []);

  // 클립보드 복사
  const copyToClipboard = useCallback(async (prompt: GeneratedPrompt): Promise<boolean> => {
    try {
      const text = getClipboardText(prompt);
      await navigator.clipboard.writeText(text);
      setCopiedPromptId(prompt.id);
      setTimeout(() => setCopiedPromptId(null), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  const copyAllToClipboard = useCallback(async (bundle: PromptExportBundle): Promise<boolean> => {
    try {
      const text = getAllPromptsClipboardText(bundle);
      await navigator.clipboard.writeText(text);
      setCopiedPromptId('all');
      setTimeout(() => setCopiedPromptId(null), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  // 파일 다운로드
  const downloadAsText = useCallback((bundle: PromptExportBundle, filename?: string) => {
    const text = promptsToText(bundle);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${bundle.title}-${bundle.service}-prompts.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const downloadAsJson = useCallback((bundle: PromptExportBundle, filename?: string) => {
    const json = promptsToJson(bundle);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${bundle.title}-${bundle.service}-prompts.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    // 설정
    config,
    setService,
    setLanguage,
    setAspectRatio,
    toggleNegativePrompt,
    toggleCharacterConsistency,

    // 서비스 정보
    currentServiceInfo,
    imageServices: IMAGE_AI_SERVICES,
    videoServices: VIDEO_AI_SERVICES,

    // 프롬프트 생성
    generateForScene,
    generateForStory,
    generateBundle,

    // 내보내기
    exportAsText,
    exportAsJson,

    // 복사
    copyToClipboard,
    copyAllToClipboard,

    // 다운로드
    downloadAsText,
    downloadAsJson,

    // 상태
    copiedPromptId,
    setCopiedPromptId
  };
};

/**
 * PanelScenes를 StoryInput 형식으로 변환하는 헬퍼
 */
export const convertToStoryInput = (
  title: string,
  scenes: PanelScenes,
  visualDNA: VisualDNA
): StoryInput => {
  const panelOrder: ('ki' | 'seung' | 'jeon' | 'gyeol')[] = ['ki', 'seung', 'jeon', 'gyeol'];
  const sceneInputs: StoryInput['scenes'] = [];

  panelOrder.forEach(panelKey => {
    const panelScenes = scenes[panelKey] || [];
    panelScenes.forEach((scene, index) => {
      // 내용이 있는 장면만 포함
      const hasContent = [
        scene.setting,
        scene.characters,
        scene.action,
        scene.dialogue,
        scene.mood
      ].some(value => value && value.trim());

      if (hasContent) {
        sceneInputs.push({
          panelKey,
          sceneIndex: index + 1,
          scene
        });
      }
    });
  });

  return {
    title,
    scenes: sceneInputs,
    visualDNA
  };
};

export default usePromptGenerator;
