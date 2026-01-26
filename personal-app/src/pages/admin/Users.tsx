import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react';
import type { User } from '@/types';

/**
 * 사용자 관리 페이지
 */
export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 사용자 승인 상태 변경
  const updateUserApproval = async (userId: string, isApproved: boolean, reason?: string) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_approved: isApproved })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 로그 기록
      if (currentUser?.id) {
        await supabase.from('approval_logs').insert({
          user_id: userId,
          action: isApproved ? 'approved' : 'rejected',
          admin_id: currentUser.id,
          reason: reason ?? null,
        });
      }

      // 목록 새로고침
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user approval:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 승인
  const handleApprove = (userId: string) => {
    if (confirm('이 사용자를 승인하시겠습니까?')) {
      updateUserApproval(userId, true);
    }
  };

  // 거절 (승인 취소)
  const handleReject = (userId: string) => {
    const reason = prompt('거절 사유를 입력해주세요:');
    if (reason !== null) {
      updateUserApproval(userId, false, reason);
    }
  };

  const getStatusBadge = (isApproved: boolean | null) => {
    if (isApproved === true) {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">승인</span>;
    }
    return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">대기</span>;
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">관리자</span>;
      case 'judge':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">심사위원</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800">사용자 관리</h1>
          </div>
          <button
            onClick={fetchUsers}
            className="btn btn-ghost flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'pending', label: '승인 대기' },
            { key: 'approved', label: '승인됨' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === key
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 사용자 목록 */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filter === 'all' ? '등록된 사용자가 없습니다.' : '해당하는 사용자가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800 truncate">
                        {user.full_name || user.email}
                      </span>
                      {getStatusBadge(user.is_approved)}
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      가입일: {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                    </p>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 ml-4">
                    {!user.is_approved && (
                      <>
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="승인"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="거절"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {user.is_approved && user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleReject(user.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="승인 취소"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
