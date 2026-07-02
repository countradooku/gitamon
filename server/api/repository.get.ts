import { createError, setHeader } from 'h3';

type GitHubRepository = {
  full_name: string;
  html_url: string;
  stargazers_count: number;
};

type RepositorySummary = {
  fullName: string;
  url: string;
  stars: number;
};

export default defineEventHandler(async (event): Promise<RepositorySummary> => {
  const config = useRuntimeConfig();
  const owner = config.public.repositoryOwner;
  const repo = config.public.repositoryName;
  const fallbackSummary = {
    fullName: `${owner}/${repo}`,
    url: config.public.repositoryUrl,
    stars: 0,
  };

  if (!owner || !repo) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Repository metadata is not configured.',
    });
  }

  setHeader(event, 'cache-control', 'public, max-age=120, stale-while-revalidate=600');

  try {
    const repository = await fetchRepository(owner, repo, getGitHubHeaders());

    return {
      fullName: repository.full_name,
      url: repository.html_url,
      stars: repository.stargazers_count,
    };
  } catch {
    return fallbackSummary;
  }
});

function getGitHubHeaders(): Record<string, string> {
  const config = useRuntimeConfig();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gitamon-nuxt',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (config.githubToken) {
    headers.Authorization = `Bearer ${config.githubToken}`;
  }

  return headers;
}

async function fetchRepository(
  owner: string,
  repo: string,
  headers: Record<string, string>,
): Promise<GitHubRepository> {
  try {
    return await $fetch<GitHubRepository>(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  } catch (caught) {
    const statusCode = getFetchStatus(caught);

    throw createError({
      statusCode,
      statusMessage: `GitHub returned ${statusCode} while reading repository stars.`,
    });
  }
}

function getFetchStatus(caught: unknown): number {
  if (typeof caught !== 'object' || caught === null) {
    return 500;
  }

  const maybeError = caught as {
    response?: { status?: number };
    status?: number;
    statusCode?: number;
  };

  return maybeError.response?.status ?? maybeError.statusCode ?? maybeError.status ?? 500;
}
