/**
 * 내보내기 허브 컴포넌트
 * 다양한 형식으로 스토리를 내보낼 수 있는 통합 UI
 */

import React, { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import {
  exportDocument,
  ALL_EXPORT_FORMATS,
  TEXT_EXPORT_FORMATS,
  DATA_EXPORT_FORMATS,
  DOCUMENT_EXPORT_FORMATS,
  getDefaultConfig
} from '@/lib/export';
import type {
  ExportFormat,
  ExportInput,
  ExportConfig,
  ExportResult,
  ExportCategory
} from '@/lib/export/types';

// ============================================
// 타입 정의
// ============================================

interface ExportHubProps {
  input: ExportInput;
  className?: string;
  onExportComplete?: (result: ExportResult) => void;
  onExportError?: (error: string) => void;
}

// ============================================
// 메인 컴포넌트
// ============================================

export const ExportHub: React.FC<ExportHubProps> = ({
  input,
  className = '',
  onExportComplete,
  onExportError
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [activeCategory, setActiveCategory] = useState<ExportCategory>('text');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [language, setLanguage] = useState<'ko' | 'en' | 'both'>('ko');

  // 형식 선택 핸들러
  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    setExportResult(null);
  }, []);

  // 내보내기 실행
  const handleExport = useCallback(async () => {
    if (!selectedFormat) return;

    setIsExporting(true);
    setExportResult(null);

    try {
      const config: Partial<ExportConfig> = {
        ...getDefaultConfig(selectedFormat),
        language
      };

      const result = await exportDocument(input, selectedFormat, config);

      setExportResult(result);

      if (result.success) {
        onExportComplete?.(result);
      } else {
        onExportError?.(result.error || '내보내기 실패');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '내보내기 중 오류 발생';
      onExportError?.(errorMessage);
      setExportResult({
        success: false,
        format: selectedFormat,
        filename: '',
        content: '',
        mimeType: '',
        size: 0,
        metadata: {
          exportedAt: new Date(),
          scenesCount: 0,
          language
        },
        error: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, input, language, onExportComplete, onExportError]);

  // 파일 다운로드
  const handleDownload = useCallback(() => {
    if (!exportResult || !exportResult.success) return;

    const blob = exportResult.content instanceof Blob
      ? exportResult.content
      : new Blob([exportResult.content], { type: exportResult.mimeType });

    saveAs(blob, exportResult.filename);
  }, [exportResult]);

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    if (!exportResult || !exportResult.success || exportResult.content instanceof Blob) return;

    try {
      await navigator.clipboard.writeText(exportResult.content);
      alert('클립보드에 복사되었습니다!');
    } catch {
      alert('복사에 실패했습니다.');
    }
  }, [exportResult]);

  // 카테고리별 형식 목록
  const formatsByCategory = {
    text: TEXT_EXPORT_FORMATS,
    data: DATA_EXPORT_FORMATS,
    document: DOCUMENT_EXPORT_FORMATS
  } as const;

  const categories: { key: ExportCategory; label: string; icon: string }[] = [
    { key: 'text', label: '텍스트', icon: '📝' },
    { key: 'data', label: '데이터', icon: '📊' },
    { key: 'document', label: '문서', icon: '📄' }
  ];

  return (
    <div className={`export-hub bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          📤 내보내기
        </h2>
        <span className="text-sm text-gray-500">
          {input.scenes.length}개 장면
        </span>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key);
              setSelectedFormat(null);
              setExportResult(null);
            }}
            className={`
              px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${activeCategory === cat.key
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* 형식 선택 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {Object.values(formatsByCategory[activeCategory]).map(format => (
          <button
            key={format.id}
            onClick={() => handleFormatSelect(format.id)}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${selectedFormat === format.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{format.icon}</span>
              <span className="font-medium text-gray-900">{format.nameKo}</span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">
              {format.descriptionKo}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {format.useCasesKo.slice(0, 2).map((use, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                >
                  {use}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* 선택된 형식 옵션 */}
      {selectedFormat && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">
            {ALL_EXPORT_FORMATS[selectedFormat].icon} {ALL_EXPORT_FORMATS[selectedFormat].nameKo} 설정
          </h3>

          {/* 언어 선택 */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-600">언어:</span>
            <div className="flex gap-2">
              {[
                { value: 'ko', label: '한국어' },
                { value: 'en', label: 'English' },
                { value: 'both', label: '둘 다' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value as typeof language)}
                  className={`
                    px-3 py-1 text-sm rounded-full transition-colors
                    ${language === opt.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 내보내기 버튼 */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`
              w-full py-3 rounded-lg font-medium transition-colors
              ${isExporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                생성 중...
              </span>
            ) : (
              `${ALL_EXPORT_FORMATS[selectedFormat].nameKo} 생성하기`
            )}
          </button>
        </div>
      )}

      {/* 내보내기 결과 */}
      {exportResult && (
        <div className={`
          rounded-lg p-4 mb-4
          ${exportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
        `}>
          {exportResult.success ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-600 text-xl">✅</span>
                <span className="font-medium text-green-800">생성 완료!</span>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <p>파일명: {exportResult.filename}</p>
                <p>크기: {formatFileSize(exportResult.size)}</p>
                <p>장면 수: {exportResult.metadata.scenesCount}개</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  💾 다운로드
                </button>

                {!(exportResult.content instanceof Blob) && (
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    📋 복사
                  </button>
                )}
              </div>

              {/* 텍스트 미리보기 */}
              {typeof exportResult.content === 'string' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">미리보기</span>
                    <span className="text-xs text-gray-500">처음 500자</span>
                  </div>
                  <pre className="bg-white p-3 rounded border border-gray-200 text-xs text-gray-700 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {exportResult.content.slice(0, 500)}
                    {exportResult.content.length > 500 && '...'}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <span className="text-red-800">{exportResult.error}</span>
            </div>
          )}
        </div>
      )}

      {/* 도움말 */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="font-medium mb-1">💡 도움말</p>
        <ul className="list-disc list-inside space-y-1">
          <li>텍스트 형식은 클립보드 복사가 가능합니다</li>
          <li>PDF 형식은 한글 폰트가 제한적일 수 있습니다</li>
          <li>JSON 형식은 다른 도구와의 연동에 유용합니다</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 파일 크기 포맷팅
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default ExportHub;
