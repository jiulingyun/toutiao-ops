# 创作灵感

## 概述

从头条号创作者平台获取创作灵感，支持两种类型：创作活动和热点推荐。

## 命令

```bash
node {baseDir}/cli/index.js inspiration [--type activity]
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--type` | 否 | `activity` | 灵感类型：`activity`（创作活动）/ `hotspot`（热点推荐） |
| `--headless` | 否 | false | 无头模式运行 |

## 类型说明

### activity（创作活动）

页面：`https://mp.toutiao.com/profile_v4/activity/task-list`

获取平台推荐的创作任务和活动，包含话题标题、热度值、参考内容、奖励信息、截止日期等。

### hotspot（热点推荐）

页面：`https://mp.toutiao.com/profile_v4/activity/hot-spot`

获取当前热点话题推荐，包含标题、阅读量、讨论量、话题链接等。

## 示例

```bash
# 创作活动（默认）
node {baseDir}/cli/index.js inspiration

# 热点推荐
node {baseDir}/cli/index.js inspiration --type hotspot
```

## 数据获取策略

- **创作活动**：拦截页面 API 请求获取创作任务列表 → 回退 DOM 提取
- **热点推荐**：从 DOM 提取热点话题卡片，包括标题、阅读量、讨论量、链接

## 输出示例

### activity

```json
{
  "success": true,
  "source": "api_intercept",
  "data": [...],
  "apiCount": 3
}
```

### hotspot

```json
{
  "success": true,
  "type": "hotspot",
  "source": "dom_scrape",
  "items": [
    {
      "title": "热点话题标题",
      "readCount": "1234万阅读",
      "discussCount": "5678讨论",
      "link": "https://..."
    }
  ],
  "count": 20
}
```

## 用途

- 获取平台推荐的热门创作方向
- 参与有奖创作活动
- 了解当前热门话题趋势
- 结合灵感列表生成创作计划
- 追踪实时热点话题，快速蹭热度
