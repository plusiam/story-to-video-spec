import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, LogOut, Mail } from 'lucide-react';

/**
 * 승인 대기 페이지
 */
export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50 px-4">
      <div className="card max-w-md w-full text-center fade-in">
        {/* 아이콘 */}
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-orange-500" />
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          승인 대기 중
        </h1>
        <p className="text-gray-600 mb-6">
          관리자의 승인을 기다리고 있습니다.
          <br />
          승인이 완료되면 알림을 보내드릴게요!
        </p>

        {/* 사용자 정보 */}
        {user && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
        )}

        {/* 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-medium text-blue-800 mb-2">💡 참고하세요</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 승인은 보통 1-2일 내에 처리됩니다.</li>
            <li>• 승인이 완료되면 이메일로 알려드립니다.</li>
            <li>• 문의사항은 관리자에게 연락해주세요.</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-3">
          <Link to="/" className="btn btn-outline">
            홈으로 돌아가기
          </Link>
          <button
            onClick={handleLogout}
            className="btn btn-ghost flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
