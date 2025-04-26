import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import url from '@rollup/plugin-url';

export default {
  input: 'assets/main.js',
  output: {
    file: 'assets/chatbot.js',
    format: 'iife',
    name: 'Chatbot'
  },
  plugins: [
    url({
      include: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.gif'],
      limit: 0, 
      fileName: '[name][hash][extname]',
      emitFiles: true
    }),
    nodeResolve(),
    commonjs(),
    terser()
  ]
};