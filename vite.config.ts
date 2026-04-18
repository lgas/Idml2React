import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@config': resolve(__dirname, 'src/config'),
      '@parser': resolve(__dirname, 'src/parser'),
      '@resolver': resolve(__dirname, 'src/resolver'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@helpers': resolve(__dirname, 'src/helpers'),
      '@scripts': resolve(__dirname, 'src/scripts'),
    },
  },
  server: {
    port: 3000,
  },
  test: {
    environment: 'node',
  },
});
