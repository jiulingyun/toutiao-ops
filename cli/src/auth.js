import { launchBrowser, closeBrowser, waitForStable } from './browser.js';

const MP_HOME = 'https://mp.toutiao.com/';
const LOGIN_URL = 'https://sso.toutiao.com/';

/**
 * 检测当前是否已登录头条号。
 * 通过持久化上下文加载 mp.toutiao.com 首页，判断是否被重定向到登录页。
 */
export async function checkLogin(opts = {}) {
  const { context, page } = await launchBrowser(opts);
  try {
    await page.goto(MP_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);

    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('sso.toutiao.com') ||
                        currentUrl.includes('login') ||
                        currentUrl.includes('passport');

    if (isLoginPage) {
      return { logged_in: false, message: '未登录，请执行 auth login 扫码登录' };
    }

    const userInfo = await extractUserInfo(page);
    return { logged_in: true, ...userInfo };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 打开浏览器等待用户手动扫码登录。
 * 检测到登录成功后自动保存会话（持久化上下文）。
 */
export async function doLogin(opts = {}) {
  const { context, page } = await launchBrowser({ ...opts, headless: false });
  try {
    await page.goto(MP_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const currentUrl = page.url();
    const alreadyLoggedIn = !currentUrl.includes('sso.toutiao.com') &&
                            !currentUrl.includes('login') &&
                            !currentUrl.includes('passport');

    if (alreadyLoggedIn) {
      const userInfo = await extractUserInfo(page);
      return { logged_in: true, message: '已登录，无需重复登录', ...userInfo };
    }

    console.error('请在浏览器窗口中完成扫码登录，等待自动检测...');

    await page.waitForURL((url) => {
      const s = url.toString();
      return s.includes('mp.toutiao.com') && !s.includes('sso.') && !s.includes('login') && !s.includes('passport');
    }, { timeout: 300000 });

    await waitForStable(page);
    const userInfo = await extractUserInfo(page);
    return { logged_in: true, message: '登录成功，会话已保存', ...userInfo };
  } finally {
    await closeBrowser(context);
  }
}

async function extractUserInfo(page) {
  try {
    const info = await page.evaluate(() => {
      const nameEl = document.querySelector('.user-name') ||
                     document.querySelector('[class*="userName"]') ||
                     document.querySelector('[class*="user_name"]') ||
                     document.querySelector('[class*="nick"]');
      return {
        username: nameEl?.textContent?.trim() || '',
        url: window.location.href,
      };
    });
    return info;
  } catch {
    return { username: '', url: page.url() };
  }
}
