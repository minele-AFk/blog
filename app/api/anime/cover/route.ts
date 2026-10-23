import { serveImageProxy } from '@/lib/image-proxy';

export async function GET(request: Request) {
  return serveImageProxy(request, 'cover');
}
