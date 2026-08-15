# API 接口文档

## 认证接口

### 登录

**POST** `/api/admin/login`

请求体：
```json
{
  "password": "string"
}
```

响应：
```json
{
  "success": true,
  "token": "string"
}
```

> **安全说明：** 登录接口有 IP 级限流，连续失败 5 次后锁定 15 分钟（返回 429）。

## 图片上传接口

### 上传图片

**POST** `/api/upload`

请求头：`Authorization: Bearer <token>`

请求体：`multipart/form-data`，字段 `file`（图片文件）

支持格式：`jpg / png / gif / webp / svg / avif`，单张最大 10MB

响应：
```json
{
  "success": true,
  "url": "/uploads/xxx.jpg"
}
```

> **安全说明：**
> - 需要管理员 JWT 鉴权
> - 校验文件真实类型（魔数验证），伪造 MIME 的恶意文件会被拒绝
> - 总量限制：最多 500 张，总大小 200MB，超限需先在图库管理清理

## 图库管理接口

### 获取图片列表

**GET** `/api/admin/gallery`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "files": [
    {
      "name": "string",
      "size": 0,
      "modifiedAt": "string",
      "url": "/uploads/xxx.jpg"
    }
  ],
  "totalCount": 0,
  "totalSize": 0
}
```

### 删除图片

**DELETE** `/api/admin/gallery`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "filename": "string"
}
```

响应：
```json
{
  "success": true
}
```

> **注意：** 删除图片不会自动更新引用它的说说/项目，被引用处会显示破图，删除前请确认。

## 项目接口

### 获取所有项目

**GET** `/api/admin/projects`

响应：
```json
{
  "success": true,
  "data": [
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
}
```

### 添加项目

**POST** `/api/admin/projects`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "name": "string",
  "description": "string",
  "date": "string",
  "tags": ["string"],
  "github": "string",
  "demo": "string",
  "cover": "string"
}
```

响应：
```json
{
  "success": true,
  "data": { /* 新建的项目对象 */ }
}
```

> `cover` 为可选的封面图 URL（可留空，有封面时项目卡片显示封面图）。

### 更新项目

**PUT** `/api/admin/projects`

请求头：`Authorization: Bearer <token>`

请求体：
```json
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
```

响应：
```json
{
  "success": true,
  "data": { /* 更新后的项目对象 */ }
}
```

### 删除项目

**DELETE** `/api/admin/projects`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "id": "string"
}
```

响应：
```json
{
  "success": true
}
```

## 说说接口

### 获取所有说说

**GET** `/api/admin/moments`

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "content": "string",
      "images": ["string"],
      "date": "string",
      "order": 0
    }
  ]
}
```

### 添加说说

**POST** `/api/admin/moments`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "content": "string",
  "images": ["string"]
}
```

响应：
```json
{
  "success": true,
  "data": { /* 新建的说说对象 */ }
}
```

### 更新说说

**PUT** `/api/admin/moments`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "id": "string",
  "content": "string",
  "images": ["string"],
  "order": 0
}
```

响应：
```json
{
  "success": true,
  "data": { /* 更新后的说说对象 */ }
}
```

### 删除说说

**DELETE** `/api/admin/moments`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "id": "string"
}
```

响应：
```json
{
  "success": true
}
```

## 友链接口

### 获取所有友链

**GET** `/api/admin/friends`

响应：
```json
{
  "success": true,
  "data": [
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
}
```

### 添加友链

**POST** `/api/admin/friends`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "name": "string",
  "avatar": "string",
  "description": "string",
  "url": "string",
  "tags": ["string"]
}
```

响应：
```json
{
  "success": true,
  "data": { /* 新建的友链对象 */ }
}
```

### 更新友链

**PUT** `/api/admin/friends`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "id": "string",
  "name": "string",
  "avatar": "string",
  "description": "string",
  "url": "string",
  "tags": ["string"],
  "order": 0
}
```

响应：
```json
{
  "success": true,
  "data": { /* 更新后的友链对象 */ }
}
```

### 删除友链

**DELETE** `/api/admin/friends`

请求头：`Authorization: Bearer <token>`

请求体：
```json
{
  "id": "string"
}
```

响应：
```json
{
  "success": true
}
```

## 文章接口

### 获取所有文章

**GET** `/api/admin/posts`

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 0,
      "slug": "string",
      "title": "string",
      "date": "string",
      "category": "string",
      "tags": ["string"]
    }
  ]
}
```

### 获取文章详情

**GET** `/api/admin/posts/[slug]`

响应：
```json
{
  "success": true,
  "data": {
    "id": 0,
    "slug": "string",
    "title": "string",
    "date": "string",
    "category": "string",
    "tags": ["string"],
    "content": "string"
  }
}
```

## 搜索接口

### 搜索文章

**GET** `/api/search?q=<keyword>`

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 0,
      "slug": "string",
      "title": "string",
      "date": "string",
      "category": "string",
      "tags": ["string"],
      "excerpt": "string"
    }
  ],
  "count": 0
}
```

## 音乐接口

### 获取歌曲信息

**GET** `/api/music?ids=<ids>&source=<source>`

