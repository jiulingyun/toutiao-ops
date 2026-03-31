---
name: toutiao-ops
description: 今日头条创作者平台全流程运营自动化。支持多账号管理、登录管理、文章/视频/微头条发布、作品管理、评论管理、数据分析、创作灵感获取。使用浏览器自动化模拟真人操作发布内容，浏览器内 API 获取数据。当用户需要运营头条号、发布内容、查看数据或管理评论时使用此技能。
version: 1.1.0
icon: "\U0001F4F0"
metadata:
  clawdbot:
    emoji: "\U0001F4F0"
    requires:
      bins:
        - node
    commands:
      auth check: node {baseDir}/cli/index.js auth check
      auth login: node {baseDir}/cli/index.js auth login
      auth logout: node {baseDir}/cli/index.js auth logout
      auth list: node {baseDir}/cli/index.js auth list
      publish article: node {baseDir}/cli/index.js publish article
      publish video: node {baseDir}/cli/index.js publish video
      publish weitoutiao: node {baseDir}/cli/index.js publish weitoutiao
      content list: node {baseDir}/cli/index.js content list
      comment list: node {baseDir}/cli/index.js comment list
      comment reply: node {baseDir}/cli/index.js comment reply
      analytics works: node {baseDir}/cli/index.js analytics works
      analytics fans: node {baseDir}/cli/index.js analytics fans
      analytics income: node {baseDir}/cli/index.js analytics income
      inspiration: node {baseDir}/cli/index.js inspiration
---

# 今日头条运营技能

完整的头条号运营自动化工具，支持多账号管理，覆盖内容发布、数据分析、评论互动全流程。

## 首次使用

1. 安装依赖：`cd {baseDir}/cli && npm install`
2. 安装浏览器：`cd {baseDir}/cli && npx playwright install chromium`
3. 登录：`node {baseDir}/cli/index.js auth login`（首次需手动扫码）

## 多账号

所有命令支持 `--account <name>` 全局参数，省略时使用 `default` 账号。

```bash
# 登录第二个账号
node {baseDir}/cli/index.js --account work auth login

# 用指定账号发布文章
node {baseDir}/cli/index.js --account work publish article --title "..."

# 查看所有账号
node {baseDir}/cli/index.js auth list
```

每个账号的浏览器会话独立隔离，互不影响。

## 执行规则

- 任何操作前先执行 `auth check` 确认登录状态
- 如果未登录，先执行 `auth login`，将输出的二维码截图展示给用户扫码
- 发布类操作使用浏览器自动化（模拟真人），数据类操作使用浏览器内 API
- 所有命令输出 JSON 格式，方便解析

## 模块索引

执行前先读取对应模块文档：

- 登录与会话管理 -> `references/auth.md`
- 文章发布 -> `references/publish-article.md`
- 视频发布 -> `references/publish-video.md`
- 微头条发布 -> `references/publish-weitoutiao.md`
- 作品管理 -> `references/content-manage.md`
- 评论管理 -> `references/comment-manage.md`
- 作品数据分析 -> `references/analytics-works.md`
- 粉丝数据分析 -> `references/analytics-fans.md`
- 收益数据分析 -> `references/analytics-income.md`
- 创作灵感 -> `references/inspiration.md`

## 命令速查

| 命令 | 说明 |
|------|------|
| `auth check` | 检测登录状态 |
| `auth login` | 扫码登录（输出二维码截图路径，需展示给用户） |
| `auth logout` | 清除指定账号的登录缓存 |
| `auth list` | 列出所有已保存的账号 |
| `publish article --title "..." --content "..."` | 发布图文文章 |
| `publish video --title "..." --file "path"` | 发布视频 |
| `publish weitoutiao --content "..."` | 发布微头条 |
| `content list` | 查看作品列表 |
| `comment list` | 查看评论列表 |
| `comment reply --comment-id "..." --content "..."` | 回复评论 |
| `analytics works` | 作品数据概览 |
| `analytics fans` | 粉丝数据概览 |
| `analytics income` | 收益数据概览 |
| `inspiration` | 创作灵感推荐 |

## 通用选项

- `--account <name>`：指定账号（默认 default），加在 `toutiao` 后、子命令前
- `--headless`：无头模式运行（默认有头模式）
