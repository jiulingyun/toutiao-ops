import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const TASK_LIST_URL = 'https://mp.toutiao.com/profile_v4/activity/task-list';

/**
 * 获取创作灵感列表。
 * 导航到创作灵感页，拦截 API 或从 DOM 提取热门话题和创作推荐。
 */
export async function listInspiration(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    const apiResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('activity') || url.includes('task') || url.includes('inspiration') || url.includes('hot') || url.includes('topic')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const json = await response.json();
            apiResponses.push({ url, data: json });
          }
        } catch {}
      }
    });

    await page.goto(TASK_LIST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 4000);

    if (apiResponses.length > 0) {
      return {
        success: true,
        source: 'api_intercept',
        data: apiResponses.map(r => r.data),
        apiCount: apiResponses.length,
      };
    }

    // 回退：DOM 提取
    const items = await page.evaluate(() => {
      const tasks = document.querySelectorAll('[class*="task-item"], [class*="activity-item"], [class*="topic-item"], [class*="card"], [class*="inspiration"] [class*="item"]');
      return Array.from(tasks).map(item => {
        const title = item.querySelector('[class*="title"], h3, h4, [class*="name"]')?.textContent?.trim() || '';
        const desc = item.querySelector('[class*="desc"], [class*="content"], p')?.textContent?.trim() || '';
        const hot = item.querySelector('[class*="hot"], [class*="heat"], [class*="count"]')?.textContent?.trim() || '';
        const reward = item.querySelector('[class*="reward"], [class*="bonus"], [class*="prize"]')?.textContent?.trim() || '';
        const deadline = item.querySelector('[class*="time"], [class*="deadline"], [class*="date"]')?.textContent?.trim() || '';
        return { title, desc, hot, reward, deadline };
      }).filter(i => i.title);
    });

    return {
      success: true,
      source: 'dom_scrape',
      items,
      count: items.length,
    };
  } finally {
    await closeBrowser(context);
  }
}
