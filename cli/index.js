#!/usr/bin/env node

import { Command } from 'commander';
import { checkLogin, doLogin, doLogout, listAccounts } from './src/auth.js';
import { publishArticle } from './src/publish-article.js';
import { publishVideo } from './src/publish-video.js';
import { publishWeitoutiao } from './src/publish-weitoutiao.js';
import { listContent } from './src/content-manage.js';
import { listComments, replyComment, likeComment } from './src/comment-manage.js';
import { getWorksAnalytics, getFansAnalytics, getIncomeAnalytics, getContentDetail } from './src/analytics.js';
import { listInspiration } from './src/inspiration.js';
import { checkForUpdates } from './src/update-check.js';

const program = new Command();

program
  .name('toutiao')
  .description('今日头条创作者平台运营自动化工具')
  .version('1.0.0')
  .option('--account <name>', '指定操作的账号（默认 default）', 'default');

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

auth
  .command('list')
  .description('列出所有已保存的账号')
  .action(async () => {
    await run(listAccounts, {});
  });

// ── publish ──
const publish = program.command('publish');

publish
  .command('article')
  .description('发布图文文章')
  .requiredOption('--title <title>', '文章标题')
  .option('--content <content>', '文章正文')
  .option('--content-file <path>', '从文件读取正文（Markdown）')
  .option('--cover <path>', '封面图片路径（单图模式）')
  .option('--cover-mode <mode>', '封面模式: single / triple / none', 'single')
  .option('--first-publish', '勾选"头条首发"')
  .option('--collection <name>', '添加至合集名称')
  .option('--no-weitoutiao', '取消"同时发布微头条"（默认开启）')
  .option('--declaration <items>', '作品声明，逗号分隔: 取材网络,引用站内,个人观点,引用AI,虚构演绎,投资观点,健康医疗')
  .option('--draft', '存为草稿而非直接发布')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(publishArticle, opts);
  });

publish
  .command('video')
  .description('发布视频')
  .requiredOption('--file <path>', '视频文件路径')
  .requiredOption('--title <title>', '视频标题')
  .option('--topic <topic>', '话题名称（不含 #）')
  .option('--cover <path>', '封面图片路径')
  .option('--description <desc>', '视频简介')
  .option('--gen-article', '勾选"生成图文"获取额外图文创作收益')
  .option('--collection <name>', '添加至合集名称')
  .option('--declaration <items>', '作品声明，逗号分隔: 取自站外,引用站内,自行拍摄,AI生成,虚构演绎,投资观点,健康医疗')
  .option('--visibility <mode>', '谁可以看: public / fans / private', 'public')
  .option('--draft', '存为草稿而非直接发布')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(publishVideo, opts);
  });

publish
  .command('weitoutiao')
  .description('发布微头条')
  .requiredOption('--content <content>', '微头条内容')
  .option('--images <paths>', '图片路径，逗号分隔')
  .option('--topic <topic>', '话题名称（不含 #）')
  .option('--first-publish', '勾选"头条首发"')
  .option('--declaration <items>', '作品声明，逗号分隔: 取材网络,引用站内,个人观点,引用AI,虚构演绎,投资观点,健康医疗')
  .option('--draft', '存草稿而非发布')
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
  .option('--with-replies', '同时获取每条评论的子评论/回复')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(listComments, opts);
  });

comment
  .command('reply')
  .description('回复评论')
  .requiredOption('--comment-id <id>', '评论 ID 或内容片段')
  .requiredOption('--content <content>', '回复内容')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(replyComment, opts);
  });

comment
  .command('like')
  .description('点赞评论')
  .requiredOption('--comment-id <id>', '评论 ID 或内容片段')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(likeComment, opts);
  });

// ── analytics ──
const analytics = program.command('analytics');

analytics
  .command('works')
  .description('查看作品数据')
  .option('--period <period>', '时间范围: 7d / 30d', '7d')
  .option('--type <type>', '类型: all / article / video / weitoutiao', 'all')
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
  .option('--type <type>', '类型: all / article / video', 'all')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(getIncomeAnalytics, opts);
  });

analytics
  .command('content-detail')
  .description('查看单个作品的详细数据')
  .option('--content-id <id>', '作品 ID（item_id / gidStr）')
  .option('--content-type <type>', '内容类型编号: 2=图文/微头条, 3=视频', '2')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(getContentDetail, opts);
  });

// ── inspiration ──
program
  .command('inspiration')
  .description('查看创作灵感')
  .option('--type <type>', '类型: activity（创作活动）/ hotspot（热点推荐）', 'activity')
  .option('--headless', '无头模式运行')
  .action(async (opts) => {
    await run(listInspiration, opts);
  });

// ── runner ──
async function run(fn, subOpts) {
  const updateCheck = checkForUpdates();
  try {
    const globalOpts = program.opts();
    const opts = { ...subOpts, account: globalOpts.account };
    const result = await fn(opts);
    await updateCheck;
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    await updateCheck.catch(() => {});
    console.error(JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    process.exit(1);
  }
}

program.parse();
