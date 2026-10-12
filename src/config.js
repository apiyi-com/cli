import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'apiyi');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const OPENCLAW_FILE = path.join(os.homedir(), '.openclaw', 'openclaw.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function readConfig() {
  return readJson(CONFIG_FILE) || {};
}

export function writeConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    /* windows */
  }
}

// Key lookup order: --api-key, APIYI_API_KEY, ~/.config/apiyi/config.json, ~/.openclaw/openclaw.json
export function resolveApiKey(explicit, env = process.env) {
  if (explicit) return { key: explicit.trim(), source: '--api-key' };
  if (env.APIYI_API_KEY?.trim()) return { key: env.APIYI_API_KEY.trim(), source: 'APIYI_API_KEY' };
  const cfg = readConfig();
  if (cfg.apiKey) return { key: String(cfg.apiKey).trim(), source: '~/.config/apiyi/config.json' };
  const oc = readJson(OPENCLAW_FILE);
  const k = oc?.skills?.entries?.apiyi?.apiKey;
  if (k) return { key: String(k).trim(), source: '~/.openclaw/openclaw.json' };
  return { key: null, source: null };
}

// Management token for /api/* (balance). Personal access tokens start with "nap_"; anything else is a
// legacy system token, retired on LEGACY_TOKEN_RETIRE_DATE. The old flag, env var and config field still
// work as aliases so existing setups keep running.
// Lookup order: --access-token / --system-token, APIYI_ACCESS_TOKEN, APIYI_SYSTEM_TOKEN, config.
export function resolveAccessToken(explicit, env = process.env) {
  const found = (token, source) => ({ token, source, legacy: !token.startsWith('nap_') });
  if (explicit && explicit !== true) return found(String(explicit).trim(), '--access-token');
  if (env.APIYI_ACCESS_TOKEN?.trim()) return found(env.APIYI_ACCESS_TOKEN.trim(), 'APIYI_ACCESS_TOKEN');
  if (env.APIYI_SYSTEM_TOKEN?.trim()) return found(env.APIYI_SYSTEM_TOKEN.trim(), 'APIYI_SYSTEM_TOKEN');
  const cfg = readConfig();
  const saved = cfg.accessToken || cfg.systemToken;
  if (saved) return found(String(saved).trim(), '~/.config/apiyi/config.json');
  return { token: null, source: null, legacy: false };
}

export const resolveSystemToken = resolveAccessToken;

// A key must be printable ASCII with no spaces. Anything else is a placeholder or a paste error,
// and would otherwise surface as an opaque ByteString error from fetch.
export function keyShapeProblem(key) {
  if (!key) return null;
  if (/[^\x21-\x7e]/.test(key)) return 'contains non-ASCII or whitespace characters (is it a placeholder like <YOUR_KEY>?)';
  if (!key.startsWith('sk-')) return 'does not start with "sk-"';
  return null;
}

export function maskKey(key) {
  if (!key) return '';
  if (key.length <= 12) return key.slice(0, 3) + '...';
  return key.slice(0, 6) + '...' + key.slice(-4);
}
