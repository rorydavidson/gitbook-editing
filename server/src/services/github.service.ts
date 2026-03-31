import { Octokit } from '@octokit/rest';
import { decrypt } from '../utils/crypto.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler.js';

async function getOctokit(userId: number): Promise<Octokit> {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new AppError(401, 'User not found');
  const token = decrypt(user.githubAccessToken);
  return new Octokit({ auth: token });
}

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  updatedAt: string;
}

export async function listRepos(userId: number, page = 1): Promise<{ repos: RepoInfo[]; hasMore: boolean }> {
  const octokit = await getOctokit(userId);
  const perPage = 30;

  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    direction: 'desc',
    per_page: perPage,
    page,
  });

  return {
    repos: data.map((r) => ({
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      defaultBranch: r.default_branch,
      private: r.private,
      updatedAt: r.updated_at ?? '',
    })),
    hasMore: data.length === perPage,
  };
}

export async function getFileContent(userId: number, owner: string, repo: string, path: string, ref?: string): Promise<string> {
  const octokit = await getOctokit(userId);

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
    throw new AppError(400, `Path ${path} is not a file`);
  }

  return Buffer.from(data.content, 'base64').toString('utf-8');
}

export async function getRepoDefaultBranch(userId: number, owner: string, repo: string): Promise<string> {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch;
}

export async function createBranch(userId: number, owner: string, repo: string, branchName: string, fromSha: string): Promise<void> {
  const octokit = await getOctokit(userId);
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: fromSha,
  });
}

export async function getLatestCommitSha(userId: number, owner: string, repo: string, branch: string): Promise<string> {
  const octokit = await getOctokit(userId);
  const { data } = await octokit.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

interface FileChange {
  path: string;
  content: string;
}

export async function commitFiles(
  userId: number,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: FileChange[],
): Promise<string> {
  const octokit = await getOctokit(userId);

  const { data: refData } = await octokit.git.getRef({
    owner, repo, ref: `heads/${branch}`,
  });
  const baseSha = refData.object.sha;

  const { data: baseCommit } = await octokit.git.getCommit({
    owner, repo, commit_sha: baseSha,
  });

  const blobs = await Promise.all(files.map(async (f) => {
    const { data } = await octokit.git.createBlob({
      owner, repo, content: f.content, encoding: 'utf-8',
    });
    return { path: f.path, sha: data.sha };
  }));

  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.tree.sha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: '100644' as const,
      type: 'blob' as const,
      sha: b.sha,
    })),
  });

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [baseSha],
  });

  await octokit.git.updateRef({
    owner, repo, ref: `heads/${branch}`, sha: newCommit.sha,
  });

  return newCommit.sha;
}

export async function createPullRequest(
  userId: number,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<{ url: string; number: number }> {
  const octokit = await getOctokit(userId);

  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head,
    base,
  });

  return { url: data.html_url, number: data.number };
}
