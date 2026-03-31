import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

chromium.use(StealthPlugin());

const BASE_DIR = join(homedir(), '.toutiao-ops');
const DEFAULT_ACCOUNT = 'default';

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

const LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-infobars',
];

/**
 * 获取指定账号的数据目录路径。
 */
export function getAccountDir(account) {
  return join(BASE_DIR, 'accounts', account || DEFAULT_ACCOUNT);
}

/**
 * 获取指定账号的浏览器数据目录。
 */
export function getBrowserDataDir(account) {
  return join(getAccountDir(account), 'browser-data');
}

/**
 * 获取指定账号的截图目录。
 */
export function getScreenshotDir(account) {
  return join(getAccountDir(account), 'screenshots');
}

/**
 * 启动持久化浏览器上下文。
 * 会话数据按账号隔离，保存在 ~/.toutiao-ops/accounts/<name>/browser-data/。
 *
 * @param {object} opts
 * @param {string} [opts.account="default"]
 * @param {boolean} [opts.headless=false]
 * @returns {{ context: BrowserContext, page: Page }}
 */
export async function launchBrowser(opts = {}) {
  const userDataDir = getBrowserDataDir(opts.account);
  mkdirSync(userDataDir, { recursive: true });

  const headless = Boolean(opts.headless);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: DEFAULT_VIEWPORT,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    args: LAUNCH_ARGS,
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = context.pages()[0] || await context.newPage();
  return { context, page };
}

/**
 * 安全关闭浏览器上下文
 */
export async function closeBrowser(context) {
  if (context) {
    await context.close();
  }
}

/**
 * 随机延迟，模拟人类操作节奏
 */
export function sleep(min = 200, max = 800) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 模拟人类打字：逐字输入并带随机间隔
 */
export async function humanType(page, selector, text) {
  await page.click(selector);
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: 50 + Math.random() * 120 });
  }
}

/**
 * 等待页面网络基本空闲后再操作
 */
export async function waitForStable(page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

/**
 * 在浏览器上下文内发起 fetch 请求（自动携带 Cookie/Referer）
 */
export async function browserFetch(page, url, fetchOpts = {}) {
  return page.evaluate(async ({ url, opts }) => {
    const res = await fetch(url, {
      credentials: 'include',
      ...opts,
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      return { ok: res.ok, status: res.status, data: await res.json() };
    }
    return { ok: res.ok, status: res.status, data: await res.text() };
  }, { url, opts: fetchOpts });
}
