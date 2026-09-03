import { resolveApiKey, keyShapeProblem } from '../config.js';
import { baseUrlFor, request, bearer, throwForStatus } from '../http.js';
import { readSse } from '../sse.js';
import { CliError } from '../errors.js';
import { CONSOLE_TOKEN_URL, DEFAULT_MODEL, EXIT, USER_AGENT } from '../constants.js';
import { printResult } from '../output.js';

function requireKey(opts) {
  const { key } = resolveApiKey(opts.apiKey);
  if (!key) {
    throw new CliError('no_key', `No API key found. Copy one at ${CONSOLE_TOKEN_URL}, then run "apiyi auth set-key" or export APIYI_API_KEY.`);
  }
  const problem = keyShapeProblem(key);
  if (problem) throw new CliError('invalid_key', `The API key ${problem}. Copy a real one at ${CONSOLE_TOKEN_URL}.`);
  return key;
}

export async function chat(prompt, opts) {
  if (!prompt) throw new CliError('bad_args', 'Usage: apiyi chat "your prompt" [-m model] [--stream] [--system "..."]');
  const key = requireKey(opts);
  const base = baseUrlFor(opts);
  const model = opts.model || DEFAULT_MODEL;
  const messages = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });
  const body = { model, messages };

  if (opts.stream && !opts.json) {
    body.stream = true;
    body.stream_options = { include_usage: true };
    let res;
    try {
      res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { ...bearer(key), 'User-Agent': USER_AGENT },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(opts.timeout),
      });
    } catch (e) {
      throw new CliError('network_error', `Cannot reach ${new URL(base).host}: ${e?.cause?.message || e?.message}`);
    }
    if (res.status !== 200) throwForStatus({ status: res.status, body: await res.text() }, { model });
    let usage = null;
    for await (const evt of readSse(res)) {
      const delta = evt?.choices?.[0]?.delta?.content;
      if (delta) process.stdout.write(delta);
      if (evt?.usage) usage = evt.usage;
    }
    process.stdout.write('\n');
    if (usage && !opts.quiet) process.stderr.write(`[${model}] tokens in/out: ${usage.prompt_tokens}/${usage.completion_tokens}\n`);
    return EXIT.ok;
  }

  const res = await request(`${base}/v1/chat/completions`, { method: 'POST', headers: bearer(key), body, timeoutMs: opts.timeout });
  if (res.status !== 200) throwForStatus(res, { model });
  const content = res.json?.choices?.[0]?.message?.content ?? '';
  const result = { status: 'ok', model: res.json?.model || model, latency_ms: res.ms, content, usage: res.json?.usage || null };
  printResult(result, opts, (r) => {
    const u = r.usage ? `\n[${r.model}] ${r.latency_ms} ms, tokens in/out: ${r.usage.prompt_tokens}/${r.usage.completion_tokens}` : '';
    return r.content + u;
  });
  return EXIT.ok;
}

export async function responses(input, opts) {
  if (!input) throw new CliError('bad_args', 'Usage: apiyi responses "your input" [-m model] [--effort low|medium|high]');
  const key = requireKey(opts);
  const base = baseUrlFor(opts);
  const model = opts.model || DEFAULT_MODEL;
  const body = { model, input };
  if (opts.effort) body.reasoning = { effort: opts.effort };
  const res = await request(`${base}/v1/responses`, { method: 'POST', headers: bearer(key), body, timeoutMs: opts.timeout });
  if (res.status !== 200) throwForStatus(res, { model });
  const j = res.json || {};
  const text =
    j.output_text ??
    (j.output || [])
      .flatMap((o) => o.content || [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('');
  const result = { status: 'ok', model: j.model || model, latency_ms: res.ms, output_text: text, usage: j.usage || null };
  printResult(result, opts, (r) => {
    const u = r.usage ? `\n[${r.model}] ${r.latency_ms} ms, tokens in/out: ${r.usage.input_tokens}/${r.usage.output_tokens}` : '';
    return r.output_text + u;
  });
  return EXIT.ok;
}
