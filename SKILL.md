---
name: 今日头条运营大师
description: 今日头条创作者平台全流程运营自动化。支持多账号管理、登录管理、文章/视频/微头条发布、作品管理、评论管理、数据分析、创作灵感获取。使用浏览器自动化模拟真人操作发布内容，浏览器内 API 获取数据。当用户需要运营头条号、发布内容、查看数据或管理评论时使用此技能。
version: 1.1.0
icon: 📰
metadata:
  clawdbot:
    emoji: 📰
    requires:
      bins:
        - node
---

# 今日头条运营技能

完整的头条号运营自动化工具，支持多账号管理，覆盖内容发布、数据分析、评论互动全流程。

## 首次使用

1. 全局安装 CLI 工具：`npm install -g @openclaw-cn/toutiao-ops`
2. 安装完成后会自动下载 Chromium 浏览器，若失败则手动执行：`npx playwright install chromium`
3. 登录：`toutiao-ops auth login`（首次需手动扫码）

## 多账号

所有命令支持 `--account <name>` 全局参数，省略时使用 `default` 账号。

```bash
# 登录第二个账号
toutiao-ops --account work auth login

# 用指定账号发布文章
toutiao-ops --account work publish article --title "..."

# 查看所有账号
toutiao-ops auth list
```

每个账号的浏览器会话独立隔离，互不影响。

## 执行规则

- 任何操作前先执行 `toutiao-ops auth check` 确认登录状态
- 如果未登录，先执行 `toutiao-ops auth login`，将输出的二维码截图展示给用户扫码
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
- 作品数据分析（含单个作品详细数据） -> `references/analytics-works.md`
- 粉丝数据分析（含分布数据 + 粉丝偏好） -> `references/analytics-fans.md`
- 收益数据分析（支持图文/视频收益筛选） -> `references/analytics-income.md`
- 创作灵感（创作活动 + 热点推荐） -> `references/inspiration.md`

## 命令速查

| 命令 | 说明 |
|------|------|
| `toutiao-ops auth check` | 检测登录状态 |
| `toutiao-ops auth login` | 扫码登录（输出二维码截图路径，需展示给用户） |
| `toutiao-ops auth logout` | 清除指定账号的登录缓存 |
| `toutiao-ops auth list` | 列出所有已保存的账号 |
| `toutiao-ops publish article --title "..." --content "..."` | 发布文章（支持 --cover-mode / --first-publish / --collection / --declaration 等） |
| `toutiao-ops publish video --title "..." --file "path"` | 发布视频（支持 --topic / --cover / --gen-article / --visibility 等） |
| `toutiao-ops publish weitoutiao --content "..."` | 发布微头条（支持 --images / --topic / --first-publish / --declaration 等） |
| `toutiao-ops content list` | 查看作品列表（支持 --type / --status） |
| `toutiao-ops comment list` | 查看评论列表（支持 --with-replies 获取子评论） |
| `toutiao-ops comment reply --comment-id "..." --content "..."` | 回复评论（支持 ID / 内容片段 / 序号定位） |
| `toutiao-ops comment like --comment-id "..."` | 点赞评论（支持 ID / 内容片段 / 序号定位） |
| `toutiao-ops analytics works` | 作品数据概览（支持 --type article / video / weitoutiao） |
| `toutiao-ops analytics fans` | 粉丝数据（含性别/年龄/地域/机型价格分布 + 粉丝偏好） |
| `toutiao-ops analytics income` | 收益数据（支持 --type article / video） |
| `toutiao-ops analytics content-detail` | 单个作品详细数据（支持 --content-id / --content-type） |
| `toutiao-ops inspiration` | 创作灵感（支持 --type activity / hotspot） |

## 通用选项

- `--account <name>`：指定账号（默认 default），加在 `toutiao-ops` 后、子命令前
- `--headless`：无头模式运行（默认有头模式）
