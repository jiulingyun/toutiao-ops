import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const URLS = {
  activity: 'https://mp.toutiao.com/profile_v4/activity/task-list',
  hotspot: 'https://mp.toutiao.com/profile_v4/activity/hot-spot',
};

/**
 * 获取创作灵感列表。
 * --type activity（创作活动，默认）| hotspot（热点推荐）
 */
export async function listInspiration(opts) {
  const type = opts.type || 'activity';
  const targetUrl = URLS[type] || URLS.activity;

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

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 4000);
    await dismissOverlays(page);

    if (apiResponses.length > 0) {
      return {
        success: true,
        type,
        source: 'api_intercept',
        data: apiResponses.map(r => r.data),
        apiCount: apiResponses.length,
      };
    }

    // 回退：DOM 提取
    const rawItems = type === 'hotspot'
      ? await extractHotspotItems(page)
      : await extractActivityItems(page);

    // 去重（以 title 为主键）
    const seen = new Set();
    const items = rawItems.filter(item => {
      const key = item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      success: true,
      type,
      source: 'dom_scrape',
      items,
      count: items.length,
    };
  } finally {
    await closeBrowser(context);
  }
}

async function extractActivityItems(page) {
  return page.evaluate(() => {
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
}

async function extractHotspotItems(page) {
  return page.evaluate(() => {
    const items = [];
    // 提取所有包含 # 话题的链接元素
    const links = document.querySelectorAll('a[href*="forum-detail"]');
    for (const a of links) {
      const fullText = a.textContent?.trim() || '';
      // 解析话题名称（#...# 格式）
      const topicMatch = fullText.match(/#(.+?)#/);
      if (!topicMatch) continue;
      const topic = topicMatch[1];

      // 解析阅读和讨论数
      const readMatch = fullText.match(/阅读\s*(\d+)/);
      const talkMatch = fullText.match(/讨论\s*(\d+)/);

      // 从 URL 中提取更多信息
      const href = a.href || '';
      const params = new URLSearchParams(href.split('?')[1] || '');

      items.push({
        title: topic,
        reads: readMatch ? parseInt(readMatch[1]) : (parseInt(params.get('read_num')) || 0),
        discussions: talkMatch ? parseInt(talkMatch[1]) : (parseInt(params.get('talk_num')) || 0),
        link: href,
        forumId: params.get('forum_id') || '',
      });
    }

    // 如果链接提取失败，回退到文本提取
    if (items.length === 0) {
      const bodyText = document.body.innerText;
      const topicRe = /#(.+?)#\s*阅读\s*(\d+)\s*讨论\s*(\d+)/g;
      let m;
      while ((m = topicRe.exec(bodyText)) !== null) {
        items.push({
          title: m[1],
          reads: parseInt(m[2]),
          discussions: parseInt(m[3]),
          link: '',
          forumId: '',
        });
      }
    }

    return items;
  });
}
