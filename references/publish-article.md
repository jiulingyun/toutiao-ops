# 文章发布

## 概述

通过浏览器自动化在 `https://mp.toutiao.com/profile_v4/graphic/publish` 完成图文文章发布，模拟真人操作避免被检测。

## 命令

```bash
node {baseDir}/cli/index.js publish article --title "文章标题" --content "正文内容"
```

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--title` | 是 | 文章标题 |
| `--content` | 否* | 文章正文（纯文本，换行分段） |
| `--content-file` | 否* | 从文件读取正文（Markdown 文件路径） |
| `--cover` | 否 | 封面图片本地路径 |
| `--tags` | 否 | 标签，逗号分隔（如 "科技,AI,创业"） |
| `--draft` | 否 | 存为草稿而非直接发布 |

*`--content` 和 `--content-file` 至少提供一个。

## 自动化流程

1. 确认登录状态
2. 导航到发布页
3. 填写标题（逐字输入，带随机延迟）
4. 输入正文（逐段输入，段间自动换行）
5. 上传封面图（如提供）
6. 添加标签（如提供）
7. 点击发布/存草稿按钮
8. 等待页面响应并返回结果

## 输出示例

```json
{
  "success": true,
  "action": "published",
  "title": "文章标题",
  "url": "https://mp.toutiao.com/..."
}
```

## 注意事项

- 正文目前以纯文本方式输入，富文本格式（加粗、图片嵌入）暂不支持
- 封面图建议使用 16:9 比例的 JPEG/PNG
- 标签数量建议不超过 5 个
