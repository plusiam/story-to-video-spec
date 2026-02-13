/**
 * AI Service - Gemini API 프록시 호출
 *
 * 서버 사이드 API Route (/api/gemini)를 통해 안전하게 Gemini API를 호출합니다.
 * API 키는 서버에서 관리되므로 클라이언트에 노출되지 않습니다.
 * 사용자 역할/ID를 헤더로 전달하여 서버측 Rate Limiting에 활용합니다.
 */

interface AIResponse {
  success: boolean;
  type: 'text' | 'image_prompt';
  content: string;
  remaining?: number;
}

interface AIError {
  error: string;
  code?: string;
  remaining?: number;
  limit?: number;
}

// 현재 사용자 정보 (외부에서 설정)
let _currentUserId: string | undefined;
let _currentUserRole: string | undefined;

/**
 * AI 서비스에서 사용할 사용자 정보 설정
 * AuthContext 등에서 로그인 시 호출
 */
export function setAIServiceUser(userId: string | undefined, role: string | undefined) {
  _currentUserId = userId;
  _currentUserRole = role;
}

/**
 * 인증 헤더 생성
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (_currentUserId) headers['x-user-id'] = _currentUserId;
  if (_currentUserRole) headers['x-user-role'] = _currentUserRole;
  return headers;
}

/**
 * Gemini AI에 텍스트 생성 요청
 * @returns { content: string, remaining?: number }
 */
export async function generateText(prompt: string): Promise<{ content: string; remaining?: number }> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt, type: 'text' }),
  });

  if (!response.ok) {
    const errorData: AIError = await response.json().catch(() => ({
      error: 'AI 서비스 연결에 실패했어요.',
    }));

    if (response.status === 429) {
      const msg = errorData.code === 'DAILY_LIMIT_EXCEEDED'
        ? errorData.error
        : 'AI 요청이 너무 많아요. 잠시 후 다시 시도해주세요.';
      throw new Error(msg);
    }

    throw new Error(errorData.error || `AI 오류 (${response.status})`);
  }

  const data: AIResponse = await response.json();
  return { content: data.content, remaining: data.remaining };
}

/**
 * 스토리 도우미 - 기승전결 아이디어 생성
 * @returns { content: string, remaining?: number }
 */
export async function generateStoryIdea(
  title: string,
  theme?: string,
  existingContent?: string
): Promise<{ content: string; remaining?: number }> {
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

