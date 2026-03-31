import { launchBrowser, closeBrowser, sleep, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const COMMENT_PAGE = 'https://mp.toutiao.com/profile_v4/manage/comment/all';

/**
 * 获取评论列表（含子评论/回复）。
 * 优先 API 拦截；API 数据中已包含 reply_count。
 * 若指定 --with-replies，会逐条点击评论从右侧面板提取子评论。
 */
export async function listComments(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    const apiData = [];
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        const json = await response.json();
        if (url.includes('comment') || json?.data?.comments || json?.data?.comment_list) {
          apiData.push(json);
        }
      } catch {}
    });

    await page.goto(COMMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(3000, 4000);
    await dismissOverlays(page);

    // 优先使用 API 数据
    const apiComments = apiData.flatMap(d => d?.data || []).filter(c => c.id_str);
    if (apiComments.length > 0) {
      const comments = apiComments.map(formatApiComment);

      // 如果需要获取子评论
      if (opts.withReplies) {
        for (let i = 0; i < comments.length; i++) {
          if (comments[i].replyCount > 0) {
            comments[i].replies = await extractRepliesForComment(page, i);
          }
        }
      }

      return { success: true, source: 'api_intercept', comments, count: comments.length };
    }

    // DOM 回退
    const comments = await extractCommentsFromDOM(page);
    return { success: true, source: 'dom_scrape', comments, count: comments.length };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 点赞评论。
 * 通过 commentId（精确 ID）或评论内容片段定位评论，点击「赞」按钮。
 */
export async function likeComment(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(COMMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 3000);
    await dismissOverlays(page);

    // 找到目标评论所在的 .all-comment-item-wrap
    const items = await page.$$('.all-comment-item-wrap');
    let targetItem = null;
    for (const item of items) {
      const text = await item.evaluate(el => el.innerText);
      if (text.includes(opts.commentId)) {
        targetItem = item;
        break;
      }
    }

    // 索引回退
    if (!targetItem) {
      const idx = parseInt(opts.commentId);
      if (!isNaN(idx) && idx >= 1 && idx <= items.length) {
        targetItem = items[idx - 1];
      }
    }

    if (!targetItem) {
      return { success: false, error: `未找到评论 ${opts.commentId}` };
    }

    // 点击该评论内的「赞」按钮（.digg）
    const diggBtn = await targetItem.$('.digg');
    if (!diggBtn) {
      return { success: false, error: '未找到点赞按钮' };
    }

    // 记录点赞前状态
    const beforeText = await diggBtn.evaluate(el => el.innerText?.trim());
    await diggBtn.click();
    await sleep(1000, 1500);

    // 检查点赞后状态变化
    const afterText = await diggBtn.evaluate(el => el.innerText?.trim());
    const afterClass = await diggBtn.evaluate(el => el.className);
    const liked = afterText !== beforeText || afterClass.includes('active') || afterClass.includes('liked');

    return {
      success: true,
      action: 'liked',
      commentId: opts.commentId,
      before: beforeText,
      after: afterText,
      message: liked ? '点赞成功' : '点赞状态已切换（可能已取消赞）',
    };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 回复评论。
 * 流程：点击左侧评论 → 右侧面板展开 → 输入回复 → 点击发布。
 */
export async function replyComment(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);

    const apiData = [];
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        const json = await response.json();
        if (url.includes('comment') && json?.data) {
          apiData.push(json);
        }
      } catch {}
    });

    await page.goto(COMMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(2000, 3000);
    await dismissOverlays(page);

    // 1. 在左侧列表找到目标评论并点击选中（打开右侧面板）
    const found = await selectComment(page, opts.commentId);
    if (!found) {
      return { success: false, error: `未找到评论 ${opts.commentId}，请确认评论 ID 正确` };
    }
    await sleep(1500, 2000);

    // 2. 在右侧面板中找到可见的回复输入框
    //    左侧每条评论内嵌的 textarea 是隐藏的，右侧面板的 textarea 才可见
    const allTextareas = await page.$$('textarea.byte-textarea');
    let visibleTextarea = null;
    for (const ta of allTextareas) {
      const visible = await ta.isVisible();
      if (visible) { visibleTextarea = ta; break; }
    }
    if (!visibleTextarea) {
      return { success: false, error: '未找到可见的回复输入框' };
    }

    await visibleTextarea.click();
    await sleep(300, 500);
    const replyText = opts.content.replace(/\\n/g, '\n');
    await page.keyboard.type(replyText, { delay: 50 + Math.random() * 80 });
    await sleep(500, 800);

    // 3. 找到可见的发布按钮并点击
    const allSubmitBtns = await page.$$('.reply-box-submit');
    let visibleSubmitBtn = null;
    for (const btn of allSubmitBtns) {
      const visible = await btn.isVisible();
      if (visible) { visibleSubmitBtn = btn; break; }
    }
    if (!visibleSubmitBtn) {
      return { success: false, error: '未找到发布按钮' };
    }

    await visibleSubmitBtn.click({ force: true });
    await sleep(2000, 3000);

    // 4. 检查是否发布成功（输入框被清空）
    const textareaValue = await visibleTextarea.evaluate(el => el.value);
    const replied = !textareaValue || textareaValue.trim() === '';

    return {
      success: replied,
      action: 'replied',
      commentId: opts.commentId,
      replyContent: opts.content,
      message: replied ? '回复成功' : '回复可能未成功，请检查页面',
    };
  } finally {
    await closeBrowser(context);
  }
}

