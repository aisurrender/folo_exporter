# Folo Exporter 重构设计

日期: 2026-01-27

## 背景

现有版本存在两个核心问题：
1. 只能抓取当前窗口可见的文章，无法获取所有未读
2. 抓取时容易触发已读状态，影响文章管理

## 目标

- 一键抓取所有未读文章（不受滚动限制）
- 不触发已读状态
- 导出为 Markdown 格式供 AI 处理
- 可接受半自动操作

## 技术方案：API 直接调用

通过 Follow 的 API 获取数据，完全绑过页面交互。

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────┬─────────────────────┬─────────────────────┤
│   Popup     │   Background        │   Content Script    │
│   (UI)      │   (Service Worker)  │   (注入页面)         │
├─────────────┼─────────────────────┼─────────────────────┤
│ - 抓取按钮   │ - 调用 Follow API   │ - 提取 auth token   │
│ - 显示结果   │ - 数据处理/格式化    │ - 从 cookie/storage │
│ - 导出选项   │ - 缓存管理          │   获取登录凭证       │
└─────────────┴─────────────────────┴─────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Follow API          │
              │   (app.folo.is)       │
              └───────────────────────┘
```

### Auth Token 获取

自动提取策略（按优先级）：
1. Cookie - 检查 app.folo.is 域下的 session cookie
2. localStorage - 检查 token/auth/session 等常见 key
3. IndexedDB - 备选

用户体验：
- 正常情况：用户已登录 Follow → 插件自动获取 token → 无需手动操作
- 异常情况：token 失效 → 提示用户刷新 Follow 页面重新登录
- 备选：提供手动输入 token 入口

### API 调用与数据获取

分页处理（假设每次限制 50 条）：
```
GET /entries?read=false&limit=50&offset=0
GET /entries?read=false&limit=50&offset=50
... 直到返回空数组
```

预期数据结构：
```json
{
  "entries": [
    {
      "id": "abc123",
      "title": "文章标题",
      "url": "https://...",
      "feed": {
        "title": "来源名称"
      },
      "publishedAt": "2026-01-27T10:00:00Z",
      "summary": "文章摘要"
    }
  ]
}
```

导出内容：标题 + 链接 + 来源 + 时间 + 摘要

### 导出格式

```markdown
# Follow 未读文章导出
导出时间: 2026-01-27 15:30
未读数量: 103 篇

---

## AI News (32)

### 文章标题
- 来源: AI News
- 时间: 2026-01-27 10:00
- 链接: https://example.com/article1
- 摘要: 文章摘要内容...

...
```

格式选项：
- 按来源分组（默认）
- 纯列表不分组

### Popup UI

```
┌────────────────────────────────────┐
│  Folo Exporter            [状态灯] │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │      [ 抓取未读文章 ]         │  │
│  └──────────────────────────────┘  │
│                                    │
│  状态: ● 已连接 (token 有效)       │
├────────────────────────────────────┤
│  抓取结果:                         │
│  ✓ 获取到 103 篇未读文章           │
│  · AI News: 32 篇                 │
│  · AI Blogs: 21 篇                │
│  · ...                            │
│                                    │
│  导出选项:                         │
│  ○ 按来源分组  ○ 纯列表            │
│                                    │
│  [ 复制到剪贴板 ]  [ 下载为文件 ]   │
└────────────────────────────────────┘
```

状态提示：
- 🟢 已连接 - token 有效
- 🟡 需要登录 - 请先登录 Follow
- 🔴 错误 - 显示具体错误信息

### 文件结构

```
folo_exporter/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── background/
│   └── service-worker.js
├── content/
│   └── content.js
└── README.md
```

### 技术选择

- 纯 JavaScript，不引入框架
- Manifest V3
- Fetch API

### 权限需求

```json
{
  "permissions": ["storage", "clipboardWrite"],
  "host_permissions": [
    "https://app.folo.is/*",
    "https://api.folo.is/*"
  ]
}
```

## 后续规划

- AI 接口集成（可选，后续实现）

## 实现前需要验证

1. Follow API 的实际端点和数据结构
2. Token 的具体存储位置
3. API 是否需要额外的认证头
