/**
 * Playwright のシナリオテスト。普段の開発サーバー（8080 / 5173）とは別のポートに、
 * テスト専用のバックエンド（dev プロファイル・メモリ上の H2・テストログインあり）と Vite を立ち上げて流す。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const API_PORT = 18080;
const WEB_PORT = 15173;
const isWindows = process.platform === 'win32';
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const gradlew = path.join(backendDir, isWindows ? 'gradlew.bat' : 'gradlew');

/** テスト用バックエンドの設定。Google の設定は使わないのでダミーを入れる。 */
const backendSettings = {
  server: { port: API_PORT },
  spring: {
    profiles: { active: 'dev' },
    security: { oauth2: { client: { registration: { google: { 'client-id': 'e2e', 'client-secret': 'e2e' } } } } },
  },
  app: {
    'frontend-base-url': `http://localhost:${WEB_PORT}`,
    // ブラウザからの書き込みは送り元を確かめるので、テスト用の Vite を許可する
    cors: { 'allowed-origins': `http://localhost:${WEB_PORT}` },
    dev: { 'test-login': true },
  },
};

export default defineConfig({
  testDir: './e2e',
  // 同じテスト用 DB を使うので 1 本ずつ流す
  workers: 1,
  fullyParallel: false,
  timeout: 5 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } } }],
  webServer: [
    {
      command: `"${gradlew}" -q bootJar && java -jar build/libs/tubeboard-0.0.1-SNAPSHOT.jar`,
      cwd: backendDir,
      env: { SPRING_APPLICATION_JSON: JSON.stringify(backendSettings) },
      url: `http://localhost:${API_PORT}/api/health`,
      timeout: 5 * 60_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      env: { TUNEBOARD_API_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      timeout: 2 * 60_000,
      reuseExistingServer: false,
    },
  ],
});
