# 登录与会话管理

## 概述

头条号登录通过浏览器持久化上下文实现，支持多账号管理。每个账号的会话独立保存在 `~/.toutiao-ops/accounts/<账号名>/` 下，互不影响。

## 多账号

所有命令通过全局 `--account <name>` 参数指定账号，省略时使用 `default`。

```bash
# 操作默认账号
toutiao-ops auth check

# 操作指定账号
toutiao-ops --account work auth check
toutiao-ops --account personal auth login
```

数据目录结构：

```
~/.toutiao-ops/accounts/
├── default/
│   ├── browser-data/    # 浏览器会话
│   ├── screenshots/     # 二维码截图
│   └── meta.json        # 账号元信息（昵称、头像、上次登录时间）
├── work/
│   ├── browser-data/
│   ├── screenshots/
│   └── meta.json
└── ...
```

## 命令

### 检测登录状态

```bash
toutiao-ops [--account <name>] auth check
```

输出示例（已登录）：

```json
{
  "logged_in": true,
  "account": "default",
  "username": "番茄3580433091797615",
  "avatar": "https://sf3-cdn-tos.toutiaostatic.com/img/...",
  "userId": "3580433091797615",
  "profileUrl": "https://www.toutiao.com/c/user/3580433091797615/",
  "url": "https://mp.toutiao.com/profile_v4/index"
}
```

输出示例（未登录）：

```json
{ "logged_in": false, "account": "default", "message": "未登录，请执行 auth login 扫码登录" }
```

### 扫码登录

```bash
toutiao-ops [--account <name>] auth login
```

登录流程分两阶段输出：

**阶段一：等待扫码（stdout 输出 JSON）**

```json
{
  "status": "waiting_for_scan",
  "account": "default",
  "message": "请使用今日头条 APP 扫描二维码登录",
  "qr_screenshot": "/Users/xxx/.toutiao-ops/accounts/default/screenshots/qrcode-xxx.png",
  "attempt": 1,
  "max_attempts": 6
}
```

**收到此输出后，必须立刻将 `qr_screenshot` 路径指向的图片发送/展示给用户，并提示用户打开今日头条 APP 扫码登录。** 二维码有效期约 60 秒，过期后自动刷新并输出新截图路径。

**阶段二：登录结果（stdout 输出 JSON）**

```json
{
  "logged_in": true,
  "account": "default",
  "message": "登录成功，会话已保存",
  "username": "番茄3580433091797615",
  "avatar": "https://sf3-cdn-tos.toutiaostatic.com/img/...",
  "userId": "3580433091797615"
}
```

登录成功后会自动保存账号元信息（昵称、头像、登录时间）到 `meta.json`。

### 退出登录

```bash
toutiao-ops [--account <name>] auth logout
```

清除指定账号的浏览器缓存、截图和元信息。

```json
{
  "success": true,
  "account": "work",
  "message": "已清除账号 [work] 的登录缓存",
  "cleared": ["work"]
}
```

### 列出所有账号

```bash
toutiao-ops auth list
```

```json
{
  "accounts": [
    { "account": "default", "has_session": true, "username": "番茄xxx", "lastLogin": "2026-03-31T..." },
    { "account": "work", "has_session": true, "username": "工作号", "lastLogin": "2026-03-31T..." }
  ],
  "count": 2
}
```

## Agent 调用规范

1. 执行 `auth login` 后监听 stdout
2. 解析到 `status: "waiting_for_scan"` 的 JSON 行时，**读取 `qr_screenshot` 图片并发送给用户**，附带提示："请使用今日头条 APP 扫描二维码登录"
3. 如果收到 `attempt > 1` 的输出，说明二维码已刷新，需再次将新截图发送给用户
4. 解析到 `logged_in: true` 时，登录完成
5. 如果命令以非零退出码结束，说明登录超时（5 分钟内未完成扫码）
6. 操作多账号时，始终在命令中带上 `--account <name>`

## 注意事项

- 任何其他操作前，都应先调用 `auth check` 确认登录状态
- 如果未登录，执行 `auth login` 并将二维码截图展示给用户
- 切换账号：直接用 `--account <新账号名>` 即可，无需先 logout
- 彻底删除某账号：`--account <name> auth logout`
- 不要对同一个账号同时运行多个命令（会争抢浏览器上下文锁文件）
- 不同账号的命令可以并行运行
- 二维码有效期约 60 秒，CLI 会自动刷新，每次刷新都会输出新截图路径
