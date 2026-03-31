import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

function StatusBadge({ status }: { status: string }) {
  const colourMap: Record<string, string> = {
    pending: 'secondary',
    pushed: 'primary',
    synced: 'success',
    error: 'error',
  };
  return <span className={`badge badge-${colourMap[status] ?? 'secondary'}`}>{status}</span>;
}

export function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const projectId = parseInt(id!);

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
    refetchInterval: 10_000,
  });

  const pushMutation = useMutation({
    mutationFn: () => api.push(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const pullMutation = useMutation({
    mutationFn: () => api.pull(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  if (error) return <div className="alert alert-error">{(error as Error).message}</div>;
  if (isLoading || !data) return <div className="loading">Loading project...</div>;

  const { project, documents, syncLogs } = data;
  const hasPushed = documents.some((d) => d.googleDocId);
  const hasUnpushed = documents.some((d) => !d.googleDocId);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{project.repoOwner}/{project.repoName}</h1>
        <div className="actions">
          {hasUnpushed && (
            <button
              className="btn btn-primary"
              disabled={pushMutation.isPending}
              onClick={() => pushMutation.mutate()}
            >
              {pushMutation.isPending ? 'Pushing...' : 'Push to Google Docs'}
            </button>
          )}
          {hasPushed && (
            <button
              className="btn btn-secondary"
              disabled={pullMutation.isPending}
              onClick={() => pullMutation.mutate()}
            >
              {pullMutation.isPending ? 'Pulling...' : 'Pull Changes Back'}
            </button>
          )}
        </div>
      </div>

      {pushMutation.error && (
        <div className="alert alert-error">{(pushMutation.error as Error).message}</div>
      )}
      {pullMutation.error && (
        <div className="alert alert-error">{(pullMutation.error as Error).message}</div>
      )}
      {pullMutation.data?.pullRequestUrl && (
        <div className="alert alert-success">
          Pull request created: <a href={pullMutation.data.pullRequestUrl} target="_blank" rel="noopener noreferrer">
            {pullMutation.data.pullRequestUrl}
          </a>
        </div>
      )}

      <h2>Documents</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Path</th>
            <th>Status</th>
            <th>Google Doc</th>
            <th>Last Pushed</th>
            <th>Last Pulled</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.title}</td>
              <td className="mono">{doc.localPath}</td>
              <td><StatusBadge status={doc.status} /></td>
              <td>
                {doc.googleDocUrl ? (
                  <a href={doc.googleDocUrl} target="_blank" rel="noopener noreferrer">Open</a>
                ) : '—'}
              </td>
              <td>{doc.lastPushedAt ? new Date(doc.lastPushedAt).toLocaleDateString('en-GB') : '—'}</td>
              <td>{doc.lastPulledAt ? new Date(doc.lastPulledAt).toLocaleDateString('en-GB') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {syncLogs.length > 0 && (
        <>
          <h2>Sync History</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Direction</th>
                <th>Status</th>
                <th>Documents</th>
                <th>PR</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.slice().reverse().map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString('en-GB')}</td>
                  <td>{log.direction}</td>
                  <td><StatusBadge status={log.status} /></td>
                  <td>{log.documentsAffected}</td>
                  <td>
                    {log.pullRequestUrl ? (
                      <a href={log.pullRequestUrl} target="_blank" rel="noopener noreferrer">View PR</a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
