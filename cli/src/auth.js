import { launchBrowser, closeBrowser, sleep, waitForStable, getAccountDir, getScreenshotDir, getBrowserDataDir } from './browser.js';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';

const MP_HOME = 'https://mp.toutiao.com/';
const LOGIN_PATH = '/auth/page/login';
const DASHBOARD_PATH = '/profile_v4';
const ACCOUNTS_BASE = join(homedir(), '.toutiao-ops', 'accounts');

/**
 * 导航到头条号首页并等待所有重定向完成。
 */
async function navigateAndSettle(page) {
  await page.goto(MP_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 });

  try {
    await page.waitForURL((url) => {
      const s = url.toString();
      return s.includes(DASHBOARD_PATH) || s.includes(LOGIN_PATH);
    }, { timeout: 15000 });
  } catch {}

  if (page.url().includes(DASHBOARD_PATH) && !page.url().includes(LOGIN_PATH)) {
    try {
      await page.waitForURL(
        (url) => url.toString().includes(LOGIN_PATH),
        { timeout: 6000 }
      );
    } catch {}
  }
}

function isOnLoginPage(url) {
  return url.includes(LOGIN_PATH) || url.includes('sso.toutiao.com');
}

function isOnDashboard(url) {
  return url.includes(DASHBOARD_PATH) && !url.includes(LOGIN_PATH);
}

function accountLabel(opts) {
  return opts.account || 'default';
}

/**
 * 检测指定账号是否已登录。
 */
export async function checkLogin(opts = {}) {
  const { context, page } = await launchBrowser(opts);
  try {
    await navigateAndSettle(page);
    const url = page.url();

    if (isOnLoginPage(url)) {
      return { logged_in: false, account: accountLabel(opts), message: '未登录，请执行 auth login 扫码登录' };
    }

    if (isOnDashboard(url)) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, account: accountLabel(opts), ...userInfo };
    }

    const hasDashboard = await page.$('[class*="sidebar"], [class*="sider"], a[href*="graphic/publish"]');
    if (hasDashboard) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, account: accountLabel(opts), ...userInfo };
    }

    return { logged_in: false, account: accountLabel(opts), message: '未登录，请执行 auth login 扫码登录' };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 扫码登录流程。
 */
