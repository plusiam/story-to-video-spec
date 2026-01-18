import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Work, WorkData, Database, Json } from '@/types';

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

  // 작품 생성
  const createWork = useCallback(async (title: string) => {
    if (!userId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const workData: WorkData = {
        title,
        panels: [],
      };

      const { data, error: createError } = await supabase
        .from('works')
        .insert({
          user_id: userId,
          title,
          step: 1,
          panels: workData as unknown as Json,
          status: 'draft' as const,
        })
        .select()
        .single();

      if (createError) throw createError;

      setWorks(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '작품 생성에 실패했습니다.');
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
