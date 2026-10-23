import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { updateFriend, deleteFriend } from '@/lib/json-store';
import { readJsonObject, text, validateFields, withApiErrors } from '@/lib/request-security';

type Context = { params: Promise<{ id: string }> };

export const PUT = withApiErrors(async (request: NextRequest, { params }: Context) => {
  if (!isAdminRequest(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const id = text((await params).id, 100, true);
  const updates = validateFields('friends', await readJsonObject(request), true);
  const updated = await updateFriend(id, updates);
  if (!updated) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
});

export const DELETE = withApiErrors(async (request: NextRequest, { params }: Context) => {
  if (!isAdminRequest(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const deleted = await deleteFriend(text((await params).id, 100, true));
  if (!deleted) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ success: true });
});
