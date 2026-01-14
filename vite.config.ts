import { execSync } from 'node:child_process';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pagesPort = process.env.NAV_PAGES_PORT || '8799';
const pagesOrigin = `http://127.0.0.1:${pagesPort}`;

function readGit(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    void e;
    return '';
  }
}

function readGitCommit(): string {
  return readGit('git rev-parse --short HEAD');
}

function readGitVersion(): string {
  return readGit('git describe --tags --always --dirty');
}

const appVersion = process.env.APP_VERSION || readGitVersion() || process.env.npm_package_version || '0.0.0';
const appCommit = process.env.APP_COMMIT || readGitCommit();
const buildTime = process.env.BUILD_TIME || new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    proxy: {
      '/api': {
        target: pagesOrigin,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (!req.url || !req.url.startsWith('/api/version')) return;
            proxyReq.setHeader('x-app-version', appVersion);
            if (appCommit) proxyReq.setHeader('x-app-commit', appCommit);
            proxyReq.setHeader('x-build-time', buildTime);
          });
        },
      },
    },
  },
});
