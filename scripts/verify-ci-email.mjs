/**
 * Fail fast in GitHub Actions when digest email secrets are missing (empty values).
 */
if (process.env.GITHUB_ACTIONS !== 'true') {
  process.exit(0);
}

const resend = process.env.RESEND_API_KEY?.trim();
if (!resend) {
  console.error(
    '::error::RESEND_API_KEY is empty in this workflow run. ' +
      'Set a non-empty value under Settings → Secrets and variables → Actions ' +
      '(repository secrets; name must be exactly RESEND_API_KEY).',
  );
  process.exit(1);
}

console.log('[ci] RESEND_API_KEY is set (length=%d)', resend.length);
