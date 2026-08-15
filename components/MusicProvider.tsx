'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { parseLrc, parseLyrics } from '@/lib/lrc';

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string;
  urls: string[];       // 所有可播放的 URL（主 URL + 替代来源的 URL）
  lrc?: string;
  lyric?: string;
  lyrics?: { time: number; text: string }[];
  pic?: string;
  name?: string;
  author?: string;
}

export type MusicSource = 'netease' | 'qq' | 'local';

export interface SongRef {
  id: string;
  source: MusicSource;
  url?: string;  // 本地文件的 URL（source 为 local 时使用）
  title?: string;  // 可选：自定义标题
  artist?: string;  // 可选：自定义艺术家
  cover?: string;  // 可选：自定义封面
  alt?: SongRefAlt[];   // 替代来源
}

export interface SongRefAlt {
  id: string;
  source: MusicSource;
  url?: string;  // 本地文件的 URL
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: SongRef[];
}

export interface Lyric {
  time: number;
  text: string;
}

export type PlayMode = 'loop' | 'single' | 'random';

/** /api/music 返回的单曲数据（字段均可选） */
export interface SongData {
  id?: string;
  name?: string;
  artist?: string;
  cover?: string;
  pic?: string;
  url?: string;
  lrc?: string;
}

/** 进度/音量控制事件：兼容 React 事件与程序化调用（{ target: { value } }） */
export interface MusicControlEvent {
  target?: { value?: unknown } | EventTarget;
  currentTarget?: { getBoundingClientRect?: () => DOMRect } | EventTarget;
  clientX?: number;
}

