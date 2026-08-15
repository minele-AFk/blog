import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getProjects, addProject, updateProject, deleteProject as removeProject } from '../../../../lib/json-store';

export async function GET() {
  const projects = getProjects();
  return NextResponse.json({ success: true, data: projects });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, tags, date, github, demo, icon, cover } = body;

  if (!name || !description) {
    return NextResponse.json({ error: '名称和描述不能为空' }, { status: 400 });
  }

  const newProject = addProject({
    name,
    description,
    tags: tags || [],
    date: date || new Date().getFullYear().toString(),
    github: github || '',
    demo: demo || '',
    icon: icon || '✨',
    cover: cover || '',
  });

  return NextResponse.json({ success: true, data: newProject }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID不能为空' }, { status: 400 });
  }

  const updatedProject = updateProject(id, updates);
  
  if (!updatedProject) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updatedProject });
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID不能为空' }, { status: 400 });
  }

  const deleted = removeProject(id);
  
  if (!deleted) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
