# 登录与会话管理

## 概述

头条号登录通过浏览器持久化上下文实现。首次登录需手动扫码，之后会话自动保存在 `~/.toutiao-ops/browser-data/`，后续启动自动复用。

## 命令

### 检测登录状态

```bash
node {baseDir}/cli/index.js auth check
```

输出示例：

```json
{ "logged_in": true, "username": "创作者昵称", "url": "https://mp.toutiao.com/..." }
```

```json
{ "logged_in": false, "message": "未登录，请执行 auth login 扫码登录" }
```

### 手动扫码登录

```bash
node {baseDir}/cli/index.js auth login
```

- 强制使用有头模式（忽略 --headless）
- 浏览器窗口打开后，在页面上用头条 APP 扫码
- 检测到登录成功后自动保存会话并退出
- 超时时间 5 分钟

## 会话持久化

- 使用 Playwright `launchPersistentContext` 持久化浏览器状态
- Cookie、localStorage、IndexedDB 全部保存
- 正常情况下 Cookie 有效期较长，无需频繁重登
- 如果 `auth check` 返回 `logged_in: false`，需重新执行 `auth login`

## 注意事项

- 任何其他操作前，都应先调用 `auth check` 确认登录状态
- 不要同时运行多个命令（会争抢浏览器上下文锁文件）
