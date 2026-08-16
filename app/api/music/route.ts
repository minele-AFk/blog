import { NextRequest, NextResponse } from 'next/server'
import { getMusicCache, getMusicCacheTs, setMusicCache } from '@/lib/music-cache'

// 缓存有效期：30 分钟（大幅降低第三方接口请求频率，避免触发网易云等接口限流）
const CACHE_TTL_MS = 30 * 60 * 1000
// Meting API：一站式获取歌曲元数据/播放URL/歌词。
// 其返回的 url 指向 Meting 自身，每次请求实时重定向到最新 CDN 地址，无时效问题，且不依赖网易云易限流的 detail 接口。
const METING_BASE = 'https://api.injahow.cn/meting/'

// 模拟浏览器请求头，绕过反爬限制（降级通道使用）
const NET_EASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
}

const QQ_MUSIC_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://y.qq.com/',
}

type SongResult = {
  id: string
  name?: string
  artist?: string
  cover?: string
  pic?: string
  url?: string
  lrc?: string
  error?: string
}

type MusicSource = 'netease' | 'qq'

/** 主通道：通过 Meting API 获取歌曲（元数据 + 播放URL + 歌词），失败返回 null */
async function fetchViaMeting(songId: string, server: 'netease' | 'tencent'): Promise<SongResult | null> {
  // 歌曲 ID 仅允许字母/数字/连字符/下划线，且必须编码后拼入 URL，防止查询参数注入
  if (!/^[\w-]{1,64}$/.test(songId)) return null
  const encodedId = encodeURIComponent(songId)
  try {
    const [songRes, lrcRes] = await Promise.all([
      fetch(`${METING_BASE}?server=${server}&type=song&id=${encodedId}`, {
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`${METING_BASE}?server=${server}&type=lrc&id=${encodedId}`, {
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
    ])

    if (!songRes.ok) return null

    const data = await songRes.json()
    const meta = Array.isArray(data) ? data[0] : data
    if (!meta || !meta.name) return null

    let lrcText = ''
    if (lrcRes && lrcRes.ok) {
      lrcText = await lrcRes.text()
    }

    return {
      id: songId,
      name: meta.name,
      artist: meta.artist || '未知歌手',
      cover: meta.pic || '',
      pic: meta.pic || '',
      url: await resolvePlayUrl(songId, server),
      lrc: lrcText,
    }
  } catch {
    return null
  }
}

/**
 * 解析真实可播放的音频直链（Workers 在服务器端解析，前端拿到后经 /api/music/stream 代理播放）。
 * 不直接返回 Meting 的 type=url 代理地址：该公共代理不稳定（曾因服务端 Redis 故障返回 HTML 错误页），
 * 且浏览器直连第三方 CDN 会因 CORS / 混合内容被拦截。
 */
async function resolvePlayUrl(songId: string, server: 'netease' | 'tencent'): Promise<string> {
  try {
    // 策略一：Meting type=url 返回 302，跟随重定向拿真实 CDN 地址（此时 Meting 只是跳板）
    const metingRes = await fetch(
      `${METING_BASE}?server=${server}&type=url&id=${encodeURIComponent(songId)}`,
      { signal: AbortSignal.timeout(10000), redirect: 'manual' }
    )
    if (metingRes.status >= 300 && metingRes.status < 400) {
      const location = metingRes.headers.get('location')
      if (location) return toHttps(location)
    }
    // Meting 不可用/未重定向，走平台直链兜底
    if (server === 'tencent') {
      return `https://ws.stream.qqmusic.qq.com/C400${songId}.m4a?fromtag=0&guid=1234567890`
    }
    return `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(songId)}.mp3`
  } catch {
    if (server === 'tencent') {
      return `https://ws.stream.qqmusic.qq.com/C400${songId}.m4a?fromtag=0&guid=1234567890`
    }
    return `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(songId)}.mp3`
  }
}

/** 将 http 直链升级为 https（https 页面中的 <audio> 禁止混合内容） */
function toHttps(url: string): string {
  return url.startsWith('http://') ? 'https://' + url.slice(7) : url
}

// ---------- 降级通道：直接请求网易云 / QQ 音乐（Meting 不可用时兜底） ----------

async function fetchNetEaseSongLegacy(songId: string): Promise<SongResult> {
  try {
    const [detailRes, lrcRes] = await Promise.all([
      fetch(
        `https://music.163.com/api/song/detail/?id=${songId}&ids=[${songId}]`,
        {
          headers: NET_EASE_HEADERS,
          signal: AbortSignal.timeout(8000),
        }
      ),
      fetch(
        `https://music.163.com/api/song/lyric?id=${songId}&lv=-1&kv=-1&tv=-1`,
        {
          headers: NET_EASE_HEADERS,
          signal: AbortSignal.timeout(8000),
        }
      ).catch(() => null),
    ])

    const detail = await detailRes.json()
    const song = detail.songs?.[0]

    if (!song) {
      return { id: songId, error: 'not_found' }
    }

    // 关键：网易云详情接口对 VIP/版权受限歌曲的 fee=1、st<0 等，但只要没有
    // mp3 试听文件，outer/url 会返回 HTML 而非真实音频。先做标记，让前端
    // 拿到 url 后能识别失败（用 0 字节占位 → fetch 时返回的就是 HTML 错误页）。
    if (song.fee === 1 && song.st === -1) {
      // VIP 且无试听：标记为不可用
      return { id: songId, error: 'unavailable' }
    }

    let lrcText = ''
    if (lrcRes && lrcRes.ok) {
      try {
        const lrcData = await lrcRes.json()
        lrcText = lrcData.lrc?.lyric || ''
      } catch {
        /* 歌词可选，失败不影响主流程 */
      }
    }

    const artistName = song.artists?.[0]?.name || '未知歌手'

    // 获取可播放的 URL（outer/url 经常返回 HTML 页面，使用 Meting API 作为备选）
    let playUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`
    try {
      const metingRes = await fetch(
        `https://api.injahow.cn/meting/?server=netease&type=url&id=${songId}`,
        {
          signal: AbortSignal.timeout(10000),
          redirect: 'manual',
        }
      )
      if (metingRes.status >= 300 && metingRes.status < 400) {
        const location = metingRes.headers.get('location')
        if (location) {
          playUrl = toHttps(location)
        }
      }
    } catch {
      // Meting API 不可用，使用默认 outer/url
    }

    return {
      id: songId,
      name: song.name,
      artist: artistName,
      cover: song.album?.picUrl || '',
      pic: song.album?.picUrl || '',
      url: playUrl,
      lrc: lrcText,
    }
  } catch (error) {
    console.error(`[api/music] 获取网易云歌曲 ${songId} 失败:`, error)
    return { id: songId, error: String(error) }
  }
}

/**
 * 主动 HEAD 探测 outer URL：跟随 302 后 Content-Type 仍为 text/html
 * （网易云对 VIP/版权受限歌曲的 outer/url 会返回 HTML 错误页），
 * 直接把 url 标记为不可用，让前端走 fallback 跳过这首。
 */
async function probeAndMarkUnavailable(
  playUrl: string
): Promise<{ url: string; unavailable: boolean }> {
  if (!playUrl || !playUrl.includes('music.163.com')) {
    return { url: playUrl, unavailable: false }
  }
  try {
    const r = await fetch(playUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
    })
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('text/html')) {
      return { url: 'unavailable', unavailable: true }
    }
  } catch {
    /* 探测失败不动 url，前端播放会再次尝试 */
  }
  return { url: playUrl, unavailable: false }
}

