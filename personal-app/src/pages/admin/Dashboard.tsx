import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Users, BookOpen, Clock, CheckCircle } from 'lucide-react';

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalWorks: number;
}

/**
 * 관리자 대시보드
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalWorks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // 사용자 통계
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: pendingUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);

      const { count: approvedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);

      // 작품 통계
      const { count: totalWorks } = await supabase
        .from('works')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: totalUsers || 0,
        pendingUsers: pendingUsers || 0,
        approvedUsers: approvedUsers || 0,
        totalWorks: totalWorks || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800">관리자 대시보드</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? '-' : stats.totalUsers}
            </p>
            <p className="text-sm text-gray-500">전체 사용자</p>
          </div>
          <div className="card text-center">
            <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? '-' : stats.pendingUsers}
            </p>
            <p className="text-sm text-gray-500">승인 대기</p>
          </div>
          <div className="card text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? '-' : stats.approvedUsers}
            </p>
            <p className="text-sm text-gray-500">승인됨</p>
          </div>
          <div className="card text-center">
            <BookOpen className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">
              {isLoading ? '-' : stats.totalWorks}
            </p>
            <p className="text-sm text-gray-500">전체 작품</p>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/admin/users" className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">사용자 관리</h3>
                <p className="text-sm text-gray-500">
                  사용자 승인, 정지, 역할 관리
                </p>
              </div>
            </div>
            {stats.pendingUsers > 0 && (
              <div className="mt-3 bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full inline-block">
                {stats.pendingUsers}명 승인 대기 중
              </div>
            )}
          </Link>

          <div className="card opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-400">작품 관리</h3>
                <p className="text-sm text-gray-400">
                  준비 중입니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
