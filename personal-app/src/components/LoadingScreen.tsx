/**
 * 로딩 화면 컴포넌트
 */
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce-slow">📚</div>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="mt-4 text-gray-500">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}
