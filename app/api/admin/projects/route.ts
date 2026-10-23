import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { getProjects, addProject, updateProject, deleteProject } from '@/lib/json-store';
import { readJsonObject, text, validateFields, withApiErrors } from '@/lib/request-security';

export async function GET() {
  return NextResponse.json({ success: true, data: await getProjects() });
}

export const POST = withApiErrors(async (request: NextRequest) => {
  if (!isAdminRequest(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const body = validateFields('projects', await readJsonObject(request));
  return NextResponse.json({ success: true, data: await addProject(body) }, { status: 201 });
});

export const PUT = withApiErrors(async (request: NextRequest) => {
  if (!isAdminRequest(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const { id: rawId, ...input } = await readJsonObject(request);
  const id = text(rawId, 100, true);
  const updates = validateFields('projects', input, true);
  const updated = await updateProject(id, updates);
  if (!updated) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
});

export const DELETE = withApiErrors(async (request: NextRequest) => {
  if (!isAdminRequest(request)) return NextResponse.json({ error: '未授权' }, { status: 401 });
  const body = await readJsonObject(request);
  const deleted = await deleteProject(text(body.id, 100, true));
  if (!deleted) return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  return NextResponse.json({ success: true });
});
