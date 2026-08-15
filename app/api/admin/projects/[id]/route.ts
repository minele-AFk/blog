import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { updateProject, deleteProject } from '../../../../../lib/json-store';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const updated = updateProject(id, body);

  if (!updated) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = _request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const success = deleteProject(id);

  if (!success) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
