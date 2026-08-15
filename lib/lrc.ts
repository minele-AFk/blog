/**
 * LRC 歌词解析器
 * 被 MusicProvider 和 MusicClient 共用，避免重复逻辑。
 */

export interface Lyric {
  time: number;
  text: string;
}

/**
 * 解析 LRC 格式的歌词文本。
 * 支持 [mm:ss.ss] 和 [mm:ss:sss] 两种时间戳格式。
 * 返回按时间排序的歌词数组。
 */
export function parseLrc(lrcText: string): Lyric[] {
  if (!lrcText || lrcText.length > 30000) return [];
  const lines = lrcText.split(/\r?\n/);
  const result: Lyric[] = [];
  for (const line of lines) {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g)];
    if (matches.length > 0) {
      let text = line.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{2,3})?\]/g, '').trim();
      // 移除控制字符（字节顺序标记、零宽字符等）
      text = text.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
      if (text) {
        for (const match of matches) {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const msPart = match[3];
          const ms = msPart ? parseInt(msPart, 10) : 0;
          // 3位毫秒 ÷ 1000，2位毫秒 ÷ 100
          const divisor = msPart?.length === 3 ? 1000 : 100;
          const time = min * 60 + sec + ms / divisor;
          result.push({ time, text });
        }
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

/**
 * 解析歌词文本，处理可能的 URI 编码问题（用于 API 返回的 lrc 字段）。
 */
export function parseLyrics(lrc: string): Lyric[] {
  if (!lrc) return [];
  try {
    const decodedLrc = decodeURIComponent(lrc);
    return parseLrc(decodedLrc);
  } catch {
    return parseLrc(lrc);
  }
}
