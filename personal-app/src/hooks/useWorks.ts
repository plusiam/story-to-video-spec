import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Work, Database, Json } from '@/types';

// ─── Supabase REST API 직접 호출 (AbortError 회피) ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * raw fetch 헤더 생성 유틸리티
 */
function restHeaders(accessToken: string): Record<string, string> {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * raw fetch로 works 테이블에서 SELECT (목록 조회)
 */
async function fetchWorksViaRest(
  userId: string,
  accessToken: string
): Promise<Work[] | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/works?user_id=eq.${userId}&select=*&order=updated_at.desc`,
      {
        headers: restHeaders(accessToken),
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[useWorks] REST fetchWorks error:', res.status, errorText);
      return null;
    }
    const data = await res.json();
    console.log('[useWorks] REST fetchWorks OK:', data?.length, 'works');
    return data as Work[];
  } catch (err) {
    console.error('[useWorks] REST fetchWorks exception:', err);
    return null;
  }
}

/**
 * raw fetch로 works 테이블에서 단일 SELECT (단일 조회)
 */
async function getWorkViaRest(
  workId: string,
  accessToken: string
): Promise<Work | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/works?id=eq.${workId}&select=*`,
      {
        headers: {
          ...restHeaders(accessToken),
          'Accept': 'application/vnd.pgrst.object+json', // single object
        },
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[useWorks] REST getWork error:', res.status, errorText);
      return null;
    }
    const data = await res.json();
    console.log('[useWorks] REST getWork OK:', data?.id);
    return data as Work;
  } catch (err) {
    console.error('[useWorks] REST getWork exception:', err);
    return null;
  }
}

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
          ...restHeaders(accessToken),
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
 * @param userId - 사용자 ID
 * @param authAccessToken - AuthContext에서 전달받은 access token (getSession() AbortError 회피)
 */
export function useWorks(userId: string | undefined, authAccessToken: string | null = null) {
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모든 작품 조회 (raw fetch 사용 — AbortError 완전 우회)
  const fetchWorks = useCallback(async () => {
    if (!userId) return;

    // accessToken 없으면 Supabase JS client 사용 (폴백)
    if (!authAccessToken) {
      console.log('[useWorks] fetchWorks: no token, trying Supabase client');
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
        console.error('[useWorks] fetchWorks Supabase client error:', err);
        setError(err instanceof Error ? err.message : '작품을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWorksViaRest(userId, authAccessToken);
      if (data === null) {
        throw new Error('작품 목록을 불러오는데 실패했습니다.');
      }
      setWorks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, authAccessToken]);

  // 작품 생성 (raw fetch 사용 — Supabase JS client AbortError 완전 우회)
  const createWork = useCallback(async (title: string) => {
    console.log('[useWorks] createWork called, userId:', userId, 'title:', title, 'hasToken:', !!authAccessToken);

    if (!userId || !authAccessToken) {
      console.error('[useWorks] createWork aborted: no userId or token available');
      setError('인증 정보가 없습니다. 다시 로그인해주세요.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const initialPanels: Json = [];

      console.log('[useWorks] Inserting work via REST:', { user_id: userId, title });
      const data = await insertWorkViaRest(userId, title, initialPanels, authAccessToken);

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
  }, [userId, authAccessToken]);

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

  // 단일 작품 조회 (raw fetch 사용 — AbortError 완전 우회)
  const getWork = useCallback(async (workId: string) => {
    // accessToken 없으면 Supabase JS client 사용 (폴백)
    if (!authAccessToken) {
      console.log('[useWorks] getWork: no token, trying Supabase client');
      try {
        const { data, error: fetchError } = await supabase
          .from('works')
          .select('*')
          .eq('id', workId)
          .single();
        if (fetchError) throw fetchError;
        return data;
      } catch (err) {
        console.error('[useWorks] getWork Supabase client error:', err);
        setError(err instanceof Error ? err.message : '작품을 찾을 수 없습니다.');
        return null;
      }
    }

    try {
      const data = await getWorkViaRest(workId, authAccessToken);
      if (!data) {
        setError('작품을 찾을 수 없습니다.');
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품을 찾을 수 없습니다.');
      return null;
    }
  }, [authAccessToken]);

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
