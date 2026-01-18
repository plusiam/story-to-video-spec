import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Pages
import HomePage from '@/pages/Home';
import LoginPage from '@/pages/Login';
import AuthCallbackPage from '@/pages/AuthCallback';
import DashboardPage from '@/pages/Dashboard';
import CreatePage from '@/pages/Create';
import WorkEditPage from '@/pages/WorkEdit';
import PendingApprovalPage from '@/pages/PendingApproval';
import AdminDashboardPage from '@/pages/admin/Dashboard';
import AdminUsersPage from '@/pages/admin/Users';

// Components
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * 인증 필요 라우트
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isApproved } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isApproved) {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
}

/**
 * 관리자 전용 라우트
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * 앱 라우터
 */
function AppRoutes() {
  return (
    <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/pending" element={<PendingApprovalPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/create" element={
          <ProtectedRoute>
            <CreatePage />
          </ProtectedRoute>
        } />
        <Route path="/work/:id" element={
          <ProtectedRoute>
            <WorkEditPage />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
