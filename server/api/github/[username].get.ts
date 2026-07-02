import { createError, getRouterParam, setHeader } from 'h3';
import {
  buildGitamonCard,
  cleanHandle,
  type GitHubEvent,
  type GitHubRepo,
  type GitHubUser,
  type GitamonProfileResponse,
} from '~~/shared/gitamon';

const githubBaseUrl = 'https://api.github.com';

export default defineEventHandler(async (event): Promise<GitamonProfileResponse> => {
  const rawUsername = getRouterParam(event, 'username') ?? '';
  const handle = cleanHandle(decodeURIComponent(rawUsername));

  if (!handle) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Enter a public GitHub username.',
    });
  }

  const headers = getGitHubHeaders();
  const encodedHandle = encodeURIComponent(handle);

  const user = await fetchGitHub<GitHubUser>(`/users/${encodedHandle}`, headers);
  const [repoList, eventList] = await Promise.all([
    fetchGitHubOptional<GitHubRepo[]>(
      `/users/${encodedHandle}/repos?per_page=100&sort=updated&type=owner`,
      headers,
      [],
    ),
    fetchGitHubOptional<GitHubEvent[]>(`/users/${encodedHandle}/events/public?per_page=100`, headers, []),
  ]);

  setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=240');

  return {
    card: buildGitamonCard(user, repoList, eventList),
    repos: repoList,
  };
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

async function fetchGitHub<T>(path: string, headers: Record<string, string>): Promise<T> {
  try {
    return await $fetch<T>(`${githubBaseUrl}${path}`, { headers });
  } catch (caught) {
    const statusCode = getFetchStatus(caught);

    if (statusCode === 404) {
      throw createError({
        statusCode,
        statusMessage: 'No public GitHub profile found for that username.',
      });
    }

    if (statusCode === 403) {
      throw createError({
        statusCode,
        statusMessage: 'GitHub rate limit is taking a breather. Try a sample card or wait a minute.',
      });
    }

    throw createError({
      statusCode,
      statusMessage: `GitHub returned ${statusCode}. Try another username.`,
    });
  }
}

async function fetchGitHubOptional<T>(path: string, headers: Record<string, string>, fallback: T): Promise<T> {
  try {
    return await fetchGitHub<T>(path, headers);
  } catch {
    return fallback;
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
