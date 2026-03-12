import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function normalizeBasePath(basePath: string | undefined) {
  if (!basePath) {
    return '/';
  }

  if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
  }

  const prefixed = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBasePath(env.VITE_BASE_PATH);

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
    },
  };
});
