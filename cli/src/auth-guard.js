import { sleep } from './browser.js';

const MP_HOME = 'https://mp.toutiao.com/';
const LOGIN_PATH = '/auth/page/login';
const DASHBOARD_PATH = '/profile_v4';

/**
 * 确保当前页面已登录。
 * 等待完整重定向链（含 JS 跳转）后再判断。
 */
export async function ensureLoggedIn(page) {
  await page.goto(MP_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 等待 HTTP 重定向
  try {
    await page.waitForURL((url) => {
      const s = url.toString();
      return s.includes(DASHBOARD_PATH) || s.includes(LOGIN_PATH);
    }, { timeout: 15000 });
  } catch {}

  // 如果在 profile_v4，等待可能的 JS 跳转到 login
  if (page.url().includes(DASHBOARD_PATH) && !page.url().includes(LOGIN_PATH)) {
    try {
      await page.waitForURL(
        (url) => url.toString().includes(LOGIN_PATH),
        { timeout: 6000 }
      );
    } catch {
      // 没跳转说明确实已登录
      return;
    }
  }

  const url = page.url();
  if (url.includes(LOGIN_PATH) || url.includes('sso.toutiao.com')) {
    throw new Error('未登录头条号，请先执行: toutiao-ops auth login');
  }
}
