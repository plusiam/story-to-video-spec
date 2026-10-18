import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Gemini AI Proxy
 *
 * 보안 계층:
 * 1. CORS 도메인 제한 (ALLOWED_ORIGIN 환경변수)
 * 2. IP 기반 Rate Limiting (인메모리, Vercel Serverless 인스턴스별)
 * 3. 역할 기반 사용량 제한 (헤더로 역할 전달)
 *
 * POST /api/gemini
 * Body: { prompt: string, type: 'text' | 'image' }
 * Headers: x-user-role: 'admin' | 'judge' | 'user' | 'guest'
 *          x-user-id: string (사용량 추적용)
 */

// ──────────────────────────────────────────────
// Rate Limiting (인메모리 - Serverless 인스턴스별)
// ──────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// 역할별 일일 한도
const ROLE_LIMITS: Record<string, number> = {
  admin: Infinity,
  judge: Infinity,
  user: 30,
  guest: 5,
};

/**
 * Rate Limit 체크 및 증가
 * @returns { allowed: boolean, remaining: number, limit: number }
 */
function checkRateLimit(userId: string, role: string) {
  const limit = ROLE_LIMITS[role] ?? ROLE_LIMITS.guest;

  // 무제한 역할은 바로 통과
  if (!Number.isFinite(limit)) {
    return { allowed: true, remaining: Infinity, limit };
  }

  const now = Date.now();
  const key = `${userId}_${role}`;
  let entry = rateLimitMap.get(key);

  // 만료되었거나 없으면 새로 생성
  if (!entry || now >= entry.resetAt) {
    // 자정까지 남은 시간 (KST 기준)
    const kstNow = new Date(now + 9 * 60 * 60 * 1000);
    const kstMidnight = new Date(kstNow);
    kstMidnight.setUTCHours(15, 0, 0, 0); // 다음 날 KST 00:00 = UTC 15:00
    if (kstMidnight.getTime() - 9 * 60 * 60 * 1000 <= now) {
      kstMidnight.setUTCDate(kstMidnight.getUTCDate() + 1);
    }
    const resetAt = kstMidnight.getTime() - 9 * 60 * 60 * 1000;

    entry = { count: 0, resetAt };
    rateLimitMap.set(key, entry);
  }

  // 오래된 항목 정리 (메모리 누수 방지)
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap) {
      if (now >= v.resetAt) rateLimitMap.delete(k);
    }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, limit };
}

// ──────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정 — 도메인 제한
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const origin = req.headers.origin || '';

  if (allowedOrigin !== '*') {
    // 허용된 도메인만 통과
    const allowedDomains = allowedOrigin.split(',').map(d => d.trim());
    if (allowedDomains.some(d => origin === d || origin.endsWith(`.${new URL(d).hostname}`))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // origin이 없는 경우 (같은 도메인) 또는 Vercel 프리뷰
      if (!origin || origin.includes('vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin || allowedDomains[0]);
      } else {
        return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
      }
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role, x-user-id');

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

  // ── Rate Limiting ──
  const userRole = (req.headers['x-user-role'] as string) || 'guest';
  const userId = (req.headers['x-user-id'] as string) || req.headers['x-forwarded-for'] as string || 'anonymous';

  const { allowed, remaining, limit } = checkRateLimit(userId, userRole);

  // Rate limit 헤더 설정
  if (Number.isFinite(limit)) {
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
  }

  if (!allowed) {
    return res.status(429).json({
      error: '오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 시도해주세요! 🌙',
      code: 'DAILY_LIMIT_EXCEEDED',
      remaining: 0,
      limit,
    });
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
        remaining,
      });
    } else if (type === 'image') {
      // 이미지 프롬프트 변환
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      const imagePromptRequest = `다음 장면 설명을 영어 이미지 생성 프롬프트로 변환해주세요. 간결하고 시각적으로 명확한 프롬프트를 만들어주세요. 프롬프트만 출력하세요:\n\n${prompt}`;

      const result = await model.generateContent(imagePromptRequest);
      const response = result.response;
      const imagePrompt = response.text();

      return res.status(200).json({
        success: true,
        type: 'image_prompt',
        content: imagePrompt,
        remaining,
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
