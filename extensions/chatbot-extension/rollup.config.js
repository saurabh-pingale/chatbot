import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/main.js',
  output: {
    file: 'src/chatbot.js',
    format: 'iife',
    name: 'Chatbot'
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    terser()
  ]
};