import { launchBrowser, closeBrowser, sleep, waitForStable } from './browser.js';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

const MP_HOME = 'https://mp.toutiao.com/';
const LOGIN_PATH = '/auth/page/login';
const DASHBOARD_PATH = '/profile_v4';
const SCREENSHOT_DIR = join(homedir(), '.toutiao-ops', 'screenshots');

/**
 * 导航到头条号首页并等待所有重定向完成。
 *
 * 头条的重定向链：
 *   mp.toutiao.com → profile_v4/index → (JS 检测 Cookie) → auth/page/login（未登录时）
 * 必须等 JS 跳转完成后才能准确判断登录状态。
 */
async function navigateAndSettle(page) {
  await page.goto(MP_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 第一阶段：等待 HTTP 重定向到 profile_v4 或直接到 login
  try {
    await page.waitForURL((url) => {
      const s = url.toString();
      return s.includes(DASHBOARD_PATH) || s.includes(LOGIN_PATH);
    }, { timeout: 15000 });
  } catch {}

  // 第二阶段：如果落在 profile_v4，等待可能的 JS 跳转到 auth/page/login
  // 头条的 JS 会检查 Cookie，如果无效就执行客户端跳转
  if (page.url().includes(DASHBOARD_PATH) && !page.url().includes(LOGIN_PATH)) {
    try {
      await page.waitForURL(
        (url) => url.toString().includes(LOGIN_PATH),
        { timeout: 6000 }
      );
    } catch {
      // 6 秒内没跳转 → 说明确实已登录，留在控制台
    }
  }
}

function isOnLoginPage(url) {
  return url.includes(LOGIN_PATH) ||
         url.includes('sso.toutiao.com');
}

function isOnDashboard(url) {
  return url.includes(DASHBOARD_PATH) && !url.includes(LOGIN_PATH);
}

/**
 * 检测当前是否已登录头条号。
 */
export async function checkLogin(opts = {}) {
  const { context, page } = await launchBrowser(opts);
  try {
    await navigateAndSettle(page);
    const url = page.url();

    if (isOnLoginPage(url)) {
      return { logged_in: false, message: '未登录，请执行 auth login 扫码登录' };
    }

    if (isOnDashboard(url)) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, ...userInfo };
    }

    // 兜底：URL 不确定时用 DOM 判断
    const hasDashboard = await page.$('[class*="sidebar"], [class*="sider"], a[href*="graphic/publish"]');
    if (hasDashboard) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, ...userInfo };
    }

    return { logged_in: false, message: '未登录，请执行 auth login 扫码登录' };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 扫码登录流程。
 * 如果未登录，截取二维码图片输出路径供远程用户扫码，然后等待登录完成。
 */
export async function doLogin(opts = {}) {
  const { context, page } = await launchBrowser({ ...opts, headless: false });
  try {
    await navigateAndSettle(page);
    const url = page.url();

    // 已登录
    if (isOnDashboard(url)) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, message: '已登录，无需重复登录', ...userInfo };
    }

    // 未登录 → 确保在登录页
    if (!isOnLoginPage(url)) {
      await page.goto('https://mp.toutiao.com/auth/page/login', {
        waitUntil: 'load',
        timeout: 30000,
      });
    }

    // 循环等待扫码：二维码有效期约 60 秒，每 50 秒刷新一次
    const QR_REFRESH_MS = 50000;
    const MAX_ATTEMPTS = 6; // 最多刷新 6 次 ≈ 5 分钟
    let loggedIn = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await waitForStable(page);
      await sleep(1000, 2000);

      const qrScreenshot = await captureQrCode(page);
      const isRefresh = attempt > 1;
      console.log(JSON.stringify({
        status: 'waiting_for_scan',
        message: isRefresh
          ? `二维码已刷新（第 ${attempt} 次），请重新扫码`
          : '请使用今日头条 APP 扫描二维码登录',
        qr_screenshot: qrScreenshot,
        attempt,
        max_attempts: MAX_ATTEMPTS,
      }));

      if (attempt === 1) {
        console.error('请扫描二维码登录（二维码每 50 秒自动刷新，最长等待 5 分钟）...');
      } else {
        console.error(`二维码已刷新（第 ${attempt}/${MAX_ATTEMPTS} 次），请重新扫码...`);
      }

      // 在本轮二维码有效期内等待扫码跳转
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
        // 本轮超时，刷新二维码
        if (attempt < MAX_ATTEMPTS) {
          await page.reload({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
        }
      }
    }

    if (!loggedIn) {
      throw new Error('登录超时（5 分钟内未完成扫码）');
    }

    // 登录成功后等待页面稳定
    await waitForStable(page);
    await sleep(1000, 2000);

    const userInfo = await extractUserInfo(page);

    return {
      logged_in: true,
      message: '登录成功，会话已保存',
      ...userInfo,
    };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 截取登录页二维码区域，保存为图片并返回路径。
 */
async function captureQrCode(page) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(SCREENSHOT_DIR, `qrcode-${timestamp}.png`);

  try {
    // 尝试定位二维码容器元素
    const qrEl = await page.$(
      '[class*="qrcode"], [class*="qr-code"], [class*="scan"], ' +
      '[class*="QRCode"], [class*="qr_code"], [class*="web-login"]'
    );

    if (qrEl) {
      await qrEl.screenshot({ path: filePath });
    } else {
      // 找不到二维码元素，截取整个登录区域
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
    // 所有定位方式都失败，截全屏
    await page.screenshot({ path: filePath });
  }

  return filePath;
}

/**
 * 从控制台页面提取当前登录用户信息。
 * 头条控制台的用户信息在 .information 区块：
 *   .auth-avator-name  → 昵称
 *   .auth-avator-img   → 头像
 *   .information a[href*="user/"] → 主页链接（含 userId）
 */
async function extractUserInfo(page) {
  await sleep(500, 1000);
  try {
    await page.waitForSelector('.information, .auth-avator-name', { timeout: 8000 }).catch(() => {});

    const info = await page.evaluate(() => {
      // 昵称
      const nameEl = document.querySelector('.auth-avator-name');
      const username = nameEl?.textContent?.trim() || '';

      // 头像
      const avatarEl = document.querySelector('.auth-avator-img');
      const avatar = avatarEl?.src || '';

      // 用户 ID：从主页链接 //www.toutiao.com/c/user/3580433091797615/ 提取
      let userId = '';
      const profileLink = document.querySelector('.information a[href*="user/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href') || '';
        const match = href.match(/user\/(\d+)/);
        if (match) userId = match[1];
      }

      // 主页 URL
      const profileUrl = profileLink?.href || '';

      return { username, avatar, userId, profileUrl, url: window.location.href };
    });
    return info;
  } catch {
    return { username: '', avatar: '', userId: '', profileUrl: '', url: page.url() };
  }
}
