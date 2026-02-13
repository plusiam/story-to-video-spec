/**
 * AI Service - Gemini API 프록시 호출
 *
 * 서버 사이드 API Route (/api/gemini)를 통해 안전하게 Gemini API를 호출합니다.
 * API 키는 서버에서 관리되므로 클라이언트에 노출되지 않습니다.
 */

interface AIResponse {
  success: boolean;
  type: 'text' | 'image_prompt';
  content: string;
}

interface AIError {
  error: string;
  code?: string;
}

/**
 * Gemini AI에 텍스트 생성 요청
 */
export async function generateText(prompt: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, type: 'text' }),
  });

  if (!response.ok) {
    const errorData: AIError = await response.json().catch(() => ({
      error: 'AI 서비스 연결에 실패했어요.',
    }));

    if (response.status === 429) {
      throw new Error('AI 요청이 너무 많아요. 잠시 후 다시 시도해주세요.');
    }

    throw new Error(errorData.error || `AI 오류 (${response.status})`);
  }

  const data: AIResponse = await response.json();
  return data.content;
}

/**
 * 이미지 생성용 프롬프트 변환 요청
 */
export async function generateImagePrompt(sceneDescription: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: sceneDescription, type: 'image' }),
  });

  if (!response.ok) {
    const errorData: AIError = await response.json().catch(() => ({
      error: 'AI 서비스 연결에 실패했어요.',
    }));
    throw new Error(errorData.error || `AI 오류 (${response.status})`);
  }

  const data: AIResponse = await response.json();
  return data.content;
}

/**
 * 스토리 도우미 - 기승전결 아이디어 생성
 */
export async function generateStoryIdea(
  title: string,
  theme?: string,
  existingContent?: string
): Promise<string> {
  const prompt = `당신은 초등학생의 창작 활동을 돕는 친절한 스토리 도우미입니다.

학생이 만들고 있는 스토리:
- 제목: ${title}
${theme ? `- 주제: ${theme}` : ''}
${existingContent ? `- 현재 내용:\n${existingContent}` : ''}

위 스토리의 기승전결(시작-전개-절정-결말)을 발전시킬 수 있는 아이디어를 제안해주세요.
- 초등학생이 이해하기 쉬운 표현을 사용하세요
- 창의적이고 재미있는 전개를 제안해주세요
- 각 단계별로 2-3문장으로 간결하게 작성해주세요
- 이모지를 적절히 사용해서 읽기 쉽게 해주세요`;

  return generateText(prompt);
}

/**
 * 장면 발전시키기 - 장면 설명 보강
 */
export async function enhanceScene(
  panelLabel: string,
  currentContent: string,
  storyContext?: string
): Promise<string> {
  const prompt = `당신은 초등학생의 스토리보드 작성을 돕는 선생님입니다.

현재 작성 중인 장면:
- 위치: ${panelLabel}
- 현재 내용: ${currentContent}
${storyContext ? `- 전체 스토리 맥락: ${storyContext}` : ''}

이 장면을 더 생동감 있게 발전시켜주세요:
1. 배경 묘사를 추가해주세요
2. 등장인물의 감정이나 행동을 구체적으로 표현해주세요
3. 대사를 자연스럽게 넣어주세요
4. 초등학생이 이해하기 쉽고 재미있게 써주세요
5. 3-4문장으로 간결하게 작성해주세요`;

  return generateText(prompt);
}

/**
 * AI 서비스 상태 확인
 */
export async function checkAIServiceStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'ping', type: 'text' }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
