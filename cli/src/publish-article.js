import { readFileSync } from 'fs';
import { launchBrowser, closeBrowser, sleep, humanType, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const PUBLISH_URL = 'https://mp.toutiao.com/profile_v4/graphic/publish';

/**
 * 发布图文文章。
 * 全程浏览器自动化：关闭弹窗 -> 填标题 -> 输入正文 -> 上传封面 -> 设置标签 -> 发布/存草稿。
 */
export async function publishArticle(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1000, 2000);
    await dismissOverlays(page);

    // ── 标题 ──
    const titleSelector = 'textarea[placeholder*="标题"], input[placeholder*="标题"], [class*="title"] textarea, [class*="title"] input';
    await page.waitForSelector(titleSelector, { timeout: 15000 });
    await sleep(300, 600);
    await page.click(titleSelector, { force: true });
    await page.keyboard.type(opts.title, { delay: 50 + Math.random() * 80 });
    await sleep(500, 1000);

    // ── 正文 ──
    let content = opts.content || '';
    if (opts.contentFile) {
      content = readFileSync(opts.contentFile, 'utf-8');
    }
    if (content) {
      const editorSelector = '.ProseMirror[contenteditable="true"], [contenteditable="true"], .ql-editor';
      await page.waitForSelector(editorSelector, { timeout: 15000 });
      await sleep(300, 600);
      await page.click(editorSelector, { force: true });
      await sleep(200, 400);

      const paragraphs = content.split('\n').filter(Boolean);
      for (const para of paragraphs) {
        await page.keyboard.type(para, { delay: 30 + Math.random() * 50 });
        await page.keyboard.press('Enter');
        await sleep(100, 300);
      }
    }
    await sleep(500, 1000);

    // ── 封面上传 ──
    if (opts.cover) {
      await uploadCover(page, opts.cover);
    }
    await sleep(500, 1000);

    // ── 标签 ──
    if (opts.tags) {
      await setTags(page, opts.tags);
    }
    await sleep(500, 1000);

    // ── 发布 / 草稿 ──
    await dismissOverlays(page);
    if (opts.draft) {
      const draftBtn = page.locator('button:has-text("存草稿"), button:has-text("保存草稿")').first();
      await draftBtn.click({ timeout: 10000 }).catch(() => {});
    } else {
      const publishBtn = page.locator('button:has-text("发布")').first();
      await publishBtn.click({ timeout: 10000 });
    }

    await sleep(2000, 4000);
    await waitForStable(page);

    return {
      success: true,
      action: opts.draft ? 'draft_saved' : 'published',
      title: opts.title,
      url: page.url(),
    };
  } finally {
    await closeBrowser(context);
  }
}

async function uploadCover(page, coverPath) {
  try {
    const coverTrigger = await page.$('[class*="cover"] [class*="upload"], [class*="cover"] button, text="上传封面"');
    if (coverTrigger) {
      await coverTrigger.click();
      await sleep(500, 1000);
    }
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      await fileInput.setInputFiles(coverPath);
      await sleep(1000, 2000);
      const confirmBtn = await page.$('button:has-text("确定"), button:has-text("确认")');
      if (confirmBtn) await confirmBtn.click();
    }
  } catch {
    // 封面上传失败不阻塞发布
  }
}

async function setTags(page, tagsStr) {
  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  try {
    const tagInput = await page.$('input[placeholder*="标签"], input[placeholder*="tag"], [class*="tag"] input');
    if (tagInput) {
      for (const tag of tags) {
        await tagInput.click();
        await page.keyboard.type(tag, { delay: 60 + Math.random() * 80 });
        await sleep(300, 500);
        await page.keyboard.press('Enter');
        await sleep(300, 600);
      }
    }
  } catch {
    // 标签设置失败不阻塞发布
  }
}
