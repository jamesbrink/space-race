#!/usr/bin/env node
// Code hygiene (docs/agents/hygiene.md): the repo's mechanical rules, checked over the tree or over the files a commit
// stages. Hard rules fail on any hit. Ratcheted rules (a file's length, its `any`s, its lint suppressions) fail only where a
// file is worse than tools/hygiene-baseline.json allows (an \`any\` is Biome's to refuse, noExplicitAny): the baseline may only go down. `--write` writes it again from the
// tree (after a sweep has made things better), `--staged` checks the files git has staged, `--quiet` prints only failures.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const BASELINE = join(root, 'tools/hygiene-baseline.json');
const args = new Set(process.argv.slice(2));
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });

/** The longest a source file may grow to before it is to be split (lines), unless the baseline holds it already longer. */
const LONGEST = 1500;

/** This file names every pattern it looks for: it is not held to them. */
const SELF = 'tools/hygiene.mjs';
const tracked = git('ls-files')
  .split('\n')
  .filter((f) => f && f !== SELF);
const files = args.has('--staged') ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR').split('\n').filter(Boolean) : tracked;
const checked = files.filter((f) => f !== SELF);
const code = (f) => /\.(ts|mjs|js)$/.test(f) && !f.startsWith('public/') && !f.includes('node_modules/');
const src = (f) => f.startsWith('src/') && f.endsWith('.ts');

/** Hard rules: each a test on a file's path and text, and what it says when it fails. */
const HARD = [
  {
    name: 'conflict markers',
    applies: (f) => !/\.(png|jpe?g|glb|bin|ktx2|exr|pdf)$/.test(f),
    hit: (_, text) => /^(<{7}|>{7}|\|{7})( |$)/m.test(text),
    why: 'a merge conflict left in the file',
  },
  {
    name: 'scratch files',
    applies: () => true,
    hit: (f) => /(^|\/)_[^_/][^/]*\.(mjs|js|ts|py)$/.test(f) || /\.(orig|rej)$/.test(f),
    why: 'a scratch or merge-leftover file (tools/_*.mjs, *.orig, *.rej) is not committed',
  },
  {
    name: 'console.log',
    applies: src,
    hit: (_, t) => /\bconsole\.log\(/.test(t),
    why: 'src/ logs through console.debug or ui.say, not console.log',
  },
  {
    name: 'type escapes',
    applies: (f) => code(f),
    hit: (_, t) => /@ts-(ignore|nocheck)\b/.test(t),
    why: '@ts-ignore and @ts-nocheck hide errors; fix the type (or @ts-expect-error with the reason, in a test)',
  },
  {
    name: 'focused tests',
    applies: (f) => f.startsWith('tests/'),
    hit: (_, t) => /\b(test|describe|it)\.only\(|\{\s*only:\s*true/.test(t),
    why: 'a focused test (.only) runs the rest of the file in nobody’s sight',
  },
  {
    name: 'loose TODOs',
    applies: (f) => code(f),
    hit: (_, t) => t.split('\n').some((l) => /\b(TODO|FIXME|XXX|HACK)\b/.test(l) && !/#\d+/.test(l)),
    why: 'a TODO names the issue that tracks it (#123), or it is done now',
  },
];

/** Ratcheted measures of a source file: none may be worse than its baseline. */
const MEASURES = {
  lines: (t) => t.split('\n').length,
  suppressions: (t) => (t.match(/biome-ignore|eslint-disable|noqa/g) ?? []).length,
};
const ALLOWED = { lines: LONGEST, suppressions: 0 };

const measure = (list) => {
  const out = {};
  for (const f of list) {
    if (!code(f) || !(f.startsWith('src/') || f.startsWith('missions/') || f.startsWith('tools/') || f.startsWith('tests/'))) continue;
    if (!existsSync(join(root, f))) continue;
    const t = readFileSync(join(root, f), 'utf8');
    const m = {};
    for (const [k, fn] of Object.entries(MEASURES)) {
      const v = fn(t);
      // (only what is over the allowance is recorded: a file within it needs no line in the baseline)
      if (k === 'lines' ? src(f) && v > ALLOWED[k] : v > ALLOWED[k]) m[k] = v;
    }
    if (Object.keys(m).length) out[f] = m;
  }
  return out;
};

if (args.has('--write')) {
  const now = measure(tracked);
  const sorted = Object.fromEntries(
    Object.keys(now)
      .sort()
      .map((f) => [f, now[f]]),
  );
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`hygiene: baseline written, ${Object.keys(now).length} files over an allowance`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const failures = [];
for (const f of checked) {
  if (!existsSync(join(root, f))) continue;
  let text = '';
  try {
    text = readFileSync(join(root, f), 'utf8');
  } catch {
    continue;
  }
  for (const r of HARD) if (r.applies(f) && r.hit(f, text)) failures.push(`${f}: ${r.name}: ${r.why}`);
}
const now = measure(checked);
for (const [f, m] of Object.entries(now)) {
  for (const [k, v] of Object.entries(m)) {
    const most = baseline[f]?.[k] ?? ALLOWED[k];
    if (v > most)
      failures.push(
        `${f}: ${k} ${v} > ${most}${k === 'lines' ? ' (split it by what it does: docs/agents/hygiene.md, "One thing per file")' : ''}`,
      );
  }
}
if (failures.length) {
  console.error(
    `hygiene: ${failures.length} failure${failures.length === 1 ? '' : 's'} (docs/agents/hygiene.md)\n  ${failures.join('\n  ')}`,
  );
  process.exit(1);
}
if (!args.has('--quiet')) console.log(`hygiene: ${checked.length} files checked, nothing new`);
