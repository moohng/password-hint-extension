const path = require('path');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
// const postCSS = require('rollup-plugin-postcss');
const terser = require('@rollup/plugin-terser');
const copy = require('rollup-plugin-copy');
const { defineConfig } = require('rollup');
const createManifestPlugin = require('./build/createManifest');

module.exports = defineConfig(() => {
  return {
    input: ['src/hint.ts','src/background.ts'],
    output: {
      dir: `dist/output`,
      format: 'es',
      plugins: [terser()],
    },
    plugins: [
      resolve({ extensions: ['.js', '.ts'] }),
      commonjs(),
      typescript(),
      // postCSS({ extract: true }),
      copy({
        targets: [
          { src: 'public/hint.css', dest: 'dist/output/', rename: 'hint.css' },
          // { src: 'public/popup.css', dest: 'dist/output/' },
          // { src: 'public/popup.html', dest: 'dist/output/' },
          { src: 'public/icons', dest: 'dist/output/' },
          // { src: 'public/options.html', dest: 'dist/output/' }, // "options_page": "options.html",
        ],
      }),
      createManifestPlugin(),
    ],
    watch: {
      include: ['src/*', 'public/*'],
    },
  };
});
