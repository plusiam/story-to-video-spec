import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, LogOut, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useState } from 'react';

/**
 * 승인 대기 페이지
 * 자동 승인 모드에서는 거의 보이지 않지만, 혹시 모를 상황을 대비
 */
export default function PendingApprovalPage() {
  const { user, isApproved, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 이미 승인된 경우 대시보드로 이동
  if (isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async () => {
    await signOut();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 페이지 새로고침으로 상태 재확인
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 px-4">
      <div className="card max-w-md w-full text-center fade-in">
        {/* 아이콘 */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-orange-100 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-full h-full">
            <Clock className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          거의 다 됐어요! ⏳
        </h1>
        <p className="text-gray-600 mb-6">
          계정 준비가 진행 중이에요.
          <br />
          잠시만 기다려주세요!
        </p>

        {/* 사용자 정보 */}
        {user && (
          <div className="bg-white/70 border border-orange-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Mail className="w-5 h-5 text-orange-500" />
              <span className="font-medium">{user.email}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              가입일: {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : '-'}
            </p>
          </div>
        )}

        {/* 새로고침 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-blue-800">잠깐!</h3>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            보통은 자동으로 승인되어요.<br />
            아래 버튼을 눌러 다시 확인해보세요!
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                확인 중...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                다시 확인하기
              </>
            )}
          </button>
        </div>

        {/* 문제 해결 안내 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-bold text-gray-700 mb-2">🤔 계속 이 화면이 보인다면?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 로그아웃 후 다시 로그인해보세요</li>
            <li>• 이메일 인증을 완료했는지 확인해주세요</li>
            <li>• 문제가 계속되면 관리자에게 문의해주세요</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-3">
          <Link to="/" className="btn btn-outline py-2.5">
            홈으로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            className="btn btn-ghost py-2.5 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
