# 文章发布

## 概述

通过浏览器自动化在 `https://mp.toutiao.com/profile_v4/graphic/publish` 完成图文文章发布，模拟真人操作避免被检测。

**支持 Markdown 富文本排版**：正文默认以 Markdown 格式解析，自动渲染为带标题、加粗、列表、表格、引用等样式的富文本，粘贴到编辑器中，呈现专业排版效果。

## 命令

```bash
toutiao-ops publish article --title "文章标题" --content "# Markdown 正文"
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--title` | 是 | - | 文章标题（**2~30 个字**，超出自动截断） |
| `--content` | 否* | - | 文章正文（支持 Markdown 语法） |
| `--content-file` | 否* | - | 从文件读取正文（`.md` 文件自动识别为 Markdown） |
| `--format` | 否 | `markdown` | 正文格式：`markdown`（富文本排版）/ `text`（纯文本逐字输入） |
| `--cover` | 否 | - | 封面图片本地路径 |
| `--cover-mode` | 否 | `single` | 封面模式：`single`（单图）/ `triple`（三图）/ `none`（无封面） |
| `--first-publish` | 否 | false | 勾选「头条首发」 |
| `--collection` | 否 | - | 添加至合集名称 |
| `--no-weitoutiao` | 否 | false | 取消「同时发布微头条」（默认开启） |
| `--declaration` | 否 | - | 作品声明，逗号分隔，可选项：`取材网络,引用站内,个人观点,引用AI,虚构演绎,投资观点,健康医疗` |
| `--draft` | 否 | false | 存为草稿而非直接发布 |
| `--headless` | 否 | false | 无头模式运行 |

*`--content` 和 `--content-file` 至少提供一个。

## 富文本排版（Markdown 模式）

默认 `--format markdown`，正文内容会经过以下流程渲染到编辑器：

1. 使用 `marked` 将 Markdown 解析为 HTML
2. 通过浏览器 `ClipboardEvent` 将 HTML 以富文本格式粘贴到编辑器
3. 头条富文本编辑器自动解析 HTML，保留格式样式

### 支持的 Markdown 语法

| 语法 | 效果 |
|------|------|
| `# 一级标题` | 大标题 |
| `## 二级标题` | 小标题 |
| `**加粗文字**` | **加粗** |
| `*斜体文字*` | *斜体* |
| `- 无序列表` | 项目符号列表 |
| `1. 有序列表` | 编号列表 |
| `> 引用内容` | 引用块（带左侧蓝色边框） |
| `` `行内代码` `` | 行内代码 |
| 表格语法 | 完整表格渲染 |

### 编写正文的最佳实践

Agent 在生成文章正文时应遵循以下规范，确保排版效果专业：

- 使用 `## 二级标题` 划分文章结构（一级标题通常对应文章标题，正文内建议从二级开始）
- 重点词句使用 `**加粗**` 标记
- 列举多项内容使用有序或无序列表
- 引用名言、数据来源使用 `>` 引用块
- 数据对比适合使用表格
- 段落之间空一行保证间距
- 文末可使用 `*斜体*` 作为结语点缀

## 示例

```bash
# 使用 Markdown 内容直接发布（默认富文本排版）
toutiao-ops publish article \
  --title "AI 技术前沿" \
  --content "## 引言\n\n**人工智能**正在改变世界。\n\n## 核心技术\n\n1. 深度学习\n2. 自然语言处理\n3. 计算机视觉\n\n> AI 不是要取代人类，而是要赋能人类。"

# 从 Markdown 文件读取（自动识别 .md 格式）
toutiao-ops publish article \
  --title "深度解析 AI 编程" \
  --content-file "/path/to/article.md" \
  --cover "/path/to/cover.jpg" \
  --cover-mode single \
  --first-publish \
  --collection "AI专栏" \
  --declaration "个人观点"

# 纯文本模式（逐字输入，无排版）
toutiao-ops publish article \
  --title "简短笔记" \
  --content "这是一段纯文本内容\n\n没有排版格式" \
  --format text

# 存草稿
toutiao-ops publish article --title "草稿标题" --content-file draft.md --draft
```

## 自动化流程

1. 确认登录状态
2. 导航到发布页，关闭弹窗遮挡
3. 填写标题（逐字输入，带随机延迟）
4. 输入正文：
   - **Markdown 模式**：将 Markdown 渲染为 HTML → 通过 ClipboardEvent 粘贴富文本 → 编辑器自动解析格式
   - **纯文本模式**：按 `\n` 分段，逐段键盘输入
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

- **标题限制 2~30 个字**：头条平台强制要求，超过 30 字会被自动截断。生成标题时务必精炼简洁
- **优先使用 Markdown 格式**（`--format markdown`，默认值），发布的文章将具有专业排版效果
- `.md` 文件通过 `--content-file` 传入时自动识别为 Markdown，无需额外指定 `--format`
- `--content` 参数中的 `\n` 会被转换为真实换行符
- 封面图建议使用 16:9 比例的 JPEG/PNG，尺寸不小于 400×200
- 作品声明可多选，用逗号分隔
