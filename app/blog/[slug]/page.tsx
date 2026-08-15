import Link from 'next/link';
import { getPostBySlug, getPostSlugs } from '../../../lib/posts';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import PostContent from './PostContent';

interface PostPageProps {
  // Next.js 15+ 中动态路由 params 是异步的
  params: Promise<{
    slug: string;
  }>;
}

// 文章实时读取文件，动态渲染，确保编辑发布后前台立即可见
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-foreground-muted">文章不存在</p>
        <Link href="/blog" className="text-primary hover:underline mt-4 block">
          返回博客首页
        </Link>
      </div>
    );
  }

  // remark -> rehype -> sanitize（过滤脚本/javascript: 等 XSS 载荷）-> html
  const contentHtml = (
    await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(post.content)
  ).toString();

  return <PostContent post={post} contentHtml={contentHtml} />;
}

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  
  return slugs.map(slug => ({
    slug,
  }));
}
