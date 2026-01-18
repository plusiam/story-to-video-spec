import { useState } from 'react';
import { Plus, Trash2, User, Palette, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import type { VisualDNA, Character } from '@/types';
import {
  createEmptyCharacter,
  ART_STYLE_OPTIONS,
  COLOR_TONE_OPTIONS,
  LIGHTING_OPTIONS
} from '@/types';

interface VisualDNASetupProps {
  visualDNA: VisualDNA;
  onChange: (dna: VisualDNA) => void;
  onSave: () => Promise<boolean>;
  isSaving: boolean;
}

/**
 * 비주얼 DNA 설정 컴포넌트 (Step 3-A)
 */
export default function VisualDNASetup({
  visualDNA,
  onChange,
  onSave,
  isSaving
}: VisualDNASetupProps) {
  const [expandedCharacter, setExpandedCharacter] = useState<string | null>(
    visualDNA.characters[0]?.id || null
  );

  // 캐릭터 추가
  const handleAddCharacter = () => {
    const newChar = createEmptyCharacter();
    onChange({
      ...visualDNA,
      characters: [...visualDNA.characters, newChar]
    });
    setExpandedCharacter(newChar.id);
  };

  // 캐릭터 수정
  const handleCharacterChange = (charId: string, updates: Partial<Character>) => {
    onChange({
      ...visualDNA,
      characters: visualDNA.characters.map(c =>
        c.id === charId ? { ...c, ...updates } : c
      )
    });
  };

  // 캐릭터 삭제
  const handleDeleteCharacter = (charId: string) => {
    onChange({
      ...visualDNA,
      characters: visualDNA.characters.filter(c => c.id !== charId)
    });
    if (expandedCharacter === charId) {
      setExpandedCharacter(null);
    }
  };

  // 스타일 변경
  const handleStyleChange = (field: keyof VisualDNA, value: string) => {
    onChange({ ...visualDNA, [field]: value });
  };

  // 환경 변경
  const handleEnvironmentChange = (field: keyof VisualDNA['environment'], value: string) => {
    onChange({
      ...visualDNA,
      environment: { ...visualDNA.environment, [field]: value }
    });
  };

  // 캐릭터 완성도
  const isCharacterComplete = (char: Character) =>
    char.name && char.physicalTraits;

  const completedCharacters = visualDNA.characters.filter(isCharacterComplete).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-lg sm:text-xl flex items-center gap-2">
          <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
          비주얼 DNA 설정
        </h2>
      </div>

      {/* 설명 */}
      <div className="bg-purple-50 rounded-xl p-3 sm:p-4">
        <p className="text-purple-700 text-xs sm:text-sm">
          <strong>💡 TIP:</strong>{' '}
          <span className="hidden sm:inline">
            캐릭터와 스타일을 먼저 정의하면 모든 장면에서 일관된 이미지를 생성할 수 있어요.
            이 설정은 AI 프롬프트 생성 시 자동으로 적용됩니다.
          </span>
          <span className="sm:hidden">
            캐릭터와 스타일을 정의해 일관된 이미지를 생성하세요!
          </span>
        </p>
      </div>

      {/* 캐릭터 정의 */}
      <section className="border-2 border-purple-200 rounded-xl overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-800">주요 캐릭터 정의</h3>
            <span className="text-xs text-purple-600">
              ({completedCharacters}/{visualDNA.characters.length} 완성)
            </span>
          </div>
          <button
            onClick={handleAddCharacter}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">캐릭터 추가</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {visualDNA.characters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">등장인물을 추가해주세요</p>
              <button
                onClick={handleAddCharacter}
                className="mt-3 text-purple-600 hover:underline text-sm"
              >
                + 첫 번째 캐릭터 추가
              </button>
            </div>
          ) : (
            visualDNA.characters.map((char) => (
              <div
                key={char.id}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* 캐릭터 헤더 */}
                <div
                  className="bg-gray-50 px-3 py-2 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedCharacter(
                    expandedCharacter === char.id ? null : char.id
                  )}
                >
                  <div className="flex items-center gap-2">
                    {expandedCharacter === char.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-medium text-sm">
                      {char.name || '이름 없음'}
                    </span>
                    {isCharacterComplete(char) && (
                      <span className="text-green-500 text-xs">✓</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCharacter(char.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 캐릭터 상세 */}
                {expandedCharacter === char.id && (
                  <div className="p-3 space-y-3 bg-white">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        이름 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={char.name}
                        onChange={(e) => handleCharacterChange(char.id, { name: e.target.value })}
                        placeholder="예: 미나"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        외모 특징 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={char.physicalTraits}
                        onChange={(e) => handleCharacterChange(char.id, { physicalTraits: e.target.value })}
                        placeholder="예: 8살 여자아이, 단발머리, 큰 눈"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        복장
                      </label>
                      <input
                        type="text"
                        value={char.clothing}
                        onChange={(e) => handleCharacterChange(char.id, { clothing: e.target.value })}
                        placeholder="예: 노란 우비, 빨간 장화"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        특이사항
                      </label>
                      <input
                        type="text"
                        value={char.distinctiveFeatures}
                        onChange={(e) => handleCharacterChange(char.id, { distinctiveFeatures: e.target.value })}
                        placeholder="예: 빨간 머리핀, 통통한 볼"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 아트 스타일 */}
      <section className="border-2 border-indigo-200 rounded-xl overflow-hidden">
        <div className="bg-indigo-50 px-4 py-3 flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-indigo-800">아트 스타일</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* 스타일 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">스타일</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ART_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStyleChange('artStyle', option.value)}
                  className={`p-2 sm:p-3 rounded-lg border-2 text-sm transition-all ${
                    visualDNA.artStyle === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 색감 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">색감</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {COLOR_TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStyleChange('colorTone', option.value)}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    visualDNA.colorTone === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 조명 선택 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">조명</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {LIGHTING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStyleChange('lighting', option.value)}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    visualDNA.lighting === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 커스텀 스타일 (고급) */}
          {visualDNA.artStyle === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                커스텀 스타일 프롬프트
              </label>
              <textarea
                value={visualDNA.customStylePrompt || ''}
                onChange={(e) => handleStyleChange('customStylePrompt', e.target.value)}
                placeholder="영문으로 원하는 스타일을 직접 입력하세요..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
              />
            </div>
          )}
        </div>
      </section>

      {/* 배경 환경 */}
      <section className="border-2 border-green-200 rounded-xl overflow-hidden">
        <div className="bg-green-50 px-4 py-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-green-800">배경 환경</h3>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">장소</label>
            <input
              type="text"
              value={visualDNA.environment.location}
              onChange={(e) => handleEnvironmentChange('location', e.target.value)}
              placeholder="예: 한국 시골 마을, 도심 아파트"
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">시대</label>
            <input
              type="text"
              value={visualDNA.environment.era}
              onChange={(e) => handleEnvironmentChange('era', e.target.value)}
              placeholder="예: 1990년대, 현대, 조선시대"
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">분위기</label>
            <input
              type="text"
              value={visualDNA.environment.mood}
              onChange={(e) => handleEnvironmentChange('mood', e.target.value)}
              placeholder="예: 향수, 따뜻함, 긴장감"
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </section>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
