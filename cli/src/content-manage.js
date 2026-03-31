import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const CONTENT_PAGE = 'https://mp.toutiao.com/profile_v4/manage/content/all';

const TYPE_MAP = {
  all: '',
  article: 'article',
  video: 'video',
  weitoutiao: 'weitoutiao',
};

const STATUS_MAP = {
  published: 'published',
  reviewing: 'reviewing',
  rejected: 'rejected',
};

/**
 * 获取作品列表。
 * 导航到内容管理页后，通过拦截 + 浏览器内 fetch 获取结构化数据。
 */
export async function listContent(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    const apiResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/pgc/ma/') && url.includes('content') || url.includes('/api/') && url.includes('article')) {
        try {
          const json = await response.json();
          apiResponses.push({ url, data: json });
        } catch {}
      }
    });

    await page.goto(CONTENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 3000);
    await dismissOverlays(page);

    if (apiResponses.length > 0) {
      return {
        success: true,
        source: 'api_intercept',
        items: apiResponses.map(r => r.data),
        count: apiResponses.length,
      };
    }

    // 回退：从 DOM 提取
    const items = await page.evaluate(() => {
      const rows = document.querySelectorAll('[class*="content-item"], [class*="article-item"], table tbody tr, [class*="list"] > div[class*="item"]');
      return Array.from(rows).map(row => {
        const title = row.querySelector('[class*="title"] a, [class*="title"] span, td:first-child a')?.textContent?.trim() || '';
        const status = row.querySelector('[class*="status"], [class*="state"]')?.textContent?.trim() || '';
        const reads = row.querySelector('[class*="read"], [class*="view"]')?.textContent?.trim() || '';
        const comments = row.querySelector('[class*="comment"]')?.textContent?.trim() || '';
        const time = row.querySelector('[class*="time"], [class*="date"], time')?.textContent?.trim() || '';
        return { title, status, reads, comments, time };
      }).filter(i => i.title);
    });

    return {
      success: true,
      source: 'dom_scrape',
      items,
      count: items.length,
      page: parseInt(opts.page) || 1,
    };
  } finally {
    await closeBrowser(context);
  }
}
