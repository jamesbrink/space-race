import { createHash } from 'node:crypto';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/** This checkout's own .claude folder, whichever checkout this is. */
const AGENTS = fileURLToPath(new URL('.claude/', import.meta.url));

/**
 * The simulator's stamp: a hash of the code a run flown by hand is flown again by (the simulator, the world it flies in,
 * the decks). A run kept by an older build is then not flown again by this one (deck/tape.ts `stampOf`). The dev server
 * takes it as it starts.
 */
const ROOT = fileURLToPath(new URL('./', import.meta.url));
const filesFor = (patterns: string[]) => globSync(patterns, { cwd: ROOT }).sort();
const digest = (files: string[]) => {
  const h = createHash('sha256');
  for (const f of files) h.update(f).update(readFileSync(ROOT + f));
  return h.digest('base64url').slice(0, 12);
};
const SIM_STAMP = digest(
  filesFor(['src/sim/**/*.ts', 'src/world/**/*.ts', 'src/deck/*.ts', 'src/types.ts', 'src/types/**/*.ts', 'src/measure.ts']),
);

// Escape queries use the full-detail pad geometry and these scene transforms.
const collisionCode = digest(filesFor(['src/app/session.ts', 'src/viewer/{explode,lod,runs,stage}.ts', 'src/viewer/onfoot/walk.ts']));
const PAD_STAMPS = Object.fromEntries(
  filesFor(['public/models/*/places/**/*.glb'])
    .filter((file) => !/\.lod\d+\.glb$/.test(file))
    .map((file) => [file.slice('public/'.length), `${collisionCode}.${digest([file])}`]),
);

// What a flight flown by hand can strike at its site, and with what hull (tools/collision-bake.mjs): a kept flight is not
// flown again on other shapes than it was flown on (deck/tape.ts `stampOf`).
const SOLID_STAMPS = Object.fromEntries(
  filesFor(['public/models/**/*.solid.bin']).map((file) => [file.slice('public/'.length), digest([file])]),
);

// GitHub Pages serves the site from /<repo>/; CI passes that in as BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    'import.meta.env.SIM_STAMP': JSON.stringify(SIM_STAMP),
    'import.meta.env.PAD_STAMPS': JSON.stringify(PAD_STAMPS),
    'import.meta.env.SOLID_STAMPS': JSON.stringify(SOLID_STAMPS),
  },
  // (agents' worktrees live under .claude/ inside the repo: a file changed in one is not this server's, and reloading the
  // page for it broke a browser test half way through and would restart anyone's session. Only this checkout's own
  // .claude is left out: a worktree's whole path lies under the repo's, and a server run there must still see its files)
  server: { port: 5180, strictPort: false, watch: { ignored: [(path: string) => path.startsWith(AGENTS)] } },
  // One three, always. Every addon is named here, so the dev server bundles them together with three when it starts:
  // one it met only later (a new import while it was running) was bundled apart, against a second copy of three, and
  // three warned of "multiple instances" (which fails `pnpm test:flicker`). A new addon is added to this list.
  resolve: { dedupe: ['three'] },
  optimizeDeps: {
    include: [
      'three',
      'three-mesh-bvh',
      'three/addons/loaders/DRACOLoader.js',
      'three/addons/loaders/GLTFLoader.js',
      'three/addons/objects/Reflector.js',
      'three/addons/postprocessing/EffectComposer.js',
      'three/addons/postprocessing/OutlinePass.js',
      'three/addons/postprocessing/OutputPass.js',
      'three/addons/postprocessing/Pass.js',
      'three/addons/postprocessing/RenderPass.js',
      'three/addons/postprocessing/ShaderPass.js',
      'three/addons/postprocessing/UnrealBloomPass.js',
      'three/addons/utils/BufferGeometryUtils.js',
    ],
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
