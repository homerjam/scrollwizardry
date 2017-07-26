import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/index.js',
  dest: 'dist/scrollwizardry.js',
  format: 'iife',
  moduleName: 'ScrollWizardry',
  sourceMap: true,
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
