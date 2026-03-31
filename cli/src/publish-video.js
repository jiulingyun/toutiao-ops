import { launchBrowser, closeBrowser, sleep, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const UPLOAD_URL = 'https://mp.toutiao.com/profile_v4/xigua/upload-video';

/**
 * 发布视频。
 * 流程：上传视频 -> 等待上传完成 -> 填写基本信息 -> 高级设置 -> 发布/存草稿。
 */
export async function publishVideo(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1500, 2500);
    await dismissOverlays(page);

    // ═══════════════════════════════════
    // 第一步：上传视频文件（input 隐藏，直接 setInputFiles）
    // ═══════════════════════════════════
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(opts.file);
    await sleep(2000, 3000);

    await waitForUpload(page);
    await sleep(3000, 5000);
    await waitForStable(page);
    await dismissOverlays(page);

    // ═══════════════════════════════════
    // 第二步：基本信息
    // ═══════════════════════════════════
    await page.locator('text=基本信息').first().waitFor({ timeout: 30000 }).catch(() => {});
    await sleep(500, 1000);

    // ── 标题（上传后自动填入文件名，清空后重新输入）──
    const titleField = page.locator('input[placeholder="请输入 1～30 个字符"]').first();
    await titleField.waitFor({ timeout: 15000 });
    await titleField.click({ force: true });
    await titleField.fill('');
    await sleep(200, 400);
    await page.keyboard.type(opts.title, { delay: 50 + Math.random() * 80 });
    await sleep(500, 800);

    // ── 话题 ──
    if (opts.topic) {
      const topicField = page.locator('input[placeholder="请输入"]').first();
      await topicField.click({ force: true, timeout: 5000 }).catch(() => {});
      await sleep(300, 500);
      await page.keyboard.type(opts.topic, { delay: 50 + Math.random() * 80 });
      await sleep(800, 1200);
      // 选第一个搜索结果
      const firstResult = page.locator('[class*="option"], [class*="item"], [class*="suggest"]').first();
      await firstResult.click({ timeout: 5000 }).catch(async () => {
        await page.keyboard.press('Enter');
      });
      await sleep(300, 600);
    }

    // ── 封面上传 ──
    if (opts.cover) {
      try {
        const coverTrigger = page.locator('text=上传封面').first();
        await coverTrigger.click({ timeout: 5000 });
        await sleep(500, 1000);
        const imgInput = page.locator('input[type="file"][accept*="image"]').first();
        await imgInput.setInputFiles(opts.cover);
        await sleep(2000, 4000);
        const confirmBtn = page.locator('button:has-text("确定"), button:has-text("确认")').first();
        await confirmBtn.click({ timeout: 5000 }).catch(() => {});
        await sleep(500, 1000);
      } catch {}
    }
    await sleep(500, 800);

    // ── 视频简介 ──
    if (opts.description) {
      const descField = page.locator('textarea[placeholder="请输入视频简介"]').first();
      await descField.click({ force: true }).catch(() => {});
      const desc = opts.description.replace(/\\n/g, '\n');
      await descField.fill(desc).catch(async () => {
        await page.keyboard.type(desc, { delay: 40 + Math.random() * 60 });
      });
      await sleep(300, 500);
    }

    // ── 视频生成图文 ──
    if (opts.genArticle) {
      await clickLabel(page, '生成图文');
    }
    await sleep(300, 500);

    // ═══════════════════════════════════
    // 高级设置
    // ═══════════════════════════════════
    const needAdvanced = opts.collection || opts.declaration || (opts.visibility && opts.visibility !== 'public');
    if (needAdvanced) {
      const advancedToggle = page.locator('text=高级设置').first();
      await advancedToggle.click({ timeout: 5000 }).catch(() => {});
      await sleep(500, 1000);

      // ── 合集 ──
      if (opts.collection) {
        try {
          const addBtn = page.locator('text=选择合集').first();
          await addBtn.click({ timeout: 5000 });
          await sleep(500, 1000);
          const item = page.locator(`text=${opts.collection}`).first();
          await item.click({ timeout: 5000 });
          await sleep(300, 600);
          const confirmBtn = page.locator('button:has-text("确定")').first();
          await confirmBtn.click({ timeout: 3000 }).catch(() => {});
        } catch {}
      }
      await sleep(300, 500);

      // ── 作品声明 ──
      if (opts.declaration) {
        await setDeclarations(page, opts.declaration);
      }
      await sleep(300, 500);

      // ── 谁可以看 ──
      if (opts.visibility && opts.visibility !== 'public') {
        const labelMap = { fans: '粉丝可见', private: '仅我可见' };
        const label = labelMap[opts.visibility];
        if (label) {
          await clickLabel(page, label);
        }
      }
      await sleep(300, 500);
    }

    // ═══════════════════════════════════
    // 发布 / 存草稿
    // ═══════════════════════════════════
    await dismissOverlays(page);

    if (opts.draft) {
      const draftBtn = page.locator('button:has-text("存草稿")').first();
      await draftBtn.click({ timeout: 10000 });
    } else {
      const publishBtn = page.locator('button:has-text("发布")').last();
      await publishBtn.click({ timeout: 10000 });
    }

    await sleep(3000, 5000);
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

async function waitForUpload(page) {
  const maxWait = 10 * 60 * 1000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const status = await page.evaluate(() => {
      const body = document.body.innerText;
      if (body.includes('上传成功')) return 'done';
      if (body.includes('上传失败')) return 'failed';
      const titleInput = document.querySelector('input[placeholder*="字符"]');
      if (titleInput) return 'done';
      return 'uploading';
    });

    if (status === 'done') return;
    if (status === 'failed') throw new Error('视频上传失败');
    await sleep(2000, 4000);
  }

  throw new Error('视频上传超时（10 分钟）');
}

async function setDeclarations(page, declarationStr) {
  const declarations = declarationStr.split(',').map(d => d.trim()).filter(Boolean);
  const labelMap = {
    '取自站外': '取自站外',
    '引用站内': '引用站内',
    '自行拍摄': '自行拍摄',
    'AI生成': 'AI生成',
    '虚构演绎': '虚构演绎，故事经历',
    '投资观点': '投资观点，仅供参考',
    '健康医疗': '健康医疗分享，仅供参考',
  };

  for (const decl of declarations) {
    const fullLabel = labelMap[decl] || decl;
    try {
      const checkbox = page.locator(`text=${fullLabel}`).first();
      await checkbox.click({ timeout: 3000 });
      await sleep(200, 400);
    } catch {}
  }
}

async function clickLabel(page, labelText) {
  try {
    const el = page.locator(`text=${labelText}`).first();
    await el.click({ timeout: 5000 });
    await sleep(200, 400);
  } catch {}
}
