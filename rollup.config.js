import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'ScrollWizardry',
      file: pkg.browser,
      format: 'umd',
      sourcemap: true,
      // globals: {
      //   lodash: '_',
      // },
    },
    plugins: [
      resolve(), // so Rollup can find `lodash`
      commonjs(), // so Rollup can convert `lodash` to an ES module
      babel({
        exclude: 'node_modules/**',
      }),
      uglify(),
    ],
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    input: 'src/index.js',
    external: [
      'lodash/merge',
      'lodash/isArray',
      'lodash/isElement',
      'lodash/isFunction',
      'lodash/isNumber',
      'lodash/isString',
      'lodash/pick',
      'lodash/camelCase',
      'lodash/forEach',
    ],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
  },
];