// ── 内部辅助函数 ──

function formatApiComment(c) {
  return {
    id: c.id_str,
    author: c.user?.name || '',
    authorAvatar: c.user?.avatar_url || '',
    authorId: c.user?.id_str || '',
    isFan: c.user?.follow_status === 2,
    content: c.text || '',
    time: formatTimestamp(c.create_time),
    timestamp: c.create_time,
    diggCount: c.digg_count || 0,
    replyCount: c.reply_count || 0,
    location: c.publish_loc_info || '',
    articleTitle: c.article_info?.title?.substring(0, 60) || '',
    articleType: c.article_info?.article_type || '',
    articleUrl: c.article_info?.url || '',
    replies: [],
  };
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 点击选中指定评论。
 * 支持通过 commentId（精确 ID）或评论内容片段匹配。
 */
async function selectComment(page, commentId) {
  // 先尝试用 API 拦截到的数据与 DOM 顺序对应
  const items = await page.$$('.all-comment-item-wrap');
  if (!items.length) return false;

  for (const item of items) {
    const text = await item.evaluate(el => el.innerText);
    // 匹配评论 ID 或内容片段
    if (text.includes(commentId)) {
      await item.click();
      await sleep(500, 800);
      const isSelected = await item.evaluate(el => el.classList.contains('select'));
      if (isSelected) return true;
    }
  }

  // 如果是纯数字 ID，尝试通过 API 数据中的内容来匹配
  // commentId 可能是评论的 id_str，需要与 DOM 中的评论内容对应
  // 回退：通过索引（如 "1" 表示第一条）
  const idx = parseInt(commentId);
  if (!isNaN(idx) && idx >= 1 && idx <= items.length) {
    await items[idx - 1].click();
    await sleep(500, 800);
    return true;
  }

  return false;
}

/**
 * 从右侧面板提取指定评论的子评论（回复）。
 * 需要先点击左侧第 index 条评论。
 */
async function extractRepliesForComment(page, index) {
  const items = await page.$$('.all-comment-item-wrap');
  if (index >= items.length) return [];

  await items[index].click();
  await sleep(1500, 2000);

  return page.evaluate(() => {
    const replies = [];
    const subItems = document.querySelectorAll('.sub-comment-item');
    for (const item of subItems) {
      const author = item.querySelector('.sub-comment-item-title a')?.textContent?.trim() || '';
      const avatar = item.querySelector('.sub-comment-item-avatar img')?.src || '';
      // 提取时间
      let time = '';
      const allSpans = item.querySelectorAll('span, div');
      for (const s of allSpans) {
        if (s.children.length === 0 && /^\d{2}-\d{2}\s\d{2}:\d{2}$/.test(s.textContent?.trim())) {
          time = s.textContent.trim();
          break;
        }
      }
      // 提取内容：用完整文本减去已知部分
      const fullText = item.innerText?.trim() || '';
      const noise = [author, time, '删除', '回复', '赞'];
      let content = fullText;
      for (const n of noise) {
        if (n) content = content.replace(n, '');
      }
      content = content.replace(/\n+/g, ' ').trim();
      if (content) {
        replies.push({ author, avatar, content, time });
      }
    }
    return replies;
  });
}

async function extractCommentsFromDOM(page) {
  return page.evaluate(() => {
    const results = [];
    const seen = new Set();
    const items = document.querySelectorAll('.all-comment-item-wrap');

    for (const wrap of items) {
      const item = wrap.querySelector('.comment-item');
      if (!item) continue;

      const author = item.querySelector('.comment-item-title')?.textContent?.trim() || '';
      const content = item.querySelector('.comment-item-content')?.textContent?.trim() || '';
      const time = item.querySelector('.comment-item-timer')?.textContent?.trim() || '';
      const articleEl = item.querySelector('.comment-item-header-extra-title');
      const articleTitle = articleEl?.textContent?.trim()?.substring(0, 60) || '';
      const articleUrl = articleEl?.href || '';

      if (!content || seen.has(content)) continue;
      seen.add(content);
      results.push({ author, content, time, articleTitle, articleUrl });
    }
    return results;
  });
}
