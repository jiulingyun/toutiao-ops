#!/usr/bin/env node

import { Command } from 'commander';
import { checkLogin, doLogin, doLogout } from './src/auth.js';
import { publishArticle } from './src/publish-article.js';
import { publishVideo } from './src/publish-video.js';
import { publishWeitoutiao } from './src/publish-weitoutiao.js';
import { listContent } from './src/content-manage.js';
import { listComments, replyComment } from './src/comment-manage.js';
import { getWorksAnalytics, getFansAnalytics, getIncomeAnalytics } from './src/analytics.js';
import { listInspiration } from './src/inspiration.js';

const program = new Command();

program
  .name('toutiao')
  .description('今日头条创作者平台运营自动化工具')
  .version('1.0.0');

// ── auth ──
const auth = program.command('auth');

auth
  .command('check')
  .description('检测头条号登录状态')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(checkLogin, opts);
  });

auth
  .command('login')
  .description('打开浏览器手动扫码登录')
  .action(async (opts) => {
    await run(doLogin, opts);
  });

auth
  .command('logout')
  .description('清除登录缓存（退出登录，用于切换账号）')
  .action(async (opts) => {
    await run(doLogout, opts);
  });

// ── publish ──
const publish = program.command('publish');

publish
  .command('article')
  .description('发布图文文章')
  .requiredOption('--title <title>', '文章标题')
  .option('--content <content>', '文章正文')
  .option('--content-file <path>', '从文件读取正文（Markdown）')
  .option('--cover <path>', '封面图片路径')
  .option('--tags <tags>', '标签，逗号分隔')
  .option('--draft', '存为草稿而非直接发布')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(publishArticle, opts);
  });

publish
  .command('video')
  .description('发布视频')
  .requiredOption('--title <title>', '视频标题')
  .requiredOption('--file <path>', '视频文件路径')
  .option('--cover <path>', '封面图片路径')
  .option('--description <desc>', '视频描述')
  .option('--tags <tags>', '标签，逗号分隔')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(publishVideo, opts);
  });

publish
  .command('weitoutiao')
  .description('发布微头条')
  .requiredOption('--content <content>', '微头条内容')
  .option('--images <paths>', '图片路径，逗号分隔')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(publishWeitoutiao, opts);
  });

// ── content ──
const content = program.command('content');

content
  .command('list')
  .description('查看作品列表')
  .option('--type <type>', '类型: article / video / weitoutiao / all', 'all')
  .option('--status <status>', '状态: published / reviewing / rejected', 'published')
  .option('--page <n>', '页码', '1')
  .option('--limit <n>', '每页数量', '20')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(listContent, opts);
  });

// ── comment ──
const comment = program.command('comment');

comment
  .command('list')
  .description('查看评论列表')
  .option('--article-id <id>', '指定文章 ID')
  .option('--page <n>', '页码', '1')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(listComments, opts);
  });

comment
  .command('reply')
  .description('回复评论')
  .requiredOption('--comment-id <id>', '评论 ID')
  .requiredOption('--content <content>', '回复内容')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(replyComment, opts);
  });

// ── analytics ──
const analytics = program.command('analytics');

analytics
  .command('works')
  .description('查看作品数据')
  .option('--period <period>', '时间范围: 7d / 30d', '7d')
  .option('--type <type>', '类型: article / video / all', 'all')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(getWorksAnalytics, opts);
  });

analytics
  .command('fans')
  .description('查看粉丝数据')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(getFansAnalytics, opts);
  });

analytics
  .command('income')
  .description('查看收益数据')
  .option('--period <period>', '时间范围: 7d / 30d', '7d')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(getIncomeAnalytics, opts);
  });

// ── inspiration ──
program
  .command('inspiration')
  .description('查看创作灵感')
  .option('--category <cat>', '灵感分类')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(listInspiration, opts);
  });

// ── runner ──
async function run(fn, opts) {
  try {
    const result = await fn(opts);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    process.exit(1);
  }
}

program.parse();
