---
title: "Next.js 性能优化实战：从入门到精通"
excerpt: "掌握 Next.js 的关键性能优化技巧，让你的网站飞起来"
date: "2026-08-05"
tags: ["Next.js", "性能", "前端", "优化"]
category: "技术"
author: "Admin"
readTime: 7
---

## 为什么性能很重要？

根据 Google 的研究数据：
- 页面加载时间从 1 秒增加到 3 秒，跳出率增加 32%
- 从 1 秒增加到 5 秒，跳出率增加 90%
- 每慢 100 毫秒，转化率下降 7%

性能直接影响用户体验和业务指标，值得我们投入精力去优化。

## 1. 图片优化

图片通常是网页最大的资源，优化图片能带来立竿见影的效果。

### 使用 Next.js Image 组件

```tsx
import Image from 'next/image';

// 自动优化：格式转换、懒加载、尺寸计算
<Image
  src="/hero.jpg"
  alt="首页横幅"
  width={1200}
  height={600}
  priority  // 首屏图片优先加载
/>
```

### 实际效果

在我的博客项目中，使用 `next/image` 后，LCP（最大内容绘制）时间从 3.2s 降低到 1.4s。

## 2. 字体优化

字体文件往往很大，不当使用会严重影响加载速度。

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],        // 只加载需要的字符集
  display: 'swap',           // 字体加载期间显示 fallback
  variable: '--font-inter',  // CSS 变量暴露
});
```

```tsx
// layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="zh" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

## 3. 代码分割

Next.js 自动按页面分割代码，但我们还可以进一步优化。

### 动态导入

```tsx
import dynamic from 'next/dynamic';

// 不在首屏加载，需要时才导入
const HeavyChart = dynamic(() => import('@/components/HeavyChart'));

export default function Dashboard() {
  return (
    <div>
      <h1>仪表盘</h1>
      <HeavyChart data={chartData} />
    </div>
  );
}
```

### 禁用客户端组件

减少不必要的 `'use client'` 使用，尽可能使用 Server Components：

```tsx
// ❌ 不必要的客户端组件
'use client';
export default function StaticInfo() {
  return <p>这是一个静态信息</p>;
}

// ✅ 服务端组件
export default async function StaticInfo() {
  return <p>这是一个静态信息</p>;
}
```

## 4. 数据缓存策略

### 使用 Next.js 内置缓存

```tsx
// 缓存 60 秒
const res = await fetch('https://api.example.com/data', {
  next: { revalidate: 60 }
});

// 永久缓存（构建时）
export const revalidate = 0;
```

### 增量静态再生成（ISR）

```tsx
// 构建时生成静态页面，之后按需更新
export const revalidate = 3600; // 每小时重新生成
```

## 5. 关键指标优化目标

| 指标 | 名称 | 目标值 | 优化方法 |
|------|------|--------|----------|
| LCP | 最大内容绘制 | < 2.5s | 图片优化、字体优化 |
| FID | 首次输入延迟 | < 100ms | 减少 JS 执行时间 |
| CLS | 累积布局偏移 | < 0.1 | 设置图片尺寸、避免动态内容插入 |
| INP | 交互到下次绘制 | < 200ms | 减少长任务，使用 Web Worker |

## 6. 我的博客优化实践

在本博客项目（戏子多秋の小站）中，我应用了以下优化：

1. **图片懒加载**：所有非首屏图片使用 `loading="lazy"`
2. **字体优化**：使用 `next/font` 并设置 `display: swap`
3. **API 缓存**：搜索接口缓存 5 分钟，博客页 ISR 1 小时
4. **服务端组件**：大部分 UI 组件使用 Server Components
5. **构建优化**：关闭不必要的 Polyfill 和 Source Map

### 优化前后对比

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| LCP | 3.2s | 1.4s | -56% |
| FCP | 1.8s | 0.9s | -50% |
| Total Blocking Time | 420ms | 180ms | -57% |
| Page Weight | 2.1MB | 850KB | -60% |

## 总结

性能优化是一个持续的过程，不是一劳永逸的任务。建议：

1. **测量先行**：先用 Lighthouse 等工具了解现状
2. **设定目标**：根据业务需求设定合理的性能目标
3. **持续优化**：每次改动都评估对性能的影响
4. **监控告警**：上线后持续关注性能指标

记住：**最快的代码是没有写过的代码**。能不用库就不用，能用服务端渲染就不用客户端渲染。