参数：
- `ids`: 歌曲ID（多个用逗号分隔）
- `source`: 音乐平台 (`netease` 或 `qq`，默认 `netease`）

#### 网易云音乐 (netease)

**请求示例：**
```
GET /api/music?ids=1347524822&source=netease
```

**响应：**
```json
[
  {
    "id": "1347524822",
    "name": "歌曲名",
    "artist": "歌手名",
    "cover": "封面图片URL",
    "url": "播放地址",
    "lrc": "歌词（LRC格式）",
    "freeTrialInfo": {
      "start": 0,
      "end": 30000
    }
  }
]
```

> **注意：** 网易云免费歌曲可能返回 30 秒试听版（`freeTrialInfo` 字段），完整播放需要会员。

#### QQ 音乐 (qq)

**请求示例：**
```
GET /api/music?ids=004XqIYb0VPIUb&source=qq
```

**响应：**
```json
[
  {
    "id": "004XqIYb0VPIUb",
    "name": "歌曲名",
    "artist": "歌手名",
    "cover": "封面图片URL",
    "url": "播放地址",
    "lrc": "歌词（LRC格式，Base64解码）"
  }
]
```

> **注意：** QQ 音乐 ID 为 `songmid`（如 `004XqIYb0VPIUb`），非数字ID。

#### 错误响应

```json
{
  "error": "错误信息"
}
```

### 音乐组件配置

#### SongRef 类型

```typescript
interface SongRef {
  id: string;
  source: 'netease' | 'qq' | 'local';
  url?: string;        // 本地文件路径（source 为 local 时必填）
  title?: string;      // 自定义标题（可选）
  artist?: string;     // 自定义艺术家（可选）
  cover?: string;      // 自定义封面（可选）
  alt?: SongRefAlt[];  // 替代来源
}

interface SongRefAlt {
  id: string;
  source: 'netease' | 'qq' | 'local';
  url?: string;  // 本地文件路径
}
```

#### 歌单配置示例

```typescript
const PLAYLISTS = [
  {
    id: 'gufeng',
    name: '🏮 古风',
    songs: [
      // 纯 API 来源
      { id: '1347524822', source: 'netease' },
      
      // 多来源自动切换（主来源失败时切换到 alt）
      { 
        id: '2747241483', 
        source: 'netease',
        alt: [{ id: 'local-1', source: 'local', url: '/music/gufeng/岸边客.mp3' }]
      },
      
      // QQ 音乐 + 网易云备用
      { 
        id: '004XqIYb0VPIUb', 
        source: 'qq',
        alt: [{ id: '473403182', source: 'netease' }]
      },
      
      // 纯本地文件
      { id: 'local-song', source: 'local', url: '/music/gufeng/歌曲.mp3' },
    ],
  },
];
```

#### 本地文件目录结构

```
public/music/
├── gufeng/      ← 古风歌单
│   ├── 岸边客.mp3
│   ├── 岸边客.lrc      ← 歌词文件（可选）
│   └── 赤伶.mp3
├── erciyuan/    ← 二次元歌单
├── liuxing/     ← 流行歌单
└── emo/         ← Emo 歌单
```

#### 自动切换机制

1. **播放优先级：** 本地文件 > API 来源
2. **主来源失败时：** 自动切换到 `alt` 中的下一个来源
3. **全部失败时：** 显示错误提示「歌曲名」的所有来源均无法播放
4. **歌词加载：** 本地文件自动查找同名 `.lrc` 文件

## 追番接口

### 获取追番列表

**GET** `/api/anime`

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "cover": "string",
      "tags": ["string"],
      "synopsis": "string",
      "status": "watching | completed | plan_to_watch | on_hold | dropped"
    }
  ],
  "meta": {
    "count": 0,
    "lastSync": 1785575874597,
    "expired": false,
    "syncing": false,
    "configReady": true
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 番剧 ID（Bangumi subject_id） |
| name | string | 番剧名称（中文优先，无中文则日文） |
| cover | string | 封面图片 URL |
| tags | string[] | 标签列表（最多10个） |
| synopsis | string | 剧情简介 |
| status | string | 收藏状态 |

**meta 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| count | number | 番剧数量 |
| lastSync | number | 上次同步时间戳（毫秒） |
| expired | boolean | 缓存是否已过期（超过 24 小时） |
| syncing | boolean | 是否正在后台同步 |
| configReady | boolean | BANGUMI_TOKEN 是否已配置（false 时同步不可用，需配置环境变量） |

**状态值说明：**
- `watching` - 在看
- `completed` - 看过
- `plan_to_watch` - 想看
- `on_hold` - 搁置
- `dropped` - 抛弃

**缓存机制：**
- 数据缓存 24 小时
- 缓存过期时自动从 Bangumi API 同步
- `meta.expired` 为 true 时表示缓存已过期
- `meta.lastSync` 为上次同步时间戳

### 手动同步

**POST** `/api/anime/sync`

请求头：`Authorization: Bearer <token>`

响应：
```json
{
  "success": true,
  "data": [],
  "count": 51
}
```

> **注意：** 需要管理员权限。点击同步按钮后会立即从 Bangumi API 获取最新数据。

### 更新番剧状态

**POST** `/api/anime/update`

请求体：
```json
{
  "id": "string",
  "status": "watching"
}
```

响应：
```json
{
  "success": true
}
```

> **注意：** 此接口仅更新本地缓存，不会同步到 Bangumi。

### 封面图片代理

**GET** `/api/anime/cover?url=<encoded_url>`

参数：
- `url`: Bangumi 封面图片 URL（需 URL 编码）

> 用于解决 Bangumi 图片在国内访问受限的问题，通过 wsrv.nl 代理服务加载。

### 定时同步（Cron）

**POST** `/api/anime/cron`

请求头：`Authorization: Bearer <CRON_SECRET>`

> Vercel Cron 定时调用，每天自动同步一次。也可使用外部 cron 服务调用。

## 错误响应

所有接口的错误响应格式：

```json
{
  "error": "string"
}
```

HTTP 状态码：
- 401: 未授权（token无效或过期）
- 400: 请求参数错误
- 404: 资源不存在
- 500: 服务器内部错误