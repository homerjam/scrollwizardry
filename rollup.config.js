import babel from 'rollup-plugin-babel';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/scrollwizardry.js',
    format: 'umd',
  },
  name: 'ScrollWizardry',
  sourcemap: true,
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
  ],
  external: ['lodash'],
  globals: {
    lodash: '_',
  },
};
