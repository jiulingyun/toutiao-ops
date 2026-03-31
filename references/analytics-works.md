# 作品数据

## 概述

从 `https://mp.toutiao.com/profile_v4/analysis/works-overall/all` 获取作品数据分析，包括阅读/播放量、互动数据、推荐数据等。

## 命令

```bash
node {baseDir}/cli/index.js analytics works [--period 7d] [--type all]
```

## 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--period` | 7d | 时间范围：7d / 30d |
| `--type` | all | 内容类型：article / video / all |

## 数据获取策略

1. 优先拦截数据分析页加载时的 API 请求
2. 回退：从页面数据卡片 DOM 提取关键指标

## 输出示例

```json
{
  "success": true,
  "category": "works",
  "source": "api_intercept",
  "data": [...],
  "apiCount": 3
}
```

典型指标包括：总阅读量、总播放量、推荐量、分享量、收藏量等。
