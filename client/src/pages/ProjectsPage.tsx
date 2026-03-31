import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export function ProjectsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: api.listProjects,
  });

  if (error) return <div className="alert alert-error">{(error as Error).message}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects</h1>
        <Link to="/repos" className="btn btn-primary">New Project</Link>
      </div>

      {isLoading ? (
        <div className="loading">Loading projects...</div>
      ) : data?.projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Select a repository to get started.</p>
          <Link to="/repos" className="btn btn-primary">Select Repository</Link>
        </div>
      ) : (
        <div className="project-list">
          {data?.projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="project-card">
              <div className="project-name">{project.repoOwner}/{project.repoName}</div>
              <div className="project-meta">
                Branch: {project.defaultBranch}
                <span className={`badge badge-${project.status === 'active' ? 'success' : 'secondary'}`}>
                  {project.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
