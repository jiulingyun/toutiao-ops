# 粉丝数据

## 概述

从 `https://mp.toutiao.com/profile_v4/analysis/fans/overview` 获取完整粉丝数据，包括核心指标、四大分布（性别/年龄/地域/机型价格）和粉丝偏好。

## 命令

```bash
toutiao-ops analytics fans
```

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--headless` | 否 | false | 无头模式运行 |

## 数据获取策略

1. 核心指标和地域分布：从页面 DOM 文本提取
2. 性别/年龄/机型价格分布：从 React Fiber 树中提取 echarts 图表的原始数据
3. 粉丝偏好（看过的作品、关注的作者）：从 `.fans-interest-article-container` 和 `.fans-interest-author` DOM 提取

## 输出示例

```json
{
  "success": true,
  "category": "fans",
  "source": "dom_scrape",
  "metrics": {
    "前日粉丝变化数": "0",
    "前日活跃粉丝数": "3,139",
    "前日活跃粉丝占比": "89.71%",
    "前日粉丝总数": "3,499",
    "总粉丝数": "3,500",
    "粉丝变化数": "-1",
    "广东": "18.70%",
    "北京": "10.00%",
    "粉丝数": "3,139",
    "涨粉数": "0",
    "掉粉数": "0"
  },
  "distributions": {
    "gender": [
      { "label": "男性", "value": 3422, "percent": "97.86%" },
      { "label": "女性", "value": 75, "percent": "2.14%" }
    ],
    "age": [
      { "label": "0-18", "percent": "0.17%" },
      { "label": "18-23", "percent": "0.37%" },
      { "label": "24-30", "percent": "3.43%" },
      { "label": "31-40", "percent": "43.58%" },
      { "label": "41-50", "percent": "42.12%" },
      { "label": "50+", "percent": "10.32%" }
    ],
    "devicePrice": [
      { "label": "0~999", "percent": "0.43%" },
      { "label": "1000~1999", "percent": "6.42%" },
      { "label": "2000~2999", "percent": "12.38%" },
      { "label": "3000~3999", "percent": "11.81%" },
      { "label": "4000~4999", "percent": "9.72%" },
      { "label": "5000以上", "percent": "59.23%" }
    ],
    "fansViewedWorks": [
      { "title": "文章标题...", "views": 942, "cover": "https://..." }
    ],
    "fansFollowedAuthors": [
      { "name": "雷军", "avatar": "https://...", "link": "https://www.toutiao.com/c/user/..." }
    ]
  }
}
```

## 数据字段说明

### metrics（核心指标 + 地域分布）

| 字段 | 说明 |
|------|------|
| `前日粉丝总数` | 截至前日的粉丝总数 |
| `前日粉丝变化数` | 前日净增粉丝数 |
| `前日活跃粉丝数` | 前日活跃粉丝数 |
| `前日活跃粉丝占比` | 活跃粉丝百分比 |
| `涨粉数` / `掉粉数` | 涨粉和掉粉明细 |
| `{省份}` | 该省份粉丝占比（如 `广东: 18.70%`） |

### distributions（分布数据）

| 字段 | 说明 |
|------|------|
| `gender` | 性别分布，含人数和百分比 |
| `age` | 年龄分布（6 个区间） |
| `devicePrice` | 手机价格分布（6 个区间） |
| `fansViewedWorks` | 粉丝最近看过的作品（标题、观看次数、封面） |
| `fansFollowedAuthors` | 粉丝还关注的其他作者（名称、头像、主页链接） |

## 注意事项

- 数据为前日数据，14:00 前更新昨日数据
- 性别/年龄/机型价格数据从 echarts 图表原始数据提取，精度高
- 地域分布包含全国 34 个省份/地区
