# 待办 Backlog（遗留问题与后续规划）

> 更新时间：2026-08-15
> 目的：汇总全项目审查发现的遗留问题与未完成的规划，方便后续恢复开发时直接调用。
> 当前版本：**v0.6.8**（自定义确认弹窗 + 追番卡片按钮移除 + 文章填充）
> 提醒：本文件只做记录，不承诺执行顺序；按需挑选执行。

---

## 一、功能 backlog（原 M5 未完成）

| # | 功能 | 说明 | 状态 |
|---|------|------|------|
| F1 | **SEO 完善** | 已有 OG/Twitter 元数据 + `app/robots.ts` + `app/sitemap.ts` + `/rss.xml` ✅ | ✅ 已完成（v0.6.5） |
| F2 | **RSS Feed** | 生成 `/rss.xml` 订阅源 ✅ | ✅ 已完成（v0.6.5） |
| F3 | **评论系统** | 集成第三方（如 Giscus / Waline），或自建 | ⬜ |
| F4 | **阅读统计** | 文章浏览量统计（本地 JSON 存储） | ⬜ |
| F5 | **文章内容填充** | 9 篇文章（3 篇原有 + 6 篇新增），覆盖技术/动漫/生活三类 ✅ | ✅ 已完成（v0.6.8） |
| F6 | **线上部署验证** | 已部署 Cloudflare Workers（2026-08-15）：`https://blog.1653500384.workers.dev`，首页/文章页海外验证 200，国内已绑定正常域名可访问 ✅ | ✅ 已完成（2026-08-15，Cloudflare Workers + 自定义域名） |
| F7 | **文章 TOC** | 里程碑曾标记"目录导航 ✅"，如需完善侧边目录可复查 | ⬜ |
| F8 | **图片懒加载补全** | 全项目 15 处 `<img>` 均已补 `loading="lazy"` ✅ | ✅ 已完成（v0.6.5） |
| F9 | **点赞/互动** | 文章点赞、分享等互动（需求待定） | ⬜ |

---

## 二、代码质量问题（审查发现，已记录未修）

