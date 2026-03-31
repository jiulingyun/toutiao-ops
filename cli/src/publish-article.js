import { readFileSync } from 'fs';
import { launchBrowser, closeBrowser, sleep, waitForStable, dismissOverlays } from './browser.js';
import { ensureLoggedIn } from './auth-guard.js';

const PUBLISH_URL = 'https://mp.toutiao.com/profile_v4/graphic/publish';

/**
 * 发布图文文章。
 * 参数:
 *   --title          文章标题（必填）
 *   --content        正文文本
 *   --content-file   从文件读取正文
 *   --cover          封面图片路径（单图模式）
 *   --cover-mode     封面模式: single / triple / none（默认 single）
 *   --first-publish  勾选"头条首发"
 *   --collection     添加至合集名称
 *   --no-weitoutiao  取消"同时发布微头条"
 *   --declaration    作品声明，逗号分隔
 *   --draft          存草稿
 */
export async function publishArticle(opts) {
  const { context, page } = await launchBrowser(opts);
  try {
    await ensureLoggedIn(page);
    await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForStable(page);
    await sleep(1500, 2500);
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
    // 将字面量 \n 转换为真正的换行符
    content = content.replace(/\\n/g, '\n');
    if (content) {
      const editorSelector = '[contenteditable="true"]';
      await page.waitForSelector(editorSelector, { timeout: 15000 });
      await sleep(300, 600);
      await page.click(editorSelector, { force: true });
      await sleep(200, 400);

      const paragraphs = content.split('\n');
      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        if (para) {
          await page.keyboard.type(para, { delay: 30 + Math.random() * 50 });
        }
        if (i < paragraphs.length - 1) {
          await page.keyboard.press('Enter');
          await sleep(100, 300);
        }
      }
    }
    await sleep(500, 1000);

    // ── 展示封面 ──
    await setCoverMode(page, opts.coverMode || 'single', opts.cover);
    await sleep(500, 1000);

    // ── 声明首发 ──
    if (opts.firstPublish) {
      await clickLabel(page, '头条首发');
    }
    await sleep(300, 500);

    // ── 合集 ──
    if (opts.collection) {
      await addToCollection(page, opts.collection);
    }
    await sleep(300, 500);

    // ── 同时发布微头条（默认已勾选，--no-weitoutiao 取消） ──
    if (opts.weitoutiao === false) {
      await uncheckWeitoutiao(page);
    }
    await sleep(300, 500);

    // ── 作品声明 ──
    if (opts.declaration) {
      await setDeclarations(page, opts.declaration);
    }
    await sleep(500, 1000);

    // ── 发布 / 草稿 ──
    await dismissOverlays(page);
    if (opts.draft) {
      // 页面底部没有独立草稿按钮，草稿已自动保存
      return {
        success: true,
        action: 'draft_saved',
        title: opts.title,
        url: page.url(),
      };
    }

    // 点击"预览并发布"按钮
    const publishBtn = page.locator('button:has-text("预览并发布"), button:has-text("发布")').first();
    await publishBtn.click({ timeout: 10000 });
    await sleep(2000, 4000);

    // 可能弹出确认对话框，点击确认
    const confirmBtn = page.locator('button:has-text("确认发布"), button:has-text("确定")').first();
    await confirmBtn.click({ timeout: 5000 }).catch(() => {});

    await sleep(2000, 4000);
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

async function setCoverMode(page, mode, coverPath) {
  try {
    const modeLabels = {
      single: '单图',
      triple: '三图',
      none: '无封面',
    };
    const label = modeLabels[mode] || modeLabels.single;

    // 点击对应的封面模式单选
    const radio = page.locator(`text=${label}`).first();
    await radio.click({ timeout: 5000 });
    await sleep(500, 800);

    // 如果选了 single 或 triple 且提供了封面图，上传
    if (mode !== 'none' && coverPath) {
      const fileInput = await page.$('input[type="file"][accept*="image"]');
      if (fileInput) {
        const paths = coverPath.split(',').map(p => p.trim()).filter(Boolean);
        await fileInput.setInputFiles(paths);
        await sleep(2000, 4000);
        // 可能弹出裁剪确认框
        const confirmBtn = page.locator('button:has-text("确定"), button:has-text("确认")').first();
        await confirmBtn.click({ timeout: 5000 }).catch(() => {});
        await sleep(500, 1000);
      }
    }
  } catch {
    // 封面设置失败不阻塞
  }
}

async function addToCollection(page, collectionName) {
  try {
    const addBtn = page.locator('text=添加至合集').first();
    await addBtn.click({ timeout: 5000 });
    await sleep(500, 1000);

    // 在弹出的合集选择面板中搜索或选择
    const searchInput = page.locator('[class*="collection"] input, [class*="search"] input').first();
    await searchInput.fill(collectionName, { timeout: 5000 }).catch(async () => {
      // 没有搜索框，直接找匹配的合集名
    });
    await sleep(500, 1000);

    const item = page.locator(`text=${collectionName}`).first();
    await item.click({ timeout: 5000 });
    await sleep(300, 600);

    // 点确认
    const confirmBtn = page.locator('button:has-text("确定"), button:has-text("确认")').first();
    await confirmBtn.click({ timeout: 3000 }).catch(() => {});
  } catch {
    // 合集添加失败不阻塞
  }
}

async function uncheckWeitoutiao(page) {
  try {
    // "同时发布微头条" 默认已勾选，点击取消
    const checkbox = page.locator('text=发布得更多收益').first();
    await checkbox.click({ timeout: 5000 });
    await sleep(200, 400);
  } catch {
    // 取消失败不阻塞
  }
}

async function clickLabel(page, labelText) {
  try {
    const el = page.locator(`text=${labelText}`).first();
    await el.click({ timeout: 5000 });
    await sleep(200, 400);
  } catch {}
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
    } catch {}
  }
}
