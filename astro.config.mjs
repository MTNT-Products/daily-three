// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://MTNT-Products.github.io/daily-three',
  base: '/daily-three/',
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
    },
  },
  integrations: [sitemap()],
  // ?????504 Outdated Optimize Dep??????????????????
  devToolbar: { enabled: false },
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_BMC_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
});