export interface MusicContextType {
  playlist: Song[];
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isLoading: boolean;
  error: string;
  currentLyric: string;
  playMode: PlayMode;
  activePlaylistId: string;
  playlists: Playlist[];
  showDirectory: boolean;
  directoryView: 'list' | 'detail';
  selectedPlaylist: Playlist | null;
  detailSongs: Song[];
  detailLoading: boolean;
  setSelectedPlaylist: (playlist: Playlist | null) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  handleSeek: (e: MusicControlEvent) => void;
  handleVolumeChange: (e: MusicControlEvent) => void;
  toggleMute: () => void;
  switchPlaylist: (playlistId: string) => void;
  setShowDirectory: (show: boolean) => void;
  setDirectoryView: (view: 'list' | 'detail') => void;
  handleOpenPlaylist: (playlist: Playlist) => void;
  handleBackToList: () => void;
  handleSelectSong: (index: number) => void;
  setCurrentIndex: (index: number) => void;
  setVolume: (volume: number) => void;
  togglePlayMode: () => void;
  setActivePlaylistId: (id: string) => void;
  isSwitchingSource: boolean;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  cyclePlaybackRate: (direction?: 'up' | 'down') => void;
  seekBy: (deltaSeconds: number) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

// 歌单配置 — 每个 SongRef 可设置 alt 作为替代来源
// ★ 重要：每首歌曲必须写中文备注，格式：// 歌曲名 - 歌手（说明）。新增歌曲时务必遵守！
const PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-gufeng',
    name: '🏮 古风',
    description: '古风古韵，诗词画卷',
    songs: [
      // 辞.九门回忆 - 解忧草/冰幽（加了QQ音乐作为替代来源，网易云外链经常过期）
      // 注意：QQ音乐 alt 来源的 ID 必须指向同一首歌（之前误用成了"以恋结缘"的 ID）
      { id: '1347524822', source: 'netease', alt: [{ id: '0022kFzj4O1OxJ', source: 'qq' }] },
      // 牵丝戏 - 银临/Aki阿杰
      { id: '30352891', source: 'netease' },
      // 九万字 - 黄诗扶
      { id: '1335942780', source: 'netease' },
      // 吹灭小山河 - 司南
      { id: '1412559986', source: 'netease' },
      // 长生诀 - 西瓜JUN
      { id: '462391069', source: 'netease' },
      // 离人赋 - 云汐（VIP歌曲，网易云外链不完整，走本地文件替代）
      { id: '1996617490', source: 'netease', alt: [{ id: 'local-li-ren-fu', source: 'local', url: '/music/gufeng/离人赋.mp3' }] },
      // 琵琶行 - 奇然/沈谧仁
      { id: '476513774', source: 'netease' },
      // 虞兮叹 - 闻人听書_（VIP歌曲，走本地文件替代）
      { id: '1479526505', source: 'netease', alt: [{ id: 'local-yu-xi-tan', source: 'local', url: '/music/gufeng/虞兮叹.mp3' }] },
      // 招摇 - 陈楚生/胡莎莎
      { id: '1343200598', source: 'netease' },
      // 岸边客（VIP歌曲，走本地文件替代）
      { id: '2747241483', source: 'netease', alt: [{ id: 'local-an-bian-ke', source: 'local', url: '/music/gufeng/岸边客.mp3' }] },
      // 赤伶（男生版）（QQ音乐VIP，走本地文件替代）
      { id: '0009TP1Y10HwLQ', source: 'qq', alt: [{ id: 'local-chi-ling', source: 'local', url: '/music/gufeng/赤伶（男生版）.mp3' }] },
      // 虞美人 - 熙宝(陆迦卉)
      { id: '482169613', source: 'netease' },
      // 人间蜉蝣 - 未知音素/徐深
      { id: '1808040375', source: 'netease' },
      // 归去来兮 - 花粥
      { id: '1357999894', source: 'netease' },
      // 盗将行 - 花粥
      { id: '574566207', source: 'netease' },
      // 空山·野马 - Bethybai
      { id: '2629771656', source: 'netease' },
      // 春涧 -
      { id: '3372945485', source: 'netease' },
      // 青衣
      { id: '3379205819', source: 'netease' },
    ],
  },
  {
    id: 'playlist-erciyuan',
    name: '🎌 二次元',
    description: '动漫游戏，ACG 音乐',
    songs: [
      // 以恋结缘（主QQ音乐，网易云作为后备）
      { id: '004XqIYb0VPIUb', source: 'qq', alt: [{ id: '473403182', source: 'netease' }] },
      // 安娜的橱窗 - 封茗囧菌
      { id: '537470060', source: 'netease' },
    ],
  },
  {
    id: 'playlist-liuxing',
    name: '🎤 流行',
    description: '热门流行音乐',
    songs: [],
  },
  {
    id: 'playlist-emo',
    name: '💔 Emo',
    description: '情绪说唱，伤感音乐',
    songs: [],
  },
  {
    id: 'playlist-yinjian',
    name: '👻 阴间',
    description: '幽冥鬼火，阴森诡谲',
    songs: [
      // 囍（Chinese Wedding） - 葛东琪
      { id: '1303289043', source: 'netease' },
      // 调查中 (Cover 糯米Nomi) - 图图
      { id: '3386930696', source: 'netease' },
      // 鸳鸯债 - Uri
      { id: '1911377814', source: 'netease' },
      // 无人区玫瑰 (Cover 一颗狼星) - Finale十一
      { id: '3399522205', source: 'netease' },
      // 来生戏--无间梦境主题曲 - 纸嫁衣
      { id: '2065906413', source: 'netease' },
      // 镜中渊 - 周林枫
      { id: '2756818436', source: 'netease' },
    ],
  },
];

