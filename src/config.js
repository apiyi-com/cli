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

export function resolveSystemToken(explicit, env = process.env) {
  if (explicit && explicit !== true) return { token: String(explicit).trim(), source: '--system-token' };
  if (env.APIYI_SYSTEM_TOKEN?.trim()) return { token: env.APIYI_SYSTEM_TOKEN.trim(), source: 'APIYI_SYSTEM_TOKEN' };
  const cfg = readConfig();
  if (cfg.systemToken) return { token: String(cfg.systemToken).trim(), source: '~/.config/apiyi/config.json' };
  return { token: null, source: null };
}

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
