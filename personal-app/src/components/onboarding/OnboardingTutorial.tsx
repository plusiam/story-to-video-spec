import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Wand2,
  Palette,
  Download,
  Sparkles,
  CheckCircle,
  Rocket
} from 'lucide-react';

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
  color: string;
  bgColor: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: <Sparkles className="w-12 h-12" />,
    title: '환영해요! 🎉',
    description: '스토리 구성 웹학습지에 오신 것을 환영해요!\n여기서 나만의 멋진 그림책 스토리를 만들 수 있어요.',
    tip: '간단한 튜토리얼을 통해 사용법을 알아볼까요?',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'story-structure',
    icon: <BookOpen className="w-12 h-12" />,
    title: '기-승-전-결로 스토리 만들기',
    description: '좋은 이야기는 시작(기), 전개(승), 위기(전), 결말(결)로 이루어져요.\n각 단계를 차근차근 채워가면 멋진 스토리가 완성돼요!',
    tip: '📝 빈칸에 생각나는 대로 적어보세요!',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'ai-prompts',
    icon: <Wand2 className="w-12 h-12" />,
    title: 'AI 프롬프트 자동 생성',
    description: '여러분의 스토리를 바탕으로 AI 그림 도구에서 사용할 수 있는\n프롬프트를 자동으로 만들어드려요!',
    tip: '💡 DALL-E, Midjourney, Gemini 등 다양한 AI 도구에서 사용할 수 있어요!',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    id: 'visual-design',
    icon: <Palette className="w-12 h-12" />,
    title: '비주얼 DNA 설정',
    description: '캐릭터의 생김새, 그림 스타일, 색감 등을\n한 번만 설정하면 모든 장면에 일관되게 적용돼요.',
    tip: '🎨 수채화, 동화책 스타일 등 원하는 느낌을 선택할 수 있어요!',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  {
    id: 'export',
    icon: <Download className="w-12 h-12" />,
    title: '다양한 형식으로 내보내기',
    description: 'PDF, 텍스트, 자막 파일 등 다양한 형식으로\n내 스토리를 내보낼 수 있어요.',
    tip: '📄 프롬프트 가이드 PDF를 출력해서 AI 도구 사용법도 배워보세요!',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 'ready',
    icon: <Rocket className="w-12 h-12" />,
    title: '준비 완료! 🚀',
    description: '이제 나만의 스토리를 만들 준비가 됐어요!\n"새 스토리 만들기" 버튼을 눌러 시작해보세요.',
    tip: '언제든지 도움말에서 다시 볼 수 있어요!',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
];

export default function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const goToNextStep = () => {
    if (isAnimating) return;
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsAnimating(false);
    }, 150);
  };

  const goToPrevStep = () => {
    if (isAnimating || isFirstStep) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        goToNextStep();
      } else if (e.key === 'ArrowLeft') {
        goToPrevStep();
      } else if (e.key === 'Escape') {
        onSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isAnimating]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`
          relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden
          transition-all duration-300
          ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
        `}
      >
        {/* 스킵 버튼 */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="건너뛰기"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* 진행 표시 */}
        <div className="flex gap-1.5 p-4 justify-center">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`
                h-1.5 rounded-full transition-all duration-300
                ${index === currentStep
                  ? 'w-8 bg-primary-500'
                  : index < currentStep
                    ? 'w-4 bg-primary-300'
                    : 'w-4 bg-gray-200'
                }
              `}
            />
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="px-8 pb-6 pt-2">
          {/* 아이콘 */}
          <div className={`
            w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center
            ${step.bgColor} ${step.color}
          `}>
            {step.icon}
          </div>

          {/* 제목 */}
          <h2 className={`text-2xl font-bold text-center mb-4 ${step.color}`}>
            {step.title}
          </h2>

          {/* 설명 */}
          <p className="text-gray-600 text-center mb-4 whitespace-pre-line leading-relaxed">
            {step.description}
          </p>

          {/* 팁 */}
          {step.tip && (
            <div className={`
              ${step.bgColor} rounded-xl p-4 text-center
            `}>
              <p className={`text-sm font-medium ${step.color}`}>
                {step.tip}
              </p>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
          <button
            onClick={goToPrevStep}
            disabled={isFirstStep}
            className={`
              flex items-center gap-1 px-4 py-2 rounded-xl font-medium transition-all
              ${isFirstStep
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <ChevronLeft className="w-5 h-5" />
            이전
          </button>

          <span className="text-sm text-gray-400">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>

          <button
            onClick={goToNextStep}
            className={`
              flex items-center gap-1 px-6 py-2.5 rounded-xl font-bold transition-all
              ${isLastStep
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-primary-500 text-white hover:bg-primary-600'
              }
            `}
          >
            {isLastStep ? (
              <>
                <CheckCircle className="w-5 h-5" />
                시작하기
              </>
            ) : (
              <>
                다음
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
