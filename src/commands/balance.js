import { resolveSystemToken } from '../config.js';
import { baseUrlFor, request, throwForStatus } from '../http.js';
import { CliError } from '../errors.js';
import { CONSOLE_PROFILE_URL, QUOTA_PER_USD, EXIT } from '../constants.js';
import { printResult } from '../output.js';

export async function balance(opts) {
  const { token, source } = resolveSystemToken(opts.systemToken);
  if (!token) {
    throw new CliError(
      'no_key',
      `Balance needs a system token, not an sk- key. Get it at the bottom of ${CONSOLE_PROFILE_URL} (re-enter your password), ` +
        'then run "apiyi auth set-key --system-token" or export APIYI_SYSTEM_TOKEN.',
    );
  }
  // The system token is passed bare, without a Bearer prefix.
  const res = await request(`${baseUrlFor(opts)}/api/user/self`, { headers: { Authorization: token }, timeoutMs: opts.timeout });
  if (res.status !== 200 || !res.json?.data) throwForStatus(res);
  const d = res.json.data;
  const result = {
    status: 'ok',
    token_source: source,
    username: d.username,
    balance_usd: Number((d.quota / QUOTA_PER_USD).toFixed(4)),
    used_usd: Number((d.used_quota / QUOTA_PER_USD).toFixed(4)),
    group: d.group,
  };
  printResult(result, opts, (r) => `user:     ${r.username}\nbalance:  $${r.balance_usd}\nused:     $${r.used_usd}\ngroup:    ${r.group}`);
  return EXIT.ok;
}
