import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const WORKS_URL = 'https://mp.toutiao.com/profile_v4/analysis/works-overall/all';
const FANS_URL = 'https://mp.toutiao.com/profile_v4/analysis/fans/overview';
const INCOME_URL = 'https://mp.toutiao.com/profile_v4/analysis/income-overview';

/**
 * 获取作品数据。
 * 导航到作品数据页，拦截 API 响应获取结构化数据。
 */
export async function getWorksAnalytics(opts) {
  return collectAnalytics(WORKS_URL, 'works', opts);
}

/**
 * 获取粉丝数据。
 */
export async function getFansAnalytics(opts) {
  return collectAnalytics(FANS_URL, 'fans', opts);
}

/**
 * 获取收益数据。
 */
export async function getIncomeAnalytics(opts) {
  return collectAnalytics(INCOME_URL, 'income', opts);
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

    // 回退：从页面可见文本中提取数据对（标签-数值）
    const pageData = await page.evaluate(() => {
      const metrics = {};

      // 方法1：找"标签 + 数值"的相邻元素对
      const allEls = document.querySelectorAll('span, div, p, td, h3, h4, label');
      const visited = new Set();
      for (const el of allEls) {
        if (visited.has(el)) continue;
        const text = el.innerText?.trim();
        if (!text || text.length > 50) continue;

        // 找紧邻的兄弟或父子中的数值
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

      // 方法2：纯文本扫描，提取概览区域的数据
      const bodyText = document.body.innerText;
      const patterns = [
        /展现量[：:\s]*([0-9,]+)/,
        /阅读量[：:\s]*([0-9,]+)/,
        /播放量[：:\s]*([0-9,]+)/,
        /评论量?[：:\s]*([0-9,]+)/,
        /点赞量?[：:\s]*([0-9,]+)/,
        /收藏量?[：:\s]*([0-9,]+)/,
        /转发量?[：:\s]*([0-9,]+)/,
        /关注量?[：:\s]*([0-9,]+)/,
        /粉丝[总数量]*[：:\s]*([0-9,]+)/,
        /涨粉[数]*[：:\s]*([0-9,]+)/,
        /掉粉[数]*[：:\s]*([0-9,]+)/,
        /总收入[：:\s]*([\d,.]+)/,
        /昨日收入[：:\s]*([\d,.]+)/,
        /累计收入[：:\s]*([\d,.]+)/,
        /预估收入[：:\s]*([\d,.]+)/,
        /基础收益[：:\s]*([\d,.]+)/,
        /创作收益[：:\s]*([\d,.]+)/,
        /发文量?[：:\s]*([0-9,]+)/,
      ];
      for (const re of patterns) {
        const m = bodyText.match(re);
        if (m) {
          const label = re.source.split('[')[0].replace(/\\/g, '');
          metrics[label] = m[1];
        }
      }

      return metrics;
    });

    return {
      success: true,
      category,
      source: apiResponses.length > 0 ? 'api_intercept' : 'dom_scrape',
      metrics: pageData,
    };
  } finally {
    await closeBrowser(context);
  }
}