/** 对单个 SongRef 依次尝试主来源和替代来源，返回合并后的 Song（包含所有有效 url） */
/** 获取 alt 中非 local 来源的 API URL */
async function fetchAltUrls(songRef: SongRef): Promise<{ urls: string[]; merged: SongData | null; parsedLyrics: Lyric[] }> {
  const urls: string[] = [];
  let merged: SongData | null = null;
  let parsedLyrics: Lyric[] = [];

  for (const alt of songRef.alt || []) {
    if (alt.source === 'local') continue;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`/api/music?ids=${alt.id}&source=${alt.source}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const data = await res.json();
      const songData = data?.[0];
      if (songData && !songData.error && songData.url) {
        urls.push(songData.url);
        if (!merged) {
          parsedLyrics = parseLyrics(songData.lrc);
          merged = songData;
        }
      }
    } catch { /* 单个来源失败，继续尝试下一个 */ }
  }

  return { urls, merged, parsedLyrics };
}

async function fetchSongWithFallback(songRef: SongRef, signal?: AbortSignal): Promise<Song | null> {
  // 本地文件：直接返回，不走 API
  if (songRef.source === 'local' && songRef.url) {
    // 尝试查找同名词的 LRC 歌词文件
    let lyrics: Lyric[] = [];
    const lrcUrl = songRef.url.replace(/\.[^.]+$/, '.lrc');
    try {
      const lrcRes = await fetch(lrcUrl, { signal });
      if (lrcRes.ok) {
        const lrcText = await lrcRes.text();
        lyrics = parseLrc(lrcText);
      }
    } catch {
      // 歌词可选，失败不影响主流程
    }

    // 同时收集 alt 来源的 URL，作为本地文件播放失败的后备
    const altResult = await fetchAltUrls(songRef);
    const allUrls = [songRef.url, ...altResult.urls];

    return {
      id: songRef.id,
      title: songRef.title || songRef.id,
      artist: songRef.artist || '本地音乐',
      cover: songRef.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300',
      url: songRef.url,
      urls: allUrls,
      lyrics: lyrics.length > 0 ? lyrics : altResult.parsedLyrics,
      lrc: '',
    };
  }

  const allSources = [
    { id: songRef.id, source: songRef.source },
    ...(songRef.alt || []),
  ];

  const urls: string[] = [];
  let merged: SongData | null = null;
  let parsedLyrics: Lyric[] = [];
  let localUrl: string | null = null;

  for (const { id, source, url: altUrl } of allSources) {
    // 本地替代来源：保存 URL，优先播放
    if (source === 'local' && altUrl) {
      localUrl = altUrl;
      continue;
    }
    
    try {
      // 修复1：添加 5 秒超时，防止某个来源卡住整个歌单加载
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // 支持外部取消信号（修复：使用 cleanup 避免内存泄漏）
      let onAbort: (() => void) | null = null;
      if (signal) {
        onAbort = () => controller.abort();
        signal.addEventListener('abort', onAbort, { once: true });
      }
      
      const res = await fetch(`/api/music?ids=${id}&source=${source}`, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      // 清理外部信号监听
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      
      if (!res.ok) continue;
      const data = await res.json();
      const songData = data?.[0];
      if (songData && !songData.error && songData.url) {
        urls.push(songData.url);
        if (!merged) {
          parsedLyrics = parseLyrics(songData.lrc);
          merged = songData;
        }
      }
    } catch {
      // 单个来源失败，继续尝试下一个
    }
  }

  if (!merged || (urls.length === 0 && !localUrl)) return null;

  // 如果有本地文件，优先使用本地文件播放
  const primaryUrl = localUrl || urls[0];
  const allUrls = localUrl ? [localUrl, ...urls] : urls;

  return {
    id: merged.id || songRef.id,
    title: merged.name || '未知歌曲',
    artist: merged.artist || '未知歌手',
    cover: merged.cover || merged.pic || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300',
    url: primaryUrl,
    urls: allUrls,
    lyrics: parsedLyrics,
    lrc: merged.lrc,
  };
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [activePlaylistId, setActivePlaylistId] = useState<string>(PLAYLISTS[0]?.id || '');
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('music-volume');
      return saved ? parseInt(saved, 10) : 40;
    }
    return 40;
  });
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('music-muted') === 'true';
    }
    return false;
  });
  const [showDirectory, setShowDirectory] = useState(false);
  const [directoryView, setDirectoryView] = useState<'list' | 'detail'>('list');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [detailSongs, setDetailSongs] = useState<Song[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [currentLyric, setCurrentLyric] = useState('♪ 音乐加载中 ♪');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [playMode, setPlayMode] = useState<PlayMode>('loop');
  const [currentUrlIdx, setCurrentUrlIdx] = useState(0);   // 当前使用的 urls 索引
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);  // 修复2：切换来源时的加载状态
  const [pendingPlayOnLoad, setPendingPlayOnLoad] = useState(false);  // 修复4：歌单加载完成后是否自动播放
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activePlaylist = PLAYLISTS.find(p => p.id === activePlaylistId);
  const currentSong = playlist[currentIndex];

  // 当前实际使用的播放 URL
  const currentUrl = currentSong?.urls?.[currentUrlIdx] || currentSong?.url || '';

  // 重置 URL 索引（切歌时）
  useEffect(() => {
    setCurrentUrlIdx(0);
  }, [currentIndex]);

  // 修复：切换音频源时加 10 秒整体超时兜底。
  // 若替代源"挂起"（既不触发 error 也不触发 timeupdate），"正在切换音频源…"提示与 error 会永不消失，
  // 超时后主动触发 fallbackToNextUrl 继续切换下一个来源。
  useEffect(() => {
    if (!isSwitchingSource) return;
    const timeoutId = setTimeout(() => {
      // currentTime 仍为 0 说明源一直未就绪，视为挂起，继续切换
      if (audioRef.current && audioRef.current.currentTime === 0) {
        fallbackToNextUrl();
      }
    }, 10000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrlIdx, isSwitchingSource]);

  // 设置播放倍速
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // ------- 打开歌单详情（支持替代来源）-------
  const handleOpenPlaylist = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setDirectoryView('detail');
    setDetailSongs([]);
    setDetailLoading(true);

    if (!playlist.songs || playlist.songs.length === 0) {
      setDetailLoading(false);
      return;
    }

    try {
      const songs = await Promise.all(
        playlist.songs.map(songRef => fetchSongWithFallback(songRef))
      );
      setDetailSongs(songs.filter((s): s is Song => s !== null));
    } catch (err) {
      console.error('加载歌单歌曲失败:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setDirectoryView('list');
    setSelectedPlaylist(null);
  };

  const handleSelectSong = (songIndex: number) => {
    if (!selectedPlaylist) return;
    
    // 修复4：如果切换到不同歌单，先加载歌单再播放（避免竞态条件）
    const needsLoad = activePlaylistId !== selectedPlaylist.id;
    
    setActivePlaylistId(selectedPlaylist.id);
    setCurrentIndex(songIndex);
    setCurrentUrlIdx(0);
    setIsSwitchingSource(false);
    setDirectoryView('list');
    setSelectedPlaylist(null);
    setShowDirectory(false);
    
    if (needsLoad) {
      // 标记需要在加载完成后自动播放
      setPendingPlayOnLoad(true);
    } else {
      setIsPlaying(true);
    }
  };

  // ------- 加载当前歌单的歌曲 -------
  useEffect(() => {
    let isMounted = true;
    let aborter = new AbortController();

    const fetchMusicData = async () => {
      if (!activePlaylist || activePlaylist.songs.length === 0) {
        if (isMounted) {
          setPlaylist([]);
          setIsLoading(false);
          setError('该歌单暂无歌曲');
        }
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const songs = await Promise.all(
          activePlaylist.songs.map(songRef =>
            fetchSongWithFallback(songRef, aborter.signal)
          )
        );
        const valid = songs.filter((s): s is Song => s !== null);

        if (isMounted) {
          if (valid.length > 0) {
            setPlaylist(valid);
            // 修复4：如果标记了自动播放，加载完成后开始播放
            if (pendingPlayOnLoad) {
              setPendingPlayOnLoad(false);
              setIsPlaying(true);
            }
          } else {
            setPlaylist([]);
            setError('音乐加载失败，请检查歌曲ID');
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setPlaylist([]);
          setError('网络错误，请检查网络连接');
          setIsLoading(false);
        }
      }
    };

    fetchMusicData();
    // 修复：仅在非指定歌曲加载时重置索引，避免覆盖 handleSelectSong 设置的 currentIndex
    if (!pendingPlayOnLoad) {
      setCurrentIndex(0);
    }
    setCurrentTime(0);
    setProgress(0);
    setIsPlaying(false);

    return () => {
      isMounted = false;
      aborter.abort();
    };
  }, [activePlaylistId]);

  // ------- 加载歌词 -------
  useEffect(() => {
    if (playlist.length === 0) {
      setLyrics([]);
      setCurrentLyricIndex(-1);
      setCurrentLyric('♪ 音乐加载中 ♪');
      return;
    }
    const song = playlist[currentIndex];
    const songLyrics = song?.lyrics || [];
    setLyrics(songLyrics);
    setCurrentLyricIndex(-1);
    setCurrentLyric(songLyrics.length > 0 ? songLyrics[0].text : '♪ 纯享音乐 ♪');
  }, [currentIndex, playlist.length]);

  // ------- 同步音量 -------
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // ------- 持久化音量设置 -------
  useEffect(() => {
    sessionStorage.setItem('music-volume', String(volume));
  }, [volume]);

  useEffect(() => {
    sessionStorage.setItem('music-muted', String(isMuted));
  }, [isMuted]);

  // ------- 播放 / 暂停 / 切换URL -------
  useEffect(() => {
    if (!audioRef.current || playlist.length === 0) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
        setError('播放失败，请检查浏览器权限');
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentIndex, playlist, currentUrlIdx]);

  const togglePlay = () => {
    if (playlist.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    if (playlist.length === 0) return;
    if (playMode === 'single') {
      // 单曲循环：重播当前歌曲（索引相同不会触发重渲染，需直接重置播放位置）
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      setCurrentTime(0);
      setProgress(0);
      setError('');
      return;
    }
    let nextIndex: number;
    if (playMode === 'random') {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setProgress(0);
    setError('');
    setIsSwitchingSource(false);
  };

  const prevSong = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + playlist.length) % playlist.length);
    setCurrentTime(0);
    setProgress(0);
    setError('');
    setIsSwitchingSource(false);
  };

  // ------- 音频错误处理：自动切换下一个来源 -------
  const fallbackToNextUrl = () => {
    const song = playlist[currentIndex];
    if (!song || !song.urls || currentUrlIdx >= song.urls.length - 1) {
      // 所有来源都已用完
      setIsPlaying(false);
      setIsSwitchingSource(false);
      setError(`「${song?.title || '当前歌曲'}」的所有来源均无法播放`);
      return;
    }
    // 修复2：设置加载状态，UI 可以显示切换中
    setIsSwitchingSource(true);
    setCurrentUrlIdx(prev => prev + 1);
    setError(`正在尝试替代音频源...`);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime, duration } = audioRef.current;
    setCurrentTime(currentTime);
    setDuration(duration || 0);
    setProgress((currentTime / (duration || 1)) * 100);

    // 修复3：播放成功后自动清除切换提示
    if (currentTime > 0 && isSwitchingSource) {
      setIsSwitchingSource(false);
      setError('');
    }

    if (lyrics.length > 0) {
      const activeLyric = lyrics.slice().reverse().find(l => currentTime >= l.time);
      if (activeLyric && activeLyric.text !== currentLyric) {
        setCurrentLyric(activeLyric.text);
        const index = lyrics.findIndex(l => l.time === activeLyric.time && l.text === activeLyric.text);
        if (index !== -1) {
          setCurrentLyricIndex(index);
        }
      }
    }
  };

  const handleSeek = (e: MusicControlEvent) => {
    if (!audioRef.current || !duration) return;
    const value = (e.target as { value?: unknown } | undefined)?.value;
    let percent: number;
    if (value !== undefined) {
      percent = Number(value) / 100;
    } else {
      const rect = (e.currentTarget as { getBoundingClientRect?: () => DOMRect } | undefined)?.getBoundingClientRect?.();
      if (!rect || e.clientX === undefined) return;
      percent = (e.clientX - rect.left) / rect.width;
    }
    if (Number.isNaN(percent)) return;
    // 防御：限制到 [0, 1]，防止越界 seek 导致播放器进入错误状态
    percent = Math.max(0, Math.min(1, percent));
    const newTime = percent * duration;
    try {
      audioRef.current.currentTime = newTime;
    } catch {
      // 个别浏览器在音频未就绪时写入 currentTime 会抛错，忽略即可
    }
    setCurrentTime(newTime);
    setProgress(percent * 100);
  };

  const seekBy = (deltaSeconds: number) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const maxTime = audio.duration || duration;
    const newTime = Math.max(0, Math.min(maxTime, audio.currentTime + deltaSeconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    if (maxTime > 0) {
      setProgress((newTime / maxTime) * 100);
    }
  };

  const handleVolumeChange = (e: MusicControlEvent) => {
    const rect = (e.currentTarget as { getBoundingClientRect?: () => DOMRect } | undefined)?.getBoundingClientRect?.();
    if (!rect || e.clientX === undefined) return;
    const percent = (e.clientX - rect.left) / rect.width;
    const newVolume = Math.round(Math.max(0, Math.min(100, percent * 100)));
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume / 100 : 0;
    }
  };

  const switchPlaylist = (playlistId: string) => {
    setActivePlaylistId(playlistId);
    setIsPlaying(false);
    setError('');
    setIsSwitchingSource(false);
    setPendingPlayOnLoad(false);
  };

  const togglePlayMode = () => {
    setPlayMode(prev => {
      if (prev === 'loop') return 'single';
      if (prev === 'single') return 'random';
      return 'loop';
    });
  };

  const PLAYBACK_RATES = [0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4];

  const cyclePlaybackRate = (direction: 'up' | 'down' = 'up') => {
    setPlaybackRate(prev => {
      const currentIdx = PLAYBACK_RATES.indexOf(prev);
      if (direction === 'up') {
        const nextIdx = currentIdx === -1 ? 4 : Math.min(currentIdx + 1, PLAYBACK_RATES.length - 1);
        return PLAYBACK_RATES[nextIdx];
      } else {
        const nextIdx = currentIdx === -1 ? 4 : Math.max(currentIdx - 1, 0);
        return PLAYBACK_RATES[nextIdx];
      }
    });
  };

  const value: MusicContextType = {
    playlist,
    currentIndex,
    isPlaying,
    progress,
    currentTime,
    duration,
    volume,
    isMuted,
    setIsMuted,
    isLoading,
    error,
    currentLyric,
    playMode,
    activePlaylistId,
    playlists: PLAYLISTS,
    showDirectory,
    directoryView,
    selectedPlaylist,
    detailSongs,
    detailLoading,
    setSelectedPlaylist,
    togglePlay,
    nextSong,
    prevSong,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    switchPlaylist,
    setShowDirectory,
    setDirectoryView,
    handleOpenPlaylist,
    handleBackToList,
    handleSelectSong,
    setCurrentIndex,
    setVolume,
    togglePlayMode,
    setActivePlaylistId,
    isSwitchingSource,
    playbackRate,
    setPlaybackRate,
    cyclePlaybackRate,
    seekBy,
  };

  return (
    <MusicContext.Provider value={value}>
      <audio
        ref={audioRef}
        key={`${currentIndex}-${currentUrlIdx}`}
        src={currentUrl || undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextSong}
        onError={fallbackToNextUrl}
        onLoadedMetadata={(e) => {
          handleTimeUpdate();
          // audio 元素切换 key/src 后会重挂载，音量为重置为 1（100%），这里重新应用
          e.currentTarget.volume = isMuted ? 0 : volume / 100;
        }}
        onCanPlay={() => {
          if (audioRef.current) {
            // 同样在可播放时兜底应用音量（防止切歌后音量跳回满格）
            audioRef.current.volume = isMuted ? 0 : volume / 100;
          }
          // 修复2：新来源加载就绪后，如果正在切换中则自动播放
          if (isSwitchingSource && isPlaying && audioRef.current) {
            audioRef.current.play().catch(() => {
              setIsPlaying(false);
              setError('播放失败，请检查浏览器权限');
            });
          }
        }}
      />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
