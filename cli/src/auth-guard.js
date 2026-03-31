import { waitForStable } from './browser.js';

const MP_HOME = 'https://mp.toutiao.com/';

/**
 * 确保当前页面已登录。
 * 如果检测到未登录状态，抛出错误提示先执行 auth login。
 */
export async function ensureLoggedIn(page) {
  await page.goto(MP_HOME, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForStable(page);

  const currentUrl = page.url();
  const isLoginPage = currentUrl.includes('sso.toutiao.com') ||
                      currentUrl.includes('login') ||
                      currentUrl.includes('passport');

  if (isLoginPage) {
    throw new Error('未登录头条号，请先执行: node index.js auth login');
  }
}
