# 评论管理

## 概述

查看评论使用浏览器内 API 拦截获取结构化数据，回复和点赞使用浏览器自动化操作（避免直接 POST 被风控）。

评论管理页为左右分栏布局：左侧评论列表，点击后右侧展示评论详情、回复输入框和子评论列表。

## 命令

### 查看评论列表

```bash
node {baseDir}/cli/index.js comment list [--with-replies]
```

### 回复评论

```bash
node {baseDir}/cli/index.js comment reply --comment-id "评论ID或内容片段" --content "回复内容"
```

### 点赞评论

```bash
node {baseDir}/cli/index.js comment like --comment-id "评论ID或内容片段"
```

## 参数

### comment list

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--article-id` | 否 | - | 指定文章 ID 的评论 |
| `--page` | 否 | `1` | 页码 |
| `--with-replies` | 否 | false | 同时获取每条评论的子评论/回复（会逐条点击有回复的评论从右侧面板提取） |
| `--headless` | 否 | false | 无头模式运行 |

### comment reply

| 参数 | 必填 | 说明 |
|------|------|------|
| `--comment-id` | 是 | 评论 ID（如 `7616903856538436387`）、评论内容片段（如 `讲的高科技`）、或序号（如 `1` 表示第一条） |
| `--content` | 是 | 回复内容（`\n` 换行） |
| `--headless` | 否 | 无头模式运行 |

### comment like

| 参数 | 必填 | 说明 |
|------|------|------|
| `--comment-id` | 是 | 评论 ID、内容片段、或序号（定位方式同 reply） |
| `--headless` | 否 | 无头模式运行 |

## 评论定位方式

`--comment-id` 支持三种定位方式（reply 和 like 通用）：

1. **精确 ID**：传入评论的 `id_str`，如 `7616903856538436387`
2. **内容片段**：传入评论内容中的关键字，如 `讲的高科技`（匹配第一条包含该文本的评论）
3. **序号**：传入数字 `1`~`10`，表示列表中的第 N 条评论

## 数据获取策略

- **评论列表**：拦截页面 API（含完整评论数据） → 回退 DOM 提取
- **子评论**：点击评论后从右侧面板的 `.sub-comment-item` 提取
- **回复/点赞**：浏览器自动化操作

## 输出示例

### comment list

```json
{
  "success": true,
  "source": "api_intercept",
  "comments": [
    {
      "id": "7616903856538436387",
      "author": "好学Chatgpt",
      "authorId": "67250406740",
      "isFan": true,
      "content": "下一次更新预计什么时候发布？",
      "time": "03-14 08:37",
      "diggCount": 0,
      "replyCount": 1,
      "location": "辽宁",
      "articleTitle": "OpenClaw-CN v0.1.7 重磅更新！...",
      "articleType": "微头条",
      "replies": [
        { "author": "我", "content": "预计下周发布", "time": "03-14 09:27" }
      ]
    }
  ],
  "count": 10
}
```

### comment reply

```json
{
  "success": true,
  "action": "replied",
  "commentId": "讲的高科技一些",
  "replyContent": "哈哈，你这个比喻很形象！",
  "message": "回复成功"
}
```

### comment like

```json
{
  "success": true,
  "action": "liked",
  "commentId": "讲的高科技一些",
  "before": "赞",
  "after": "1",
  "message": "点赞成功"
}
```

## 注意事项

- 点赞为切换操作：已赞状态下再次点赞会取消赞
- `--with-replies` 会增加耗时，因为需要逐条点击有回复的评论
- 子评论数据需要点击评论后才会加载，API 中不包含子评论详情
