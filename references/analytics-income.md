# 收益数据

## 概述

从头条号创作者平台获取创作收益数据，支持按收益类型筛选。

## 命令

```bash
node {baseDir}/cli/index.js analytics income [--type all]
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--type` | 否 | `all` | 收益类型：`all`（总览）/ `article`（图文收益）/ `video`（视频收益） |
| `--headless` | 否 | false | 无头模式运行 |

不同类型对应不同的页面 URL：

| 类型 | URL | 说明 |
|------|-----|------|
| `all` | `analysis/income-overview` | 收益总览 |
| `article` | `analysis/new-income-advertisement` | 图文广告收益 |
| `video` | `analysis/video-income` | 视频收益 |

## 示例

```bash
# 收益总览
node {baseDir}/cli/index.js analytics income

# 图文收益
node {baseDir}/cli/index.js analytics income --type article

# 视频收益
node {baseDir}/cli/index.js analytics income --type video
```

## 数据获取策略

1. 优先拦截收益页加载时的 API 请求
2. 回退：从页面收益卡片 DOM 提取数据（正则匹配关键指标）

## 输出示例

```json
{
  "success": true,
  "category": "income_all",
  "source": "dom_scrape",
  "metrics": {
    "总收入": "1,234.56",
    "昨日收入": "12.34",
    "基础收益": "800.00",
    "创作收益": "434.56"
  }
}
```

## 注意事项

- 典型指标包括：总收入、昨日收入、累计收入、预估收入、基础收益、创作收益
- 不同类型页面展示的指标维度不同
