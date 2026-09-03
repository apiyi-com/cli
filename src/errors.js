import { EXIT } from './constants.js';

export class CliError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status; // one of the EXIT keys
    this.code = EXIT[status] ?? EXIT.unexpected;
    Object.assign(this, extra);
  }
}

export function statusFromHttp(httpStatus) {
  if (httpStatus === 401 || httpStatus === 403) return 'invalid_key';
  if (httpStatus === 404) return 'model_not_found';
  if (httpStatus === 429) return 'rate_limited_or_no_balance';
  if (httpStatus === 400) return 'bad_request';
  if (httpStatus >= 500) return 'network_error';
  return 'unexpected';
}

export function extractMessage(raw) {
  try {
    const j = JSON.parse(raw);
    return j?.error?.message || j?.message || String(raw).slice(0, 300);
  } catch {
    return String(raw).slice(0, 300);
  }
}
