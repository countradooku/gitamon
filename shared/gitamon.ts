export type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  location: string | null;
  company: string | null;
  blog: string | null;
  html_url: string;
};

export type GitHubRepo = {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  size: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
  topics?: string[];
};

export type GitHubEvent = {
  type: string;
};

export type ElementStyle = {
  name: string;
  color: string;
  ink: string;
  glow: string;
};

export type Metric = {
  id: string;
  label: string;
  score: number;
  value: string;
};

export type Move = {
  name: string;
  damage: number;
  detail: string;
};

export type LanguageSlice = {
  language: string;
  percent: number;
  color: string;
};

export type GitamonCard = {
  login: string;
  displayName: string;
  cardName: string;
  avatarUrl: string;
  githubUrl: string;
  bio: string;
  type: ElementStyle;
  secondaryType: ElementStyle;
  primaryLanguage: string;
  secondaryLanguage: string;
  hp: number;
  overall: number;
  rarity: string;
  stage: string;
  dexNumber: string;
  ability: string;
  abilityText: string;
  moves: Move[];
  metrics: Metric[];
  playstyles: string[];
  languageMix: LanguageSlice[];
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  followers: number;
  accountYears: number;
  recentRepos: number;
  topRepo: GitHubRepo | null;
  joinedYear: string;
  title: string;
};

export type GitamonProfileResponse = {
  card: GitamonCard;
  repos: GitHubRepo[];
};

const elementStyles: Record<string, ElementStyle> = {
  Spark: { name: 'Spark', color: '#ffd84d', ink: '#211700', glow: 'rgba(255, 216, 77, 0.42)' },
  Steel: { name: 'Steel', color: '#9fb4c7', ink: '#07111a', glow: 'rgba(159, 180, 199, 0.4)' },
  Mind: { name: 'Mind', color: '#b892ff', ink: '#1b0c30', glow: 'rgba(184, 146, 255, 0.36)' },
  Flame: { name: 'Flame', color: '#ff7a45', ink: '#2a0d00', glow: 'rgba(255, 122, 69, 0.38)' },
  Wave: { name: 'Wave', color: '#54d4ff', ink: '#001a24', glow: 'rgba(84, 212, 255, 0.35)' },
  Bloom: { name: 'Bloom', color: '#45dd88', ink: '#031a0d', glow: 'rgba(69, 221, 136, 0.35)' },
  Shadow: { name: 'Shadow', color: '#d06bff', ink: '#20032d', glow: 'rgba(208, 107, 255, 0.35)' },
  Core: { name: 'Core', color: '#ffffff', ink: '#101010', glow: 'rgba(255, 255, 255, 0.28)' },
};

const languageElements: Record<string, keyof typeof elementStyles> = {
  TypeScript: 'Spark',
  JavaScript: 'Spark',
  Vue: 'Bloom',
  Svelte: 'Flame',
  HTML: 'Bloom',
  CSS: 'Wave',
  SCSS: 'Wave',
  Python: 'Mind',
  Jupyter: 'Mind',
  Ruby: 'Flame',
  Rust: 'Steel',
  Go: 'Wave',
  C: 'Steel',
  'C++': 'Steel',
  'C#': 'Steel',
  Java: 'Flame',
  Kotlin: 'Mind',
  Swift: 'Flame',
  PHP: 'Shadow',
  Shell: 'Spark',
  Dockerfile: 'Steel',
  Elixir: 'Shadow',
  Haskell: 'Mind',
  Dart: 'Wave',
};

