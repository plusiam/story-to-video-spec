import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Gemini AI Proxy
 *
 * API 키를 서버 사이드에서 안전하게 관리하며,
 * 클라이언트에서 Gemini API를 호출할 수 있게 해줍니다.
 *
 * POST /api/gemini
 * Body: { prompt: string, type: 'text' | 'image' }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const { prompt, type = 'text' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ error: 'Prompt too long (max 10000 chars)' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    if (type === 'text') {
      // 텍스트 생성 (스토리 도우미)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return res.status(200).json({
        success: true,
        type: 'text',
        content: text,
      });
    } else if (type === 'image') {
      // 이미지 생성 (Imagen 3 via Gemini)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

      // 이미지 생성은 프롬프트만 반환 (Imagen API는 별도 호출 필요)
      // 공모전 데모에서는 텍스트 기반 이미지 프롬프트 개선만 제공
      const imagePromptRequest = `다음 장면 설명을 영어 이미지 생성 프롬프트로 변환해주세요. 간결하고 시각적으로 명확한 프롬프트를 만들어주세요. 프롬프트만 출력하세요:\n\n${prompt}`;

      const result = await model.generateContent(imagePromptRequest);
      const response = result.response;
      const imagePrompt = response.text();

      return res.status(200).json({
        success: true,
        type: 'image_prompt',
        content: imagePrompt,
      });
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "text" or "image"' });
    }
  } catch (error: unknown) {
    console.error('Gemini API error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('RATE_LIMIT') || message.includes('429')) {
      return res.status(429).json({
        error: 'AI 요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
        code: 'RATE_LIMIT'
      });
    }

    return res.status(500).json({
      error: 'AI 처리 중 오류가 발생했어요.',
      code: 'INTERNAL_ERROR'
    });
  }
}
