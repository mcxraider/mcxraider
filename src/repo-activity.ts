export const COMMITS_PER_PAGE = 100;
export const REPO_SHORTLIST_SIZE = 20;
export const TOP_REPOS_LIMIT = 5;

export type RepoListEntry = {
  name: string;
  description?: string | null;
  html_url: string;
  pushed_at?: string | null;
};

export type RepoActivity = {
  name: string;
  description: string;
  url: string;
  commitMessages: string[];
  lastPushedAt: string | null;
};

export type CommitPageEntry = {
  commit?: {
    message?: string;
  };
};

export async function getPaginatedCommitMessages(
  fetchPage: (page: number, perPage: number) => Promise<CommitPageEntry[]>,
  perPage = COMMITS_PER_PAGE
): Promise<string[]> {
  const messages: string[] = [];
  let page = 1;

  while (true) {
    const commits = await fetchPage(page, perPage);

    if (commits.length === 0) {
      break;
    }

    for (const commit of commits) {
      const message = commit.commit?.message?.trim();
      if (message) {
        messages.push(message);
      }
    }

    if (commits.length < perPage) {
      break;
    }

    page += 1;
  }

  return messages;
}

export function shortlistRepos(
  repos: RepoListEntry[],
  shortlistSize = REPO_SHORTLIST_SIZE
): RepoListEntry[] {
  return repos.slice(0, shortlistSize);
}

export function rankRepoActivities(
  entries: RepoActivity[],
  limit = TOP_REPOS_LIMIT
): RepoActivity[] {
  return entries
    .filter((entry) => entry.commitMessages.length > 0)
    .sort((a, b) => {
      const commitDelta = b.commitMessages.length - a.commitMessages.length;

      if (commitDelta !== 0) {
        return commitDelta;
      }

      const pushedDelta =
        new Date(b.lastPushedAt ?? 0).getTime() -
        new Date(a.lastPushedAt ?? 0).getTime();

      if (pushedDelta !== 0) {
        return pushedDelta;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
