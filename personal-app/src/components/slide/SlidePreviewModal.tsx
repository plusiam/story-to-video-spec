/**
 * 슬라이드 미리보기 모달
 * 모든 슬라이드를 미리보기하고 개별/전체 다운로드 지원
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { X, Download, Package, Loader2, Presentation } from 'lucide-react';
import SlideCard from './SlideCard';
import SlidePresentationMode from './SlidePresentationMode';
import { storyToSlides, downloadSingleSlide } from '@/lib/slideExport';
import type { PanelContent } from '@/components/story/storyPanelConfig';
import type { PanelScenes } from '@/components/story/sceneConfig';
import toast from 'react-hot-toast';

interface SlidePreviewModalProps {
  title: string;
  panels: PanelContent;
  scenes: PanelScenes;
  onClose: () => void;
}

/**
 * 슬라이드 미리보기 모달 컴포넌트
 */
export default function SlidePreviewModal({
  title,
  panels,
  scenes,
  onClose
}: SlidePreviewModalProps) {
  // 슬라이드 데이터 생성 (메모이제이션)
  const slides = useMemo(() => {
    return storyToSlides(title, panels, scenes);
  }, [title, panels, scenes]);

  // 각 슬라이드의 DOM ref 저장
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ZIP 생성 중 상태
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // 프레젠테이션 모드 상태
  const [showPresentation, setShowPresentation] = useState(false);
  const [presentationStartIndex, setPresentationStartIndex] = useState(0);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGeneratingZip) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isGeneratingZip]);

  /**
   * 단건 슬라이드 다운로드
   */
  const handleDownloadSlide = async (index: number) => {
    const element = slideRefs.current[index];
    if (!element) {
      toast.error('슬라이드를 찾을 수 없습니다.');
      return;
    }

    try {
      const filename = `slide_${String(index + 1).padStart(2, '0')}.png`;
      await downloadSingleSlide(element, filename);
      toast.success(`슬라이드 ${index + 1} 저장 완료!`);
    } catch (error) {
      console.error('슬라이드 다운로드 실패:', error);
      toast.error('슬라이드 다운로드에 실패했습니다.');
    }
  };

  /**
   * 프레젠테이션 모드 시작
   */
  const handleStartPresentation = (startIndex: number = 0) => {
    setPresentationStartIndex(startIndex);
    setShowPresentation(true);
  };

  /**
   * 프레젠테이션 모드 종료
   */
  const handleClosePresentation = () => {
    setShowPresentation(false);
  };

  /**
   * 전체 슬라이드 ZIP 다운로드 (진행률 표시)
   */
  const handleDownloadAllSlides = async () => {
    const validElements = slideRefs.current.filter((el): el is HTMLDivElement => el !== null);

    if (validElements.length === 0) {
      toast.error('다운로드할 슬라이드가 없습니다.');
      return;
    }

    setIsGeneratingZip(true);
    setZipProgress(0);

    try {
      // 진행률을 보여주기 위해 커스텀 ZIP 생성 로직 사용
      const { toPng } = await import('html-to-image');
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');

      const zip = new JSZip();

      for (let i = 0; i < validElements.length; i++) {
        const element = validElements[i];
        const filename = `slide_${String(i + 1).padStart(2, '0')}.png`;

        // 슬라이드를 PNG로 변환
        const dataUrl = await toPng(element, {
          pixelRatio: 2,
          width: 640,
          height: 360
        });

        // Data URL을 Base64로 변환하여 ZIP에 추가
        const base64Data = dataUrl.split(',')[1];
        zip.file(filename, base64Data, { base64: true });

        // 진행률 업데이트
        setZipProgress(Math.round(((i + 1) / validElements.length) * 100));
      }

      // ZIP 파일 생성 및 다운로드
      const blob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `${title}_슬라이드.zip`;
      saveAs(blob, zipFilename);

      toast.success(`${validElements.length}개 슬라이드 ZIP 저장 완료!`);
    } catch (error) {
      console.error('ZIP 다운로드 실패:', error);
      toast.error('ZIP 다운로드에 실패했습니다.');
    } finally {
      setIsGeneratingZip(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">슬라이드 미리보기</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">총 {slides.length}개 슬라이드</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 ml-2">
            <button
              onClick={() => handleStartPresentation(0)}
              disabled={isGeneratingZip || slides.length === 0}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg
                         hover:bg-green-700 transition-colors font-medium disabled:opacity-50
                         disabled:cursor-not-allowed text-sm"
            >
              <Presentation className="w-4 h-4" />
              <span className="hidden sm:inline">발표 모드</span>
              <span className="sm:hidden">발표</span>
            </button>
            <button
              onClick={handleDownloadAllSlides}
              disabled={isGeneratingZip}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors font-medium disabled:opacity-50
                         disabled:cursor-not-allowed text-sm"
            >
              {isGeneratingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">생성 중 {zipProgress}%</span>
                  <span className="sm:hidden">{zipProgress}%</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">전체 ZIP 저장</span>
                  <span className="sm:hidden">ZIP</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isGeneratingZip}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="닫기"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 슬라이드 목록 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p className="text-base sm:text-lg font-medium">슬라이드가 없습니다</p>
              <p className="text-xs sm:text-sm mt-2 text-center px-4">스토리를 작성하면 자동으로 슬라이드가 생성됩니다.</p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {slides.map((slide, index) => (
                <div key={slide.id} className="space-y-2 sm:space-y-3">
                  {/* 슬라이드 정보 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        슬라이드 {index + 1}
                      </span>
                      <span className="text-xs text-gray-500 hidden sm:inline">
                        {slide.type === 'title' ? '제목' : `${slide.stageLabel} - ${slide.stageSubtitle}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartPresentation(index)}
                        disabled={isGeneratingZip}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-green-600
                                   hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="여기서부터 발표 시작"
                      >
                        <Presentation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">발표</span>
                      </button>
                      <button
                        onClick={() => handleDownloadSlide(index)}
                        disabled={isGeneratingZip}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-blue-600
                                   hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">저장</span>
                      </button>
                    </div>
                  </div>

                  {/* 슬라이드 카드 (미리보기 + 다운로드 대상) */}
                  <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <SlideCard
                      ref={(el) => {
                        slideRefs.current[index] = el;
                      }}
                      slide={slide}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-600">
            💡 개별 슬라이드를 PNG로 저장하거나, 전체 ZIP으로 다운로드할 수 있습니다.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ESC 키로 닫기 · 고해상도 1280×720 PNG · 발표 모드로 전체화면 발표 가능
          </p>
        </div>
      </div>

      {/* 프레젠테이션 모드 */}
      {showPresentation && (
        <SlidePresentationMode
          slides={slides}
          initialSlideIndex={presentationStartIndex}
          onClose={handleClosePresentation}
        />
      )}
    </div>
  );
}