export async function doLogin(opts = {}) {
  const { context, page } = await launchBrowser({ ...opts, headless: false });
  const screenshotDir = getScreenshotDir(opts.account);
  try {
    await navigateAndSettle(page);
    const url = page.url();

    if (isOnDashboard(url)) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, account: accountLabel(opts), message: '已登录，无需重复登录', ...userInfo };
    }

    if (!isOnLoginPage(url)) {
      await page.goto('https://mp.toutiao.com/auth/page/login', {
        waitUntil: 'load',
        timeout: 30000,
      });
    }

    const QR_REFRESH_MS = 50000;
    const MAX_ATTEMPTS = 6;
    let loggedIn = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await waitForStable(page);
      await sleep(1000, 2000);

      const qrScreenshot = await captureQrCode(page, screenshotDir);
      const isRefresh = attempt > 1;
      console.log(JSON.stringify({
        status: 'waiting_for_scan',
        account: accountLabel(opts),
        message: isRefresh
          ? `二维码已刷新（第 ${attempt} 次），请重新扫码`
          : '请使用今日头条 APP 扫描二维码登录',
        qr_screenshot: qrScreenshot,
        attempt,
        max_attempts: MAX_ATTEMPTS,
      }));

      if (attempt === 1) {
        console.error(`[${accountLabel(opts)}] 请扫描二维码登录（二维码每 50 秒自动刷新，最长等待 5 分钟）...`);
      } else {
        console.error(`[${accountLabel(opts)}] 二维码已刷新（第 ${attempt}/${MAX_ATTEMPTS} 次），请重新扫码...`);
      }

      try {
        await page.waitForURL(
          (u) => {
            const s = u.toString();
            return s.includes(DASHBOARD_PATH) && !s.includes(LOGIN_PATH);
          },
          { timeout: QR_REFRESH_MS }
        );
        loggedIn = true;
        break;
      } catch {
        if (attempt < MAX_ATTEMPTS) {
          await page.reload({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
        }
      }
    }

    if (!loggedIn) {
      throw new Error('登录超时（5 分钟内未完成扫码）');
    }

    await waitForStable(page);
    await sleep(1000, 2000);

    const userInfo = await extractUserInfo(page);

    // 保存账号元信息
    saveAccountMeta(opts.account, userInfo);

    return {
      logged_in: true,
      account: accountLabel(opts),
      message: '登录成功，会话已保存',
      ...userInfo,
    };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 清除指定账号的浏览器缓存和会话数据。
 */
export async function doLogout(opts = {}) {
  const accountDir = getAccountDir(opts.account);
  const cleared = [];

  if (existsSync(accountDir)) {
    rmSync(accountDir, { recursive: true, force: true });
    cleared.push(accountLabel(opts));
  }

  return {
    success: true,
    account: accountLabel(opts),
    message: `已清除账号 [${accountLabel(opts)}] 的登录缓存`,
    cleared,
  };
}

/**
 * 列出所有已保存的账号及其状态。
 */
export async function listAccounts() {
  if (!existsSync(ACCOUNTS_BASE)) {
    return { accounts: [], count: 0 };
  }

  const dirs = readdirSync(ACCOUNTS_BASE, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const accounts = dirs.map(name => {
    const metaPath = join(ACCOUNTS_BASE, name, 'meta.json');
    let meta = {};
    if (existsSync(metaPath)) {
      try {
        meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      } catch {}
    }
    const hasBrowserData = existsSync(join(ACCOUNTS_BASE, name, 'browser-data'));
    return {
      account: name,
      has_session: hasBrowserData,
      ...meta,
    };
  });

  return { accounts, count: accounts.length };
}

// ── 内部工具函数 ──

function saveAccountMeta(account, userInfo) {
  try {
    const dir = getAccountDir(account);
    mkdirSync(dir, { recursive: true });
    const metaPath = join(dir, 'meta.json');
    const meta = {
      username: userInfo.username || '',
      avatar: userInfo.avatar || '',
      userId: userInfo.userId || '',
      profileUrl: userInfo.profileUrl || '',
      lastLogin: new Date().toISOString(),
    };
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch {}
}

async function captureQrCode(page, screenshotDir) {
  mkdirSync(screenshotDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(screenshotDir, `qrcode-${timestamp}.png`);

  try {
    const qrEl = await page.$(
      '[class*="qrcode"], [class*="qr-code"], [class*="scan"], ' +
      '[class*="QRCode"], [class*="qr_code"], [class*="web-login"]'
    );

    if (qrEl) {
      await qrEl.screenshot({ path: filePath });
    } else {
      const loginPanel = await page.$(
        '[class*="login-panel"], [class*="login-container"], ' +
        '[class*="login-wrapper"], [class*="content"], main, #app'
      );
      if (loginPanel) {
        await loginPanel.screenshot({ path: filePath });
      } else {
        await page.screenshot({ path: filePath });
      }
    }
  } catch {
    await page.screenshot({ path: filePath });
  }

  return filePath;
}

async function extractUserInfo(page) {
  await sleep(500, 1000);
  try {
    await page.waitForSelector('.information, .auth-avator-name', { timeout: 8000 }).catch(() => {});

    const info = await page.evaluate(() => {
      const nameEl = document.querySelector('.auth-avator-name');
      const username = nameEl?.textContent?.trim() || '';

      const avatarEl = document.querySelector('.auth-avator-img');
      const avatar = avatarEl?.src || '';

      let userId = '';
      const profileLink = document.querySelector('.information a[href*="user/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href') || '';
        const match = href.match(/user\/(\d+)/);
        if (match) userId = match[1];
      }

      const profileUrl = profileLink?.href || '';

      return { username, avatar, userId, profileUrl, url: window.location.href };
    });
    return info;
  } catch {
    return { username: '', avatar: '', userId: '', profileUrl: '', url: page.url() };
  }
}
