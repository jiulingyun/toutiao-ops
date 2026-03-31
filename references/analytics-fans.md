# 粉丝数据

## 概述

从 `https://mp.toutiao.com/profile_v4/analysis/fans/overview` 获取粉丝数据，包括粉丝总数、增长趋势、粉丝画像。

## 命令

```bash
node {baseDir}/cli/index.js analytics fans
```

## 数据获取策略

1. 优先拦截粉丝分析页加载时的 API 请求
2. 回退：从页面数据卡片和图表区域提取指标

## 输出示例

```json
{
  "success": true,
  "category": "fans",
  "source": "api_intercept",
  "data": [...],
  "apiCount": 2
}
```

典型指标包括：粉丝总数、今日新增、今日取关、净增长、粉丝性别分布、年龄分布、地域分布等。
