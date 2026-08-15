import HomeContent from './HomeContent';
import { getPosts } from '../lib/posts';
import { getProjects, getMoments } from '../lib/json-store';

// 首页数据来自运行时的文件读取（posts/*.md、data/*.json），
// 强制动态渲染，确保管理员后台发布的新文章/说说在刷新后立即展示，避免生产环境静态缓存。
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [posts, projects, moments] = await Promise.all([
    getPosts(),
    Promise.resolve(getProjects()),
    Promise.resolve(getMoments()),
  ]);

  const recentPosts = posts.slice(0, 6);

  // 最新一条说说（按日期）：用于首页"开发记录"卡片（动态数据，避免硬编码永不过时）
  const latestMoment =
    [...moments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;

  return (
    <HomeContent 
      recentPosts={recentPosts}
      projectCount={projects.length}
      momentCount={moments.length}
      latestMoment={latestMoment}
    />
  );
}