export function buildGitamonCard(user: GitHubUser, repoList: GitHubRepo[], eventList: GitHubEvent[]): GitamonCard {
  const activeRepos = repoList.filter((repo) => !repo.archived);
  const ownedRepos = activeRepos.filter((repo) => !repo.fork);
  const totalStars = sum(ownedRepos.map((repo) => repo.stargazers_count));
  const totalForks = sum(ownedRepos.map((repo) => repo.forks_count));
  const topRepo = [...ownedRepos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0] ?? null;
  const languageMix = getLanguageMix(ownedRepos);
  const primaryLanguage = languageMix[0]?.language ?? 'Markdown';
  const secondaryLanguage = languageMix[1]?.language ?? 'Git';
  const type = getElementStyle(primaryLanguage);
  const secondaryType = getElementStyle(secondaryLanguage);
  const accountYears = Math.max(0.2, yearsSince(user.created_at));
  const recentRepos = ownedRepos.filter((repo) => repo.pushed_at && daysSince(repo.pushed_at) <= 180).length;
  const eventCount = eventList.length;
  const pushEvents = eventList.filter((event) => event.type === 'PushEvent').length;
  const pullRequestEvents = eventList.filter((event) => event.type === 'PullRequestEvent').length;
  const issueEvents = eventList.filter((event) => event.type === 'IssuesEvent').length;

  const forge = clampScore(32 + scoreLog(user.public_repos + ownedRepos.length, 260) * 0.5 + languageMix.length * 5);
  const aura = clampScore(24 + scoreLog(user.followers + totalStars * 0.7, 50000) * 0.78);
  const spark = clampScore(28 + recentRepos * 4.5 + pushEvents * 1.8 + pullRequestEvents * 2.4 + issueEvents * 1.2);
  const reach = clampScore(24 + scoreLog(totalForks + (topRepo?.stargazers_count ?? 0), 25000) * 0.82);
  const lore = clampScore(34 + Math.min(accountYears, 15) * 4.4 + scoreLog(user.followers + totalStars, 80000) * 0.18);
  const focus = clampScore(26 + scoreLog(totalStars + ownedRepos.length * 18 + recentRepos * 40, 40000) * 0.68);
  const metrics: Metric[] = [
    { id: 'aur', label: 'Aura', score: aura, value: `${formatCompact(user.followers)} followers` },
    { id: 'frg', label: 'Forge', score: forge, value: `${formatCompact(user.public_repos)} repos` },
    { id: 'spk', label: 'Spark', score: spark, value: `${formatCompact(eventCount)} recent events` },
    { id: 'rch', label: 'Reach', score: reach, value: `${formatCompact(totalStars)} stars` },
    { id: 'lor', label: 'Lore', score: lore, value: `${accountYears.toFixed(1)} years` },
    { id: 'foc', label: 'Focus', score: focus, value: `${formatCompact(recentRepos)} active repos` },
  ];

  const overall = Math.round(metrics.reduce((acc, metric) => acc + metric.score, 0) / metrics.length);
  const hp = clamp(Math.round(58 + overall * 0.92), 70, 160);
  const rarity = getRarity(overall);
  const stage = getStage(overall, accountYears);
  const title = getTitle(type.name, overall, totalStars, user.followers);

  return {
    login: user.login,
    displayName: user.name || user.login,
    cardName: user.login.toUpperCase(),
    avatarUrl: getSizedAvatarUrl(user.avatar_url, 512),
    githubUrl: user.html_url,
    bio: user.bio || 'Public GitHub signal condensed into one original collectible developer card.',
    type,
    secondaryType,
    primaryLanguage,
    secondaryLanguage,
    hp,
    overall,
    rarity,
    stage,
    dexNumber: `GTM-${hashHandle(user.login).toString().padStart(3, '0')}`,
    ability: getAbility(primaryLanguage, overall),
    abilityText: getAbilityText(primaryLanguage, totalStars, recentRepos, languageMix.length),
    moves: getMoves(totalStars, totalForks, spark, reach),
    metrics,
    playstyles: getPlaystyles(totalStars, totalForks, recentRepos, accountYears, user.followers, languageMix.length),
    languageMix,
    totalStars,
    totalForks,
    totalRepos: user.public_repos,
    followers: user.followers,
    accountYears,
    recentRepos,
    topRepo,
    joinedYear: new Date(user.created_at).getFullYear().toString(),
    title,
  };
}

export function cleanHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').replace(/[^a-zA-Z0-9-]/g, '');
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function getLanguageMix(repoList: GitHubRepo[]): LanguageSlice[] {
  const weights = new Map<string, number>();

  for (const repo of repoList) {
    if (!repo.language) continue;
    const current = weights.get(repo.language) ?? 0;
    const weight = Math.max(repo.size, 1) + repo.stargazers_count * 24 + repo.forks_count * 10 + 120;
    weights.set(repo.language, current + weight);
  }

  if (weights.size === 0) {
    return [{ language: 'Markdown', percent: 100, color: elementStyles.Core.color }];
  }

  const total = sum([...weights.values()]);

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language, value]) => ({
      language,
      percent: Math.max(5, Math.round((value / total) * 100)),
      color: getElementStyle(language).color,
    }));
}

function getElementStyle(language: string): ElementStyle {
  const key = languageElements[language] ?? 'Core';
  return elementStyles[key];
}

