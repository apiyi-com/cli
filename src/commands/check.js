import { resolveApiKey, resolveAccessToken, maskKey, keyShapeProblem } from '../config.js';
import { baseUrlFor, request, bearer } from '../http.js';
import { statusFromHttp, extractMessage } from '../errors.js';
import { CONSOLE_TOKEN_URL, CONSOLE_PROFILE_URL, QUOTA_PER_USD, EXIT, LEGACY_TOKEN_RETIRE_DATE } from '../constants.js';
import { accessTokenHint } from '../access-token.js';
import { printResult } from '../output.js';

export async function check(opts) {
  const base = baseUrlFor(opts);
  const { key, source } = resolveApiKey(opts.apiKey);
  const result = {
    status: null,
    node: new URL(base).host,
    key_source: source,
    key: maskKey(key),
    model_count: null,
    latency_ms: null,
  };

  if (!key) {
    result.status = 'no_key';
    result.hint = `No API key found. Copy one at ${CONSOLE_TOKEN_URL}, then run "apiyi auth set-key" or export APIYI_API_KEY.`;
  } else if (keyShapeProblem(key)) {
    result.status = 'invalid_key';
    result.hint = `The key from ${source} ${keyShapeProblem(key)}. Copy a real one at ${CONSOLE_TOKEN_URL}.`;
  } else {
    try {
      const res = await request(`${base}/v1/models`, { headers: bearer(key), timeoutMs: opts.timeout });
      result.latency_ms = res.ms;
      if (res.status === 200) {
        result.status = 'ready';
        result.model_count = Array.isArray(res.json?.data) ? res.json.data.length : null;
      } else {
        const s = statusFromHttp(res.status);
        result.status = s === 'invalid_key' || s === 'network_error' ? s : 'unexpected';
        result.http_status = res.status;
        result.hint = extractMessage(res.body);
      }
    } catch (e) {
      result.status = e.status || 'network_error';
      result.hint = e.message;
    }
  }

  // Balance needs a personal access token; a normal key cannot read it. Optional, never affects status.
  const { token, legacy } = resolveAccessToken(opts.accessToken);
  if (token) {
    if (legacy) result.access_token_note = `legacy system token, retires on ${LEGACY_TOKEN_RETIRE_DATE}; switch to a personal access token`;
    try {
      const res = await request(`${base}/api/user/self`, { headers: { Authorization: token }, timeoutMs: opts.timeout });
      if (res.status === 200 && res.json?.data) {
        result.balance_usd = Number((res.json.data.quota / QUOTA_PER_USD).toFixed(4));
      } else {
        result.balance_error = accessTokenHint(res) || `HTTP ${res.status}`;
      }
    } catch {
      /* balance is best-effort */
    }
  }

  printResult(result, opts, (r) => {
    const lines = [`status:   ${r.status}`, `node:     ${r.node}`];
    if (r.key_source) lines.push(`key:      ${r.key} (from ${r.key_source})`);
    if (r.latency_ms != null) lines.push(`latency:  ${r.latency_ms} ms`);
    if (r.model_count != null) lines.push(`models:   ${r.model_count} visible to this key`);
    if (r.balance_usd != null) lines.push(`balance:  $${r.balance_usd}`);
    else if (r.balance_error) lines.push(`balance:  (${r.balance_error})`);
    else if (r.status === 'ready') lines.push(`balance:  (needs a personal access token from ${CONSOLE_PROFILE_URL}; see "apiyi balance")`);
    if (r.access_token_note) lines.push(`token:    ${r.access_token_note}`);
    if (r.hint) lines.push(`hint:     ${r.hint}`);
    return lines.join('\n');
  });
  return result.status === 'ready' ? EXIT.ok : EXIT[result.status] ?? EXIT.unexpected;
}
