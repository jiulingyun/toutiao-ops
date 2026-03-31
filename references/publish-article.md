# 文章发布

## 概述

通过浏览器自动化在 `https://mp.toutiao.com/profile_v4/graphic/publish` 完成图文文章发布，模拟真人操作避免被检测。

## 命令

```bash
node {baseDir}/cli/index.js publish article --title "文章标题" --content "正文内容"
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--title` | 是 | - | 文章标题 |
| `--content` | 否* | - | 文章正文（纯文本，`\n` 分段） |
| `--content-file` | 否* | - | 从文件读取正文（Markdown 文件路径） |
| `--cover` | 否 | - | 封面图片本地路径 |
| `--cover-mode` | 否 | `single` | 封面模式：`single`（单图）/ `triple`（三图）/ `none`（无封面） |
| `--first-publish` | 否 | false | 勾选「头条首发」 |
| `--collection` | 否 | - | 添加至合集名称 |
| `--no-weitoutiao` | 否 | false | 取消「同时发布微头条」（默认开启） |
| `--declaration` | 否 | - | 作品声明，逗号分隔，可选项：`取材网络,引用站内,个人观点,引用AI,虚构演绎,投资观点,健康医疗` |
| `--draft` | 否 | false | 存为草稿而非直接发布 |
| `--headless` | 否 | false | 无头模式运行 |

*`--content` 和 `--content-file` 至少提供一个。

## 示例

```bash
# 基础发布
node {baseDir}/cli/index.js publish article --title "AI 技术前沿" --content "人工智能正在...\n\n第二段内容..."

# 完整参数
node {baseDir}/cli/index.js publish article \
  --title "深度解析 AI 编程" \
  --content "正文内容..." \
  --cover "/path/to/cover.jpg" \
  --cover-mode single \
  --first-publish \
  --collection "AI专栏" \
  --declaration "个人观点"

# 存草稿
node {baseDir}/cli/index.js publish article --title "草稿标题" --content "内容..." --draft
```

## 自动化流程

1. 确认登录状态
2. 导航到发布页，关闭弹窗遮挡
3. 填写标题（逐字输入，带随机延迟）
4. 输入正文（按 `\n` 分段，逐段输入）
5. 设置封面模式并上传封面图（如提供）
6. 勾选头条首发（如指定）
7. 添加合集（如指定）
8. 设置作品声明（如指定）
9. 取消同步微头条（如指定 `--no-weitoutiao`）
10. 点击「预览并发布」/「存草稿」按钮
11. 确认发布弹窗
12. 等待页面响应并返回结果

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

- 正文以纯文本方式输入，使用 `\n` 表示换行/分段
- 封面图建议使用 16:9 比例的 JPEG/PNG，尺寸不小于 400×200
- 标签数量建议不超过 5 个
- 作品声明可多选，用逗号分隔
