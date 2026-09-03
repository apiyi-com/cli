# apiyi

Command line for [APIYI](https://api.apiyi.com), the OpenAI / Anthropic / Google
compatible gateway to 400+ models. Zero dependencies, Node 18.17+.

```bash
npx apiyi@latest check
```

Nothing to install. `check` reports where your key came from, whether the node
is reachable, whether `/v1/models` returns 200, and the latency. Its exit code
is the status, so scripts and agents can branch on it.

## Commands

| Command | Needs | What it does |
|---|---|---|
| `apiyi check` | key optional | Self-check. Shows balance too if a system token is configured |
| `apiyi models [--grep text]` | key optional | Lists models. With a key: what that key can reach. Without: the public registry |
| `apiyi chat "prompt" [-m model] [--stream] [--system "..."]` | key | One Chat Completions call. Default model `gpt-5.4-mini` |
| `apiyi responses "input" [-m model] [--effort low]` | key | One Responses call, prints `output_text` |
| `apiyi image "prompt" [-m gpt-image-2] [-o out.png] [--size WxH] [--n 1]` | key | Generates an image to a local file (360 s timeout, billed per call) |
| `apiyi balance` | system token | Balance in USD (500000 quota units = 1 USD) |
| `apiyi auth set-key [--system-token]` / `show` / `clear` | none | Saves to `~/.config/apiyi/config.json` with mode 0600 |

Global flags: `--api-key`, `--system-token`, `--node api|vip|b|cf`, `--base-url`, `--timeout <ms>`, `--json`, `--quiet`.

## Keys

Lookup order: `--api-key`, then `APIYI_API_KEY`, then `~/.config/apiyi/config.json`,
then `~/.openclaw/openclaw.json` (`skills.entries.apiyi.apiKey`). If you already
installed the OpenClaw skill, the CLI reuses that key.

Get a key at https://api.apiyi.com/token. Keys start with `sk-`.

A normal key cannot read the balance. `apiyi balance` needs the **system token**
from the bottom of https://api.apiyi.com/account/profile, stored with
`apiyi auth set-key --system-token` or `APIYI_SYSTEM_TOKEN`.

## Exit codes

| Code | Status |
|---|---|
| 0 | ok / ready |
| 2 | `no_key` |
| 3 | `invalid_key` (401 / 403) |
| 4 | `network_error` (DNS, timeout, 5xx) |
| 5 | `model_not_found` (404, usually a misspelled ID; IDs are dot-versioned and case-sensitive) |
| 6 | `rate_limited_or_no_balance` (429) |
| 7 | `bad_request` (400, upstream `error.message` printed verbatim) |
| 8 | bad arguments |
| 1 | unexpected |

`--json` prints the same fields as a JSON object on stdout.

## Nodes

`--node api` (default, mainland China), `vip` (outside mainland China, lowest
latency), `b` (backup), `cf` (Cloudflare CDN, text only, about 100 s cap).

## For agents

Paste to your coding or chat agent:

```
请帮我安装并跑通 API易 命令行工具：https://github.com/apiyi-com/cli
要求：Node 18 以上；直接 `npx apiyi@latest check` 零安装；引导我配置 API Key；
最后跑 `npx apiyi@latest chat "你好" -m gpt-5.4-mini`，把输出贴给我。
```

More: https://docs.apiyi.com/developer-kit (skill, model registry, integration contract).

## Development

```bash
npm test                 # node --test
node bin/apiyi.js check
```

Releases: bump `version`, tag `vX.Y.Z`, push the tag; the publish workflow
runs `npm publish --provenance --access public`.

## License

MIT
