export default defineNuxtConfig({
  compatibilityDate: '2026-07-02',
  css: ['~/assets/styles.css'],
  runtimeConfig: {
    githubToken: process.env.NUXT_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        {
          name: 'description',
          content: 'Gitamon turns public GitHub profiles into original collectible developer creature cards.',
        },
      ],
    },
  },
});
