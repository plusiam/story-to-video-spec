import { useState } from 'react';
import { X, Key, ExternalLink, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => Promise<boolean>;
  hasExistingKey: boolean;
  onRemove?: () => Promise<boolean>;
}

/**
 * Gemini API 키 등록/관리 모달
 */
export default function ApiKeyModal({
  isOpen,
  onClose,
  onSave,
  hasExistingKey,
  onRemove
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API 키를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await onSave(apiKey.trim());

    setIsLoading(false);

    if (result) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setApiKey('');
        setSuccess(false);
      }, 1500);
    } else {
      setError('API 키 저장에 실패했습니다. 키가 올바른지 확인해주세요.');
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    if (!confirm('정말 API 키를 삭제하시겠습니까?\n삭제 후에는 일일 무료 횟수만 사용할 수 있습니다.')) return;

    setIsLoading(true);
    const result = await onRemove();
    setIsLoading(false);

    if (result) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-lg">
              {hasExistingKey ? 'API 키 관리' : 'Gemini API 키 등록'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* 설명 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              Google AI Studio에서 무료로 API 키를 발급받을 수 있습니다.
            </p>
          </div>

          {/* 발급 방법 */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">📋 발급 방법:</h3>
            <ol className="text-sm text-gray-600 space-y-1 pl-4">
              <li>1. Google AI Studio 접속</li>
              <li>2. "Get API Key" 클릭</li>
              <li>3. 키 생성 후 복사</li>
            </ol>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mt-2"
            >
              Google AI Studio 바로가기
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 기존 키가 있는 경우 */}
          {hasExistingKey && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-medium">API 키가 등록되어 있습니다</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                무제한으로 AI 기능을 사용할 수 있습니다.
              </p>
            </div>
          )}

          {/* API 키 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {hasExistingKey ? '새 API 키로 변경' : 'API 키 입력'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                }}
                placeholder="AIzaSy..."
                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              API 키가 저장되었습니다!
            </div>
          )}

          {/* 주의사항 */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h4 className="font-medium text-sm text-yellow-800 mb-2">⚠️ 주의사항:</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• API 키는 암호화되어 저장됩니다</li>
              <li>• 사용 비용은 본인 Google 계정에 청구됩니다</li>
              <li>• 무료 티어: 분당 60회, 일일 1,500회</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          {hasExistingKey && onRemove && (
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              키 삭제
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !apiKey.trim()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '저장 중...' : '저장하고 사용하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
