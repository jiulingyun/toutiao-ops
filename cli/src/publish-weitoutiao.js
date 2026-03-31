import { launchBrowser, closeBrowser, sleep, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const PUBLISH_URL = 'https://mp.toutiao.com/profile_v4/weitoutiao/publish';

/**
 * 发布微头条。
 * 参数:
 *   --content      微头条正文（必填）
 *   --images       图片路径，逗号分隔
 *   --topic        话题名称（不含 #）
 *   --first-publish 勾选"头条首发"
 *   --declaration  作品声明，逗号分隔，可选值: 取材网络,引用站内,个人观点,引用AI,虚构演绎,投资观点,健康医疗
 *   --draft        存草稿而非发布
 */
export async function publishWeitoutiao(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1500, 2500);
    await dismissOverlays(page);

    // ── 输入内容 ──
    const editorSelector = [
      '[contenteditable="true"]',
      '[class*="editor"] [contenteditable]',
      'textarea',
    ].join(', ');
    await page.waitForSelector(editorSelector, { timeout: 15000 });
    await sleep(300, 600);
    await page.click(editorSelector, { force: true });
    await sleep(200, 400);

    // 将字面量 \n 转换为真正的换行符
    const text = opts.content.replace(/\\n/g, '\n');
    const paragraphs = text.split('\n');
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      if (para) {
        await page.keyboard.type(para, { delay: 40 + Math.random() * 80 });
      }
      if (i < paragraphs.length - 1) {
        await page.keyboard.press('Enter');
        await sleep(100, 300);
      }
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

    // ── 话题 ──
    if (opts.topic) {
      await setTopic(page, opts.topic);
    }
    await sleep(300, 600);

    // ── 声明首发 ──
    if (opts.firstPublish) {
      await checkFirstPublish(page);
    }
    await sleep(300, 600);

    // ── 作品声明 ──
    if (opts.declaration) {
      await setDeclarations(page, opts.declaration);
    }
    await sleep(500, 1000);

    // ── 发布 / 存草稿 ──
    await dismissOverlays(page);

    if (opts.draft) {
      const draftBtn = page.locator('button:has-text("存草稿")').first();
      await draftBtn.click({ timeout: 10000 });
    } else {
      const publishBtn = page.locator('button:has-text("发布")').first();
      await publishBtn.click({ timeout: 10000 });
    }

    await sleep(2000, 4000);
    await waitForStable(page);

    return {
      success: true,
      action: opts.draft ? 'draft_saved' : 'published',
      content: opts.content.substring(0, 50) + (opts.content.length > 50 ? '...' : ''),
      url: page.url(),
    };
  } finally {
    await closeBrowser(context);
  }
}

async function uploadImages(page, imagePaths) {
  try {
    // 先点击"图片"按钮打开上传对话框
    const imgBtn = page.locator('text=图片').first();
    await imgBtn.click({ timeout: 5000 });
    await sleep(800, 1200);

    // 在对话框中找到文件输入并上传
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    await fileInput.setInputFiles(imagePaths);
    await sleep(3000, 5000);

    // 等待图片上传完成，点击"确定"按钮关闭对话框
    const confirmBtn = page.locator('button:has-text("确定")').first();
    await confirmBtn.waitFor({ timeout: 10000 });
    await sleep(500, 800);
    await confirmBtn.click();
    await sleep(1000, 2000);
  } catch {
    // 图片上传失败不阻塞发布
  }
}

async function setTopic(page, topicName) {
  try {
    const topicBtn = page.locator('text=话题').first();
    await topicBtn.click({ timeout: 5000 });
    await sleep(500, 800);

    const topicInput = page.locator('input[placeholder*="话题"], input[placeholder*="搜索"], [class*="topic"] input').first();
    await topicInput.fill(topicName, { timeout: 5000 });
    await sleep(800, 1200);

    // 选择第一个搜索结果
    const firstResult = page.locator('[class*="topic"] [class*="item"], [class*="search-result"] [class*="item"], [class*="option"]').first();
    await firstResult.click({ timeout: 5000 }).catch(async () => {
      await page.keyboard.press('Enter');
    });
    await sleep(300, 600);
  } catch {
    // 话题设置失败不阻塞
  }
}

async function checkFirstPublish(page) {
  try {
    const checkbox = page.locator('text=头条首发').first();
    await checkbox.click({ timeout: 5000 });
    await sleep(200, 400);
  } catch {
    // 首发勾选失败不阻塞
  }
}

async function setDeclarations(page, declarationStr) {
  const declarations = declarationStr.split(',').map(d => d.trim()).filter(Boolean);
  const labelMap = {
    '取材网络': '取材网络',
    '引用站内': '引用站内',
    '个人观点': '个人观点，仅供参考',
    '引用AI': '引用AI',
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
    } catch {
      // 单个声明勾选失败不阻塞
    }
  }
}
