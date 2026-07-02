<script setup lang="ts">
import { computed, ref } from 'vue';
import { toBlob, toPng } from 'html-to-image';
import {
  Copy,
  Download,
  ExternalLink,
  Github,
  Info,
  Link2,
  RefreshCw,
  Search,
  Share2,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-vue-next';
import { cleanHandle, formatCompact, type GitHubRepo, type GitamonCard, type GitamonProfileResponse } from '~~/shared/gitamon';

type RepositorySummary = {
  fullName: string;
  url: string;
  stars: number;
};

const route = useRoute();
const router = useRouter();
const initialHandle = cleanHandle(getQueryHandle(route.query.u) || 'yyx990803') || 'yyx990803';
const username = ref(initialHandle);
const loading = ref(false);
const error = ref('');
const toast = ref('');
const card = ref<GitamonCard | null>(null);
const repos = ref<GitHubRepo[]>([]);
const cardRef = ref<HTMLElement | null>(null);
const showRecipe = ref(false);

const sampleHandles = ['yyx990803', 'torvalds', 'sindresorhus', 'gaearon'];
let toastTimer: number | undefined;

const featuredRepos = computed(() => {
  return repos.value
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((a, b) => b.stargazers_count + b.forks_count - (a.stargazers_count + a.forks_count))
    .slice(0, 4);
});

const heroAccent = computed(() => card.value?.type.color ?? '#ffd84d');
const heroSecondary = computed(() => card.value?.secondaryType.color ?? '#2f6cff');
const cardTheme = computed((): Record<string, string> => {
  if (!card.value) return {};

  return {
    '--card-primary': card.value.type.color,
    '--card-secondary': card.value.secondaryType.color,
    '--card-primary-ink': card.value.type.ink,
    '--card-secondary-ink': card.value.secondaryType.ink,
    '--card-glow': card.value.type.glow,
  };
});

const { data: repository } = await useFetch<RepositorySummary>('/api/repository', {
  key: 'gitamon-repository-summary',
});

const repositoryUrl = computed(() => repository.value?.url ?? 'https://github.com/countradooku/gitamon');
const repositoryStars = computed(() => formatCompact(repository.value?.stars ?? 0));

const { data: initialProfile, error: initialError } = await useFetch<GitamonProfileResponse>(
  `/api/github/${encodeURIComponent(initialHandle)}`,
  {
    key: `gitamon-profile-${initialHandle}`,
  },
);

if (initialProfile.value) {
  setProfile(initialProfile.value);
}

if (initialError.value) {
  error.value = getApiErrorMessage(initialError.value);
}

useHead({
  title: computed(() => (card.value ? `${card.value.displayName} - Gitamon` : 'Gitamon - GitHub Creature Cards')),
  meta: [
    {
      name: 'description',
      content: 'Gitamon turns public GitHub profiles into original collectible developer creature cards.',
    },
  ],
});

async function loadProfile(rawHandle = username.value, options: { replaceUrl?: boolean } = {}) {
  const handle = cleanHandle(rawHandle);

  if (!handle) {
    error.value = 'Enter a public GitHub username.';
    return;
  }

  loading.value = true;
  error.value = '';
  username.value = handle;

  try {
    const profile = await $fetch<GitamonProfileResponse>(`/api/github/${encodeURIComponent(handle)}`);
    setProfile(profile);
    await syncUrl(profile.card.login, options.replaceUrl);
  } catch (caught) {
    error.value = getApiErrorMessage(caught);
  } finally {
    loading.value = false;
  }
}

async function downloadCard() {
  if (!cardRef.value || !card.value) return;

  try {
    const image = await toPng(cardRef.value, {
      cacheBust: true,
      pixelRatio: 2.5,
      backgroundColor: '#f8f2cf',
    });
    const link = document.createElement('a');
    link.href = image;
    link.download = `${card.value.login}-gitamon-card.png`;
    link.click();
    showToastMessage('Card image downloaded');
  } catch {
    await copyLink('Image export was blocked. Link copied instead.');
  }
}

async function copyCardImage() {
  if (!cardRef.value) return;

  try {
    const blob = await toBlob(cardRef.value, {
      cacheBust: true,
      pixelRatio: 2.2,
      backgroundColor: '#f8f2cf',
    });

    if (!blob || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      await downloadCard();
      return;
    }

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToastMessage('Card image copied');
  } catch {
    await downloadCard();
  }
}

async function shareCard() {
  if (!card.value) return;

  const shareData = {
    title: `${card.value.displayName} is a ${card.value.rarity} Gitamon`,
    text: `${card.value.displayName} scored ${card.value.overall} as a ${card.value.primaryLanguage} Gitamon.`,
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      return;
    }
  }

  await copyLink();
}

async function copyLink(message = 'Link copied') {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToastMessage(message);
  } catch {
    showToastMessage('Copy is unavailable in this browser');
  }
}

function showToastMessage(message: string) {
  toast.value = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = '';
  }, 2600);
}

function setProfile(profile: GitamonProfileResponse) {
  card.value = profile.card;
  repos.value = profile.repos;
  username.value = profile.card.login;
  error.value = '';
}

