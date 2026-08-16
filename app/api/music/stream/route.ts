import { NextRequest, NextResponse } from 'next/server'

// 允许代理的音源域名白名单（防 SSRF：只转发到已知音乐平台）
const ALLOWED_HOSTS = [
  'music.163.com',
  'music.126.net',
  'm801.music.126.net',
  'm701.music.126.net',
  'ws.stream.qqmusic.qq.com',
  'stream.qqmusic.qq.com',
  'dl.stream.qqmusic.qq.com',
  'api.injahow.cn',
]

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

/** 根据目标域名选择 Referer，绕过音源防盗链 */
function pickReferer(host: string): string | undefined {
  if (host.includes('163.com') || host.includes('126.net')) return 'https://music.163.com/'
  if (host.includes('qqmusic.qq.com')) return 'https://y.qq.com/'
  return undefined
}

/**
 * 音频流代理：
 * 前端 <audio> 无法直连第三方 CDN（CORS / 混合内容 / 防盗链 / IP 绑定均会导致失败）。
 * 此路由由 Workers 在服务端携带正确 UA/Referer 拉取音频流并流式转发。
 * 注意：CDN 直链带签名有有效期，这里不做 URL 级缓存，每次现取。
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'Protocol not allowed' }, { status: 400 })
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': BROWSER_UA,
    }
    const referer = pickReferer(parsed.hostname)
    if (referer) upstreamHeaders.Referer = referer
    const range = request.headers.get('range')
    if (range) upstreamHeaders.Range = range

    const upstream = await fetch(parsed.toString(), {
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg'
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // 每次现取的签名直链，允许浏览器短暂缓存即可
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    }
    // 转发 Range 响应头，支持音频拖拽进度（seek）
    const contentRange = upstream.headers.get('content-range')
    const contentLength = upstream.headers.get('content-length')
    if (contentRange) headers['Content-Range'] = contentRange
    if (contentLength) headers['Content-Length'] = contentLength
    if (upstream.status === 206) headers['Accept-Ranges'] = 'bytes'

    return new NextResponse(upstream.body as unknown as ReadableStream, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    console.error('[api/music/stream] 代理音频失败:', String(error))
    return NextResponse.json({ error: 'Proxy failed' }, { status: 502 })
  }
}
