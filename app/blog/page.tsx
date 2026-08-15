import { getPosts, getCategories, getTags } from '../../lib/posts';
import { getMoments } from '../../lib/json-store';
import BlogContent from './BlogContent';

export default async function BlogPage() {
  const [posts, categories, tags, moments] = await Promise.all([
    getPosts(),
    getCategories(),
    getTags(),
    getMoments(),
  ]);

  return <BlogContent posts={posts} categories={categories} tags={tags} moments={moments} />;
}
