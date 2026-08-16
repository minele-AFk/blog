import fs from 'fs';
import path from 'path';
import { isCloudflare, kvGetJson, kvSetJson } from './storage';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface Moment {
  id: string;
  content: string;
  date: string;
  likes: number;
  comments: number;
  images: string[];
  order?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  date: string;
  github: string;
  demo: string;
  icon: string;
  cover?: string;
  order?: number;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  description: string;
  url: string;
  tags: string[];
  order?: number;
}

// KV key 前缀：data: 命名空间，避免与其他 KV 数据冲突
const KV_PREFIX = 'data:';

const kvKey = (filename: string) => `${KV_PREFIX}${filename}`;

// ---------- 底层读写：本地 fs ↔ Workers KV ----------

const readJsonFile = async <T>(filename: string): Promise<T[]> => {
  if (isCloudflare()) {
    return (await kvGetJson<T[]>(kvKey(filename))) ?? [];
  }
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
};

const writeJsonFile = async <T>(filename: string, data: T[]) => {
  if (isCloudflare()) {
    await kvSetJson(kvKey(filename), data);
    return;
  }
  const filePath = path.join(DATA_DIR, filename);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // 原子写入：先写临时文件再 rename，防止写入中途崩溃导致 JSON 损坏
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getMoments = async (): Promise<Moment[]> => {
  const moments = await readJsonFile<Moment>('moments.json');
  return moments.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const addMoment = async (moment: Omit<Moment, 'id'>): Promise<Moment> => {
  const moments = await getMoments();
  const newMoment: Moment = {
    ...moment,
    id: generateId(),
  };
  moments.unshift(newMoment);
  await writeJsonFile('moments.json', moments);
  return newMoment;
};

export const updateMoment = async (id: string, updates: Partial<Moment>): Promise<Moment | null> => {
  const moments = await getMoments();
  const index = moments.findIndex(m => m.id === id);

  if (index === -1) return null;

  moments[index] = { ...moments[index], ...updates };
  await writeJsonFile('moments.json', moments);
  return moments[index];
};

export const deleteMoment = async (id: string): Promise<boolean> => {
  const moments = await getMoments();
  const newMoments = moments.filter(m => m.id !== id);

  if (newMoments.length === moments.length) return false;

  await writeJsonFile('moments.json', newMoments);
  return true;
};

export const getProjects = async (): Promise<Project[]> => {
  const projects = await readJsonFile<Project>('projects.json');
  return projects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const addProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
  const projects = await getProjects();
  const newProject: Project = {
    ...project,
    id: generateId(),
  };
  projects.push(newProject);
  await writeJsonFile('projects.json', projects);
  return newProject;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === id);

  if (index === -1) return null;

  projects[index] = { ...projects[index], ...updates };
  await writeJsonFile('projects.json', projects);
  return projects[index];
};

export const deleteProject = async (id: string): Promise<boolean> => {
  const projects = await getProjects();
  const newProjects = projects.filter(p => p.id !== id);

  if (newProjects.length === projects.length) return false;

  await writeJsonFile('projects.json', newProjects);
  return true;
};

export const getFriends = async (): Promise<Friend[]> => {
  const friends = await readJsonFile<Friend>('friends.json');
  return friends.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const addFriend = async (friend: Omit<Friend, 'id'>): Promise<Friend> => {
  const friends = await getFriends();
  const newFriend: Friend = {
    ...friend,
    id: generateId(),
  };
  friends.push(newFriend);
  await writeJsonFile('friends.json', friends);
  return newFriend;
};

export const updateFriend = async (id: string, updates: Partial<Friend>): Promise<Friend | null> => {
  const friends = await getFriends();
  const index = friends.findIndex(f => f.id === id);

  if (index === -1) return null;

  friends[index] = { ...friends[index], ...updates };
  await writeJsonFile('friends.json', friends);
  return friends[index];
};

export const deleteFriend = async (id: string): Promise<boolean> => {
  const friends = await getFriends();
  const newFriends = friends.filter(f => f.id !== id);

  if (newFriends.length === friends.length) return false;

  await writeJsonFile('friends.json', newFriends);
  return true;
};
