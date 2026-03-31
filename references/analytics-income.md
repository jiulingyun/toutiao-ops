# 收益数据

## 概述

从 `https://mp.toutiao.com/profile_v4/analysis/income-overview` 获取创作收益数据。

## 命令

```bash
node {baseDir}/cli/index.js analytics income [--period 7d]
```

## 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--period` | 7d | 时间范围：7d / 30d |

## 数据获取策略

1. 优先拦截收益页加载时的 API 请求
2. 回退：从页面收益卡片 DOM 提取数据

## 输出示例

```json
{
  "success": true,
  "category": "income",
  "source": "api_intercept",
  "data": [...],
  "apiCount": 2
}
```

典型指标包括：总收益、今日预估收益、文章收益、视频收益、微头条收益等明细。
