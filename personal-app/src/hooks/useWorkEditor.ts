import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWorksManager } from '@/hooks/useWorksManager';
import { useAIUsage, useVisualDNA } from '@/hooks/useAIUsage';
import { generateStoryIdea } from '@/lib/aiService';
import type { Work, VisualDNA } from '@/types';
import { createEmptyVisualDNA } from '@/types';
import type { PanelContent, PanelScenes, Scene } from '@/components/story';
import { EMPTY_PANELS, EMPTY_PANEL_SCENES, createEmptyScene, PANEL_LABELS } from '@/components/story';

/**
 * 작품 편집 로직을 담당하는 커스텀 훅
 * WorkEdit 페이지에서 UI와 로직을 분리하기 위해 추출
 */
export function useWorkEditor(id: string | undefined) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getWork, updateWork, deleteWork } = useWorksManager();

  // AI 사용량 및 비주얼 DNA
  const { usageStatus, canUseAI, incrementUsage, syncFromServer } = useAIUsage(user?.id, user?.role ?? undefined);
  const {
    visualDNA,
    saveVisualDNA,
    isLoading: isVisualDNALoading
  } = useVisualDNA(id);

  // 편집 상태
  const [work, setWork] = useState<Work | null>(null);
  const [title, setTitle] = useState('');
  const [panels, setPanels] = useState<PanelContent>(EMPTY_PANELS);
  const [scenes, setScenes] = useState<PanelScenes>(EMPTY_PANEL_SCENES);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [localVisualDNA, setLocalVisualDNA] = useState<VisualDNA | null>(null);

  // AI 도우미 상태
  const [aiIdea, setAiIdea] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 비주얼 DNA 동기화
  useEffect(() => {
    if (visualDNA) {
      setLocalVisualDNA(visualDNA);
    } else if (id && !isVisualDNALoading) {
      setLocalVisualDNA(createEmptyVisualDNA(id));
    }
  }, [visualDNA, id, isVisualDNALoading]);

  // 작품 로드
  useEffect(() => {
    if (id) {
      getWork(id).then((data) => {
        if (data) {
          setWork(data);
          setTitle(data.title);
          if (data.panels && typeof data.panels === 'object') {
            const savedData = data.panels as unknown as { panels?: PanelContent; scenes?: PanelScenes };
            if (savedData.panels) {
              setPanels({
                ki: savedData.panels.ki || '',
                seung: savedData.panels.seung || '',
                jeon: savedData.panels.jeon || '',
                gyeol: savedData.panels.gyeol || ''
              });
              if (savedData.scenes) {
                setScenes(savedData.scenes);
              }
            } else {
              const savedPanels = data.panels as unknown as PanelContent;
              setPanels({
                ki: savedPanels.ki || '',
                seung: savedPanels.seung || '',
                jeon: savedPanels.jeon || '',
                gyeol: savedPanels.gyeol || ''
              });
            }
          }
          if (data.panels && typeof data.panels === 'object') {
            const savedData = data.panels as unknown as { step?: number };
            if (savedData.step && savedData.step >= 1 && savedData.step <= 3) {
              setCurrentStep(savedData.step as 1 | 2 | 3);
            }
          }
        } else {
          navigate('/dashboard');
        }
      });
    }
  }, [id, getWork, navigate]);

  // 패널 변경
  const handlePanelsChange = useCallback((newPanels: PanelContent) => {
    setPanels(newPanels);
    setHasChanges(true);
  }, []);

  // 장면 변경
  const handleScenesChange = useCallback((newScenes: PanelScenes) => {
    setScenes(newScenes);
    setHasChanges(true);
  }, []);

  // 완료도 계산
  const getCompletedStep = useCallback(() => {
    let step = 0;
    if (panels.ki.trim().length >= 20) step++;
    if (panels.seung.trim().length >= 20) step++;
    if (panels.jeon.trim().length >= 20) step++;
    if (panels.gyeol.trim().length >= 20) step++;
    if (step === 0) return 1;
    if (step <= 2) return 2;
    return 3;
  }, [panels]);

  // 저장
  const handleSave = useCallback(async () => {
    if (!work || !id) return;

    setIsSaving(true);
    try {
      const updated = await updateWork(id, {
        title,
        panels: { panels, scenes, step: currentStep } as unknown as import('@/types').Json,
      });
      if (updated) {
        setWork(updated);
        setLastSaved(new Date());
        setHasChanges(false);
        toast.success('저장되었습니다');
      } else {
        toast.error('저장에 실패했습니다');
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다');
    } finally {
      setIsSaving(false);
    }
  }, [work, id, title, panels, scenes, currentStep, updateWork]);

  // 자동 저장
  const handleAutoSave = useCallback(() => {
    if (hasChanges && work && id) {
      handleSave();
    }
  }, [hasChanges, work, id, handleSave]);

  // 삭제
  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm('정말 이 작품을 삭제하시겠습니까?\n삭제된 작품은 복구할 수 없습니다.')) return;

    try {
      const success = await deleteWork(id);
      if (success) {
        toast.success('작품이 삭제되었습니다');
        navigate('/dashboard');
      } else {
        toast.error('삭제에 실패했습니다');
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다');
    }
  }, [id, deleteWork, navigate]);

  // 비주얼 DNA 저장
  const handleVisualDNASave = useCallback(async () => {
    if (!localVisualDNA) return false;
    setIsSaving(true);
    try {
      const success = await saveVisualDNA(localVisualDNA);
      if (success) {
        setHasChanges(false);
        toast.success('비주얼 DNA가 저장되었습니다');
      } else {
        toast.error('비주얼 DNA 저장에 실패했습니다');
      }
      return success;
    } catch {
      toast.error('비주얼 DNA 저장 중 오류가 발생했습니다');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [localVisualDNA, saveVisualDNA]);

  // 비주얼 DNA 변경
  const handleVisualDNAChange = useCallback((dna: VisualDNA) => {
    setLocalVisualDNA(dna);
    setHasChanges(true);
  }, []);

  // 제목 변경
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  }, []);

  // AI 도우미: 스토리 아이디어 생성
  const handleAIStoryIdea = useCallback(async () => {
    // 사용량 사전 체크
    if (!canUseAI) {
      setAiError('오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 시도해주세요! 🌙');
      return;
    }

    // 클라이언트 사용량 증가 (UX용 사전 체크)
    const allowed = await incrementUsage();
    if (!allowed) {
      setAiError('오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 시도해주세요! 🌙');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    setAiIdea(null);

    try {
      const existingContent = [
        panels.ki && `기(시작): ${panels.ki}`,
        panels.seung && `승(전개): ${panels.seung}`,
        panels.jeon && `전(위기): ${panels.jeon}`,
        panels.gyeol && `결(결말): ${panels.gyeol}`,
      ].filter(Boolean).join('\n');

      const result = await generateStoryIdea(
        title || '(제목 미정)',
        undefined,
        existingContent || undefined
      );
      setAiIdea(result.content);

      // 서버 응답의 remaining으로 클라이언트 동기화
      if (result.remaining !== undefined) {
        syncFromServer(result.remaining);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 아이디어 생성에 실패했어요.');
    } finally {
      setIsAiLoading(false);
    }
  }, [title, panels, canUseAI, incrementUsage, syncFromServer]);

  // AI 아이디어 닫기
  const dismissAiIdea = useCallback(() => {
    setAiIdea(null);
  }, []);

  // 장면 확장으로 이동
  const handleGoToSceneExpansion = useCallback(() => {
    const newScenes = { ...scenes };
    (['ki', 'seung', 'jeon', 'gyeol'] as const).forEach(key => {
      if (newScenes[key].length === 0) {
        newScenes[key] = [createEmptyScene(key, 1)];
      }
    });
    setScenes(newScenes);
    setCurrentStep(2);
  }, [scenes]);

  // 다운로드 유틸리티
  const downloadFile = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filename} 다운로드 완료`);
  }, []);

  // 텍스트 다운로드
  const handleDownloadText = useCallback(() => {
    const content = `제목: ${title}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[기 - 시작]
${panels.ki || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[승 - 전개]
${panels.seung || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[전 - 위기]
${panels.jeon || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[결 - 결말]
${panels.gyeol || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

작성일: ${new Date().toLocaleDateString('ko-KR')}
`;
    downloadFile(content, `${title || '스토리'}.txt`, 'text/plain');
  }, [title, panels, downloadFile]);

  // JSON 다운로드
  const handleDownloadJson = useCallback(() => {
    const data = {
      title,
      panels: {
        ki: { label: '기(시작)', content: panels.ki },
        seung: { label: '승(전개)', content: panels.seung },
        jeon: { label: '전(위기)', content: panels.jeon },
        gyeol: { label: '결(결말)', content: panels.gyeol }
      },
      metadata: {
        createdAt: work?.created_at,
        updatedAt: work?.updated_at,
        exportedAt: new Date().toISOString()
      }
    };
    downloadFile(JSON.stringify(data, null, 2), `${title || '스토리'}.json`, 'application/json');
  }, [title, panels, work, downloadFile]);

  // Vids 관련 유틸리티
  const collectVidsScenes = useCallback(() => {
    const panelOrder: (keyof PanelScenes)[] = ['ki', 'seung', 'jeon', 'gyeol'];
    const items: { panelKey: keyof PanelScenes; scene: Scene }[] = [];

    panelOrder.forEach((panelKey) => {
      const ordered = [...scenes[panelKey]].sort((a, b) => (a.order || 0) - (b.order || 0));
      ordered.forEach((scene) => {
        const hasContent = [
          scene.setting, scene.characters, scene.action,
          scene.dialogue, scene.mood, scene.narration,
          scene.subtitle, scene.onScreenText
        ].some((value) => value && value.trim());
        if (hasContent) {
          items.push({ panelKey, scene });
        }
      });
    });
    return items;
  }, [scenes]);

  const estimateDurationSec = useCallback((scene: Scene) => {
    if (scene.durationSec && Number.isFinite(scene.durationSec)) {
      return scene.durationSec;
    }
    const baseText = (scene.narration || scene.subtitle || scene.dialogue || scene.action || '').trim();
    if (!baseText) return 4;
    const chars = baseText.replace(/\s+/g, '').length;
    const sentenceCount = baseText.split(/[.!?\n]+/).filter(Boolean).length;
    const estimate = Math.ceil(chars / 12) + (sentenceCount * 0.5);
    const rounded = Math.round(estimate * 10) / 10;
    return Math.max(4, rounded);
  }, []);

  const formatSrtTime = useCallback((seconds: number) => {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);
    const pad = (value: number, size = 2) => value.toString().padStart(size, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  }, []);

  // Vids 스토리보드 다운로드
  const handleDownloadVidsStoryboard = useCallback(() => {
    const items = collectVidsScenes();
    const scenesData = items.map((item, index) => {
      const narration = (item.scene.narration || item.scene.dialogue || item.scene.action || '').trim();
      const subtitle = (item.scene.subtitle || narration).trim();
      return {
        sceneNumber: index + 1,
        stage: PANEL_LABELS[item.panelKey].label,
        stageName: PANEL_LABELS[item.panelKey].subtitle,
        panelKey: item.panelKey,
        narration, subtitle,
        onScreenText: item.scene.onScreenText || '',
        durationSec: estimateDurationSec(item.scene),
        cameraAngle: item.scene.cameraAngle || '',
        shotType: item.scene.shotType || '',
        sfx: item.scene.sfx || '',
        music: item.scene.music || '',
        setting: item.scene.setting || '',
        characters: item.scene.characters || '',
        action: item.scene.action || '',
        mood: item.scene.mood || '',
        imagePrompt: item.scene.imagePrompt || ''
      };
    });
    const data = { title, exportedAt: new Date().toISOString(), format: 'google-vids', scenes: scenesData };
    downloadFile(JSON.stringify(data, null, 2), `${title || '스토리'}-vids-storyboard.json`, 'application/json');
  }, [title, collectVidsScenes, estimateDurationSec, downloadFile]);

  // Vids 스크립트 다운로드
  const handleDownloadVidsScript = useCallback(() => {
    const items = collectVidsScenes();
    const lines = items.map((item, index) => {
      const narration = (item.scene.narration || item.scene.dialogue || item.scene.action || '').trim();
      const label = `${index + 1}. [${PANEL_LABELS[item.panelKey].label}]`;
      return `${label}\n${narration || '(나레이션 없음)'}\n`;
    });
    const content = [`제목: ${title || '스토리'}`, '', '---', '', ...lines].join('\n');
    downloadFile(content, `${title || '스토리'}-vids-script.txt`, 'text/plain');
  }, [title, collectVidsScenes, downloadFile]);

  // 자막 다운로드
  const handleDownloadVidsCaptions = useCallback(() => {
    const items = collectVidsScenes();
    let cursor = 0;
    const entries: string[] = [];
    items.forEach((item) => {
      const duration = estimateDurationSec(item.scene);
      const start = cursor;
      const end = cursor + duration;
      cursor = end;
      const text = (item.scene.subtitle || item.scene.narration || item.scene.dialogue || item.scene.action || '').trim();
      if (!text) return;
      entries.push(String(entries.length + 1), `${formatSrtTime(start)} --> ${formatSrtTime(end)}`, text, '');
    });
    downloadFile(entries.join('\n'), `${title || '스토리'}-captions.srt`, 'text/plain');
  }, [title, collectVidsScenes, estimateDurationSec, formatSrtTime, downloadFile]);

  return {
    // 상태
    work,
    title,
    panels,
    scenes,
    currentStep,
    isSaving,
    lastSaved,
    hasChanges,
    localVisualDNA,
    usageStatus,
    aiIdea,
    isAiLoading,
    aiError,

    // 핸들러
    setCurrentStep,
    handleTitleChange,
    handlePanelsChange,
    handleScenesChange,
    handleSave,
    handleAutoSave,
    handleDelete,
    handleVisualDNASave,
    handleVisualDNAChange,
    handleGoToSceneExpansion,
    getCompletedStep,
    handleAIStoryIdea,
    dismissAiIdea,

    // 다운로드
    handleDownloadText,
    handleDownloadJson,
    handleDownloadVidsStoryboard,
    handleDownloadVidsScript,
    handleDownloadVidsCaptions,
  };
}
