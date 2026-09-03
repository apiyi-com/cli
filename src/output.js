export function table(rows, columns) {
  if (!rows.length) return '(none)';
  const widths = columns.map((c) => Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? '').length)));
  const line = (cells) => cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ').trimEnd();
  const out = [line(columns.map((c) => c.label)), line(widths.map((w) => '-'.repeat(w)))];
  for (const r of rows) out.push(line(columns.map((c) => r[c.key])));
  return out.join('\n');
}

export function printResult(result, opts, human) {
  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (!opts.quiet) {
    process.stdout.write(human(result) + '\n');
  }
}
