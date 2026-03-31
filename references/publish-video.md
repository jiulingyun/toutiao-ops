# 视频发布

## 概述

通过浏览器自动化在 `https://mp.toutiao.com/profile_v4/xigua/upload-video` 完成视频上传和发布。

## 命令

```bash
node {baseDir}/cli/index.js publish video --title "视频标题" --file "/path/to/video.mp4"
```

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--title` | 是 | 视频标题 |
| `--file` | 是 | 视频文件本地路径 |
| `--cover` | 否 | 自定义封面图片路径 |
| `--description` | 否 | 视频简介/描述 |
| `--tags` | 否 | 标签，逗号分隔 |

## 自动化流程

1. 确认登录状态
2. 导航到视频上传页
3. 选择并上传视频文件
4. 轮询等待上传和转码完成（最长 10 分钟）
5. 填写标题和描述
6. 上传自定义封面（如提供）
7. 添加标签（如提供）
8. 点击发布按钮

## 输出示例

```json
{
  "success": true,
  "action": "published",
  "title": "视频标题",
  "url": "https://mp.toutiao.com/..."
}
```

## 注意事项

- 支持格式：MP4、MOV 等常见视频格式
- 大文件上传时间较长，请确保网络稳定
- 转码超时（10 分钟）会报错，可重试
- 不提供封面时使用平台自动截取的封面
