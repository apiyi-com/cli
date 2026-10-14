import readline from 'node:readline';
import { readConfig, writeConfig, maskKey, CONFIG_FILE, resolveApiKey, resolveAccessToken } from '../config.js';
import { CliError } from '../errors.js';
import { EXIT, selfCmd } from '../constants.js';
import { printResult } from '../output.js';

// Prompt on stderr with echo suppressed, so the key never lands in the terminal scrollback.
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr, terminal: true });
    const write = rl._writeToOutput;
    rl._writeToOutput = function (s) {
      if (s.startsWith(question)) write.call(this, question);
    };
    rl.question(question, (ans) => {
      rl.close();
      process.stderr.write('\n');
      resolve(ans.trim());
    });
  });
}

export async function auth(sub, opts, positional) {
  const cfg = readConfig();
  switch (sub) {
    case 'set-key': {
      const isToken = opts.accessToken === true;
      let value = positional[0];
      if (!value) {
        if (!process.stdin.isTTY) {
          throw new CliError('bad_args', `Pass the key as an argument when stdin is not a terminal: ${selfCmd()} auth set-key sk-...`);
        }
        value = await askHidden(isToken ? 'Personal access token (input hidden): ' : 'API key (input hidden): ');
      }
      if (!value) throw new CliError('bad_args', 'Empty value, nothing saved.');
      if (!isToken && !value.startsWith('sk-')) process.stderr.write('Warning: APIYI keys start with "sk-". Saving anyway.\n');
      if (isToken && !value.startsWith('nap_')) {
        process.stderr.write('Warning: personal access tokens start with "nap_". Legacy system tokens retire on 2026-11-11 (UTC+8). Saving anyway.\n');
      }
      if (isToken) {
        cfg.accessToken = value;
        delete cfg.systemToken;
      } else cfg.apiKey = value;
      writeConfig(cfg);
      printResult({ status: 'ok', saved: isToken ? 'accessToken' : 'apiKey', file: CONFIG_FILE }, opts, (r) => `Saved ${r.saved} to ${r.file} (mode 0600)`);
      return EXIT.ok;
    }
    case 'show': {
      const k = resolveApiKey(opts.apiKey);
      const t = resolveAccessToken(opts.accessToken);
      const result = {
        status: 'ok',
        api_key: maskKey(k.key) || null,
        api_key_source: k.source,
        access_token: t.token ? maskKey(t.token) : null,
        access_token_source: t.source,
        access_token_legacy: t.token ? t.legacy : null,
        file: CONFIG_FILE,
      };
      printResult(result, opts, (r) =>
        [
          `api key:       ${r.api_key || '(none)'}${r.api_key_source ? ` from ${r.api_key_source}` : ''}`,
          `access token:  ${r.access_token || '(none)'}${r.access_token_source ? ` from ${r.access_token_source}` : ''}${r.access_token_legacy ? ' (legacy system token, retires 2026-11-11 UTC+8)' : ''}`,
          `config file:   ${r.file}`,
        ].join('\n'),
      );
      return EXIT.ok;
    }
    case 'clear': {
      delete cfg.apiKey;
      delete cfg.accessToken;
      delete cfg.systemToken;
      writeConfig(cfg);
      printResult({ status: 'ok', file: CONFIG_FILE }, opts, (r) => `Cleared key and access token from ${r.file}`);
      return EXIT.ok;
    }
    default:
      throw new CliError('bad_args', 'Usage: apiyi auth <set-key [--access-token] | show | clear>');
  }
}
