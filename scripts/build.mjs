import path from 'node:path';
import { builtinModules, createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pkg = require(path.join(rootDir, 'package.json'));

const dependencyNames = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {})
];

const externals = [
  ...new Set([
    ...builtinModules,
    ...builtinModules.map((mod) => `node:${mod}`),
    ...dependencyNames,
    ...dependencyNames.map((dep) => `${dep}/*`)
  ])
];

rmSync(path.join(rootDir, 'dist'), { force: true, recursive: true });
mkdirSync(path.join(rootDir, 'dist'), { recursive: true });

const shared = {
  absWorkingDir: rootDir,
  bundle: true,
  define: {
    __MODULE_REQUIRE_TARGET__: 'import.meta.url'
  },
  entryPoints: [path.join(rootDir, 'index.js')],
  external: externals,
  platform: 'node',
  sourcemap: false,
  target: 'node18'
};

await build({
  ...shared,
  format: 'esm',
  outfile: path.join(rootDir, 'dist', 'index.js')
});

await build({
  ...shared,
  define: {
    __MODULE_REQUIRE_TARGET__: '__filename'
  },
  footer: {
    js: 'module.exports = module.exports.default;'
  },
  format: 'cjs',
  outfile: path.join(rootDir, 'dist', 'index.cjs')
});
