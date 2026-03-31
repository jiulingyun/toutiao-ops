import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const CACHE_DIR = join(homedir(), '.toutiao-ops');
const CACHE_FILE = join(CACHE_DIR, 'update-check.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const PKG_NAME = '@openclaw-cn/toutiao-ops';
const REGISTRY = 'https://registry.npmjs.org';

function getCurrentVersion() {
  const pkg = require(join(__dirname, '..', 'package.json'));
  return pkg.version;
}

function readCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf-8');
  } catch { /* ignore */ }
}

function compareVersions(current, latest) {
  const a = current.split('.').map(Number);
  const b = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((b[i] || 0) > (a[i] || 0)) return true;
    if ((b[i] || 0) < (a[i] || 0)) return false;
  }
  return false;
}

async function fetchLatestVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${REGISTRY}/${PKG_NAME}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkForUpdates() {
  try {
    const currentVersion = getCurrentVersion();
    const cache = readCache();
    const now = Date.now();

    if (cache && (now - cache.lastCheck) < CACHE_TTL) {
      if (cache.latestVersion && compareVersions(currentVersion, cache.latestVersion)) {
        printUpdateNotice(currentVersion, cache.latestVersion);
      }
      return;
    }

    const latestVersion = await fetchLatestVersion();
    writeCache({ lastCheck: now, latestVersion: latestVersion || currentVersion });

    if (latestVersion && compareVersions(currentVersion, latestVersion)) {
      printUpdateNotice(currentVersion, latestVersion);
    }
  } catch { /* never block CLI execution */ }
}

function printUpdateNotice(current, latest) {
  const versionLine = `${current} → ${latest}`;
  const updateCmd = `npm i -g ${PKG_NAME}`;
  const W = 47;
  const displayWidth = (s) => {
    let w = 0;
    for (const ch of s) w += (ch.charCodeAt(0) > 0x7f ? 2 : 1);
    return w;
  };
  const pad = (s, w) => s + ' '.repeat(Math.max(0, w - displayWidth(s)));
  const msg = [
    '',
    `╭${'─'.repeat(W)}╮`,
    `│  ${pad('toutiao-ops 有新版本可用！', W - 3)}│`,
    `│  ${pad(versionLine, W - 3)}│`,
    `│  ${pad(`运行 ${updateCmd} 更新`, W - 3)}│`,
    `╰${'─'.repeat(W)}╯`,
    '',
  ].join('\n');
  process.stderr.write(msg);
}
