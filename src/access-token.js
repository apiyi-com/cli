import { CliError, extractMessage, statusFromHttp } from './errors.js';
import { ACCESS_TOKEN_DOCS_URL, CONSOLE_PROFILE_URL, LEGACY_TOKEN_RETIRE_DATE } from './constants.js';

export const NO_TOKEN_HINT =
  `Balance needs a personal access token (starts with "nap_"), not an sk- key. Create one at ${CONSOLE_PROFILE_URL} ` +
  '-> Account Options -> Personal Access Tokens with "Profile: Read", ' +
  'then run "apiyi auth set-key --access-token" or export APIYI_ACCESS_TOKEN.';

export const LEGACY_WARNING =
  `Warning: this looks like a legacy system token. System tokens retire on ${LEGACY_TOKEN_RETIRE_DATE}; ` +
  `switch to a personal access token (starts with "nap_"): ${ACCESS_TOKEN_DOCS_URL}`;

// Map the management API's token errors to an actionable hint. Returns null for anything else.
export function accessTokenHint(res) {
  const code = res.json?.code;
  const msg = extractMessage(res.body);
  if (code === 'ACCESS_TOKEN_LEGACY_RETIRED') {
    return `System tokens have been retired. Create a personal access token with "Profile: Read": ${ACCESS_TOKEN_DOCS_URL}`;
  }
  if (code === 'ACCESS_TOKEN_SCOPE_DENIED') {
    return 'This personal access token lacks "Profile: Read". Permissions cannot be edited; create a new token with it.';
  }
  if (/current IP address/i.test(msg)) {
    return 'This personal access token does not allow your current IP. The allowlist cannot be edited; create a new token.';
  }
  return null;
}

// The management API reports a bad or expired token as HTTP 200 with success:false.
export function throwForAccessToken(res) {
  const hint = accessTokenHint(res);
  const rejected = res.status === 200 && res.json?.success === false;
  const status = rejected ? 'invalid_key' : statusFromHttp(res.status);
  const msg = hint || extractMessage(res.body) + (rejected ? ` Check the token, or create a new one: ${ACCESS_TOKEN_DOCS_URL}` : '');
  throw new CliError(status, msg, { httpStatus: res.status });
}
