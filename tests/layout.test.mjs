// docs/agents/layout.md is where an agent finds what a file is for: every tracked file under src/ and tools/ is named
// there, by its path under src/ or tools/, or by its own name.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const layout = readFileSync(join(root, 'docs/agents/layout.md'), 'utf8');
const tracked = execFileSync('git', ['ls-files', 'src', 'tools'], { cwd: root, encoding: 'utf8' }).trim().split('\n');

/** Whether `name` stands in the layout as a word of its own (not the tail of a longer name). */
const named = (name) => new RegExp(`(^|[\\s/(\`])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s,;:)\`])`, 'm').test(layout);

test('every file under src/ and tools/ is named in docs/agents/layout.md', () => {
  const missing = tracked.filter((file) => {
    const under = file.replace(/^(src|tools)\//, '');
    return !named(under) && !named(under.split('/').at(-1));
  });
  assert.deepEqual(missing, [], `not in layout.md: ${missing.join(', ')}`);
});
