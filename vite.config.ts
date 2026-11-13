import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/; CI passes that in as BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // (agents' worktrees live under .claude/ inside the repo: a file changed in one is not this server's, and reloading the
  // page for it broke a browser test half way through and would restart anyone's session)
  server: { port: 5180, strictPort: false, watch: { ignored: ['**/.claude/**'] } },
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
