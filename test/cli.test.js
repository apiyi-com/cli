import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusFromHttp, extractMessage, CliError } from '../src/errors.js';
import { resolveApiKey, resolveAccessToken, resolveSystemToken, maskKey, keyShapeProblem } from '../src/config.js';
import { accessTokenHint, throwForAccessToken } from '../src/access-token.js';
import { baseUrlFor, request } from '../src/http.js';
import { table } from '../src/output.js';
import { EXIT } from '../src/constants.js';
import { main } from '../src/cli.js';

test('http status maps to exit status', () => {
  assert.equal(statusFromHttp(401), 'invalid_key');
  assert.equal(statusFromHttp(403), 'invalid_key');
  assert.equal(statusFromHttp(404), 'model_not_found');
  assert.equal(statusFromHttp(429), 'rate_limited_or_no_balance');
  assert.equal(statusFromHttp(400), 'bad_request');
  assert.equal(statusFromHttp(502), 'network_error');
  assert.equal(statusFromHttp(418), 'unexpected');
  assert.equal(new CliError('no_key', 'x').code, EXIT.no_key);
});

test('extractMessage prefers error.message and survives non-JSON', () => {
  assert.equal(extractMessage('{"error":{"message":"bad model"}}'), 'bad model');
  assert.equal(extractMessage('<html>gateway</html>'), '<html>gateway</html>');
});

test('key lookup order: flag beats env beats config', () => {
  assert.deepEqual(resolveApiKey(' sk-flag ', { APIYI_API_KEY: 'sk-env' }), { key: 'sk-flag', source: '--api-key' });
  assert.deepEqual(resolveApiKey(undefined, { APIYI_API_KEY: 'sk-env' }), { key: 'sk-env', source: 'APIYI_API_KEY' });
  assert.equal(resolveSystemToken(true, { APIYI_SYSTEM_TOKEN: 'tok' }).token, 'tok');
});

test('access token: new env beats legacy env, legacy detected by missing nap_ prefix', () => {
  const both = resolveAccessToken(undefined, { APIYI_ACCESS_TOKEN: 'nap_new', APIYI_SYSTEM_TOKEN: 'old' });
  assert.deepEqual(both, { token: 'nap_new', source: 'APIYI_ACCESS_TOKEN', legacy: false });
  assert.equal(resolveAccessToken(undefined, { APIYI_SYSTEM_TOKEN: 'old' }).legacy, true);
  assert.equal(resolveAccessToken(' nap_flag ', { APIYI_ACCESS_TOKEN: 'nap_env' }).token, 'nap_flag');
});

test('access token errors map to actionable hints', () => {
  const r = (status, obj) => ({ status, body: JSON.stringify(obj), json: obj });
  assert.match(accessTokenHint(r(401, { code: 'ACCESS_TOKEN_LEGACY_RETIRED', message: 'x' })), /retired/);
  assert.match(accessTokenHint(r(403, { code: 'ACCESS_TOKEN_SCOPE_DENIED', message: 'x' })), /Profile: Read/);
  assert.match(accessTokenHint(r(401, { message: 'This access token may not be used from the current IP address.' })), /IP/);
  assert.equal(accessTokenHint(r(401, { message: 'Unauthorized' })), null);
  assert.throws(() => throwForAccessToken(r(200, { success: false, message: 'The access token is invalid.' })), (e) => e.status === 'invalid_key');
});

test('maskKey never reveals the middle', () => {
  assert.equal(maskKey('sk-abcdefghijklmnopqrstuvwxyz'), 'sk-abc...wxyz');
  assert.equal(maskKey('short'), 'sho...');
});

test('baseUrlFor picks node or custom base url', () => {
  assert.equal(baseUrlFor({}), 'https://api.apiyi.com');
  assert.equal(baseUrlFor({ node: 'vip' }), 'https://vip.apiyi.com');
  assert.equal(baseUrlFor({ baseUrl: 'https://b.apiyi.com/' }), 'https://b.apiyi.com');
  assert.throws(() => baseUrlFor({ node: 'nope' }), /Unknown node/);
});

test('request wraps transport failure as network_error', async () => {
  const fetchImpl = async () => {
    throw new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') });
  };
  await assert.rejects(request('https://api.apiyi.com/v1/models', { fetchImpl }), (e) => e.status === 'network_error');
});

test('request returns parsed json and latency', async () => {
  const fetchImpl = async () => new Response('{"data":[{"id":"gpt-5.4-mini"}]}', { status: 200 });
  const res = await request('https://api.apiyi.com/v1/models', { fetchImpl });
  assert.equal(res.status, 200);
  assert.equal(res.json.data[0].id, 'gpt-5.4-mini');
  assert.ok(res.ms >= 0);
});

test('table pads columns', () => {
  const out = table([{ id: 'a', v: 'xx' }, { id: 'bbb', v: 'y' }], [{ key: 'id', label: 'id' }, { key: 'v', label: 'v' }]);
  assert.equal(out.split('\n')[2], 'a    xx');
});

test('unknown command and missing command exit with bad_args', async () => {
  const origErr = process.stderr.write;
  process.stderr.write = () => true;
  const origOut = process.stdout.write;
  process.stdout.write = () => true;
  try {
    assert.equal(await main(['frobnicate']), EXIT.bad_args);
    assert.equal(await main([]), EXIT.bad_args);
    assert.equal(await main(['--help']), EXIT.bad_args);
    assert.equal(await main(['check', '--help']), EXIT.ok);
  } finally {
    process.stderr.write = origErr;
    process.stdout.write = origOut;
  }
});

test('keyShapeProblem flags placeholders and accepts real-looking keys', () => {
  assert.equal(keyShapeProblem('sk-abc123XYZ'), null);
  assert.match(keyShapeProblem('<YOUR_KEY>'), /sk-/);
  assert.match(keyShapeProblem('sk-abc 123'), /non-ASCII|whitespace/);
  assert.match(keyShapeProblem('sk-分组KEY'), /non-ASCII/);
});
