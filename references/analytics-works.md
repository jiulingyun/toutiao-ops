# 作品数据

## 概述

从头条号创作者平台获取作品数据分析，包括阅读/播放量、互动数据、推荐数据等。支持按内容类型筛选。

## 命令

### 作品数据概览

```bash
node {baseDir}/cli/index.js analytics works [--type all]
```

### 单个作品详细数据

```bash
node {baseDir}/cli/index.js analytics content-detail [--content-id "作品ID"] [--content-type 2]
```

## 参数

### analytics works

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--type` | 否 | `all` | 内容类型：`all`（全部）/ `article`（图文）/ `video`（视频）/ `weitoutiao`（微头条） |
| `--headless` | 否 | false | 无头模式运行 |

不同类型对应不同的页面 URL：

| 类型 | URL |
|------|-----|
| `all` | `works-overall/all` |
| `article` | `works-overall/article` |
| `video` | `works-overall/video` |
| `weitoutiao` | `works-overall/weitoutiao` |

### analytics content-detail

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--content-id` | 否 | - | 作品 ID（item_id / gidStr）；不提供则自动获取第一个作品的 ID |
| `--content-type` | 否 | `2` | 内容类型编号：`2` = 图文/微头条，`3` = 视频 |
| `--headless` | 否 | false | 无头模式运行 |

## 数据获取策略

- **作品概览**：拦截数据分析页加载时的 API 请求 → 回退从页面 DOM 提取关键指标
- **单个作品**：直接通过浏览器内 `fetch` 调用 `/mp/agw/statistic/v2/item/info` API（复用登录 session）

## 输出示例

### analytics works

```json
{
  "success": true,
  "category": "works_all",
  "source": "dom_scrape",
  "metrics": {
    "展现量": "12,345",
    "阅读量": "6,789",
    "评论量": "123",
    "收藏量": "45"
  }
}
```

### analytics content-detail

```json
{
  "success": true,
  "category": "content_detail",
  "contentId": "7623453165358170664",
  "contentType": "2",
  "source": "api_fetch",
  "data": {
    "message": "success",
    "data": {
      "show_count": 50000,
      "read_count": 8000,
      "comment_count": 120,
      "share_count": 35,
      "repin_count": 80
    }
  }
}
```

## 注意事项

- 典型指标包括：展现量、阅读量、播放量、评论量、点赞量、收藏量、转发量、关注量
- `content-detail` 直接调用 API 获取精确数据，效率高且稳定
- 不提供 `--content-id` 时，会自动导航到作品管理列表获取第一个作品的 ID
