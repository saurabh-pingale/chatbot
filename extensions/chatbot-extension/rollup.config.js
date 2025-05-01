import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'assets/main.js',
  output: {
    file: 'assets/chatbot.js',
    format: 'iife',
    name: 'Chatbot'
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    terser()
  ]
};