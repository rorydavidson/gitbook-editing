import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, type SummaryEntry } from '../api/client';
import { SummaryTree } from '../components/SummaryTree';

function flattenEntries(entries: SummaryEntry[]): SummaryEntry[] {
  const flat: SummaryEntry[] = [];
  function walk(items: SummaryEntry[]) {
    for (const item of items) {
      flat.push(item);
      walk(item.children);
    }
  }
  walk(entries);
  return flat;
}

export function DocumentSelectPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['summary', owner, repo],
    queryFn: () => api.getSummary(owner!, repo!),
    enabled: !!owner && !!repo,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { project } = await api.createProject(owner!, repo!);
      const flat = flattenEntries(data!.entries);
      const docs = flat.filter((e) => selected.has(e.path)).map((e) => ({
        path: e.path,
        title: e.title,
      }));
      await api.selectDocuments(project.id, docs);
      return project;
    },
    onSuccess: (project) => {
      navigate(`/projects/${project.id}`);
    },
  });

  const togglePath = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!data) return;
    const flat = flattenEntries(data.entries);
    setSelected(new Set(flat.map((e) => e.path)));
  }, [data]);

  if (error) return <div className="alert alert-error">{(error as Error).message}</div>;

  return (
    <div className="page">
      <h1>Select Documents</h1>
      <p>
        Repository: <strong>{owner}/{repo}</strong>
      </p>
      <p>Choose which documents to push to Google Docs for collaborative editing.</p>

      {isLoading ? (
        <div className="loading">Loading document structure...</div>
      ) : data ? (
        <>
          <div className="actions-bar">
            <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select all</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>Clear selection</button>
            <span>{selected.size} document(s) selected</span>
          </div>

          <SummaryTree entries={data.entries} selected={selected} onToggle={togglePath} />

          <div className="actions-bar">
            <button
              className="btn btn-primary"
              disabled={selected.size === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating project...' : 'Create Project'}
            </button>
          </div>

          {createMutation.error && (
            <div className="alert alert-error">{(createMutation.error as Error).message}</div>
          )}
        </>
      ) : null}
    </div>
  );
}
