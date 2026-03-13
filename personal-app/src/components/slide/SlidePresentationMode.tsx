/**
 * 슬라이드 프레젠테이션 모드
 * 전체화면으로 슬라이드를 순차적으로 표시하고 키보드로 제어
 */

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import SlideCard from './SlideCard';
import type { SlideData } from '@/lib/slideExport';

interface SlidePresentationModeProps {
  slides: SlideData[];
  onClose: () => void;
  initialSlideIndex?: number;
}

/**
 * 프레젠테이션 모드 컴포넌트
 */
export default function SlidePresentationMode({
  slides,
  onClose,
  initialSlideIndex = 0
}: SlidePresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const currentSlide = slides[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === slides.length - 1;

  /**
   * 다음 슬라이드로 이동
   */
  const nextSlide = useCallback(() => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLast]);

  /**
   * 이전 슬라이드로 이동
   */
  const prevSlide = useCallback(() => {
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [isFirst]);

  /**
   * 전체화면 토글
   */
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error('전체화면 전환 실패:', error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error('전체화면 해제 실패:', error);
      }
    }
  }, []);

  /**
   * 키보드 이벤트 핸들러
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          setCurrentIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentIndex(slides.length - 1);
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, onClose, isFullscreen, toggleFullscreen, slides.length]);

  /**
   * 전체화면 변경 감지
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * 마우스 움직임 감지 (컨트롤 표시/숨김)
   */
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  if (!currentSlide) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* 슬라이드 영역 */}
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* 슬라이드 카드 - 최대 크기로 표시 */}
          <div
            className="transition-transform duration-300 ease-in-out"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              aspectRatio: '16 / 9'
            }}
          >
            <SlideCard
              slide={currentSlide}
              width={1280}
              height={720}
            />
          </div>
        </div>
      </div>

      {/* 컨트롤 (자동 숨김) */}
      <div
        className={`fixed inset-x-0 bottom-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 하단 컨트롤 바 */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="max-w-4xl mx-auto">
            {/* 진행률 바 */}
            <div className="mb-4">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / slides.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 이전 버튼 */}
                <button
                  onClick={prevSlide}
                  disabled={isFirst}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors
                             disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="이전 슬라이드"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* 다음 버튼 */}
                <button
                  onClick={nextSlide}
                  disabled={isLast}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors
                             disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="다음 슬라이드"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* 슬라이드 번호 */}
                <span className="text-white text-sm font-medium">
                  {currentIndex + 1} / {slides.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* 전체화면 토글 */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="전체화면 토글"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>

                {/* 닫기 버튼 */}
                <button
                  onClick={onClose}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 키보드 단축키 안내 */}
            <div className="mt-3 text-xs text-white/60 text-center">
              ← → 방향키 또는 스페이스바: 슬라이드 이동 · F: 전체화면 · ESC: 종료
            </div>
          </div>
        </div>
      </div>

      {/* 좌우 클릭 영역 (데스크톱) */}
      <div className="hidden md:block">
        {!isFirst && (
          <button
            onClick={prevSlide}
            className="fixed left-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white
                       hover:bg-white/10 rounded-lg transition-all"
            aria-label="이전 슬라이드"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}
        {!isLast && (
          <button
            onClick={nextSlide}
            className="fixed right-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white
                       hover:bg-white/10 rounded-lg transition-all"
            aria-label="다음 슬라이드"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>

      {/* 상단 슬라이드 정보 */}
      <div
        className={`fixed top-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-white/80 text-sm">
              {currentSlide.type === 'title' ? (
                <span className="font-medium">제목 슬라이드</span>
              ) : (
                <span>
                  <span className="font-semibold">{currentSlide.stageLabel}</span>
                  {' · '}
                  {currentSlide.stageSubtitle}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
