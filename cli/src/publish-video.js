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

    // ── 封面（必填）──
    await handleVideoCover(page, opts.cover);
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
      await expandAdvancedSettings(page);

      // ── 合集 ──
      if (opts.collection) {
        try {
          const addBtn = page.locator('text=选择合集').first();
          await addBtn.scrollIntoViewIfNeeded().catch(() => {});
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
          const radio = page.locator(`text=${label}`).first();
          await radio.scrollIntoViewIfNeeded().catch(() => {});
          await radio.click({ timeout: 5000 }).catch(() => {});
        }
      }
      await sleep(300, 500);
    }

    // ═══════════════════════════════════
    // 发布 / 存草稿
    // ═══════════════════════════════════
    await dismissOverlays(page);

    // 调试截图：发布前状态
    const { getScreenshotDir } = await import('./browser.js');
    const { mkdirSync } = await import('fs');
    const debugDir = getScreenshotDir(opts.account);
    mkdirSync(debugDir, { recursive: true });
    const beforePath = `${debugDir}/video-before-publish-${Date.now()}.png`;
    await page.screenshot({ path: beforePath, fullPage: true });
    console.error(JSON.stringify({ debug_before: beforePath }));

    if (opts.draft) {
      const draftBtn = page.locator('button:has-text("存草稿")').first();
      await draftBtn.scrollIntoViewIfNeeded().catch(() => {});
      await sleep(300, 500);
      await draftBtn.click({ force: true, timeout: 10000 });
    } else {
      // "发布"按钮在底部最右侧，用 last() 避免匹配到其他元素
      const publishBtn = page.locator('button:has-text("发布")').last();
      await publishBtn.scrollIntoViewIfNeeded().catch(() => {});
      await sleep(300, 500);
      await publishBtn.click({ force: true, timeout: 10000 });
    }

    await sleep(3000, 5000);
    await waitForStable(page);

    // 调试截图：发布后状态
    const afterPath = `${debugDir}/video-after-publish-${Date.now()}.png`;
    await page.screenshot({ path: afterPath, fullPage: true });
    console.error(JSON.stringify({ debug_after: afterPath, final_url: page.url() }));

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

/**
 * 确保"高级设置"处于展开状态。
 * 先检查内部元素是否可见，不可见才点击展开，避免误折叠。
 */
async function expandAdvancedSettings(page) {
  const toggle = page.locator('text=高级设置').first();
  await toggle.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(300, 500);

  // 检查高级设置内部的标志性元素是否已经可见
  const alreadyExpanded = await page.locator('text=作品声明').first().isVisible().catch(() => false)
    || await page.locator('text=选择合集').first().isVisible().catch(() => false)
    || await page.locator('text=谁可以看').first().isVisible().catch(() => false);

  if (!alreadyExpanded) {
    await toggle.click({ timeout: 5000 }).catch(() => {});
    await sleep(800, 1200);
    // 验证展开成功
    const expanded = await page.locator('text=作品声明').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!expanded) {
      // 再试一次
      await toggle.click({ timeout: 5000 }).catch(() => {});
      await sleep(800, 1200);
    }
  }
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
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});
      await checkbox.click({ timeout: 3000 });
      await sleep(200, 400);
    } catch {}
  }
}

