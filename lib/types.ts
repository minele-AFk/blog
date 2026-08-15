export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  date: string;
  tags: string[];
  category: string;
  author: string;
  coverImage?: string;
  readTime: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 追番记录
export type AnimeStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export interface Anime {
  id: string;              // 唯一标识（来自封面URL的ID）
  name: string;            // 中文/日文名称
  cover: string;           // 封面图片 URL
  tags: string[];          // 标签
  synopsis: string;        // 剧情简介
  status: AnimeStatus;     // 状态（手动指定）
}
