/**
 * 슬라이드 카드 컴포넌트 - 시네마틱 스토리보드 디자인
 * html-to-image를 사용하여 PNG로 변환할 수 있도록 forwardRef 구현
 * Tailwind 클래스 대신 인라인 style 사용 (html-to-image 호환성)
 *
 * 디자인 컨셉:
 * - 와이드스크린 영화적 레이아웃 (16:9 비율)
 * - 레터박스 효과 (상단/하단 검은 띠로 시네마틱 느낌)
 * - 챕터별 그라데이션 배경 (기/승/전/결)
 * - 영화 클랩보드 스타일 장면 번호
 * - 영화 자막 스타일 텍스트
 */

import { forwardRef } from 'react';
import type { SlideData } from '@/lib/slideExport';

interface SlideCardProps {
  slide: SlideData;
  width?: number;
  height?: number;
}

/**
 * 슬라이드 카드 컴포넌트 (forwardRef)
 * 16:9 비율 고정 (기본 640×360)
 */
const SlideCard = forwardRef<HTMLDivElement, SlideCardProps>(
  ({ slide, width = 640, height = 360 }, ref) => {
    const isTitle = slide.type === 'title';

    // 레터박스 높이 (시네마틱 효과)
    const letterboxHeight = height * 0.08; // 상하단 8%

    return (
      <div
        ref={ref}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: slide.bgGradient || slide.bgColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0',
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 상단 레터박스 (시네마틱 효과) */}
        {!isTitle && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${letterboxHeight}px`,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
              zIndex: 1
            }}
          />
        )}

        {/* 하단 레터박스 (시네마틱 효과) */}
        {!isTitle && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${letterboxHeight}px`,
              background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)',
              zIndex: 1
            }}
          />
        )}

        {/* 메인 콘텐츠 영역 */}
        <div
          style={{
            width: '100%',
            height: '100%',
            padding: '48px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2
          }}
        >
          {isTitle ? (
            // 제목 슬라이드 레이아웃 (영화 타이틀 스타일)
            <div
              style={{
                textAlign: 'center',
                width: '100%'
              }}
            >
              <h1
                style={{
                  fontSize: '56px',
                  fontWeight: '900',
                  color: '#111827',
                  marginBottom: '32px',
                  lineHeight: '1.1',
                  letterSpacing: '-0.03em',
                  textShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                {slide.title}
              </h1>
              <div
                style={{
                  width: '180px',
                  height: '6px',
                  background: `linear-gradient(90deg, transparent 0%, ${slide.accentColor} 20%, ${slide.accentColor} 80%, transparent 100%)`,
                  margin: '0 auto',
                  borderRadius: '3px'
                }}
              />
            </div>
          ) : (
            // 패널/장면 슬라이드 레이아웃 (시네마틱 스타일)
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              {/* 상단: 클랩보드 스타일 장면 번호 + 제목 */}
              <div>
                {/* 영화 클랩보드 스타일 장면 번호 */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: `linear-gradient(135deg, ${slide.accentDark || slide.accentColor} 0%, ${slide.accentColor} 100%)`,
                    color: '#FFFFFF',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '800',
                    marginBottom: '20px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <span style={{ opacity: 0.9 }}>SCENE</span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontWeight: '900'
                    }}
                  >
                    {slide.index}
                  </span>
                  <span style={{ opacity: 0.9 }}>·</span>
                  <span style={{ opacity: 0.9 }}>{slide.stageLabel}</span>
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>({slide.stageSubtitle})</span>
                </div>

                {/* 제목 - 영화 타이틀 스타일 */}
                <h2
                  style={{
                    fontSize: '36px',
                    fontWeight: '800',
                    color: '#1F2937',
                    marginBottom: '24px',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em',
                    textShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  {slide.title}
                </h2>

                {/* 구분선 */}
                <div
                  style={{
                    width: '100%',
                    height: '3px',
                    background: `linear-gradient(90deg, ${slide.accentColor} 0%, ${slide.accentColor}40 100%)`,
                    marginBottom: '28px',
                    borderRadius: '2px'
                  }}
                />
              </div>

              {/* 본문 - 영화 스크립트 스타일 */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: '16px',
                  paddingBottom: '16px'
                }}
              >
                <p
                  style={{
                    fontSize: '26px',
                    lineHeight: '1.75',
                    color: '#1F2937',
                    textAlign: 'left',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'keep-all',
                    fontWeight: '500',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {slide.content}
                </p>
              </div>

              {/* 하단: 영화 자막 스타일 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: `2px solid ${slide.accentColor}20`
                }}
              >
                {/* 자막 - 영화 자막 스타일 */}
                {slide.subtitle && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.85)',
                      color: '#FFFFFF',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontStyle: 'normal',
                      maxWidth: '65%',
                      lineHeight: '1.5',
                      letterSpacing: '0.01em',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    {slide.subtitle}
                  </div>
                )}

                {/* 슬라이드 번호 - 필름 프레임 스타일 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginLeft: 'auto'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '3px',
                      background: `linear-gradient(90deg, transparent 0%, ${slide.accentColor} 100%)`,
                      borderRadius: '2px'
                    }}
                  />
                  <span
                    style={{
                      fontSize: '16px',
                      color: slide.accentDark || slide.accentColor,
                      fontWeight: '800',
                      letterSpacing: '0.05em',
                      fontFamily: 'monospace'
                    }}
                  >
                    {String(slide.index).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SlideCard.displayName = 'SlideCard';

export default SlideCard;
