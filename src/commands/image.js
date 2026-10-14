import fs from 'node:fs';
import path from 'node:path';
import { resolveApiKey, keyShapeProblem } from '../config.js';
import { baseUrlFor, request, bearer, throwForStatus } from '../http.js';
import { CliError } from '../errors.js';
import { CONSOLE_TOKEN_URL, DEFAULT_IMAGE_MODEL, EXIT, selfCmd } from '../constants.js';
import { printResult } from '../output.js';

export async function image(prompt, opts) {
  if (!prompt) throw new CliError('bad_args', 'Usage: apiyi image "prompt" [-m gpt-image-2] [-o out.png] [--size 1024x1024] [--n 1]');
  const { key } = resolveApiKey(opts.apiKey);
  if (!key) {
    throw new CliError('no_key', `No API key found. Copy one at ${CONSOLE_TOKEN_URL}, then run "${selfCmd()} auth set-key" or export APIYI_API_KEY.`);
  }
  if (keyShapeProblem(key)) throw new CliError('invalid_key', `The API key ${keyShapeProblem(key)}. Copy a real one at ${CONSOLE_TOKEN_URL}.`);
  const base = baseUrlFor(opts);
  const model = opts.model || DEFAULT_IMAGE_MODEL;
  const n = Number(opts.n || 1);
  const body = { model, prompt, n, response_format: 'b64_json' };
  if (opts.size) body.size = opts.size;
  if (!opts.quiet && !opts.json) {
    process.stderr.write(`Generating with ${model} (image calls are billed per call and can take minutes)...\n`);
  }
  const timeoutMs = Math.max(opts.timeout, 360000);
  const res = await request(`${base}/v1/images/generations`, { method: 'POST', headers: bearer(key), body, timeoutMs });
  if (res.status !== 200) throwForStatus(res, { model });
  const items = res.json?.data || [];
  const out = opts.output || 'apiyi-image.png';
  const files = [];
  items.forEach((item, i) => {
    const file = items.length === 1 ? out : out.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${i + 1}${ext || '.png'}`);
    if (item.b64_json) {
      fs.writeFileSync(path.resolve(file), Buffer.from(item.b64_json, 'base64'));
      files.push(file);
    } else if (item.url) {
      files.push(item.url);
    }
  });
  const result = { status: 'ok', model, latency_ms: res.ms, files, usage: res.json?.usage || null };
  printResult(result, opts, (r) => `saved: ${r.files.join(', ')}\n[${r.model}] ${r.latency_ms} ms`);
  return EXIT.ok;
}
