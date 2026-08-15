# 数据结构文档

## 数据文件位置

所有动态数据存储在 `data/` 目录下的 JSON 文件中：

```
data/
├── admin.json       # 管理员信息
├── projects.json    # 项目数据
├── moments.json     # 说说数据
└── friends.json     # 友链数据
```

## 上传图片存储

上传的图片存放在 `public/uploads/` 目录（不在 `data/` 下），说说/项目的图片字段保存的是 `/uploads/xxx.jpg` 相对路径。

- **上传方式**：通过 `POST /api/upload` 接口上传（需管理员 JWT），或直接在说说/项目编辑弹窗中拖拽/选择图片
- **支持格式**：jpg / png / gif / webp / svg / avif，单张最大 10MB
- **总量限制**：最多 500 张，总大小 200MB（超限需在图库管理清理）
- **管理方式**：登录后访问 `/admin/gallery` 图库管理页，可查看缩略图、删除图片
- **注意事项**：删除图片文件不会自动更新引用它的说说/项目，被引用处会显示破图

## 数据结构定义

### 管理员信息 (`admin.json`)

```json
{
  "password": "string"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| password | string | 加密后的管理员密码（bcrypt） |

### 项目数据 (`projects.json`)

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "date": "string",
    "tags": ["string"],
    "github": "string",
    "demo": "string",
    "icon": "string",
    "cover": "string",
    "order": 0
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 项目唯一标识（UUID） |
| name | string | 项目名称 |
| description | string | 项目描述 |
| date | string | 创建日期（YYYY-MM-DD） |
| tags | string[] | 技术标签列表 |
| github | string | GitHub 仓库链接 |
| demo | string | 演示地址 |
| icon | string | 项目图标（emoji） |
| cover | string | 封面图片 URL（可选，为空则不显示封面） |
| order | number | 排序序号（从小到大） |

### 说说数据 (`moments.json`)

```json
[
  {
    "id": "string",
    "content": "string",
    "images": ["string"],
    "date": "string",
    "order": 0
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 说说唯一标识（UUID） |
| content | string | 说说内容 |
| images | string[] | 图片 URL 列表 |
| date | string | 发布日期（YYYY-MM-DD HH:mm:ss） |
| order | number | 排序序号（从小到大） |

### 友链数据 (`friends.json`)

```json
[
  {
    "id": "string",
    "name": "string",
    "avatar": "string",
    "description": "string",
    "url": "string",
    "tags": ["string"],
    "order": 0
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 友链唯一标识（UUID） |
| name | string | 站点名称 |
| avatar | string | 头像 URL |
| description | string | 站点描述 |
| url | string | 站点链接 |
| tags | string[] | 标签列表 |
| order | number | 排序序号（从小到大） |

## 音乐数据

音乐播放器支持多来源播放，包括 API 来源（网易云音乐、QQ音乐）和本地文件来源。

### 歌单配置

歌单配置在 `components/MusicProvider.tsx` 中定义为常量 `PLAYLISTS`：

```typescript
interface SongRef {
  id: string;
  source: MusicSource;       // 'netease' | 'qq' | 'local'
  url?: string;              // 本地文件的 URL（source 为 local 时使用）
  title?: string;            // 自定义标题（source 为 local 时必须）
  artist?: string;           // 自定义艺术家（source 为 local 时可选）
  cover?: string;            // 自定义封面（source 为 local 时可选）
  alt?: SongRefAlt[];        // 替代来源
}

interface SongRefAlt {
  id: string;
  source: MusicSource;
  url?: string;              // 本地文件 URL
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: SongRef[];
}
```

### 播放流程

1. 主来源播放失败时，自动切换到 `alt` 中定义的替代来源
2. 所有来源都失败时，显示"所有来源均无法播放"并停止播放
3. 播放成功后会清除切换提示

### 本地文件放置规范

本地文件放在 `public/music/{歌单分类}/` 目录下：

```
public/music/
├── gufeng/          # 古风歌单的本地文件
│   ├── 虞兮叹.mp3
│   ├── 岸边客.mp3
│   └── 赤伶（男生版）.mp3
```

### VIP歌曲处理流程

部分歌曲在 API 来源上需要 VIP 会员才能完整播放，网易云会返回 30 秒试听版。处理方式如下：

**方法1：本地文件替代（推荐）**

将歌曲配置为以 API 为主来源，本地文件为 alt 后备。播放时优先使用本地文件，本地文件失败时自动回退到 API 来源：

```typescript
{ id: '1479526505', source: 'netease', alt: [{ id: 'local-yu-xi-tan', source: 'local', url: '/music/gufeng/虞兮叹.mp3' }] },
```

**方法2：纯本地文件（无 API 来源）**

适用于不在 API 平台上的歌曲，或者只需本地播放的歌曲：

```typescript
{ id: 'local-song-id', source: 'local', url: '/music/gufeng/歌曲名.mp3', title: '歌曲名', artist: '歌手名', cover: '封面URL' },
```

**方法3：本地文件为主 + API 后备**

与方法1相反，主要使用本地文件，API 来源仅作为后备：

```typescript
{ id: 'local-song-id', source: 'local', url: '/music/gufeng/歌曲名.mp3', title: '歌曲名', artist: '歌手名', cover: '封面URL', alt: [{ id: '1911377814', source: 'netease' }] },
```

**注意事项：**
- 本地文件优先播放：`fetchSongWithFallback` 会将本地 URL 放在 `urls` 数组首位
- 歌曲配置中每条都必须写中文备注，格式：`// 歌曲名 - 歌手（说明）`
- 本地文件的歌词可以通过同名的 `.lrc` 文件自动加载（如 `虞兮叹.lrc`）
- 本地文件的封面图片通过 `cover` 字段指定

### API 接口

详见 [API.md](API.md) 中的音乐接口章节。

### 关于这部分的配置参考

MusicProvider.tsx 的 `fetchSongWithFallback` 函数实现了上述所有播放流程逻辑，包括：
- 多来源自动切换
- 本地文件优先播放
- 超时保护（单个来源 5 秒超时）
- 歌词解析（支持 LRC 格式）

## Markdown 文章

博客文章存储在 `posts/` 目录下，使用 Markdown 格式：

```markdown
---
title: "文章标题"
date: "2026-07-13"
category: "技术"
tags: ["React", "Next.js"]
---

文章内容...
```

| Frontmatter | 类型 | 说明 |
|-------------|------|------|
| title | string | 文章标题 |
| date | string | 发布日期（YYYY-MM-DD） |
| category | string | 分类 |
| tags | string[] | 标签列表 |

### 追番数据 (`anime.json`)

```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "cover": "string",
      "tags": ["string"],
      "synopsis": "string",
      "status": "watching"
    }
  ],
  "lastSync": 1785575874597
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Anime[] | 番剧列表 |
| lastSync | number | 上次同步时间戳（毫秒） |

**数据来源：** Bangumi API (`api.bgmapi.com`)

**同步机制：**
1. 手动同步：管理员点击同步按钮触发
2. 定时同步：Vercel Cron 每天自动调用 `/api/anime/cron`
3. 访问自动同步：缓存超过 24 小时后，下次访问时自动同步

**缓存有效期：** 24 小时

## 数据操作说明

### 排序机制

所有支持拖拽排序的数据（项目、说说、友链）都有 `order` 字段：
- 数据按 `order` 字段从小到大排序
- 拖拽排序时，系统会重新分配所有条目的 `order` 值
- 新添加的条目 `order` 值为当前最大值 + 1

### ID 生成

所有数据的 `id` 字段使用 UUID 格式（v4），在创建时自动生成。

### 数据持久化

所有数据修改（增删改）都会实时写入对应的 JSON 文件，无需额外的数据库服务。