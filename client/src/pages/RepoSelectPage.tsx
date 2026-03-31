import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export function RepoSelectPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['repos', page],
    queryFn: () => api.listRepos(page),
  });

  const filteredRepos = data?.repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  async function handleSelect(owner: string, name: string) {
    navigate(`/repos/${owner}/${name}/documents`);
  }

  if (error) return <div className="alert alert-error">{(error as Error).message}</div>;

  return (
    <div className="page">
      <h1>Select a Repository</h1>
      <p>Choose a GitBook repository to set up for collaborative editing.</p>

      <input
        type="text"
        className="search-input"
        placeholder="Filter repositories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="loading">Loading repositories...</div>
      ) : (
        <>
          <div className="repo-list">
            {filteredRepos.map((repo) => (
              <div key={repo.fullName} className="repo-card" onClick={() => handleSelect(repo.owner, repo.name)}>
                <div className="repo-name">
                  {repo.fullName}
                  {repo.private && <span className="badge badge-secondary">Private</span>}
                </div>
                {repo.description && <p className="repo-desc">{repo.description}</p>}
              </div>
            ))}
          </div>

          <div className="pagination">
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button className="btn btn-secondary" disabled={!data?.hasMore} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
