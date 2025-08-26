// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Generate TypeScript definitions
const generateTypes = () => ({
  name: 'generate-types',
  writeBundle() {
    const types = `// Type definitions for @vorthain/tab-safe-timers

export declare class TabSafeTimers {
  constructor();
  init(): boolean;
  destroy(): void;
}

/**
 * Initialize tab-safe timers
 */
export declare function initTabSafeTimers(): TabSafeTimers;

/**
 * Destroy the tab-safe timers system
 */
export declare function destroyTabSafeTimers(): void;

/**
 * Get the current TabSafeTimers instance
 */
export declare function getTabSafeTimers(): TabSafeTimers | null;

export default initTabSafeTimers;
`;
    writeFileSync(join('dist', 'index.d.ts'), types);
  },
});

export default [
  // ESM build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      exports: 'named',
    },
    plugins: [resolve(), commonjs(), generateTypes()],
  },
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [resolve(), commonjs()],
  },
  // UMD build (minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'TabSafeTimers',
      exports: 'named',
    },
    plugins: [resolve(), commonjs(), terser()],
  },
];
