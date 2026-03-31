import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable } from './browser.js';
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
      const isAnalyticsApi =
        url.includes('/pgc/ma/') ||
        url.includes('/api/') && (
          url.includes('analysis') ||
          url.includes('statistic') ||
          url.includes('overview') ||
          url.includes('income') ||
          url.includes('fans') ||
          url.includes('data')
        );
      if (isAnalyticsApi) {
        try {
          const json = await response.json();
          apiResponses.push({ url, data: json });
        } catch {}
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 4000);

    if (apiResponses.length > 0) {
      return {
        success: true,
        category,
        source: 'api_intercept',
        data: apiResponses.map(r => r.data),
        apiCount: apiResponses.length,
      };
    }

    // 回退：从 DOM 抓取数据卡片
    const cards = await page.evaluate(() => {
      const metrics = {};
      const statCards = document.querySelectorAll('[class*="stat"], [class*="metric"], [class*="card"], [class*="overview"] [class*="item"]');
      statCards.forEach(card => {
        const label = card.querySelector('[class*="label"], [class*="name"], [class*="title"]')?.textContent?.trim() || '';
        const value = card.querySelector('[class*="value"], [class*="number"], [class*="count"]')?.textContent?.trim() || '';
        if (label && value) {
          metrics[label] = value;
        }
      });
      return metrics;
    });

    // 尝试获取趋势图表数据
    const chartData = await page.evaluate(() => {
      const charts = document.querySelectorAll('[class*="chart"], [class*="trend"], canvas');
      return { chartCount: charts.length, hasChart: charts.length > 0 };
    });

    return {
      success: true,
      category,
      source: 'dom_scrape',
      metrics: cards,
      chart: chartData,
    };
  } finally {
    await closeBrowser(context);
  }
}
