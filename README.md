# toutiao-ops — 今日头条运营技能包

面向 AI Agent 的今日头条创作者平台全流程运营自动化技能包。让 Agent 完全代理人类完成头条号日常运营。

## 项目定位

这是一个 **AI Agent 技能包**（Skill），遵循 [Agent Skill 规范](https://clawd.org.cn/tools/creating-skills.md)。Agent 通过读取 `SKILL.md` 了解可用命令，读取 `references/` 下的模块文档了解具体参数和用法，然后调用 `cli/` 下的 CLI 工具执行操作。

**同时**，`cli/` 目录也是一个独立的 npm 包 [`@openclaw-cn/toutiao-ops`](https://www.npmjs.com/package/@openclaw-cn/toutiao-ops)，可以脱离 Agent 单独使用。

## 功能覆盖

```
┌─ 账号管理 ─── 多账号登录 / QR 扫码 / 会话持久化 / 账号切换
│
├─ 内容发布 ─── 文章（封面/首发/合集/声明）
│              视频（封面/话题/生成图文/可见性）
│              微头条（多图/话题/首发/声明）
│
├─ 内容管理 ─── 作品列表 / 类型筛选 / 状态筛选
│
├─ 评论互动 ─── 评论列表 / 子评论 / 回复评论 / 点赞评论
│
├─ 数据分析 ─── 作品数据（按类型筛选）
│              粉丝画像（性别/年龄/地域/机型价格/偏好）
│              收益数据（总览/图文/视频）
│              单个作品详细数据
│
└─ 创作灵感 ─── 创作活动 / 热点推荐
```

## 技术方案

| 操作类型 | 实现方式 | 原因 |
|----------|----------|------|
| 内容发布 | Playwright 浏览器自动化 | 模拟真人操作，避免被判定机器发布 |
| 评论互动 | Playwright 浏览器自动化 | 避免直接 POST 触发风控 |
| 数据读取 | 浏览器内 `fetch()` / API 拦截 | 复用浏览器 Cookie，获取结构化 JSON |
| 图表数据 | React Fiber 树提取 | 从 echarts 图表中提取原始数据 |

### 反检测

- `playwright-extra` + stealth 插件隐藏自动化特征
- 持久化浏览器上下文保留真实指纹
- 随机延迟 + 逐字输入模拟人类节奏
- 主动关闭弹窗、拒绝地理位置权限

## 项目结构

```
toutiao-ops/
├── SKILL.md                    # Agent 技能入口（元数据 + 命令索引）
├── README.md                   # 项目说明（本文件）
├── .gitignore
│
├── references/                 # 各模块详细文档
│   ├── auth.md                 # 登录与会话管理
│   ├── publish-article.md      # 文章发布
│   ├── publish-video.md        # 视频发布
│   ├── publish-weitoutiao.md   # 微头条发布
│   ├── content-manage.md       # 作品管理
│   ├── comment-manage.md       # 评论管理（列表/回复/点赞）
│   ├── analytics-works.md      # 作品数据 + 单个作品详情
│   ├── analytics-fans.md       # 粉丝数据（含四大分布 + 偏好）
│   ├── analytics-income.md     # 收益数据
│   └── inspiration.md          # 创作灵感（活动 + 热点）
│
└── cli/                        # CLI 工具（npm: @openclaw-cn/toutiao-ops）
    ├── package.json
    ├── README.md               # npm 包文档
    ├── index.js                # 命令入口
    └── src/
        ├── browser.js          # 浏览器启动、反检测、工具函数
        ├── auth.js             # 登录/登出/账号管理
        ├── auth-guard.js       # 登录状态守卫
        ├── publish-article.js  # 文章发布自动化
        ├── publish-video.js    # 视频发布自动化
        ├── publish-weitoutiao.js # 微头条发布自动化
        ├── content-manage.js   # 作品列表
        ├── comment-manage.js   # 评论列表/回复/点赞
        ├── analytics.js        # 数据分析（作品/粉丝/收益/单作品）
        └── inspiration.js      # 创作灵感
```

## 安装

### 作为 npm 包使用

```bash
npm install @openclaw-cn/toutiao-ops
npx toutiao-ops auth login
```

### 作为 Agent 技能使用

```bash
cd cli && npm install && npx playwright install chromium
```

Agent 读取 `SKILL.md` 获取命令列表，读取 `references/*.md` 获取参数说明。

## 快速开始

```bash
# 登录（首次需手机扫码）
npx toutiao-ops auth login

# 发布文章
npx toutiao-ops publish article --title "AI 前沿" --content "内容..."

# 发布视频
npx toutiao-ops publish video --title "探险记" --file video.mp4

# 发布微头条
npx toutiao-ops publish weitoutiao --content "今日分享" --images "img.jpg"

# 查看评论并回复
npx toutiao-ops comment list
npx toutiao-ops comment reply --comment-id "内容片段" --content "感谢！"

# 查看粉丝画像
npx toutiao-ops analytics fans

# 获取热点
npx toutiao-ops inspiration --type hotspot
```

## 多账号管理

```bash
# 登录多个账号
npx toutiao-ops --account personal auth login
npx toutiao-ops --account work auth login

# 指定账号操作
npx toutiao-ops --account work publish article --title "..."

# 查看所有账号
npx toutiao-ops auth list
```

每个账号独立存储在 `~/.toutiao-ops/accounts/<name>/`，包含浏览器会话、二维码截图和账号元信息。

## 命令速查

| 命令 | 说明 |
|------|------|
| `auth check` | 检测登录状态 |
| `auth login` | 扫码登录 |
| `auth logout` | 退出登录 |
| `auth list` | 列出所有账号 |
| `publish article` | 发布文章 |
| `publish video` | 发布视频 |
| `publish weitoutiao` | 发布微头条 |
| `content list` | 作品列表 |
| `comment list` | 评论列表 |
| `comment reply` | 回复评论 |
| `comment like` | 点赞评论 |
| `analytics works` | 作品数据 |
| `analytics fans` | 粉丝画像 |
| `analytics income` | 收益数据 |
| `analytics content-detail` | 单个作品详情 |
| `inspiration` | 创作灵感 |

详细参数请查阅 `references/` 目录下对应模块文档。

## 环境要求

- Node.js >= 18
- macOS / Linux / Windows
- 首次登录需要显示器环境（扫码），后续可 `--headless` 运行

## License

MIT
