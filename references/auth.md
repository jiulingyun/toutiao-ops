# 登录与会话管理

## 概述

头条号登录通过浏览器持久化上下文实现。首次登录需手动扫码，之后会话自动保存在 `~/.toutiao-ops/browser-data/`，后续启动自动复用。

## 命令

### 检测登录状态

```bash
node {baseDir}/cli/index.js auth check
```

输出示例（已登录）：

```json
{
  "logged_in": true,
  "username": "番茄3580433091797615",
  "avatar": "https://sf3-cdn-tos.toutiaostatic.com/img/...",
  "userId": "3580433091797615",
  "profileUrl": "https://www.toutiao.com/c/user/3580433091797615/",
  "url": "https://mp.toutiao.com/profile_v4/index"
}
```

输出示例（未登录）：

```json
{ "logged_in": false, "message": "未登录，请执行 auth login 扫码登录" }
```

### 扫码登录

```bash
node {baseDir}/cli/index.js auth login
```

登录流程会分两阶段输出：

**阶段一：等待扫码（stdout 输出 JSON）**

命令启动后会立刻截取登录页二维码并输出截图路径：

```json
{
  "status": "waiting_for_scan",
  "message": "请使用今日头条 APP 扫描二维码登录",
  "qr_screenshot": "/Users/xxx/.toutiao-ops/screenshots/qrcode-2026-03-31T14-46-17-042Z.png",
  "attempt": 1,
  "max_attempts": 6
}
```

**收到此输出后，必须立刻将 `qr_screenshot` 路径指向的图片发送/展示给用户，并提示用户打开今日头条 APP 扫码登录。** 二维码有效期约 60 秒，过期后会自动刷新并输出新的截图路径（`attempt` 递增）。

**阶段二：登录结果（stdout 输出 JSON）**

用户扫码成功后输出最终结果：

```json
{
  "logged_in": true,
  "message": "登录成功，会话已保存",
  "username": "番茄3580433091797615",
  "avatar": "https://sf3-cdn-tos.toutiaostatic.com/img/...",
  "userId": "3580433091797615",
  "profileUrl": "https://www.toutiao.com/c/user/3580433091797615/",
  "url": "https://mp.toutiao.com/profile_v4/index"
}
```

## Agent 调用规范

1. 执行 `auth login` 后监听 stdout
2. 解析到 `status: "waiting_for_scan"` 的 JSON 行时，**读取 `qr_screenshot` 图片并发送给用户**，附带提示："请使用今日头条 APP 扫描二维码登录"
3. 如果收到 `attempt > 1` 的输出，说明二维码已刷新，需再次将新截图发送给用户
4. 解析到 `logged_in: true` 时，登录完成
5. 如果命令以非零退出码结束，说明登录超时（5 分钟内未完成扫码）

## 退出登录 / 切换账号

```bash
node {baseDir}/cli/index.js auth logout
```

清除所有浏览器缓存和会话数据（`~/.toutiao-ops/browser-data/` 和截图目录），下次操作需重新扫码登录。

输出示例：

```json
{
  "success": true,
  "message": "已清除登录缓存，下次操作需重新扫码登录",
  "cleared": ["browser-data", "screenshots"]
}
```

切换账号流程：先执行 `auth logout`，再执行 `auth login`。

## 会话持久化

- 使用 Playwright `launchPersistentContext` 持久化浏览器状态
- Cookie、localStorage、IndexedDB 全部保存
- 正常情况下 Cookie 有效期较长，无需频繁重登
- 如果 `auth check` 返回 `logged_in: false`，需重新执行 `auth login`

## 注意事项

- 任何其他操作前，都应先调用 `auth check` 确认登录状态
- 如果未登录，执行 `auth login` 并将二维码截图展示给用户
- 切换账号：先 `auth logout` 再 `auth login`
- 不要同时运行多个命令（会争抢浏览器上下文锁文件）
- 二维码有效期约 60 秒，CLI 会自动刷新，每次刷新都会输出新截图路径
