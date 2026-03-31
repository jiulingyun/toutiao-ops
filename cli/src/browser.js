import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

chromium.use(StealthPlugin());

const USER_DATA_DIR = join(homedir(), '.toutiao-ops', 'browser-data');

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

const LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-infobars',
];

/**
 * 启动持久化浏览器上下文。
 * 会话数据保存在 ~/.toutiao-ops/browser-data/，首次登录后后续启动自动复用 Cookie。
 *
 * @param {object} opts
 * @param {boolean} [opts.headless=false]
 * @returns {{ context: BrowserContext, page: Page }}
 */
export async function launchBrowser(opts = {}) {
  mkdirSync(USER_DATA_DIR, { recursive: true });

  const headless = Boolean(opts.headless);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
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
 * @param {number} min 毫秒下限
 * @param {number} max 毫秒上限
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
