import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const { user, authenticated, logout } = useAuth();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">GitBook Editor</Link>
          {authenticated && (
            <nav className="nav">
              <Link to="/projects">Projects</Link>
              <Link to="/repos">New Project</Link>
              <span className="user-info">
                {user?.githubUsername}
                {user?.googleConnected ? (
                  <span className="badge badge-success" title={user.googleEmail ?? ''}>Google connected</span>
                ) : (
                  <a href="/auth/google" className="badge badge-warning">Connect Google</a>
                )}
              </span>
              <button onClick={() => logout()} className="btn btn-secondary btn-sm">Sign out</button>
            </nav>
          )}
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
