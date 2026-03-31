import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const COMMENT_PAGE = 'https://mp.toutiao.com/profile_v4/manage/comment/all';

/**
 * 获取评论列表。
 * 先尝试拦截 API，回退到 DOM 提取。
 */
export async function listComments(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    const apiResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('comment') && (url.includes('/pgc/') || url.includes('/api/'))) {
        try {
          const json = await response.json();
          apiResponses.push({ url, data: json });
        } catch {}
      }
    });

    await page.goto(COMMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 3000);

    if (apiResponses.length > 0) {
      return {
        success: true,
        source: 'api_intercept',
        items: apiResponses.map(r => r.data),
        count: apiResponses.length,
      };
    }

    const items = await page.evaluate(() => {
      const rows = document.querySelectorAll('[class*="comment-item"], [class*="comment-card"], [class*="list"] > div[class*="item"]');
      return Array.from(rows).map(row => {
        const author = row.querySelector('[class*="author"], [class*="name"], [class*="user"]')?.textContent?.trim() || '';
        const content = row.querySelector('[class*="content"], [class*="text"], [class*="body"]')?.textContent?.trim() || '';
        const time = row.querySelector('[class*="time"], [class*="date"], time')?.textContent?.trim() || '';
        const articleTitle = row.querySelector('[class*="article"], [class*="title"] a')?.textContent?.trim() || '';
        return { author, content, time, articleTitle };
      }).filter(i => i.content);
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

/**
 * 回复评论。
 * 使用浏览器自动化在评论管理页面操作，避免直接 POST 被风控。
 */
export async function replyComment(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(COMMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1500, 2500);

    // 查找目标评论并展开回复框
    const commented = await page.evaluate((commentId) => {
      const items = document.querySelectorAll('[class*="comment-item"], [class*="comment-card"]');
      for (const item of items) {
        const idAttr = item.getAttribute('data-id') || item.getAttribute('data-comment-id') || '';
        if (idAttr === commentId || item.textContent.includes(commentId)) {
          const replyBtn = item.querySelector('button:has-text("回复"), [class*="reply"]');
          if (replyBtn) {
            replyBtn.click();
            return true;
          }
        }
      }
      return false;
    }, opts.commentId);

    if (!commented) {
      // 尝试用通用方式找回复按钮
      const replyBtns = await page.$$('[class*="reply-btn"], button:has-text("回复")');
      if (replyBtns.length > 0) {
        await replyBtns[0].click();
      }
    }

    await sleep(500, 1000);

    const replyInput = await page.$('[class*="reply"] textarea, [class*="reply"] [contenteditable], [class*="reply-input"] textarea');
    if (replyInput) {
      await replyInput.click();
      await page.keyboard.type(opts.content, { delay: 50 + Math.random() * 80 });
      await sleep(300, 600);

      const submitBtn = await page.$('[class*="reply"] button:has-text("发布"), [class*="reply"] button:has-text("回复"), [class*="reply"] button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      }
    }

    await sleep(2000, 3000);

    return {
      success: true,
      action: 'replied',
      commentId: opts.commentId,
      replyContent: opts.content,
    };
  } finally {
    await closeBrowser(context);
  }
}
