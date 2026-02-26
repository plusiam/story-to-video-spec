import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Wand2, Download, FileText, FileJson, Loader2, X } from 'lucide-react';
import { CONFIG } from '@/lib/config';
import { useWorkEditor } from '@/hooks/useWorkEditor';
import {
  FourPanelStory,
  EchinGuideCard,
  Step2SceneExpansion,
  Step3AICompletion
} from '@/components/story';

/**
 * 작품 편집 페이지
 * 로직은 useWorkEditor 훅으로 분리됨
 */
export default function WorkEditPage() {
  const { id } = useParams<{ id: string }>();
  const editor = useWorkEditor(id);

  if (!editor.work) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="hidden sm:inline">내 작품</span>
          </Link>

          <div className="flex items-center gap-2">
            {editor.hasChanges && (
              <span className="text-xs text-orange-500 hidden sm:inline">
                저장되지 않은 변경사항
              </span>
            )}
            {editor.lastSaved && !editor.hasChanges && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                {editor.lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨
              </span>
            )}
            <button
              onClick={editor.handleSave}
              disabled={editor.isSaving}
              className="btn btn-primary flex items-center gap-1 text-sm"
            >
              <Save className="w-4 h-4" />
              {editor.isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 제목 입력 */}
        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            스토리 제목
          </label>
          <input
            type="text"
            value={editor.title}
            onChange={(e) => editor.handleTitleChange(e.target.value)}
            className="input text-xl font-medium"
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 단계 표시 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">진행 단계</h3>
            <span className="text-sm text-gray-500">
              {editor.currentStep}/3 단계
            </span>
          </div>
          <div className="flex gap-2">
            {([
              { step: 1, label: '4컷 스토리', shortLabel: '4컷' },
              { step: 2, label: '장면 확장', shortLabel: '확장' },
              { step: 3, label: '완성', shortLabel: '완성' },
            ] as const).map(({ step, label, shortLabel }) => (
              <button
                key={step}
                onClick={() => editor.setCurrentStep(step)}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  editor.currentStep === step
                    ? 'bg-primary-500 text-white'
                    : editor.currentStep > step
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className="sm:hidden">{step}. {shortLabel}</span>
                <span className="hidden sm:inline">{step}. {label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 1: 4컷 스토리 패널 */}
        {editor.currentStep === 1 && (
          <>
            {/* 이친 가이드 카드 */}
            <div className="mb-6">
              <EchinGuideCard step="step1" />
            </div>

            <div className="card mb-6">
              <FourPanelStory
                panels={editor.panels}
                onChange={editor.handlePanelsChange}
                onAutoSave={editor.handleAutoSave}
              />
            </div>

            {editor.getCompletedStep() >= 2 && (
              <div className="card mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary-700">4컷 스토리 작성 완료!</p>
                    <p className="text-sm text-primary-600 mt-1">
                      이제 각 장면을 더 상세하게 확장해보세요.
                    </p>
                  </div>
                  <button
                    onClick={editor.handleGoToSceneExpansion}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    장면 확장하기
                  </button>
                </div>
              </div>
            )}

            {/* AI 도우미 */}
            {CONFIG.ENABLE_AI_FEATURES && (
              <div className="card mb-6">
                <button
                  onClick={editor.handleAIStoryIdea}
                  disabled={editor.isAiLoading}
                  className="w-full btn btn-outline flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                >
                  {editor.isAiLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI가 아이디어를 생각하는 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      AI 도우미로 스토리 아이디어 얻기
                    </>
                  )}
                </button>

                {/* AI 에러 메시지 */}
                {editor.aiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{editor.aiError}</span>
                  </div>
                )}

                {/* AI 아이디어 결과 */}
                {editor.aiIdea && (
                  <div className="mt-3 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-purple-800 flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        AI 도우미의 아이디어
                      </h4>
                      <button
                        onClick={editor.dismissAiIdea}
                        className="p-1 hover:bg-purple-100 rounded"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {editor.aiIdea}
                    </div>
                    <p className="mt-3 text-xs text-purple-600">
                      💡 위 아이디어를 참고해서 나만의 스토리를 완성해보세요!
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 2: 장면 확장 */}
        {editor.currentStep === 2 && (
          <div className="card mb-6">
            <Step2SceneExpansion
              panels={editor.panels}
              scenes={editor.scenes}
              onScenesChange={editor.handleScenesChange}
              onBack={() => editor.setCurrentStep(1)}
              onNext={() => editor.setCurrentStep(3)}
            />
          </div>
        )}

        {/* Step 3: AI 완성 */}
        {editor.currentStep === 3 && id && (
          <div className="card mb-6">
            <Step3AICompletion
              workId={id}
              scenes={editor.scenes}
              visualDNA={editor.localVisualDNA}
              onVisualDNAChange={editor.handleVisualDNAChange}
              onVisualDNASave={editor.handleVisualDNASave}
              usageStatus={editor.usageStatus}
              onBack={() => editor.setCurrentStep(2)}
              isSaving={editor.isSaving}
            />
          </div>
        )}

        {/* 다운로드 버튼 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <Download className="w-5 h-5" />
              내보내기
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={editor.handleDownloadText}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5" />
              텍스트 파일 (.txt)
            </button>
            <button
              onClick={editor.handleDownloadJson}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileJson className="w-5 h-5" />
              JSON 파일 (.json)
            </button>
            <button
              onClick={editor.handleDownloadVidsStoryboard}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileJson className="w-5 h-5" />
              Vids 스토리보드 (.json)
            </button>
            <button
              onClick={editor.handleDownloadVidsScript}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5" />
              Vids 스크립트 (.txt)
            </button>
            <button
              onClick={editor.handleDownloadVidsCaptions}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50 sm:col-span-2"
            >
              <FileText className="w-5 h-5" />
              자막 파일 (.srt)
            </button>
          </div>
        </div>

        {/* 작품 삭제 (위험 영역) */}
        <div className="border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">이 작품 삭제</p>
              <p className="text-xs text-gray-400 mt-0.5">삭제하면 되돌릴 수 없습니다</p>
            </div>
            <button
              onClick={editor.handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