async function handleVideoCover(page, coverPath) {
  // 点击"上传封面"打开封面对话框
  const coverTrigger = page.locator('text=上传封面').first();
  await coverTrigger.click({ timeout: 5000 }).catch(() => {});
  await sleep(1500, 2500);

  if (coverPath) {
    // 用户提供了封面图片 → 切到"本地上传" tab
    try {
      const localTab = page.locator('text=本地上传').first();
      await localTab.click({ timeout: 5000 });
      await sleep(800, 1200);

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 10000 }),
        page.locator('text=本地上传').nth(1).click({ timeout: 5000 }).catch(() => {
          // 如果第二个"本地上传"不存在，可能 tab 切换后有上传按钮
          return page.locator('button:has-text("上传"), text=点击上传').first().click({ timeout: 5000 });
        }),
      ]).catch(() => [null]);

      if (fileChooser) {
        await fileChooser.setFiles(coverPath);
        await sleep(3000, 5000);
      }

      // 点击"下一步"或"确定"
      const nextBtn = page.locator('button:has-text("下一步")').first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      if (nextVisible) {
        await nextBtn.click({ timeout: 5000 });
        await sleep(1500, 2500);
      }

      const confirmBtn = page.locator('button:has-text("确定"), button:has-text("确认")').first();
      await confirmBtn.click({ timeout: 5000 }).catch(() => {});
      await sleep(1000, 2000);
    } catch {
      // 本地上传失败，回退到封面截取
      await useFrameCover(page);
    }
  } else {
    // 没有提供封面 → 使用"封面截取"，默认选第一帧
    await useFrameCover(page);
  }

  // 确保对话框关闭
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300, 500);
}

async function useFrameCover(page) {
  try {
    await sleep(2000, 3000);

    // 步骤1：点击"下一步" → 进入封面编辑
    const nextBtn = page.locator('text=下一步').first();
    const nextVisible = await nextBtn.isVisible().catch(() => false);
    console.error(JSON.stringify({ step: 'cover', next_visible: nextVisible }));

    if (!nextVisible) {
      console.error('未找到"下一步"按钮，跳过封面设置');
      return;
    }

    await nextBtn.click({ force: true, timeout: 5000 });
    await sleep(3000, 4000);

    // 步骤2：封面编辑页 → 点击底部红色"确定"按钮（触发二次确认弹窗）
    // 使用 Playwright locator（可穿透 Shadow DOM）
    let okCount = await page.locator('text="确定"').count();
    console.error(JSON.stringify({ step: 'editing_ok', ok_count: okCount }));

    // 从最后一个（最上层）开始尝试点击
    let clicked = false;
    for (let i = okCount - 1; i >= 0; i--) {
      const btn = page.locator('text="确定"').nth(i);
      const vis = await btn.isVisible().catch(() => false);
      if (vis) {
        console.error(JSON.stringify({ step: 'editing_ok_click', index: i }));
        await btn.click({ force: true, timeout: 5000 });
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // 备选：直接试最后一个
      await page.locator('text="确定"').last().click({ force: true, timeout: 5000 }).catch(() => {});
    }
    await sleep(2000, 3000);

    // 步骤3：二次确认弹窗 "完成后无法继续编辑，是否确定完成？" → 点击"确定"
    okCount = await page.locator('text="确定"').count();
    console.error(JSON.stringify({ step: 'confirm_popup', ok_count: okCount }));

    clicked = false;
    for (let i = okCount - 1; i >= 0; i--) {
      const btn = page.locator('text="确定"').nth(i);
      const vis = await btn.isVisible().catch(() => false);
      if (vis) {
        console.error(JSON.stringify({ step: 'confirm_popup_click', index: i }));
        await btn.click({ force: true, timeout: 5000 });
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await page.locator('text="确定"').last().click({ force: true, timeout: 5000 }).catch(() => {});
    }

    // 步骤4：等待封面图片上传完成（对话框自动关闭）
    console.error(JSON.stringify({ step: 'waiting_cover_upload' }));
    await sleep(3000, 5000);
    // 轮询检查对话框是否关闭（最长等 30 秒）
    const uploadStart = Date.now();
    while (Date.now() - uploadStart < 30000) {
      const dialogVisible = await page.locator('text=封面编辑').first().isVisible().catch(() => false);
      if (!dialogVisible) {
        console.error(JSON.stringify({ step: 'cover_dialog_closed' }));
        break;
      }
      await sleep(2000, 3000);
    }
  } catch (e) {
    console.error(JSON.stringify({ cover_error: e.message }));
  }
}

async function clickLabel(page, labelText) {
  try {
    const el = page.locator(`text=${labelText}`).first();
    await el.click({ timeout: 5000 });
    await sleep(200, 400);
  } catch {}
}

