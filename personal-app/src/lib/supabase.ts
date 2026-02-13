import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * 환경 변수 검증
 */
function validateEnvVariables() {
  const missingVars: string[] = [];

  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;

    if (import.meta.env.DEV) {
      console.error('❌ ' + errorMessage);
      console.error('💡 Please check your .env file and ensure it contains:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
    }

    throw new Error(errorMessage);
  }
}

// 프로덕션 환경에서는 반드시 환경 변수 검증
if (import.meta.env.PROD) {
  validateEnvVariables();
}

// 개발 환경에서는 경고만 표시 (Mock 모드 허용)
if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('⚠️ Supabase credentials not found. Running in mock mode.');
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Supabase 연결 상태 확인
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
