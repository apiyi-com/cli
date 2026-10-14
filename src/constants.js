export const NODES = {
  api: 'https://api.apiyi.com',
  vip: 'https://vip.apiyi.com',
  b: 'https://b.apiyi.com',
  cf: 'https://api-cf.apiyi.com',
};
export const REGISTRY_URL = 'https://docs.apiyi.com/model-registry.json';
export const PRICING_URL = 'https://api.apiyi.com/api/pricing';
export const CONSOLE_TOKEN_URL = 'https://api.apiyi.com/token';
export const CONSOLE_PROFILE_URL = 'https://api.apiyi.com/account/profile';
export const DOCS_URL = 'https://docs.apiyi.com/developer-kit';
export const DEFAULT_MODEL = 'gpt-5.4-mini';
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
export const QUOTA_PER_USD = 500000;
export const USER_AGENT = 'apiyi-cli/0.2.2';
export const ACCESS_TOKEN_DOCS_URL = 'https://docs.apiyi.com/faq/personal-access-token';
export const LEGACY_TOKEN_RETIRE_DATE = '2026-11-11 (UTC+8)';

// How to invoke this CLI again in a hint. Under npx / npm exec there is no `apiyi` on PATH,
// so hints must spell out `npx apiyi@latest`, or users hit "command not found: apiyi".
export function selfCmd(env = process.env) {
  return env.npm_command === 'exec' ? 'npx apiyi@latest' : 'apiyi';
}

// Exit codes. Scripts and agents branch on these instead of parsing text.
export const EXIT = {
  ok: 0,
  unexpected: 1,
  no_key: 2,
  invalid_key: 3,
  network_error: 4,
  model_not_found: 5,
  rate_limited_or_no_balance: 6,
  bad_request: 7,
  bad_args: 8,
};