async function fetchQQMusicSongLegacy(songId: string): Promise<SongResult> {
  try {
    // 获取歌曲详情
    const detailRes = await fetch(
      `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&data=%7B%22comm%22%3A%7B%22ct%22%3A24%2C%22cv%22%3A0%7D%2C%22songinfo%22%3A%7B%22method%22%3A%22get_song_detail_yqq%22%2C%22param%22%3A%7B%22song_mid%22%3A%22${songId}%22%2C%22song_type%22%3A0%2C%22platform%22%3A%22h5%22%2C%22need_media%22%3A1%7D%2C%22module%22%3A%22music.pf_song_detail_svr%22%7D%7D`,
      {
        headers: QQ_MUSIC_HEADERS,
        signal: AbortSignal.timeout(8000),
      }
    )

    const detail = await detailRes.json()
    const trackInfo = detail.songinfo?.data?.track_info

    if (!trackInfo) {
      return { id: songId, error: 'not_found' }
    }

    // 获取播放链接
    let playUrl = ''
    // 策略：通过 Meting API 获取实际可播放的 URL（该 API 会重定向到真实流媒体地址）
    try {
      const metingRes = await fetch(
        `https://api.injahow.cn/meting/?server=tencent&type=url&id=${songId}`,
        {
          signal: AbortSignal.timeout(10000),
          redirect: 'manual', // 不自动跟随重定向，获取重定向地址
        }
      )
      if (metingRes.status >= 300 && metingRes.status < 400) {
        const location = metingRes.headers.get('location')
        if (location) {
          playUrl = toHttps(location)
        }
      }
    } catch {
      // Meting API 不可用
    }

    // 如果 Meting API 没获取到，尝试直接 URL（部分免费歌曲可用）
    if (!playUrl) {
      const mediaMid = trackInfo.file?.media_mid || songId
      playUrl = `https://ws.stream.qqmusic.qq.com/C400${mediaMid}.m4a?fromtag=0&guid=1234567890`
    }

    // 获取歌词
    let lrcText = ''
    try {
      const lrcRes = await fetch(
        `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${songId}&g_tk=5381&loginUin=0&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0`,
        {
          headers: QQ_MUSIC_HEADERS,
          signal: AbortSignal.timeout(8000),
        }
      )
      const lrcData = await lrcRes.json()
      if (lrcData.lyric) {
        // QQ 音乐歌词是 Base64 编码，需要解码
        try {
          lrcText = Buffer.from(lrcData.lyric, 'base64').toString('utf-8')
        } catch {
          lrcText = decodeURIComponent(lrcData.lyric)
        }
      }
    } catch {
      /* 歌词可选，失败不影响主流程 */
    }

    const artistName = trackInfo.singer?.[0]?.name || '未知歌手'
    const coverUrl = trackInfo.album?.mid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${trackInfo.album.mid}.jpg?max_age=2592000`
      : ''

    return {
      id: songId,
      name: trackInfo.name || trackInfo.title || '未知歌曲',
      artist: artistName,
      cover: coverUrl,
      pic: coverUrl,
      url: playUrl,
      lrc: lrcText,
    }
  } catch (error) {
    console.error(`[api/music] 获取QQ音乐歌曲 ${songId} 失败:`, error)
    return { id: songId, error: String(error) }
  }
}

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids')
  const source = (request.nextUrl.searchParams.get('source') || 'netease') as MusicSource

  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
  }

  // 限制单次请求数量，防止被用作第三方接口的放大/拖慢手段
  const songIds = ids.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 50)

  // 带 30 分钟磁盘缓存：命中直接返回，未命中再请求第三方（主通道 Meting，失败降级原逻辑）
  // 并发限制为 3：防止一次歌单批量请求打爆第三方接口触发限流
  const fetchOne = async (songId: string): Promise<SongResult> => {
    // v2：url 解析方式变更（改为真实直链 + 前端代理播放），旧缓存里的 Meting 代理 URL 作废，直接失效
    const cacheKey = `v2:${source}:${songId}`
    const cached = await getMusicCache<SongResult>(cacheKey)
    if (cached && Date.now() - (await getMusicCacheTs(cacheKey)) < CACHE_TTL_MS) {
      return cached
    }

    const result =
      source === 'qq'
        ? (await fetchViaMeting(songId, 'tencent')) || (await fetchQQMusicSongLegacy(songId))
        : (await fetchViaMeting(songId, 'netease')) || (await fetchNetEaseSongLegacy(songId))

    // 关键：网易云对 VIP/版权受限歌曲，outer/url 实际返回 HTML 错误页而不是音频。
    // 主动 HEAD 探测确认是 HTML 时，把 url 标记为 'unavailable'，前端会跳过这首。
    if (result && !result.error && result.url && result.url.includes('music.163.com')) {
      const probed = await probeAndMarkUnavailable(result.url)
      if (probed.unavailable) {
        return { ...result, url: 'unavailable', error: 'unavailable' }
      }
    }

    // 成功结果才缓存，失败不缓存（便于限流解除后重试）
    if (!result.error) {
      await setMusicCache(cacheKey, result)
    }
    return result
  }

  const results: SongResult[] = []
  let cursor = 0
  const worker = async () => {
    while (cursor < songIds.length) {
      const i = cursor++
      results[i] = await fetchOne(songIds[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(3, songIds.length) }, () => worker())
  )

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
