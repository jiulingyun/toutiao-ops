# 创作灵感

## 概述

从 `https://mp.toutiao.com/profile_v4/activity/task-list` 获取头条平台推荐的创作灵感、热门话题和创作任务。

## 命令

```bash
node {baseDir}/cli/index.js inspiration [--category "科技"]
```

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--category` | 否 | 灵感分类筛选 |

## 数据获取策略

1. 优先拦截页面 API 请求获取创作任务列表
2. 回退：从页面 DOM 提取话题卡片

## 输出示例

```json
{
  "success": true,
  "source": "api_intercept",
  "data": [...],
  "apiCount": 3
}
```

典型字段包括：话题标题、热度值、参考内容、奖励信息、截止日期等。

## 用途

- 获取平台推荐的热门创作方向
- 参与有奖创作活动
- 了解当前热门话题趋势
- 结合灵感列表生成创作计划
