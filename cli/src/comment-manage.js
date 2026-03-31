import { launchBrowser, closeBrowser, sleep, browserFetch, waitForStable, dismissOverlays } from './browser.js';
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
      try {
        const url = response.url();
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        if (url.includes('/static/') || url.includes('.css') || url.includes('.js')) return;
        const json = await response.json();
        if (url.includes('comment') || json?.data?.comments || json?.data?.comment_list) {
          apiResponses.push({ url: url.split('?')[0], data: json });
        }
      } catch {}
    });

    await page.goto(COMMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(3000, 4000);
    await dismissOverlays(page);

    if (apiResponses.length > 0) {
      return {
        success: true,
        source: 'api_intercept',
        items: apiResponses.map(r => r.data),
        count: apiResponses.length,
      };
    }

    // DOM 提取：按评论卡片结构解析，通过页面全文智能分割
    const items = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      // 头条评论管理页的每条评论通常包含：用户名、评论内容、时间、所属文章
      // 尝试多种选择器
      const commentBlocks = document.querySelectorAll(
        '[class*="comment-item"], [class*="comment-card"], [class*="commentItem"], [class*="comment_item"]'
      );

      if (commentBlocks.length > 0) {
        for (const block of commentBlocks) {
          const text = block.innerText?.trim() || '';
          if (!text || text.length < 5) continue;
          const key = text.substring(0, 60);
          if (seen.has(key)) continue;
          seen.add(key);

          const author = block.querySelector('[class*="name"], [class*="author"], [class*="user-name"]')?.textContent?.trim() || '';
          const time = block.querySelector('time, [class*="time"], [class*="date"]')?.textContent?.trim() || '';
          const contentEl = block.querySelector('[class*="content"], [class*="text"], [class*="body"]');
          const content = contentEl?.textContent?.trim() || '';
          const articleEl = block.querySelector('[class*="article"], [class*="source"] a, [class*="title"] a');
          const articleTitle = articleEl?.textContent?.trim() || '';
          if (content && content.length > 1) {
            results.push({ author, content, time, articleTitle });
          }
        }
      }

      // 回退：如果未找到评论块，从页面文本智能提取
      if (results.length === 0) {
        const textContent = document.body.innerText;
        const commentPattern = /(.{2,30})\n(.{5,200})\n(\d{2}-\d{2}\s\d{2}:\d{2})/g;
        let match;
        while ((match = commentPattern.exec(textContent)) !== null) {
          const [, possibleAuthor, content, time] = match;
          const key = content.substring(0, 40);
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({ author: possibleAuthor, content, time, articleTitle: '' });
        }
      }

      return results;
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
