# 待办 Backlog（遗留问题与后续规划）

> 更新时间：2026-08-16
> 目的：只记录**未完成**的遗留问题与规划；已完成任务的详细记录见 `README.md` 版本记录。
> 当前版本：**v0.7.0**（音乐播放器误报修复 + 追番封面缓存与交互体验）
> 提醒：本文件只做记录，不承诺执行顺序；按需挑选执行。

---

## 一、功能 backlog（未完成）

| # | 功能 | 说明 | 状态 |
|---|------|------|------|
| F3 | **评论系统** | 集成第三方（如 Giscus / Waline），或自建 | ⬜ |
| F4 | **阅读统计** | 文章浏览量统计（本地 JSON 存储） | ⬜ |
| F7 | **文章 TOC** | 里程碑曾标记"目录导航 ✅"，如需完善侧边目录可复查 | ⬜ |
| F9 | **点赞/互动** | 文章点赞、分享等互动（需求待定） | ⬜ |

---

## 二、代码质量问题（审查发现，已记录未修）

### 中优先级（可能影响体验/稳定性）

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| Q3 | [app/layout.tsx](file:///e:/Java/personal-blog/app/layout.tsx) | `NEXT_PUBLIC_SITE_URL` 未配置或无协议时 `new URL()` 抛 TypeError 导致构建失败；默认 `example.com` 占位 | 校验 env 格式 / 配置前降级处理 |

### 低优先级（健壮性/整洁度）

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| Q10 | 全项目 | 21 处 `any` 类型 | 逐个收紧类型 |
| Q12 | [.env.example](file:///e:/Java/personal-blog/.env.example) | ADMIN_PASSWORD 占位符无强度提示 | 补充强弱校验说明 |
| Q13 | [app/anime/page.tsx](file:///e:/Java/personal-blog/app/anime/page.tsx) + [components/AnimeCard.tsx](file:///e:/Java/personal-blog/components/AnimeCard.tsx) | 追番列表滚动位置恢复不稳定：进入详情页返回后**不是每次都**回到进入前位置（偶发回到顶部/偏移）。v0.7.0 用户实测反馈（2026-08-16） | 待处理：排查恢复时机（图片懒加载/列表高度变化导致 scrollTo 不到位）与 sessionStorage 读写竞态（如连续点击卡片） |

---

## 三、依赖与安全

| # | 项目 | 说明 | 状态 |
|---|------|------|------|
| S1 | **npm audit 高危漏洞** | 4 个 high（位于 bcryptjs / jsonwebtoken 等依赖链） | 需评估是否可升级（jsonwebtoken v9 无升级版时需评估风险与替代） |
| S2 | **Meting API 依赖** | 音乐主通道依赖第三方 `api.injahow.cn`，其故障时降级直连网易云（可能被限流） | 已实现降级；如需要可做多源轮换 |

---

## 四、Cloudflare Workers 部署遗留问题（未完成项）

> 背景：博客已上线 Cloudflare Workers（构建命令 `npm run build:cf` → 生成静态文章数据 + OpenNext bundle）。
> Workers 无持久磁盘，数据与写入已迁移 KV/R2 双模式；以下为仍待处理的遗留项。

| # | 问题 | 状态 |
|---|------|------|
| D5 | `app/api/upload/route.ts` 图片上传已改 R2 双模式 + `/uploads` 读取路由，但 **R2 未启用**，需账户启用 R2 后创建 `blog-uploads` bucket | 🔶 待启用 R2 后创建 bucket |

---

## 五、使用说明

- 恢复开发时：先读本文件 → 按需挑选 → 涉及功能变更先走"头脑风暴 → 写作计划"流程
- 完成某项后：在本文件勾选 ✅ 并注明版本/提交，保持文档即状态
- 已完成任务的详细版本记录见项目根目录 `README.md`（版本记录表）
