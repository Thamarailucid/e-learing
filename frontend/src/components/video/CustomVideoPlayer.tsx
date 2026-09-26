import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Subtitles,
  Gauge,
  HelpCircle,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { Slider, Popover, message } from 'antd';
import { ApiClient } from '../../services/api/ApiClient';

export interface InteractiveQuestionCue {
  id: string;
  timestamp_seconds: number;
  question_text: string;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface CustomVideoPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
}

export interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  initialTime?: number;
  isPrivate?: boolean;
  courseId?: string;
  lessonId?: string;
  subtitles?: SubtitleCue[];
  interactiveQuestions?: InteractiveQuestionCue[];
  watermarkText?: string;
  onTimeUpdate?: (currentTime: number, duration: number, watchPercentage: number) => void;
  onEnded?: () => void;
  onPause?: (currentTime: number, duration: number, watchPercentage: number) => void;
  onCheckpoint?: (question: InteractiveQuestionCue) => void;
  onSecurityViolation?: (violationType: string) => void;
}

const DEFAULT_SUBTITLES: SubtitleCue[] = [
  { start: 0, end: 6, text: 'Welcome to this lesson on multi-tenant architecture and systems design.' },
  { start: 7, end: 14, text: 'We will explore how tenant isolation, connection pooling, and security models operate.' },
  { start: 15, end: 25, text: 'Notice how row-level security and partitioned indexing deliver optimal performance at scale.' },
  { start: 26, end: 38, text: 'Every query automatically resolves the active tenant context using middleware guards.' },
  { start: 39, end: 44, text: 'Pay close attention as we examine the schema strategy before the upcoming knowledge check.' },
  { start: 45, end: 55, text: 'Let us dive deeper into the database isolation patterns and production tradeoffs.' },
];

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const CustomVideoPlayer = forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(
  (
    {
      src,
      poster,
      title,
      initialTime = 0,
      isPrivate = false,
      courseId,
      lessonId,
      subtitles = DEFAULT_SUBTITLES,
      interactiveQuestions = [],
      watermarkText,
      onTimeUpdate,
      onEnded,
      onPause,
      onCheckpoint,
      onSecurityViolation,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasSeekedInitialTime = useRef<boolean>(false);

    // Imperative methods exposed to parent
    useImperativeHandle(ref, () => ({
      play: () => {
        const video = videoRef.current;
        if (video && (video.paused || video.ended)) {
          const p = video.play();
          if (p !== undefined) {
            p.then(() => setIsPlaying(true)).catch((e) => console.warn('[CustomVideoPlayer] Play error:', e));
          }
        }
      },
      pause: () => {
        videoRef.current?.pause();
        setIsPlaying(false);
      },
      seek: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          setCurrentTime(seconds);
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
    }));

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UI state
  const [controlsVisible, setControlsVisible] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  // Anti-Piracy Blackout States (Protects proprietary courses against OBS / Snipping Tool / Alt+Tab capture)
  const [blurBlackout, setBlurBlackout] = useState(false);
  const [screenshotFlash, setScreenshotFlash] = useState(false);

  // Watermark drifting position
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '15%' });

  // Triggered checkpoints tracking
  const triggeredCheckpoints = useRef<Set<string>>(new Set());
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Report Security Violation to backend audit log
  const reportViolation = useCallback(
    async (type: string, keyInfo?: string) => {
      if (!isPrivate) return;
      try {
        await ApiClient.post('/courses/LogCourseViolation', {
          courseId,
          lessonId,
          violationType: type,
          details: {
            key: keyInfo,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
          },
        });
        onSecurityViolation?.(type);
      } catch (err) {
        console.warn('[SecurityAudit] Failed to log violation', err);
      }
    },
    [isPrivate, courseId, lessonId, onSecurityViolation]
  );

  // Anti-Piracy Defense for Private Proprietary Courses
  useEffect(() => {
    if (!isPrivate) return;

    const handleWindowBlur = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
        reportViolation('SCREEN_RECORD_OR_WINDOW_UNFOCUS', 'Window Unfocus / Background Recording Detected');
      }
      setBlurBlackout(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
          reportViolation('SCREEN_RECORD_OR_TAB_SWITCH', 'Browser Tab Hidden / Recording Tool Switched');
        }
        setBlurBlackout(true);
      }
    };

    const handleKeyIntercept = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === 's' || e.key === 'S');
      const isWinScreenshot = e.key === 's' && e.shiftKey && (e.metaKey || (e as any).windowsKey);
      const isPrint = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');

      if (isPrintScreen || isMacScreenshot || isWinScreenshot || isPrint) {
        e.preventDefault();
        e.stopPropagation();
        setScreenshotFlash(true);
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        try {
          navigator.clipboard?.writeText?.('');
        } catch {}
        message.warning({
          content: 'Screenshots and screen recording are strictly prohibited for private proprietary courses. Violation logged to security servers.',
          duration: 4,
        });
        reportViolation('SCREENSHOT_ATTEMPT', e.key || e.code);
        setTimeout(() => setScreenshotFlash(false), 2500);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyIntercept, true);
    window.addEventListener('keyup', handleKeyIntercept, true);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyIntercept, true);
      window.removeEventListener('keyup', handleKeyIntercept, true);
    };
  }, [isPrivate, reportViolation]);

  // Reset seeked flag when video source changes and force reload
  useEffect(() => {
    hasSeekedInitialTime.current = false;
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  // Resume from initialTime once when ready
  useEffect(() => {
    if (videoRef.current && initialTime > 0 && !hasSeekedInitialTime.current) {
      if (videoRef.current.readyState >= 1) {
        hasSeekedInitialTime.current = true;
        videoRef.current.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
  }, [initialTime, src]);

  // Periodic watermark drift
  useEffect(() => {
    const interval = setInterval(() => {
      const randomTop = Math.floor(10 + Math.random() * 70);
      const randomLeft = Math.floor(10 + Math.random() * 70);
      setWatermarkPos({ top: `${randomTop}%`, left: `${randomLeft}%` });
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Play / Pause Toggle with safe async promise handling
  const togglePlay = useCallback((e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[CustomVideoPlayer] Play interrupted/prevented:', err);
        });
      }
    } else {
      video.pause();
    }
  }, []);

  // Skip forward / backward
  const handleSeekDelta = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  }, []);

  // YouTube-Style Double-Click Seeking Feedback State (+10s right / -10s left)
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    side: 'left' | 'right';
    seconds: number;
  } | null>(null);
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerDoubleTapSeek = useCallback((deltaSeconds: number, side: 'left' | 'right') => {
    handleSeekDelta(deltaSeconds);
    if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    setDoubleTapFeedback({ side, seconds: Math.abs(deltaSeconds) });
    doubleTapTimer.current = setTimeout(() => {
      setDoubleTapFeedback(null);
    }, 700);
  }, [handleSeekDelta]);

  // Full-surface click / double-click discrimination
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;

    if (e.detail === 2) {
      // Double Click: cancel pending single-click play/pause and trigger 10s seek
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      triggerDoubleTapSeek(isRightSide ? 10 : -10, isRightSide ? 'right' : 'left');
    } else if (e.detail === 1) {
      // Single Click: debounce slightly (220ms) to allow double-click
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay();
        clickTimeoutRef.current = null;
      }, 220);
    }
  };

  // Seek to initialTime reliably when video metadata is ready
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      setDuration(dur);
      if (initialTime > 0 && initialTime < dur && !hasSeekedInitialTime.current) {
        hasSeekedInitialTime.current = true;
        videoRef.current.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }
  };

  // Timeline Scrubbing
  const handleTimelineChange = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value;
    setCurrentTime(value);
  };

  // Volume & Mute
  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.85;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Speed Adjustment
  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setSpeedMenuOpen(false);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen change event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Inactivity autohide for control bar
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  // Time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(curr);
    setDuration(dur);

    // Buffer calculation
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(bufferedEnd);
    }

    // Subtitle detection
    if (captionsEnabled && subtitles.length > 0) {
      const active = subtitles.find((s) => curr >= s.start && curr <= s.end);
      setActiveSubtitle(active ? active.text : '');
    } else {
      setActiveSubtitle('');
    }

    // Interactive question checkpoint check
    if (interactiveQuestions.length > 0 && onCheckpoint) {
      for (const q of interactiveQuestions) {
        if (
          Math.abs(curr - q.timestamp_seconds) < 0.8 &&
          !triggeredCheckpoints.current.has(q.id)
        ) {
          triggeredCheckpoints.current.add(q.id);
          videoRef.current.pause();
          setIsPlaying(false);
          onCheckpoint(q);
          break;
        }
      }
    }

    if (onTimeUpdate && dur > 0) {
      const percentage = Math.min(100, Math.round((curr / dur) * 100));
      onTimeUpdate(curr, dur, percentage);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekDelta(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekDelta(5);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleSeekDelta]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        message.info('Video download is disabled for copyright protection.');
      }}
      className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl group select-none flex items-center justify-center"
    >
      {/* Proprietary Content Anti-Piracy Blackout Shield */}
      {isPrivate && (blurBlackout || screenshotFlash) && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
          </div>
          <h4 className="text-white text-base sm:text-lg font-bold tracking-tight">
            Proprietary Content Protected
          </h4>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md mt-2 leading-relaxed">
            Screen recording software, screenshot capture utility, or window unfocus detected.
            The screen has been blackened to protect academy intellectual property.
          </p>
          <button
            type="button"
            onClick={() => {
              setBlurBlackout(false);
              setScreenshotFlash(false);
            }}
            className="mt-5 px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-gray-100 transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <span>Resume Secure Playback</span>
          </button>
        </div>
      )}

      {/* Video Element without default browser controls and with anti-download attributes */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={false}
        controlsList="nodownload noplaybackrate nopictureinpicture"
        disablePictureInPicture
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          const curr = videoRef.current?.currentTime || 0;
          const dur = videoRef.current?.duration || 0;
          const pct = dur > 0 ? Math.min(100, Math.round((curr / dur) * 100)) : 0;
          onPause?.(curr, dur, pct);
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Full-Surface Click Layer to Pause / Resume Anywhere & Double-Click 10s Seek */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleSurfaceClick}
        title={isPlaying ? 'Click to Pause • Double-click sides to seek ±10s' : 'Click to Play • Double-click sides to seek ±10s'}
      />

      {/* YouTube-Style Double-Click Feedback Overlay */}
      {doubleTapFeedback && (
        <div
          className={`absolute inset-y-0 ${
            doubleTapFeedback.side === 'left' ? 'left-0 rounded-r-3xl' : 'right-0 rounded-l-3xl'
          } w-1/3 bg-black/50 backdrop-blur-xs z-30 flex flex-col items-center justify-center pointer-events-none transition-all duration-300 animate-pulse border ${
            doubleTapFeedback.side === 'left' ? 'border-r border-white/20' : 'border-l border-white/20'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-1 shadow-lg">
            {doubleTapFeedback.side === 'left' ? (
              <RotateCcw className="w-7 h-7 text-white" />
            ) : (
              <RotateCw className="w-7 h-7 text-white" />
            )}
          </div>
          <div className="text-white font-bold text-sm sm:text-base drop-shadow tracking-wider">
            {doubleTapFeedback.side === 'left' ? '<< 10s' : '10s >>'}
          </div>
          <div className="text-[10px] text-gray-300 font-medium mt-0.5">
            {doubleTapFeedback.side === 'left' ? 'Rewind 10s' : 'Forward 10s'}
          </div>
        </div>
      )}

      {/* Forensic Moving Anti-Piracy Watermark */}
      {watermarkText && (
        <div
          style={{
            position: 'absolute',
            top: watermarkPos.top,
            left: watermarkPos.left,
            pointerEvents: 'none',
            transition: 'all 2.5s ease-in-out',
          }}
          className="text-[10px] sm:text-[11px] font-mono font-medium text-white/25 select-none drop-shadow z-20"
        >
          {watermarkText}
        </div>
      )}

      {/* Subtitles Overlay */}
      {captionsEnabled && activeSubtitle && (
        <div className="absolute bottom-16 sm:bottom-20 px-4 py-1.5 rounded-lg bg-black/80 backdrop-blur-xs text-white text-xs sm:text-sm font-medium text-center max-w-xl mx-auto z-20 pointer-events-none transition-all shadow-md">
          {activeSubtitle}
        </div>
      )}

      {/* Center Big Play / Pause Button (appears on pause or hover) */}
      {(!isPlaying || controlsVisible) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay(e);
          }}
          className={`absolute w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-lg ${
            !isPlaying
              ? 'scale-100 opacity-100 pointer-events-auto'
              : controlsVisible
              ? 'scale-90 opacity-80 pointer-events-auto'
              : 'scale-90 opacity-0 pointer-events-none'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </button>
      )}

      {/* Custom Proprietary Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 pt-10 flex flex-col gap-2 z-30 transition-opacity duration-300 ${
          controlsVisible || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scoped CSS for video seekbar slider to eliminate AntD green halo / double ring */}
        <style>{`
          .custom-video-slider.ant-slider {
            margin: 0 !important;
            padding: 4px 0 !important;
          }
          .custom-video-slider .ant-slider-rail {
            background-color: rgba(255, 255, 255, 0.25) !important;
            height: 5px !important;
            border-radius: 9999px !important;
          }
          .custom-video-slider .ant-slider-track {
            background: linear-gradient(90deg, #a855f7, #8b5cf6) !important;
            height: 5px !important;
            border-radius: 9999px !important;
          }
          .custom-video-slider .ant-slider-handle {
            width: 14px !important;
            height: 14px !important;
            background-color: #ffffff !important;
            border: 3px solid #8b5cf6 !important;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.9) !important;
            margin-top: -4.5px !important;
            transition: transform 0.15s ease !important;
            z-index: 25 !important;
          }
          .custom-video-slider .ant-slider-handle:hover,
          .custom-video-slider .ant-slider-handle:active {
            transform: scale(1.3) !important;
          }
          .custom-video-slider .ant-slider-handle::before,
          .custom-video-slider .ant-slider-handle::after {
            display: none !important;
          }
        `}</style>

        {/* Timeline Scrubber with Checkpoint Markers */}
        <div className="relative w-full flex items-center group/timeline">
          {/* Checkpoint Indicators on Timeline */}
          {duration > 0 &&
            interactiveQuestions.map((q) => {
              if (q.timestamp_seconds <= 0 || q.timestamp_seconds >= duration) return null;
              const posPercent = Math.min(99, Math.max(1, (q.timestamp_seconds / duration) * 100));
              return (
                <div
                  key={q.id}
                  style={{ left: `${posPercent}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white z-20 shadow-md pointer-events-auto cursor-pointer hover:scale-130 transition-transform"
                  title={`Checkpoint: ${q.question_text}`}
                />
              );
            })}

          <Slider
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleTimelineChange}
            tooltip={{ formatter: (val) => formatTime(val || 0) }}
            className="w-full !my-0 cursor-pointer custom-video-slider"
          />
        </div>

        {/* Lower Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play, Replay 10s, Skip 10s, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay(e);
              }}
              className="p-1 hover:text-purple-400 transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleSeekDelta(-10)}
              className="p-1 hover:text-purple-400 transition-colors"
              title="Replay 10 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleSeekDelta(10)}
              className="p-1 hover:text-purple-400 transition-colors"
              title="Skip 10 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-gray-300 ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Volume, Captions, Speed, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Volume with hover slider */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1 hover:text-purple-400 transition-colors"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <div className="w-16 hidden sm:block">
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="!my-0"
                  trackStyle={{ backgroundColor: '#8b5cf6', height: 3 }}
                  railStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', height: 3 }}
                  handleStyle={{ borderColor: '#8b5cf6', width: 8, height: 8 }}
                />
              </div>
            </div>

            {/* Captions Toggle */}
            <button
              onClick={() => setCaptionsEnabled((prev) => !prev)}
              className={`p-1 rounded transition-colors flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 border ${
                captionsEnabled
                  ? 'border-purple-500 text-purple-300 bg-purple-950/40'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
              title={captionsEnabled ? 'Turn Captions OFF' : 'Turn Captions ON'}
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>CC</span>
            </button>

            {/* Playback Speed Popover */}
            <Popover
              open={speedMenuOpen}
              onOpenChange={setSpeedMenuOpen}
              trigger="click"
              placement="top"
              content={
                <div className="p-1 w-28 space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1">Playback Speed</div>
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full text-left px-2.5 py-1 text-xs rounded flex items-center justify-between transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-purple-50 text-purple-700 font-bold'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>{speed === 1.0 ? 'Normal' : `${speed}x`}</span>
                      {playbackSpeed === speed && <span className="text-[10px] text-purple-600 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              }
            >
              <button
                className="p-1 hover:text-purple-400 transition-colors flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border border-white/20"
                title="Playback Speed"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{playbackSpeed}x</span>
              </button>
            </Popover>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-purple-400 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

CustomVideoPlayer.displayName = 'CustomVideoPlayer';
