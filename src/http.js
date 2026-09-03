import { NODES, USER_AGENT } from './constants.js';
import { CliError, statusFromHttp, extractMessage } from './errors.js';

export function baseUrlFor(opts) {
  if (opts.baseUrl) return opts.baseUrl.replace(/\/+$/, '');
  const node = opts.node || 'api';
  if (!NODES[node]) {
    throw new CliError('bad_args', `Unknown node "${node}". Use one of: ${Object.keys(NODES).join(', ')}`);
  }
  return NODES[node];
}

// Thin fetch wrapper. Returns { status, body, json, ms }. Throws CliError('network_error') on transport failure.
export async function request(url, { method = 'GET', headers = {}, body, timeoutMs = 60000, fetchImpl = globalThis.fetch } = {}) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetchImpl(url, {
      method,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const reason = e?.name === 'TimeoutError' ? `timed out after ${timeoutMs} ms` : e?.cause?.message || e?.message || String(e);
    throw new CliError('network_error', `Cannot reach ${new URL(url).host}: ${reason}`);
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, body: text, json, ms: Date.now() - t0 };
}

export function bearer(key) {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// Turn a non-2xx response into a CliError with the right exit status and the upstream message verbatim.
export function throwForStatus(res, context = {}) {
  const status = statusFromHttp(res.status);
  const msg = extractMessage(res.body);
  throw new CliError(status, msg, { httpStatus: res.status, ...context });
}
