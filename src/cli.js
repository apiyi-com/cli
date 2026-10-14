import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { EXIT, DOCS_URL, selfCmd } from './constants.js';
import { CliError } from './errors.js';
import { check } from './commands/check.js';
import { models } from './commands/models.js';
import { chat, responses } from './commands/chat.js';
import { image } from './commands/image.js';
import { balance } from './commands/balance.js';
import { auth } from './commands/auth.js';

export const HELP = `apiyi - APIYI command line (api.apiyi.com)

Usage:
  apiyi check                                  key / node self-check (exit code = status)
  apiyi models [--grep text]                   list model IDs (public registry when no key)
  apiyi chat "prompt" [-m model] [--stream] [--system "..."]
  apiyi responses "input" [-m model] [--effort low|medium|high]
  apiyi image "prompt" [-m gpt-image-2] [-o out.png] [--size WxH] [--n 1]
  apiyi balance                                needs a personal access token (nap_...), not an sk- key
  apiyi auth set-key [--access-token] | show | clear

Global options:
  --api-key <key>        override key lookup (else APIYI_API_KEY, ~/.config/apiyi/config.json, ~/.openclaw/openclaw.json)
  --access-token <tok>   personal access token for balance (else APIYI_ACCESS_TOKEN, config);
                         --system-token / APIYI_SYSTEM_TOKEN still work as aliases
  --node api|vip|b|cf    api (default, mainland China), vip (overseas), b (backup), cf (Cloudflare, text only)
  --base-url <url>       custom base URL (overrides --node)
  --timeout <ms>         request timeout, default 120000
  --json                 machine-readable output
  --quiet                no human output
  -h, --help / -v, --version

Exit codes: 0 ok, 2 no_key, 3 invalid_key, 4 network_error, 5 model_not_found,
            6 rate_limited_or_no_balance, 7 bad_request, 8 bad_args, 1 unexpected
${selfCmd() === 'apiyi' ? '' : `\nRunning via npx: there is no "apiyi" command on your PATH. Prefix every command with
"npx apiyi@latest" (e.g. npx apiyi@latest auth set-key), or install once with: npm i -g apiyi\n`}
Docs: ${DOCS_URL}`;

const OPTIONS = {
  'api-key': { type: 'string' },
  'access-token': { type: 'string' },
  'system-token': { type: 'string' },
  node: { type: 'string' },
  'base-url': { type: 'string' },
  timeout: { type: 'string' },
  json: { type: 'boolean', default: false },
  quiet: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
  version: { type: 'boolean', short: 'v', default: false },
  model: { type: 'string', short: 'm' },
  stream: { type: 'boolean', default: false },
  system: { type: 'string' },
  effort: { type: 'string' },
  output: { type: 'string', short: 'o' },
  size: { type: 'string' },
  n: { type: 'string' },
  grep: { type: 'string' },
};

export async function main(argv) {
  // `auth set-key --access-token` uses the flag as a boolean; everywhere else it takes a value.
  // --system-token is the pre-0.2 name and still works.
  const TOKEN_FLAGS = ['--access-token', '--system-token'];
  const authTokenFlag = argv[0] === 'auth' && argv.some((a) => TOKEN_FLAGS.includes(a));
  const argvClean = authTokenFlag ? argv.filter((a) => !TOKEN_FLAGS.includes(a)) : argv;
  let parsed;
  try {
    parsed = parseArgs({ args: argvClean, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    process.stderr.write(`${e.message}\n\n${HELP}\n`);
    return EXIT.bad_args;
  }
  const { values, positionals } = parsed;
  if (values.version) {
    process.stdout.write(createRequire(import.meta.url)('../package.json').version + '\n');
    return EXIT.ok;
  }
  const [cmd, ...rest] = positionals;
  if (values.help || !cmd) {
    process.stdout.write(HELP + '\n');
    return cmd ? EXIT.ok : EXIT.bad_args;
  }

  const opts = {
    apiKey: values['api-key'],
    accessToken: authTokenFlag ? true : values['access-token'] ?? values['system-token'],
    node: values.node,
    baseUrl: values['base-url'],
    timeout: Number(values.timeout || 120000),
    json: values.json,
    quiet: values.quiet,
    model: values.model,
    stream: values.stream,
    system: values.system,
    effort: values.effort,
    output: values.output,
    size: values.size,
    n: values.n,
    grep: values.grep,
  };

  try {
    switch (cmd) {
      case 'check':
        return await check(opts);
      case 'models':
        return await models(opts);
      case 'chat':
        return await chat(rest.join(' '), opts);
      case 'responses':
        return await responses(rest.join(' '), opts);
      case 'image':
        return await image(rest.join(' '), opts);
      case 'balance':
        return await balance(opts);
      case 'auth':
        return await auth(rest[0], opts, rest.slice(1));
      default:
        process.stderr.write(`Unknown command "${cmd}".\n\n${HELP}\n`);
        return EXIT.bad_args;
    }
  } catch (e) {
    if (e instanceof CliError) {
      if (opts.json) {
        process.stdout.write(JSON.stringify({ status: e.status, http_status: e.httpStatus, model: e.model, message: e.message }, null, 2) + '\n');
      } else {
        process.stderr.write(`error (${e.status}${e.httpStatus ? `, HTTP ${e.httpStatus}` : ''}): ${e.message}\n`);
      }
      return e.code;
    }
    throw e;
  }
}
