# 今日头条运营技能包 (toutiao-ops)

面向 AI Agent 的今日头条创作者平台全流程运营自动化工具。

## 功能

- **登录管理**：首次手动扫码，自动持久化会话
- **文章发布**：图文内容自动填写并发布
- **视频发布**：视频上传、转码等待、信息填写、发布
- **微头条发布**：短内容 + 多图发布
- **作品管理**：查看已发布作品列表和状态
- **评论管理**：查看评论列表、自动回复评论
- **作品数据**：阅读量、播放量、推荐量等指标
- **粉丝数据**：粉丝总数、增长趋势、画像分析
- **收益数据**：创作收益概览和明细
- **创作灵感**：平台推荐的热门话题和创作任务

## 技术方案

| 操作类型 | 实现方式 | 原因 |
|----------|----------|------|
| 内容发布 | 浏览器自动化 (Playwright) | 模拟真人操作，避免被判定机器发布 |
| 数据读取 | 浏览器内 API 调用 | 复用浏览器认证，获取结构化 JSON |

### 反检测

- playwright-extra + stealth 插件
- 持久化浏览器上下文（真实指纹）
- 随机延迟模拟人类节奏
- 逐字输入模拟打字

## 安装

```bash
cd cli
npm install
npx playwright install chromium
```

## 快速开始

```bash
# 1. 首次登录（扫码）
node cli/index.js auth login

# 2. 检查登录状态
node cli/index.js auth check

# 3. 发布文章
node cli/index.js publish article --title "AI 时代的创作" --content "人工智能正在改变..."

# 4. 发布微头条
node cli/index.js publish weitoutiao --content "今天的思考..." --images "photo1.jpg,photo2.jpg"

# 5. 查看作品数据
node cli/index.js analytics works --period 7d

# 6. 查看创作灵感
node cli/index.js inspiration
```

## 依赖

- Node.js >= 18
- playwright-extra
- puppeteer-extra-plugin-stealth
- commander

## 目录结构

```
toutiao-ops/
├── SKILL.md              # 技能入口
├── README.md             # 本文件
├── .clawignore           # 打包排除
├── references/           # 各模块详细文档
├── examples/             # 示例输入
└── cli/                  # CLI 实现
    ├── package.json
    ├── index.js          # 命令入口
    └── src/              # 功能模块
```

## 许可

MIT
