import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Work, Database, Json } from '@/types';

// ─── Supabase REST API 직접 호출 (AbortError 회피) ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * raw fetch로 works 테이블에 INSERT (Supabase JS client AbortError 우회)
 */
async function insertWorkViaRest(
  userId: string,
  title: string,
  panels: Json,
  accessToken: string
): Promise<Work | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/works`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.pgrst.object+json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          title,
          panels,
        }),
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[useWorks] REST insert error:', res.status, errorText);
      return null;
    }
    const data = await res.json();
    console.log('[useWorks] REST insert OK:', data?.id);
    return data as Work;
  } catch (err) {
    console.error('[useWorks] REST insert exception:', err);
    return null;
  }
}

/**
 * 작품 관리 훅
 */
export function useWorks(userId: string | undefined) {
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모든 작품 조회
  const fetchWorks = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('works')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setWorks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 작품 생성 (raw fetch 사용 — Supabase JS client AbortError 우회)
  const createWork = useCallback(async (title: string) => {
    // userId가 없으면 세션에서 직접 가져오는 fallback
    let effectiveUserId = userId;
    let accessToken = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!effectiveUserId) {
        effectiveUserId = session?.user?.id;
        console.log('[useWorks] Session fallback userId:', effectiveUserId);
      }
      accessToken = session?.access_token || '';
    } catch (err) {
      console.error('[useWorks] getSession failed:', err);
    }

    console.log('[useWorks] createWork called, userId:', effectiveUserId, 'title:', title);
    if (!effectiveUserId || !accessToken) {
      console.error('[useWorks] createWork aborted: no userId or token available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const initialPanels: Json = [];

      console.log('[useWorks] Inserting work via REST:', { user_id: effectiveUserId, title });
      const data = await insertWorkViaRest(effectiveUserId, title, initialPanels, accessToken);

      if (!data) {
        throw new Error('작품 생성에 실패했습니다.');
      }

      console.log('[useWorks] Work created successfully:', data.id);
      setWorks(prev => [data, ...prev]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '작품 생성에 실패했습니다.';
      console.error('[useWorks] createWork exception:', err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 작품 업데이트
  const updateWork = useCallback(async (workId: string, updates: Partial<Omit<Work, 'id' | 'user_id' | 'created_at'>>) => {
    setIsLoading(true);
    setError(null);

    try {
      const updateData: Database['public']['Tables']['works']['Update'] = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('works')
        .update(updateData)
        .eq('id', workId)
        .select()
        .single();

      if (updateError) throw updateError;

      setWorks(prev => prev.map(w => w.id === workId ? data : w));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품 저장에 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 작품 삭제
  const deleteWork = useCallback(async (workId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('works')
        .delete()
        .eq('id', workId);

      if (deleteError) throw deleteError;

      setWorks(prev => prev.filter(w => w.id !== workId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품 삭제에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 단일 작품 조회
  const getWork = useCallback(async (workId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품을 찾을 수 없습니다.');
      return null;
    }
  }, []);

  return {
    works,
    isLoading,
    error,
    fetchWorks,
    createWork,
    updateWork,
    deleteWork,
    getWork,
  };
}
