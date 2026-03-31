# 评论管理

## 概述

查看评论使用浏览器内 API，回复评论使用浏览器自动化操作（避免直接 POST 被风控）。

## 命令

### 查看评论列表

```bash
node {baseDir}/cli/index.js comment list [--article-id "123"] [--page 1]
```

### 回复评论

```bash
node {baseDir}/cli/index.js comment reply --comment-id "456" --content "感谢支持！"
```

## 参数

### comment list

| 参数 | 必填 | 说明 |
|------|------|------|
| `--article-id` | 否 | 指定文章 ID 的评论 |
| `--page` | 否 | 页码，默认 1 |

### comment reply

| 参数 | 必填 | 说明 |
|------|------|------|
| `--comment-id` | 是 | 目标评论 ID |
| `--content` | 是 | 回复内容 |

## 数据获取策略

- 评论列表：拦截页面 API -> 回退 DOM 提取
- 回复评论：浏览器自动化操作（点击回复按钮、输入内容、提交）

## 输出示例

```json
{
  "success": true,
  "source": "api_intercept",
  "items": [
    { "author": "用户A", "content": "写得真好！", "time": "2小时前", "articleTitle": "..." }
  ]
}
```
