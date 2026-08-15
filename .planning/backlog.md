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
| F6 | **线上部署验证** | 目前仅本地 dev；GitHub Pages workflow 已删除（未配置静态导出），需确定部署方案（Vercel/自建/重新配置 GH Pages） | ⬜ |
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

## 使用说明

- 恢复开发时：先读本文件 → 按需挑选 → 涉及功能变更先走"头脑风暴 → 写作计划"流程
- 完成某项后：在本文件勾选 ✅ 并注明版本/提交，保持文档即状态
