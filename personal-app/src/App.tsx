import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Components
import { LoadingScreen } from '@/components/LoadingScreen';

// Lazy-loaded Pages (코드 스플리팅)
const HomePage = lazy(() => import('@/pages/Home'));
const LoginPage = lazy(() => import('@/pages/Login'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallback'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const CreatePage = lazy(() => import('@/pages/Create'));
const WorkEditPage = lazy(() => import('@/pages/WorkEdit'));
const PendingApprovalPage = lazy(() => import('@/pages/PendingApproval'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsersPage = lazy(() => import('@/pages/admin/Users'));

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
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
