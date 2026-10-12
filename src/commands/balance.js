import { resolveAccessToken } from '../config.js';
import { baseUrlFor, request } from '../http.js';
import { CliError } from '../errors.js';
import { QUOTA_PER_USD, EXIT } from '../constants.js';
import { NO_TOKEN_HINT, LEGACY_WARNING, throwForAccessToken } from '../access-token.js';
import { printResult } from '../output.js';

export async function balance(opts) {
  const { token, source, legacy } = resolveAccessToken(opts.accessToken);
  if (!token) throw new CliError('no_key', NO_TOKEN_HINT);
  if (legacy && !opts.quiet) process.stderr.write(LEGACY_WARNING + '\n');
  // Passed bare; the gateway accepts it with or without a Bearer prefix.
  const res = await request(`${baseUrlFor(opts)}/api/user/self`, { headers: { Authorization: token }, timeoutMs: opts.timeout });
  if (res.status !== 200 || !res.json?.data) throwForAccessToken(res);
  const d = res.json.data;
  const result = {
    status: 'ok',
    token_source: source,
    legacy_token: legacy,
    username: d.username,
    balance_usd: Number((d.quota / QUOTA_PER_USD).toFixed(4)),
    used_usd: Number((d.used_quota / QUOTA_PER_USD).toFixed(4)),
    group: d.group,
  };
  printResult(result, opts, (r) => `user:     ${r.username}\nbalance:  $${r.balance_usd}\nused:     $${r.used_usd}\ngroup:    ${r.group}`);
  return EXIT.ok;
}
