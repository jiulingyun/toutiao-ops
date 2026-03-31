# 作品管理

## 概述

通过浏览器内 API 拦截从 `https://mp.toutiao.com/profile_v4/manage/content/all` 获取作品列表数据。

## 命令

```bash
node {baseDir}/cli/index.js content list [--type all] [--status published] [--page 1] [--limit 20]
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--type` | 否 | `all` | 筛选类型：`article` / `video` / `weitoutiao` / `all` |
| `--status` | 否 | `published` | 状态：`published` / `reviewing` / `rejected` |
| `--page` | 否 | `1` | 页码 |
| `--limit` | 否 | `20` | 每页数量 |
| `--headless` | 否 | false | 无头模式运行 |

## 数据获取策略

1. 优先拦截页面加载时发出的 API 请求，获取结构化 JSON
2. 回退方案：从页面 DOM 提取作品列表

## 输出示例

```json
{
  "success": true,
  "source": "api_intercept",
  "items": [...],
  "count": 20
}
```

每个 item 包含：标题、发布时间、阅读量、评论数、审核状态等字段。
