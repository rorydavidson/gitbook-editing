import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RepoSelectPage } from './pages/RepoSelectPage';
import { DocumentSelectPage } from './pages/DocumentSelectPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDashboard } from './pages/ProjectDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, isLoading } = useAuth();
  if (isLoading) return <div className="loading">Loading...</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/repos" element={
            <ProtectedRoute>
              <ErrorBoundary><RepoSelectPage /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/repos/:owner/:repo/documents" element={
            <ProtectedRoute>
              <ErrorBoundary><DocumentSelectPage /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute>
              <ErrorBoundary><ProjectsPage /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/projects/:id" element={
            <ProtectedRoute>
              <ErrorBoundary><ProjectDashboard /></ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="*" element={
            <div className="page">
              <h1>Page not found</h1>
              <p>The page you are looking for does not exist.</p>
            </div>
          } />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
