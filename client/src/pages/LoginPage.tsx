import { useAuth } from '../hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';

export function LoginPage() {
  const { authenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  if (isLoading) return <div className="loading">Loading...</div>;
  if (authenticated) return <Navigate to="/projects" replace />;

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>GitBook Editor</h1>
        <p>Convert GitBook documents to Google Docs for collaborative editing, then sync changes back to your repository.</p>

        {error && (
          <div className="alert alert-error">
            Authentication failed. Please try again.
          </div>
        )}

        <a href="/auth/github" className="btn btn-primary btn-lg">
          Sign in with GitHub
        </a>

        <p className="login-note">
          You will also need to connect a Google account to create and edit Google Docs.
        </p>
      </div>
    </div>
  );
}
