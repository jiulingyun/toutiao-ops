# 微头条发布

## 概述

通过浏览器自动化在 `https://mp.toutiao.com/profile_v4/weitoutiao/publish` 发布微头条（类似微博的短内容）。

## 命令

```bash
toutiao-ops publish weitoutiao --content "今天分享一个有趣的发现..."
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--content` | 是 | - | 微头条文本内容（`\n` 换行） |
| `--images` | 否 | - | 图片路径，多张用逗号分隔（最多 9 张） |
| `--topic` | 否 | - | 话题名称（不含 `#`） |
| `--first-publish` | 否 | false | 勾选「头条首发」 |
| `--declaration` | 否 | - | 作品声明，逗号分隔，可选项：`取材网络,引用站内,个人观点,引用AI,虚构演绎,投资观点,健康医疗` |
| `--draft` | 否 | false | 存为草稿而非直接发布 |
| `--headless` | 否 | false | 无头模式运行 |

## 示例

```bash
# 纯文本
toutiao-ops publish weitoutiao --content "今天天气真不错！\n\n分享一下午后阳光~"

# 带图片和话题
toutiao-ops publish weitoutiao \
  --content "周末探店记录" \
  --images "/path/img1.jpg,/path/img2.jpg" \
  --topic "美食探店" \
  --first-publish

# 存草稿
toutiao-ops publish weitoutiao --content "草稿内容" --draft
```

## 自动化流程

1. 确认登录状态
2. 导航到微头条发布页，关闭弹窗遮挡
3. 输入文本内容（逐字输入，模拟真人节奏）
4. 上传图片（如提供）：点击「图片」→ 选择文件 → 点击「确定」
5. 设置话题（如提供）
6. 勾选头条首发（如指定）
7. 设置作品声明（如指定）
8. 点击「发布」/「存草稿」按钮

## 输出示例

```json
{
  "success": true,
  "action": "published",
  "content": "今天天气真不错！...",
  "url": "https://mp.toutiao.com/..."
}
```

## 注意事项

- 图片格式支持 JPEG、PNG
- 多图上传最多 9 张
- 内容中的 `\n` 会被转换为实际换行
- 图片上传后需点击确认按钮才会附加到微头条