async function syncUrl(handle: string, replaceUrl = false) {
  const nextLocation = {
    query: {
      ...route.query,
      u: handle,
    },
  };

  if (replaceUrl) {
    await router.replace(nextLocation);
  } else {
    await router.push(nextLocation);
  }
}

function getQueryHandle(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
}

function getApiErrorMessage(caught: unknown): string {
  if (typeof caught !== 'object' || caught === null) {
    return 'The GitHub signal got scrambled. Try another handle.';
  }

  const maybeError = caught as {
    data?: { message?: string; statusMessage?: string };
    message?: string;
    statusMessage?: string;
  };

  return (
    maybeError.data?.statusMessage ??
    maybeError.data?.message ??
    maybeError.statusMessage ??
    maybeError.message ??
    'The GitHub signal got scrambled. Try another handle.'
  );
}
</script>

<template>
  <main class="app-shell" :style="{ '--hero-accent': heroAccent, '--hero-secondary': heroSecondary }">
    <header class="topbar" aria-label="Gitamon navigation">
      <a class="brand-lockup" href="/" aria-label="Gitamon home">
        <span class="brand-mark">
          <Sparkles :size="18" stroke-width="2.6" />
        </span>
        <span>Gitamon</span>
      </a>

      <div class="topbar-actions">
        <button
          class="icon-button"
          type="button"
          :aria-expanded="showRecipe"
          aria-controls="scoring-popover"
          aria-label="Show scoring recipe"
          @click="showRecipe = !showRecipe"
        >
          <Info :size="18" />
        </button>
        <div v-if="showRecipe" id="scoring-popover" class="info-popover" role="dialog" aria-label="Scoring recipe">
          <span class="section-kicker">Data Recipe</span>
          <h2>Signals become card stats.</h2>
          <p>
            Aura uses followers and stars, Forge uses repo volume and language spread, Spark uses recent public events,
            Reach uses forks and top-repo pull, Lore uses account age, and Focus rewards current public activity.
          </p>
        </div>
        <a class="pill-link github-data-link" :href="repositoryUrl" target="_blank" rel="noreferrer">
          <Github :size="17" />
          <span>GitHub data</span>
          <strong class="repo-star-count">
            <Star :size="13" />
            {{ repositoryStars }}
          </strong>
        </a>
      </div>
    </header>

    <section class="hero-grid" aria-labelledby="page-title">
      <div class="hero-copy">
        <div class="eyebrow">
          <span>GITHUB</span>
          <Zap :size="14" />
          <span>GITAMON LAB</span>
        </div>
        <h1 id="page-title">GET EVOLVED.</h1>
        <p>
          Turn any public GitHub profile into an original foil-grade developer creature card, with live stats,
          elemental types, moves, rarity, and a shareable report.
        </p>

        <form class="scout-form" @submit.prevent="loadProfile()">
          <label class="sr-only" for="github-username">GitHub username</label>
          <input
            id="github-username"
            v-model="username"
            name="github-username"
            placeholder="github username"
            autocomplete="off"
            inputmode="text"
          />
          <button class="primary-button" type="submit" :disabled="loading">
            <RefreshCw v-if="loading" class="spin" :size="18" />
            <Search v-else :size="18" />
            <span>{{ loading ? 'SUMMONING' : 'SUMMON' }}</span>
          </button>
        </form>

        <p v-if="error" class="error-message">{{ error }}</p>

        <div class="sample-row" aria-label="Sample GitHub profiles">
          <span>try</span>
          <button
            v-for="sample in sampleHandles"
            :key="sample"
            type="button"
            class="sample-link"
            @click="loadProfile(sample)"
          >
            {{ sample }}
          </button>
        </div>

        <dl class="hero-facts">
          <div>
            <dt>Source</dt>
            <dd>Public REST API</dd>
          </div>
          <div>
            <dt>Export</dt>
            <dd>PNG card</dd>
          </div>
          <div>
            <dt>Identity</dt>
            <dd>Original IP</dd>
          </div>
        </dl>
      </div>

      <div class="hero-stage" aria-label="Gitamon card preview">
        <div class="stack-card stack-card-one" aria-hidden="true"></div>
        <div class="stack-card stack-card-two" aria-hidden="true"></div>
        <section
          v-if="card"
          ref="cardRef"
          class="gitamon-card"
          :style="cardTheme"
          :aria-label="`${card.displayName} Gitamon card`"
        >
          <div class="foil-layer" aria-hidden="true"></div>
          <div class="card-header">
            <span>{{ card.stage }} · {{ card.overall }}</span>
            <strong>{{ card.hp }} HP</strong>
          </div>

          <div class="card-title-row">
            <h2>{{ card.cardName }}</h2>
            <div class="type-orb" :style="{ background: card.type.color, color: card.type.ink }">
              {{ card.type.name.slice(0, 2).toUpperCase() }}
            </div>
          </div>

          <div class="portrait-frame">
            <div class="portrait-art">
              <img
                :src="card.avatarUrl"
                :alt="`${card.displayName} GitHub avatar`"
                crossorigin="anonymous"
                decoding="async"
                loading="eager"
                referrerpolicy="no-referrer"
              />
            </div>
            <div class="portrait-meta">
              <span>{{ card.primaryLanguage }}</span>
              <span>{{ card.dexNumber }}</span>
            </div>
          </div>

          <div class="type-strip">
            <span :style="{ '--chip': card.type.color }">{{ card.type.name }}</span>
            <span :style="{ '--chip': card.secondaryType.color }">{{ card.secondaryType.name }}</span>
            <strong>{{ card.rarity }}</strong>
          </div>

          <section class="ability-box" aria-label="Card ability">
            <span>Ability</span>
            <strong>{{ card.ability }}</strong>
            <p>{{ card.abilityText }}</p>
          </section>

          <section class="move-list" aria-label="Card moves">
            <article v-for="move in card.moves" :key="move.name" class="move-row">
              <div>
                <strong>{{ move.name }}</strong>
                <p>{{ move.detail }}</p>
              </div>
              <span>{{ move.damage }}</span>
            </article>
          </section>

        </section>
      </div>
    </section>

    <section v-if="card" class="report-grid" aria-labelledby="report-title">
      <aside class="report-column">
        <section class="profile-report panel">
          <span class="section-kicker">Scout Report</span>
          <h2 id="report-title">{{ card.displayName }}</h2>
          <div class="profile-tags">
            <span>{{ card.rarity }}</span>
            <span>{{ card.title }}</span>
            <a :href="card.githubUrl" target="_blank" rel="noreferrer">
              @{{ card.login }}
              <ExternalLink :size="13" />
            </a>
          </div>
          <p>{{ card.bio }}</p>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <Shield :size="17" />
            <h3>Traits</h3>
          </div>
          <div class="trait-list">
            <div>
              <span>Stage</span>
              <strong>{{ card.stage }}</strong>
            </div>
            <div>
              <span>Joined</span>
              <strong>{{ card.joinedYear }}</strong>
            </div>
            <div>
              <span>Top type</span>
              <strong>{{ card.type.name }}</strong>
            </div>
            <div>
              <span>Deck no.</span>
              <strong>{{ card.dexNumber }}</strong>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <Sparkles :size="17" />
            <h3>Playstyles</h3>
          </div>
          <ul class="playstyle-list">
            <li v-for="style in card.playstyles" :key="style">
              <Star :size="14" />
              <span>{{ style }}</span>
            </li>
          </ul>
        </section>
      </aside>

      <section class="action-column">
        <div class="score-banner">
          <span>Overall</span>
          <strong>{{ card.overall }}</strong>
          <small>{{ card.rarity }}</small>
        </div>

        <div class="share-grid" aria-label="Card actions">
          <button type="button" class="primary-button wide" @click="shareCard">
            <Share2 :size="18" />
            <span>Share</span>
          </button>
          <button type="button" class="tool-button" @click="copyLink()">
            <Link2 :size="18" />
            <span>Link</span>
          </button>
          <button type="button" class="tool-button" @click="downloadCard">
            <Download :size="18" />
            <span>PNG</span>
          </button>
          <button type="button" class="tool-button" @click="copyCardImage">
            <Copy :size="18" />
            <span>Image</span>
          </button>
        </div>

        <section class="metrics-panel panel">
          <div class="panel-heading">
            <Trophy :size="17" />
            <h3>Power Matrix</h3>
          </div>
          <div class="metric-list">
            <div v-for="metric in card.metrics" :key="metric.id" class="metric-row">
              <div>
                <span>{{ metric.label }}</span>
                <small>{{ metric.value }}</small>
              </div>
              <div class="meter" aria-hidden="true">
                <i :style="{ width: `${metric.score}%` }"></i>
              </div>
              <strong>{{ metric.score }}</strong>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <Zap :size="17" />
            <h3>Language Spectrum</h3>
          </div>
          <div class="language-bars">
            <div v-for="slice in card.languageMix" :key="slice.language">
              <div>
                <span>{{ slice.language }}</span>
                <strong>{{ slice.percent }}%</strong>
              </div>
              <i :style="{ width: `${slice.percent}%`, background: slice.color }"></i>
            </div>
          </div>
        </section>
      </section>
    </section>

    <section v-if="featuredRepos.length" class="repo-section" aria-labelledby="repo-title">
      <div class="section-heading">
        <span class="section-kicker">Deck Highlights</span>
        <h2 id="repo-title">Signature repositories</h2>
      </div>
      <div class="repo-grid">
        <a v-for="repo in featuredRepos" :key="repo.id" class="repo-card" :href="repo.html_url" target="_blank" rel="noreferrer">
          <span>{{ repo.language || 'Code' }}</span>
          <h3>{{ repo.name }}</h3>
          <p>{{ repo.description || 'No description, just raw public signal.' }}</p>
          <div>
            <strong>{{ formatCompact(repo.stargazers_count) }} stars</strong>
            <strong>{{ formatCompact(repo.forks_count) }} forks</strong>
          </div>
        </a>
      </div>
    </section>

    <p v-if="toast" class="toast" role="status">{{ toast }}</p>
  </main>
</template>
