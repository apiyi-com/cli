import readline from 'node:readline';
import { readConfig, writeConfig, maskKey, CONFIG_FILE, resolveApiKey, resolveSystemToken } from '../config.js';
import { CliError } from '../errors.js';
import { EXIT } from '../constants.js';
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
      const isSystem = opts.systemToken === true;
      let value = positional[0];
      if (!value) {
        if (!process.stdin.isTTY) {
          throw new CliError('bad_args', 'Pass the key as an argument when stdin is not a terminal: apiyi auth set-key sk-...');
        }
        value = await askHidden(isSystem ? 'System token (input hidden): ' : 'API key (input hidden): ');
      }
      if (!value) throw new CliError('bad_args', 'Empty value, nothing saved.');
      if (!isSystem && !value.startsWith('sk-')) process.stderr.write('Warning: APIYI keys start with "sk-". Saving anyway.\n');
      if (isSystem) cfg.systemToken = value;
      else cfg.apiKey = value;
      writeConfig(cfg);
      printResult({ status: 'ok', saved: isSystem ? 'systemToken' : 'apiKey', file: CONFIG_FILE }, opts, (r) => `Saved ${r.saved} to ${r.file} (mode 0600)`);
      return EXIT.ok;
    }
    case 'show': {
      const k = resolveApiKey(opts.apiKey);
      const t = resolveSystemToken(opts.systemToken);
      const result = {
        status: 'ok',
        api_key: maskKey(k.key) || null,
        api_key_source: k.source,
        system_token: t.token ? maskKey(t.token) : null,
        system_token_source: t.source,
        file: CONFIG_FILE,
      };
      printResult(result, opts, (r) =>
        [
          `api key:       ${r.api_key || '(none)'}${r.api_key_source ? ` from ${r.api_key_source}` : ''}`,
          `system token:  ${r.system_token || '(none)'}${r.system_token_source ? ` from ${r.system_token_source}` : ''}`,
          `config file:   ${r.file}`,
        ].join('\n'),
      );
      return EXIT.ok;
    }
    case 'clear': {
      delete cfg.apiKey;
      delete cfg.systemToken;
      writeConfig(cfg);
      printResult({ status: 'ok', file: CONFIG_FILE }, opts, (r) => `Cleared key and system token from ${r.file}`);
      return EXIT.ok;
    }
    default:
      throw new CliError('bad_args', 'Usage: apiyi auth <set-key [--system-token] | show | clear>');
  }
}
