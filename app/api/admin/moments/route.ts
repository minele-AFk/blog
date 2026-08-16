import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getMoments, addMoment, updateMoment, deleteMoment as removeMoment } from '../../../../lib/json-store';

export async function GET() {
  const moments = await getMoments();
  return NextResponse.json({ success: true, data: moments });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const { content, date, likes = 0, comments = 0, images = [] } = body;

  if (!content) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
  }

  const newMoment = await addMoment({
    content,
    date: date || new Date().toISOString().split('T')[0],
    likes,
    comments,
    images,
  });

  return NextResponse.json({ success: true, data: newMoment }, { status: 201 });
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

  const updatedMoment = await updateMoment(id, updates);
  
  if (!updatedMoment) {
    return NextResponse.json({ error: '说说不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updatedMoment });
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

  const deleted = await removeMoment(id);
  
  if (!deleted) {
    return NextResponse.json({ error: '说说不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
