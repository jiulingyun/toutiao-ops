import { launchBrowser, closeBrowser, sleep, humanType, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const UPLOAD_URL = 'https://mp.toutiao.com/profile_v4/xigua/upload-video';

/**
 * 发布视频。
 * 浏览器自动化：上传视频文件 -> 等待上传/转码 -> 填写标题描述 -> 设置封面 -> 发布。
 */
export async function publishVideo(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1000, 2000);
    await dismissOverlays(page);

    // ── 上传视频文件 ──
    const fileInput = await page.waitForSelector(
      'input[type="file"][accept*="video"], input[type="file"][accept*="mp4"]',
      { timeout: 15000 }
    );
    await fileInput.setInputFiles(opts.file);
    await sleep(1000, 2000);

    // ── 等待上传完成 ──
    await waitForUpload(page);

    // ── 标题 ──
    const titleSelector = 'textarea[placeholder*="标题"], input[placeholder*="标题"], [class*="title"] textarea, [class*="title"] input';
    const titleEl = await page.waitForSelector(titleSelector, { timeout: 15000 }).catch(() => null);
    if (titleEl) {
      await titleEl.click();
      await titleEl.fill('');
      await sleep(200, 400);
      await humanType(page, titleSelector, opts.title);
    }
    await sleep(500, 1000);

    // ── 描述 ──
    if (opts.description) {
      const descSelector = 'textarea[placeholder*="简介"], textarea[placeholder*="描述"], [class*="desc"] textarea';
      const descEl = await page.$(descSelector);
      if (descEl) {
        await descEl.click();
        await page.keyboard.type(opts.description, { delay: 40 + Math.random() * 60 });
      }
      await sleep(500, 1000);
    }

    // ── 封面 ──
    if (opts.cover) {
      await uploadVideoCover(page, opts.cover);
    }
    await sleep(500, 1000);

    // ── 标签 ──
    if (opts.tags) {
      await setVideoTags(page, opts.tags);
    }
    await sleep(500, 1000);

    // ── 发布 ──
    await dismissOverlays(page);
    const publishBtn = page.locator('button:has-text("发布")').first();
    await publishBtn.click({ timeout: 10000 });

    await sleep(3000, 5000);
    await waitForStable(page);

    return {
      success: true,
      action: 'published',
      title: opts.title,
      url: page.url(),
    };
  } finally {
    await closeBrowser(context);
  }
}

/**
 * 轮询等待视频上传 / 转码完成，最多等 10 分钟。
 */
async function waitForUpload(page) {
  const maxWait = 10 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const progress = await page.evaluate(() => {
      const el = document.querySelector('[class*="progress"], [class*="upload-status"], [class*="percent"]');
      return el?.textContent?.trim() || '';
    });

    const done = progress.includes('100%') || progress.includes('完成') || progress.includes('成功');
    if (done) return;

    const hasPublishBtn = await page.$('button:has-text("发布")');
    if (hasPublishBtn) return;

    await sleep(2000, 4000);
  }

  throw new Error('视频上传/转码超时（10 分钟）');
}

async function uploadVideoCover(page, coverPath) {
  try {
    const coverTrigger = await page.$('[class*="cover"] [class*="upload"], [class*="cover"] button, text="上传封面"');
    if (coverTrigger) {
      await coverTrigger.click();
      await sleep(500, 1000);
    }
    const imgInput = await page.$('input[type="file"][accept*="image"]');
    if (imgInput) {
      await imgInput.setInputFiles(coverPath);
      await sleep(1000, 2000);
      const confirmBtn = await page.$('button:has-text("确定"), button:has-text("确认")');
      if (confirmBtn) await confirmBtn.click();
    }
  } catch {
    // 封面上传失败不阻塞发布
  }
}

async function setVideoTags(page, tagsStr) {
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