### 中优先级（可能影响体验/稳定性）

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| Q1 | [lib/music-cache.ts](file:///e:/Java/personal-blog/lib/music-cache.ts) | 缓存无过期淘汰、无大小上限，`writeFileSync` 全量同步重写；多实例部署 last-writer-wins 会丢条目 | ✅ 已加 TTL(30min) 惰性清理 + 500 条上限淘汰 + 原子写入（2026-08-09 批次2） |
| Q2 | [components/MusicProvider.tsx](file:///e:/Java/personal-blog/components/MusicProvider.tsx) | 切换音频源无整体超时：若源"挂起"（不触发 timeupdate 也不触发 error），"正在切换音频源…" 提示与 error 永不消失 | ✅ 已加 10s 超时兜底（2026-08-09 批次2） |
| Q3 | [app/layout.tsx](file:///e:/Java/personal-blog/app/layout.tsx) | `NEXT_PUBLIC_SITE_URL` 未配置或无协议时 `new URL()` 抛 TypeError 导致构建失败；默认 `example.com` 占位 | 校验 env 格式 / 配置前降级处理 |

### 低优先级（健壮性/整洁度）

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| Q4 | [lib/lrc.ts](file:///e:/Java/personal-blog/lib/lrc.ts) | 时间戳正则要求分钟至少 2 位，`[1:23]` 这类行被忽略 | ✅ 已放宽为 1-2 位（2026-08-09 批次1） |
| Q5 | [lib/posts.ts](file:///e:/Java/personal-blog/lib/posts.ts) | `searchPosts` 对 `excerpt.toLowerCase()` 无空值保护；`getPosts` 中 `data.date` 缺失时 `new Date(undefined)` 排序为 NaN | ✅ 已加空值兜底（2026-08-09 批次1） |
| Q6 | [components/HomeContent.tsx](file:///e:/Java/personal-blog/components/HomeContent.tsx) | 开发记录卡片硬编码时间（2026.06.03）与标题，内容永不过时 | ✅ 已改为展示最新说说（动态数据，2026-08-09 批次3） |
| Q7 | [components/Sidebar.tsx](file:///e:/Java/personal-blog/components/Sidebar.tsx) | 最新动态为硬编码示例数据，且 `key={index}` | ✅ 已接入真实说说数据（key=moment.id）并挂载到博客列表页（2026-08-09 批次3） |
| Q8 | [lib/json-store.ts](file:///e:/Java/personal-blog/lib/json-store.ts) | 并发写竞态（读-改-写无锁） | 无需处理：读-改-写均为同步（Node 单线程同事件循环内不中断），实际无竞态；加锁需改动全部管理函数与路由，YAGNI 不做（2026-08-09） |
| Q9 | [app/api/search/route.ts](file:///e:/Java/personal-blog/app/api/search/route.ts) | 空结果时返回完整文章内容（响应冗余） | ✅ 已改为只返回元数据（2026-08-09 批次1） |
| Q10 | 全项目 | 21 处 `any` 类型 | 逐个收紧类型 |
| Q11 | [app/api/admin/posts/route.ts](file:///e:/Java/personal-blog/app/api/admin/posts/route.ts) | POST 请求体无 JSON 容错（登录接口已处理，此处未处理） | ✅ 已对齐登录接口 try/catch（2026-08-09 批次1） |
| Q12 | [.env.example](file:///e:/Java/personal-blog/.env.example) | ADMIN_PASSWORD 占位符无强度提示 | 补充强弱校验说明 |

---

## 三、依赖与安全

| # | 项目 | 说明 | 状态 |
|---|------|------|------|
| S1 | **npm audit 高危漏洞** | 4 个 high（位于 bcryptjs / jsonwebtoken 等依赖链） | 需评估是否可升级（jsonwebtoken v9 无升级版时需评估风险与替代） |
| S2 | **Meting API 依赖** | 音乐主通道依赖第三方 `api.injahow.cn`，其故障时降级直连网易云（可能被限流） | 已实现降级；如需要可做多源轮换 |

---

## 四、已归档（已完成的工作，不再维护）

- v0.6.0 安全加固：计划/设计/进度文档已删除（2026-08-07），内容浓缩于 `checklist.md` 第十阶段与 `PRD.md` 更新记录
- v0.6.1 音乐稳定性：见 `PRD.md` / `checklist.md` 第十一阶段
- v0.6.2 图片上传与安全加固：见 `checklist.md` 第十二阶段与 `PRD.md` 更新记录
- v0.6.3 健壮性与数据驱动优化：见 `checklist.md` 第十三阶段（M6.7）与 `PRD.md` 更新记录
- v0.6.4 管理员体验与追番性能优化：见 `checklist.md` 第十四阶段（M6.8）与 `PRD.md` 更新记录

---

## 五、Cloudflare Workers 部署遗留问题（2026-08-15 记录，待处理）

> 背景：博客已上线 Cloudflare Workers（构建命令 `npm run build:cf` → 生成静态文章数据 + OpenNext bundle）。
> Workers 无持久磁盘、无 cron（需改 triggers），以下问题均为"先上线、改造后置"策略下的遗留项，按优先级排列。

### P1 数据未上线（页面显示为空）

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| D1 | `data/*.json`（moments/projects/friends/anime 等）按隐私决定**未提交 GitHub**，云端无数据 | 首页"0项目/0说说"；说说/友链/项目/追番页面全空 | ✅ 已迁移 KV（`data:` 前缀）并导入全部数据（2026-08-16） |
| D2 | 文章数据来自构建时快照（`lib/generated/posts-data.ts`），**新增文章需重新构建部署**才生效 | 后台发文 → 构建 → 部署的流程待定 | ✅ 后台发文已改 KV（`post:index` + `post:{slug}`），发文即时生效，无需重建（2026-08-16） |

### P2 Workers 上不可用的动态功能（fs 写操作）

| # | 位置 | 问题 | 状态 |
|---|------|------|------|
| D3 | `app/api/admin/posts/route.ts`、`app/api/admin/posts/[slug]/route.ts` | 发布/编辑文章用 `fs` 写 `posts/*.md` → Workers 无磁盘，**后台发文不可用** | ✅ 已改 KV 双模式（2026-08-16） |
| D4 | `lib/json-store.ts`（写入函数）+ 对应 admin API | 说说/项目/友链的增删改写 JSON → 同上，**后台管理不可用** | ✅ 已改 KV 双模式（2026-08-16） |
| D5 | `app/api/upload/route.ts` | 图片上传写 `public/uploads/` → 无磁盘，**上传不可用** | 🔶 代码已改 R2 双模式 + `/uploads` 读取路由，**待账户启用 R2 后创建 `blog-uploads` bucket** |
| D6 | `lib/music-cache.ts` | 音乐元数据磁盘缓存 → 无磁盘，缓存失效（每次冷请求，Meting 主通道仍可用，仅性能损失） | ✅ 已改 KV（`music:` 前缀）（2026-08-16） |

### P3 配置类

| # | 问题 | 状态 |
|---|------|------|
| D7 | **环境变量未在 Cloudflare 配置**：`JWT_SECRET`、`ADMIN_PASSWORD`、`BANGUMI_TOKEN`、`CRON_SECRET`、`ADMIN_TOKEN`（真实值在本地 `.env`，未提交） | ✅ 已配置 4 个 secrets（JWT_SECRET/BANGUMI_TOKEN 复用 `.env`，CRON_SECRET/ADMIN_TOKEN 新生成）；ADMIN_PASSWORD 无需配置（KV 已存密码哈希）（2026-08-16） |
| D8 | **cron 未迁移**：追番每日同步原在 `vercel.json`，Workers 需改为 `triggers.crons` | ✅ 已迁移 wrangler `triggers.crons`（`0 0 * * *` → `/api/anime/cron`），路由兼容 CF 调度 UA（2026-08-16） |
| D9 | **站点 URL 仍是占位符**：`app/layout.tsx` 的 `NEXT_PUBLIC_SITE_URL` 未配置，og:url 等输出 `xizi-duo-qiu.example.com`；配置真实域名后需处理（Q3 同源） | ✅ 已配置 `vars.NEXT_PUBLIC_SITE_URL` = 当前 workers.dev 域名；绑定自定义域名后需同步更新（2026-08-16） |

### P4 工程/安全

| # | 问题 | 状态 |
|---|------|------|
| D10 | **GitHub PAT 已暴露**（对话中明文出现，`ghp_` 开头） | ✅ 已核实：PAT 未出现在任何项目文件中（仅 Trae MCP GitHub 工具配置），用户决定不处理（2026-08-16） |
| D11 | 本地 Windows 无法跑 `npm run build:cf`（OpenNext 崩溃，0xC0000409），只能云端构建或 WSL | ✅ 记录即可，改开发机时注意（2026-08-16） |
| D12 | 追番数据（`data/anime.json`）为运行时缓存且未提交，追番页无数据 | ✅ 已导入 KV（`data:anime.json`，2026-08-16） |

### 处理建议顺序

1. D10（安全，先撤销 PAT）→ 2. D7（配环境变量）→ 3. D1+D4（KV 改造 + 数据导入，恢复说说/友链/项目）→ 4. D3/D5（发文/上传改 R2）→ 5. D8（cron）→ 6. D2/D9（数据流与域名收尾）

---

## 使用说明

- 恢复开发时：先读本文件 → 按需挑选 → 涉及功能变更先走"头脑风暴 → 写作计划"流程
- 完成某项后：在本文件勾选 ✅ 并注明版本/提交，保持文档即状态
