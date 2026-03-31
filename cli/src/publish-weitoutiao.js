import { launchBrowser, closeBrowser, sleep, waitForStable } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const PUBLISH_URL = 'https://mp.toutiao.com/profile_v4/weitoutiao/publish';

/**
 * 发布微头条。
 * 浏览器自动化：输入文本 -> 上传图片（支持多图） -> 发布。
 */
export async function publishWeitoutiao(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1000, 2000);

    // ── 输入内容 ──
    const editorSelector = '[contenteditable="true"], textarea[class*="content"], textarea[placeholder*="内容"], .ProseMirror, [class*="editor"] [contenteditable]';
    await page.waitForSelector(editorSelector, { timeout: 15000 });
    await sleep(300, 600);
    await page.click(editorSelector);
    await sleep(200, 400);

    const paragraphs = opts.content.split('\n').filter(Boolean);
    for (const para of paragraphs) {
      await page.keyboard.type(para, { delay: 40 + Math.random() * 80 });
      await page.keyboard.press('Enter');
      await sleep(100, 300);
    }
    await sleep(500, 1000);

    // ── 图片上传 ──
    if (opts.images) {
      const imagePaths = opts.images.split(',').map(p => p.trim()).filter(Boolean);
      if (imagePaths.length > 0) {
        await uploadImages(page, imagePaths);
      }
    }
    await sleep(500, 1000);

    // ── 发布 ──
    const publishBtn = await page.$('button:has-text("发布"), button:has-text("发表")');
    if (publishBtn) {
      await sleep(300, 600);
      await publishBtn.click();
    }

    await sleep(2000, 4000);
    await waitForStable(page);

    return {
      success: true,
      action: 'published',
      content: opts.content.substring(0, 50) + (opts.content.length > 50 ? '...' : ''),
      url: page.url(),
    };
  } finally {
    await closeBrowser(context);
  }
}

async function uploadImages(page, imagePaths) {
  try {
    const imgTrigger = await page.$('[class*="image"] [class*="upload"], [class*="upload-image"], text="上传图片", [class*="image-btn"]');
    if (imgTrigger) {
      await imgTrigger.click();
      await sleep(500, 1000);
    }

    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      await fileInput.setInputFiles(imagePaths);
      await sleep(1500, 3000);
    }
  } catch {
    // 图片上传失败不阻塞发布
  }
}
