import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/api/index.ts',
    'src/api/client.gen.ts',
    'src/api/client/index.ts',
    'src/api/client/client.gen.ts',
    'src/api/client/types.gen.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
});
