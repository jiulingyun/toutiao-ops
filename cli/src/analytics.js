import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const WORKS_URLS = {
  all: 'https://mp.toutiao.com/profile_v4/analysis/works-overall/all',
  article: 'https://mp.toutiao.com/profile_v4/analysis/works-overall/article',
  video: 'https://mp.toutiao.com/profile_v4/analysis/works-overall/video',
  weitoutiao: 'https://mp.toutiao.com/profile_v4/analysis/works-overall/weitoutiao',
};

const FANS_URL = 'https://mp.toutiao.com/profile_v4/analysis/fans/overview';

const INCOME_URLS = {
  all: 'https://mp.toutiao.com/profile_v4/analysis/income-overview',
  article: 'https://mp.toutiao.com/profile_v4/analysis/new-income-advertisement',
  video: 'https://mp.toutiao.com/profile_v4/analysis/video-income',
};

/**
 * 获取作品数据。
 * --type 支持: all / article / video / weitoutiao
 */
export async function getWorksAnalytics(opts) {
  const type = opts.type || 'all';
  const url = WORKS_URLS[type] || WORKS_URLS.all;
  return collectAnalytics(url, `works_${type}`, opts);
}

/**
 * 获取粉丝数据。
 */
export async function getFansAnalytics(opts) {
  return collectAnalytics(FANS_URL, 'fans', opts);
}

/**
 * 获取收益数据。
 * --type 支持: all / article / video
 */
export async function getIncomeAnalytics(opts) {
  const type = opts.type || 'all';
  const url = INCOME_URLS[type] || INCOME_URLS.all;
  return collectAnalytics(url, `income_${type}`, opts);
}

/**
 * 获取单个作品的详细数据。
 * 直接调用头条数据统计 API：/mp/agw/statistic/v2/item/info
 * --content-id  作品 ID（item_id / gidStr）
 * --content-type 内容类型编号（默认 2）: 2=图文/微头条, 3=视频 等
 */
export async function getContentDetail(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    // 先导航到头条号页面以获取 cookie 上下文
    await page.goto('https://mp.toutiao.com/profile_v4/manage/content/all', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await waitForStable(page);
    await sleep(1500, 2500);

    const itemId = opts.contentId;
    const contentType = opts.contentType || '2';

    if (!itemId) {
      // 未指定 ID，从列表中取第一个作品的 ID
      const firstId = await page.evaluate(() => {
        const link = document.querySelector('.genre-item a[href*="toutiao.com/i"], .genre-item a[href*="toutiao.com/item/"]');
        if (link) {
          const m = link.href.match(/\/(?:i|item\/)(\d+)/);
          return m ? m[1] : null;
        }
        return null;
      });

      if (!firstId) {
        return { success: false, error: '未找到作品，请通过 --content-id 指定作品 ID' };
      }

      opts.contentId = firstId;
    }

    // 通过浏览器内 fetch 直接调用统计 API（复用登录 session）
    const data = await page.evaluate(async ({ id, type }) => {
      const url = `https://mp.toutiao.com/mp/agw/statistic/v2/item/info?item_id=${id}&type=${type}&app_id=1231`;
      const res = await fetch(url, { credentials: 'include' });
      return res.json();
    }, { id: opts.contentId, type: contentType });

    return {
      success: true,
      category: 'content_detail',
      contentId: opts.contentId,
      contentType,
      source: 'api_fetch',
      data,
    };
  } finally {
    await closeBrowser(context);
  }
}

async function collectAnalytics(targetUrl, category, opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    const apiResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      try {
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        // 只拦截与分析数据相关的 API
        const isRelevant = url.includes('analysis') || url.includes('statistic')
          || url.includes('overview') || url.includes('income')
          || url.includes('fans_data') || url.includes('data_overview')
          || url.includes('/pgc/ma/');
        if (!isRelevant) return;
        const json = await response.json();
        apiResponses.push({ url: url.split('?')[0], data: json });
      } catch {}
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(3000, 5000);
    await dismissOverlays(page);

    if (apiResponses.length > 0) {
      return {
        success: true,
        category,
        source: 'api_intercept',
        data: apiResponses.map(r => r.data),
        apiCount: apiResponses.length,
      };
    }

    // 回退：DOM 提取
    const pageData = await extractPageMetrics(page);
    return {
      success: true,
      category,
      source: 'dom_scrape',
      metrics: pageData,
    };
  } finally {
    await closeBrowser(context);
  }
}

async function extractPageMetrics(page) {
  return page.evaluate(() => {
    const metrics = {};

    // 方法1：找"标签 + 数值"的相邻元素对
    const allEls = document.querySelectorAll('span, div, p, td, h3, h4, label');
    const visited = new Set();
    for (const el of allEls) {
      if (visited.has(el)) continue;
      const text = el.innerText?.trim();
      if (!text || text.length > 50) continue;

      const sibling = el.nextElementSibling;
      if (sibling) {
        const sibText = sibling.innerText?.trim();
        if (sibText && /^[\d,.\-+%万亿千百元￥]+$/.test(sibText.replace(/\s/g, ''))) {
          if (!visited.has(sibling) && text.length < 20) {
            metrics[text] = sibText;
            visited.add(el);
            visited.add(sibling);
          }
        }
      }
    }

    // 方法2：正则匹配关键指标
    const bodyText = document.body.innerText;
    const patterns = [
      [/展现量[：:\s]*([0-9,]+)/, '展现量'],
      [/阅读量[：:\s]*([0-9,]+)/, '阅读量'],
      [/播放量[：:\s]*([0-9,]+)/, '播放量'],
      [/评论量[：:\s]*([0-9,]+)/, '评论量'],
      [/点赞量[：:\s]*([0-9,]+)/, '点赞量'],
      [/收藏量[：:\s]*([0-9,]+)/, '收藏量'],
      [/转发量[：:\s]*([0-9,]+)/, '转发量'],
      [/关注量[：:\s]*([0-9,]+)/, '关注量'],
      [/粉丝[总数量]*[：:\s]*([0-9,]+)/, '粉丝数'],
      [/涨粉[数]*[：:\s]*([0-9,]+)/, '涨粉数'],
      [/掉粉[数]*[：:\s]*([0-9,]+)/, '掉粉数'],
      [/总收入[：:\s]*([\d,.]+)/, '总收入'],
      [/昨日收入[：:\s]*([\d,.]+)/, '昨日收入'],
      [/累计收入[：:\s]*([\d,.]+)/, '累计收入'],
      [/预估收入[：:\s]*([\d,.]+)/, '预估收入'],
      [/基础收益[：:\s]*([\d,.]+)/, '基础收益'],
      [/创作收益[：:\s]*([\d,.]+)/, '创作收益'],
      [/发文量[：:\s]*([0-9,]+)/, '发文量'],
    ];
    for (const [re, label] of patterns) {
      const m = bodyText.match(re);
      if (m && !metrics[label]) {
        metrics[label] = m[1];
      }
    }

    return metrics;
  });
}