function getRarity(overall: number): string {
  if (overall >= 95) return 'Legend Foil';
  if (overall >= 90) return 'Mythic Holo';
  if (overall >= 82) return 'Ultra Rare';
  if (overall >= 72) return 'Rare';
  return 'Uncommon';
}

function getStage(overall: number, accountYears: number): string {
  if (overall >= 95 || accountYears >= 12) return 'Legend';
  if (overall >= 86 || accountYears >= 7) return 'Stage 2';
  if (overall >= 74 || accountYears >= 3) return 'Stage 1';
  return 'Base';
}

function getTitle(typeName: string, overall: number, totalStars: number, followers: number): string {
  if (overall >= 95) return 'Hall of Frame';
  if (totalStars >= 10000) return 'Star Sovereign';
  if (followers >= 5000) return 'Community Beacon';
  if (typeName === 'Steel') return 'Systems Guardian';
  if (typeName === 'Spark') return 'Reactive Striker';
  if (typeName === 'Mind') return 'Pattern Mystic';
  if (typeName === 'Bloom') return 'Interface Druid';
  return 'Open Source Adept';
}

function getAbility(language: string, overall: number): string {
  if (overall >= 95) return 'Maintainer Aura';
  if (['TypeScript', 'JavaScript', 'Shell'].includes(language)) return 'Reactive Spark';
  if (['Rust', 'C', 'C++', 'Go'].includes(language)) return 'Systems Shell';
  if (['Python', 'Jupyter', 'Haskell'].includes(language)) return 'Pattern Whisper';
  if (['HTML', 'CSS', 'Vue', 'Svelte'].includes(language)) return 'Interface Bloom';
  return 'Open Source Pulse';
}

function getAbilityText(language: string, totalStars: number, recentRepos: number, languageCount: number): string {
  if (totalStars >= 10000) return 'Whenever this profile enters a feed, starred repositories charge every move.';
  if (recentRepos >= 10) return 'Fresh commits raise Spark and Focus during active release seasons.';
  if (languageCount >= 4) return 'Polyglot energy lets this Gitamon borrow power from adjacent stacks.';
  return `${language} signal anchors the card while public repo activity shapes the stat line.`;
}

function getMoves(totalStars: number, totalForks: number, spark: number, reach: number): Move[] {
  const firstDamage = clamp(Math.round(35 + scoreLog(totalStars + 1, 60000) * 0.95), 40, 140);
  const secondDamage = clamp(Math.round((spark + reach) * 0.72 + scoreLog(totalForks + 1, 25000) * 0.4), 40, 150);

  return [
    {
      name: totalStars >= 1000 ? 'Starfall Refactor' : 'Clean Commit',
      damage: firstDamage,
      detail: `${formatCompact(totalStars)} public stars turn reputation into pressure.`,
    },
    {
      name: totalForks >= 500 ? 'Forkstorm Merge' : 'Branch Dash',
      damage: secondDamage,
      detail: `${formatCompact(totalForks)} forks and recent events fuel the follow-up.`,
    },
  ];
}

function getPlaystyles(
  totalStars: number,
  totalForks: number,
  recentRepos: number,
  accountYears: number,
  followers: number,
  languageCount: number,
): string[] {
  const styles = new Set<string>();

  if (totalStars >= 500) styles.add('Star Magnet');
  if (totalForks >= 200) styles.add('Fork Catalyst');
  if (recentRepos >= 8) styles.add('Release Sprinter');
  if (accountYears >= 6) styles.add('Veteran Core');
  if (followers >= 1000) styles.add('Community Aura');
  if (languageCount >= 4) styles.add('Polyglot');
  styles.add('Repo Tactician');

  return [...styles].slice(0, 7);
}

function getSizedAvatarUrl(url: string, size: number): string {
  try {
    const avatarUrl = new URL(url);
    avatarUrl.searchParams.set('s', String(size));
    return avatarUrl.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}s=${size}`;
  }
}

function scoreLog(value: number, max: number): number {
  return clamp((Math.log10(value + 1) / Math.log10(max + 1)) * 99, 0, 99);
}

function clampScore(value: number): number {
  return Math.round(clamp(value, 35, 99));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function yearsSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function daysSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function hashHandle(handle: string): number {
  let hash = 0;
  for (const char of handle) {
    hash = (hash * 31 + char.charCodeAt(0)) % 999;
  }
  return hash + 1;
}
