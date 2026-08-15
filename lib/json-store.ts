import fs from 'fs';
import path from 'path';

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

export const readJsonFile = <T>(filename: string): T[] => {
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

export const writeJsonFile = <T>(filename: string, data: T[]) => {
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

export const getMoments = (): Moment[] => {
  const moments = readJsonFile<Moment>('moments.json');
  return moments.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const addMoment = (moment: Omit<Moment, 'id'>): Moment => {
  const moments = getMoments();
  const newMoment: Moment = {
    ...moment,
    id: generateId(),
  };
  moments.unshift(newMoment);
  writeJsonFile('moments.json', moments);
  return newMoment;
};

export const updateMoment = (id: string, updates: Partial<Moment>): Moment | null => {
  const moments = getMoments();
  const index = moments.findIndex(m => m.id === id);
  
  if (index === -1) return null;
  
  moments[index] = { ...moments[index], ...updates };
  writeJsonFile('moments.json', moments);
  return moments[index];
};

export const deleteMoment = (id: string): boolean => {
  const moments = getMoments();
  const newMoments = moments.filter(m => m.id !== id);
  
  if (newMoments.length === moments.length) return false;
  
  writeJsonFile('moments.json', newMoments);
  return true;
};

export const getProjects = (): Project[] => {
  const projects = readJsonFile<Project>('projects.json');
  return projects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const addProject = (project: Omit<Project, 'id'>): Project => {
  const projects = getProjects();
  const newProject: Project = {
    ...project,
    id: generateId(),
  };
  projects.push(newProject);
  writeJsonFile('projects.json', projects);
  return newProject;
};

export const updateProject = (id: string, updates: Partial<Project>): Project | null => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = { ...projects[index], ...updates };
  writeJsonFile('projects.json', projects);
  return projects[index];
};

export const deleteProject = (id: string): boolean => {
  const projects = getProjects();
  const newProjects = projects.filter(p => p.id !== id);
  
  if (newProjects.length === projects.length) return false;
  
  writeJsonFile('projects.json', newProjects);
  return true;
};

export const getFriends = (): Friend[] => {
  const friends = readJsonFile<Friend>('friends.json');
  return friends.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const addFriend = (friend: Omit<Friend, 'id'>): Friend => {
  const friends = getFriends();
  const newFriend: Friend = {
    ...friend,
    id: generateId(),
  };
  friends.push(newFriend);
  writeJsonFile('friends.json', friends);
  return newFriend;
};

export const updateFriend = (id: string, updates: Partial<Friend>): Friend | null => {
  const friends = getFriends();
  const index = friends.findIndex(f => f.id === id);
  
  if (index === -1) return null;
  
  friends[index] = { ...friends[index], ...updates };
  writeJsonFile('friends.json', friends);
  return friends[index];
};

export const deleteFriend = (id: string): boolean => {
  const friends = getFriends();
  const newFriends = friends.filter(f => f.id !== id);
  
  if (newFriends.length === friends.length) return false;
  
  writeJsonFile('friends.json', newFriends);
  return true;
};
