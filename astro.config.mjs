// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rhcpgtbd0611-moto.github.io/daily-three',
  base: '/daily-three/',
  integrations: [sitemap()],
  // 開発時の「504 Outdated Optimize Dep」ノイズを防ぐ（本番には影響なし）
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
