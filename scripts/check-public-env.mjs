/**
 * The PUBLIC_* variables are declared optional in astro.config.mjs, so a missing secret
 * builds a site whose Good / Bad buttons are silently dead. Say so where it is visible.
 * Set REQUIRE_PUBLIC_ENV=1 to make that a build failure instead.
 */
const REQUIRED_FOR_FEEDBACK = ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY'];

const missing = REQUIRED_FOR_FEEDBACK.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  const message = `${missing.join(', ')} is not set - the Good / Bad buttons will do nothing on the built site`;
  if (process.env.REQUIRE_PUBLIC_ENV === '1') {
    console.error(`[check-public-env] ${message}`);
    process.exit(1);
  }
  // GitHub renders this on the run summary, so it is not just another log line.
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Feedback disabled::${message}`);
  console.warn(`[check-public-env] ${message}`);
}
