'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, AlertCircle, Menu, ChevronLeft, ChevronRight, Loader2, Music, Gauge } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useMusic } from './MusicProvider';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface MusicPlayerProps {
  onLyricChange?: (lyric: string) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export default function MusicPlayer({ onLyricChange, onPlayingChange }: MusicPlayerProps) {
  const { theme } = useTheme();
  const isDayMode = theme === 'day';
  const router = useRouter();
  const {
    playlist,
    currentIndex,
    isPlaying,
    progress,
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isLoading,
    error,
    currentLyric,
    activePlaylistId,
    playlists: PLAYLISTS,
    showDirectory,
    directoryView,
    selectedPlaylist,
    setSelectedPlaylist,
    detailSongs,
    detailLoading,
    togglePlay,
    nextSong: handleNext,
    prevSong: handlePrev,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    setShowDirectory,
    setDirectoryView,
    handleOpenPlaylist,
    handleBackToList,
    handleSelectSong,
    isSwitchingSource,
    playbackRate,
    setPlaybackRate,
    cyclePlaybackRate,
  } = useMusic();

  const [, setLyricUpdateFlag] = useState(0);
  const [isSpeedExpanded, setIsSpeedExpanded] = useState(false);
  const [dragPreview, setDragPreview] = useState<number | null>(null);  // 拖拽中的预览进度（%）
  const speedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navBlockedUntilRef = useRef(0);  // 导航冷却截止时间戳
  const NAV_COOLDOWN_MS = 600;  // 关闭面板后的导航冷却时长（ms）
  const clickCountRef = useRef(0);  // 单击/双击计数
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeDragRef = useRef(false);  // 是否正在拖拽音量条
  const volumeBarRef = useRef<HTMLDivElement>(null);  // 音量条 DOM
  const seekDragRef = useRef(false);  // 是否正在拖拽进度条
  const seekBarRef = useRef<HTMLDivElement>(null);  // 进度条 DOM
  const activePlaylist = PLAYLISTS.find(p => p.id === activePlaylistId);
  const currentSong = playlist[currentIndex];

  // 导航冷却保护：关闭面板后短时间内阻止跳转
  const navigateToMusic = () => {
    if (Date.now() < navBlockedUntilRef.current) return;
    router.push('/music');
  };

  // 关闭面板时设置导航冷却
  const closeSpeedPanel = () => {
    setIsSpeedExpanded(false);
    navBlockedUntilRef.current = Date.now() + NAV_COOLDOWN_MS;
  };

  // 音量拖拽：按下时开始，mousemove 更新，mouseup 结束
  const handleVolumeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    volumeDragRef.current = true;
    const setVol = (clientX: number) => {
      const bar = volumeBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      setVolume(Math.round(percent));
      if (percent > 0) setIsMuted(false);
    };
    setVol(e.clientX);
    const onMove = (ev: MouseEvent) => setVol(ev.clientX);
    const onUp = () => {
      volumeDragRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setVolume]);  // setIsMuted 从 useMusic 直接引用

  // 进度条拖拽：按下时只更新本地预览，松手时一次性 seek，避免拖拽中对音频源连续 seek 触发错误
  const handleSeekMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    seekDragRef.current = true;
    const getPercent = (clientX: number) => {
      const bar = seekBarRef.current;
      if (!bar) return 0;
      const rect = bar.getBoundingClientRect();
      return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    };
    setDragPreview(getPercent(e.clientX));
    const onMove = (ev: MouseEvent) => setDragPreview(getPercent(ev.clientX));
    const onUp = (ev: MouseEvent) => {
      seekDragRef.current = false;
      // 松开时执行一次真实跳转
      handleSeek({ target: { value: String(getPercent(ev.clientX)) } });
      setDragPreview(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [handleSeek]);

  // 自动收起倍速控制
  const handleSpeedInteraction = (direction: 'up' | 'down') => {
    cyclePlaybackRate(direction);
    setIsSpeedExpanded(true);
    if (speedTimeoutRef.current) clearTimeout(speedTimeoutRef.current);
    speedTimeoutRef.current = setTimeout(() => closeSpeedPanel(), 3000);
  };

  // 点击速度图标：单击重置为1.0x，双击展开面板
  const handleSpeedIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      // 第一次点击，启动定时器等待可能的第二次点击
      clickTimerRef.current = setTimeout(() => {
        // 单击：重置为 1.0x
        setPlaybackRate(1);
        clickCountRef.current = 0;
      }, 450);
    } else if (clickCountRef.current === 2) {
      // 双击：展开面板
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickCountRef.current = 0;
      setIsSpeedExpanded(true);
    }
  };

  // 点击外部自动收起 + 阻止导航跳转
  useEffect(() => {
    if (!isSpeedExpanded) return;
    
    const handleCaptureClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const speedContainer = document.getElementById('speed-control-container');
      if (speedContainer && !speedContainer.contains(target)) {
        closeSpeedPanel();
        // 在 capture 阶段阻止事件传播，避免触发导航等 handler
        e.stopPropagation();
      }
    };
    
    // 使用 capture 阶段拦截 click 事件
    // 在事件到达目标元素之前截停，防止冒泡到导航 handler
    document.addEventListener('click', handleCaptureClick, true);
    
    return () => {
      document.removeEventListener('click', handleCaptureClick, true);
    };
  }, [isSpeedExpanded]);

  // 通知父组件歌词变化
  useEffect(() => {
    if (onLyricChange) {
      onLyricChange(currentLyric);
    }
    setLyricUpdateFlag(prev => prev + 1);
  }, [currentLyric]);

  // 播放状态变化通知
  const [, setPrevPlaying] = useState(isPlaying);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 加载状态
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card neon-border p-6 h-full flex flex-col items-center justify-center cursor-pointer"
        onClick={navigateToMusic}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full mb-4"
        />
        <span className="text-foreground-muted font-medium tracking-widest animate-pulse text-sm">
          CONNECTING...
        </span>
        <span className="text-xs text-foreground-muted/60 mt-2">点击任意位置进入音乐馆</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card neon-border p-4 h-full flex flex-col relative"
    >
      {/* 头部信息 */}
      <div className="flex items-center mb-3 cursor-pointer" onClick={navigateToMusic}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-secondary/20 text-secondary">
            CLOUD MUSIC
          </span>
        </div>
      </div>

      {/* 错误/空状态*/}
      {playlist.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center cursor-pointer" onClick={navigateToMusic}>
          <AlertCircle className="w-8 h-8 text-yellow-400 mb-3" />
          <span className="text-foreground-muted font-medium text-sm text-center">
            {error || '该歌单暂无歌曲'}
          </span>
          <p className="text-xs text-foreground-muted/60 mt-2 text-center">
            点击下方按钮切换歌单
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); setShowDirectory(true); }}
            className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isDayMode
                ? 'bg-purple-100 border border-purple-300 text-purple-700 hover:bg-purple-200'
                : 'bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30'
            }`}
          >
            <Menu className="w-4 h-4" />
            切换歌单
          </motion.button>
        </div>
      ) : (
        <>
          {/* 歌曲信息 */}
          <div className="flex gap-3 flex-1 items-center mb-3 cursor-pointer" onClick={navigateToMusic}>
            <div
              className="relative w-16 h-16 flex-shrink-0 rounded-full overflow-hidden border-2 border-purple-500/30"
            >
              <img
                key={currentSong?.id}
                src={currentSong?.cover}
                alt={currentSong?.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300';
                }}
              />
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-400"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h4 className="font-medium text-foreground text-sm truncate">{currentSong?.title}</h4>
              <p className="text-xs text-foreground-muted truncate mt-0.5">{currentSong?.artist}</p>
            </div>
          </div>

          {/* 歌词显示 */}
          <p className="text-purple-300 text-xs font-medium truncate mb-3 cursor-pointer" onClick={navigateToMusic}>
            {currentLyric || '♪ 音乐加载中 ♪'}
          </p>

          {/* 播放错误提示（如所有音频源均无法播放） */}
          {error && (
            <p className="text-red-400/90 text-[11px] font-medium mb-2 truncate" title={error}>
              {error}
            </p>
          )}

          {/* 修复2：切换来源时的加载指示 */}
          {isSwitchingSource && (
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
              />
              <span className="text-[10px] text-purple-400/70">正在切换音频源...</span>
            </div>
          )}

          {/* 进度条和控制区域 */}
          <div className="mb-3 cursor-default">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-foreground-muted">{formatTime(currentTime)}</span>
              <div
                ref={seekBarRef}
                className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer hover:bg-white/20 transition-colors"
                onClick={(e) => handleSeek(e)}
                onMouseDown={handleSeekMouseDown}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dragPreview ?? progress}%` }}
                  transition={{ duration: 0.05 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4)' }}
                />
              </div>
              <span className="text-xs text-foreground-muted">{formatTime(duration)}</span>
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePrev()}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => togglePlay()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-foreground glow-purple"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNext()}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative" id="speed-control-container">
                  <AnimatePresence mode="wait">
                    {!isSpeedExpanded ? (
                      <motion.button
                        key="speed-icon"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSpeedIconClick}
                        className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-colors ${
                          playbackRate !== 1
                            ? 'text-foreground bg-purple-500/10'
                            : 'text-foreground-muted hover:text-primary hover:bg-white/10'
                        }`}
                        title={`倍速: ${playbackRate}x`}
                      >
                        <Gauge className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.div
                        key="speed-controls"
                        initial={{ opacity: 0, width: 0, scale: 0.8 }}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-white/5 border border-white/10"
                      >
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleSpeedInteraction('down')}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </motion.button>
                        <span className="px-1.5 text-xs font-medium text-foreground min-w-[28px] text-center">
                          {playbackRate}x
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleSpeedInteraction('up')}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-foreground-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDirectory(true)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
                >
                  <Menu className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleMute()}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>
                <div
                  ref={volumeBarRef}
                  className="relative w-24 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer hover:bg-white/20 transition-colors"
                  onClick={(e) => handleVolumeChange(e)}
                  onMouseDown={handleVolumeMouseDown}
                  title={`音量: ${isMuted ? 0 : volume}%`}
                >
                  <motion.div
                    animate={{ width: `${isMuted ? 0 : volume}%` }}
                    transition={{ duration: 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4)' }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `${isMuted ? 0 : volume}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 目录/歌单选择弹窗 */}
      <AnimatePresence>
        {showDirectory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${
              isDayMode ? 'bg-black/40' : 'bg-black/70'
            }`}
            onClick={(e) => { e.stopPropagation(); setShowDirectory(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-card neon-border rounded-xl overflow-hidden"
            >
              {/* 头部 */}
              <div className={`flex items-center justify-between p-4 border-b ${
                isDayMode ? 'border-gray-200' : 'border-white/10'
              }`}>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    {directoryView === 'detail' && (
                      <motion.button
                        key="back"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBackToList}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isDayMode
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            : 'bg-white/5 hover:bg-white/10 text-foreground-muted'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {directoryView === 'list' && (
                    <Menu className={`w-5 h-5 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {directoryView === 'list' ? '歌单目录' : selectedPlaylist?.name || '歌单详情'}
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      {directoryView === 'list'
                        ? '选择歌单切换歌曲分类'
                        : `${selectedPlaylist?.songs.length || 0} 首歌曲`}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowDirectory(false);
                    setDirectoryView('list');
                    setSelectedPlaylist(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 内容区域 */}
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {directoryView === 'list' ? (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
                      {PLAYLISTS.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => handleOpenPlaylist(pl)}
                          className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                            activePlaylistId === pl.id
                              ? isDayMode
                                ? 'bg-purple-100 border border-purple-300'
                                : 'bg-purple-500/20 border border-purple-500/30'
                              : isDayMode
                                ? 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                            activePlaylistId === pl.id
                              ? isDayMode ? 'bg-purple-200' : 'bg-purple-500/30'
                              : isDayMode ? 'bg-gray-100' : 'bg-white/10'
                          }`}>
                            {pl.name.split(' ')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium truncate ${
                              activePlaylistId === pl.id
                                ? isDayMode ? 'text-purple-700' : 'text-purple-300'
                                : 'text-foreground'
                            }`}>
                              {pl.name}
                            </h4>
                            <p className="text-sm text-foreground-muted truncate">{pl.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activePlaylistId === pl.id && (
                              <motion.div
                                animate={isPlaying ? { opacity: [1, 0.5, 1] } : {}}
                                transition={{ duration: 1, repeat: Infinity }}
                                className={`w-2 h-2 rounded-full ${isDayMode ? 'bg-purple-600' : 'bg-purple-400'}`}
                              />
                            )}
                            <span className="text-xs text-foreground-muted">
                              {pl.songs.length} 首
                            </span>
                            <ChevronRight className={`w-4 h-4 ${isDayMode ? 'text-gray-400' : 'text-foreground-muted'}`} />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
                      {selectedPlaylist && !detailLoading && detailSongs.length > 0 ? (
                        detailSongs.map((song, index) => (
                          <div
                            key={song.id}
                            onClick={() => handleSelectSong(index)}
                            className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
                              currentIndex === index && activePlaylistId === selectedPlaylist.id
                                ? isDayMode
                                  ? 'bg-purple-100 border border-purple-300'
                                  : 'bg-purple-500/20 border border-purple-500/30'
                                : isDayMode
                                  ? 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={song.cover}
                                alt={song.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300';
                                }}
                              />
                              {currentIndex === index && activePlaylistId === selectedPlaylist.id && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <motion.div
                                    animate={isPlaying ? { opacity: [1, 0.5, 1] } : {}}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    className="w-2 h-2 rounded-full bg-white"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium truncate text-sm ${
                                currentIndex === index && activePlaylistId === selectedPlaylist.id
                                  ? isDayMode ? 'text-purple-700' : 'text-purple-300'
                                  : 'text-foreground'
                              }`}>
                                {song.title}
                              </h4>
                              <p className="text-xs text-foreground-muted truncate">{song.artist}</p>
                            </div>
                            <Music className={`w-4 h-4 ${isDayMode ? 'text-gray-400' : 'text-foreground-muted'}`} />
                          </div>
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-8"
                        >
                          {detailLoading ? (
                            <>
                              <Loader2 className={`w-8 h-8 mb-3 ${isDayMode ? 'text-gray-400' : 'text-foreground-muted'} animate-spin`} />
                              <span className="text-sm text-foreground-muted">加载歌曲中...</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className={`w-8 h-8 mb-3 ${isDayMode ? 'text-gray-400' : 'text-foreground-muted'}`} />
                              <span className="text-sm text-foreground-muted">该歌单暂无歌曲</span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
