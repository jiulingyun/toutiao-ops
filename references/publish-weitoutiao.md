# 微头条发布

## 概述

通过浏览器自动化在 `https://mp.toutiao.com/profile_v4/weitoutiao/publish` 发布微头条（类似微博的短内容）。

## 命令

```bash
node {baseDir}/cli/index.js publish weitoutiao --content "今天分享一个有趣的发现..."
```

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--content` | 是 | 微头条文本内容 |
| `--images` | 否 | 图片路径，多张用逗号分隔 |

## 自动化流程

1. 确认登录状态
2. 导航到微头条发布页
3. 输入文本内容（逐字输入，模拟真人节奏）
4. 上传图片（如提供，支持多图）
5. 点击发布按钮

## 输出示例

```json
{
  "success": true,
  "action": "published",
  "content": "今天分享一个有趣的发现...",
  "url": "https://mp.toutiao.com/..."
}
```

## 注意事项

- 图片格式支持 JPEG、PNG
- 多图上传最多 9 张
- 内容长度限制参考平台规则
