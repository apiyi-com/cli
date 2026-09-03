import { resolveApiKey } from '../config.js';
import { baseUrlFor, request, bearer, throwForStatus } from '../http.js';
import { REGISTRY_URL, PRICING_URL, EXIT } from '../constants.js';
import { printResult, table } from '../output.js';

export async function models(opts) {
  const { key } = resolveApiKey(opts.apiKey);
  let rows = [];
  let source;
  if (key) {
    const res = await request(`${baseUrlFor(opts)}/v1/models`, { headers: bearer(key), timeoutMs: opts.timeout });
    if (res.status !== 200) throwForStatus(res);
    rows = (res.json?.data || []).map((m) => ({ id: m.id, owned_by: m.owned_by || '' }));
    source = '/v1/models';
  } else {
    // No key: the public registry lists everything with vendor/category/endpoints; fall back to raw pricing.
    let res = await request(REGISTRY_URL, { timeoutMs: opts.timeout }).catch(() => null);
    if (res?.status === 200 && Array.isArray(res.json?.models)) {
      rows = res.json.models.map((m) => ({
        id: m.id,
        vendor: m.vendor_en || '',
        category: m.category || '',
        endpoints: (m.endpoints || []).join(','),
      }));
      source = REGISTRY_URL;
    } else {
      res = await request(PRICING_URL, { timeoutMs: opts.timeout });
      if (res.status !== 200) throwForStatus(res);
      rows = (res.json?.data || []).map((m) => ({
        id: m.model_name,
        vendor: m.vendor_name || '',
        endpoints: (m.supported_endpoint_types || []).join(','),
      }));
      source = PRICING_URL;
    }
  }
  if (opts.grep) {
    const g = opts.grep.toLowerCase();
    rows = rows.filter((r) => r.id.toLowerCase().includes(g));
  }
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const result = { status: 'ok', source, count: rows.length, models: rows };
  printResult(result, opts, (r) => {
    const cols = Object.keys(r.models[0] || { id: '' }).map((k) => ({ key: k, label: k }));
    return `${table(r.models, cols)}\n\n${r.count} models (source: ${r.source})`;
  });
  return EXIT.ok;
}
