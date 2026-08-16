import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getFriends, addFriend, updateFriend, deleteFriend as removeFriend } from '../../../../lib/json-store';

export async function GET() {
  const friends = await getFriends();
  return NextResponse.json({ success: true, data: friends });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const { name, avatar, description, url, tags = [] } = body;

  if (!name || !url) {
    return NextResponse.json({ error: '名称和链接地址不能为空' }, { status: 400 });
  }

  const newFriend = await addFriend({
    name,
    avatar: avatar || '',
    description: description || '',
    url,
    tags,
  });

  return NextResponse.json({ success: true, data: newFriend }, { status: 201 });
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

  const updatedFriend = await updateFriend(id, updates);
  
  if (!updatedFriend) {
    return NextResponse.json({ error: '友链不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updatedFriend });
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

  const deleted = await removeFriend(id);
  
  if (!deleted) {
    return NextResponse.json({ error: '友链不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}