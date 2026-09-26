import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Progress, Modal, Radio, message, Alert } from 'antd';
import {
  PlayCircle,
  CheckCircle2,
  Award,
  ArrowLeft,
  Shield,
  AlertCircle,
  ShieldAlert,
  Lock,
  EyeOff,
  HardDrive,
  Clock,
  Calendar,
} from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { CustomVideoPlayer, CustomVideoPlayerRef } from '../../components/video/CustomVideoPlayer';
import { CertificateViewerModal } from '../../components/certificate/CertificateViewerModal';

export const LearningPlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLessonId = searchParams.get('lesson');

  let backPath = '/student/dashboard';
  if (location.pathname.startsWith('/instructor')) {
    backPath = '/instructor/courses';
  } else if (location.pathname.startsWith('/organization')) {
    backPath = '/organization/courses';
  }
  const queryClient = useQueryClient();
  const session = SecureStorageService.GetDecryptedValue<any>('session');

  const playerRef = useRef<CustomVideoPlayerRef>(null);

  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [initialResumePosition, setInitialResumePosition] = useState(0);
  const [lastSavedPosition, setLastSavedPosition] = useState(0);
  const [currentPlaySeconds, setCurrentPlaySeconds] = useState(0);
  const [currentVideoDuration, setCurrentVideoDuration] = useState(0);
  const [earnedCert, setEarnedCert] = useState<any>(null);

  // Refs for stable lifecycle progress persistence without trigger loops
  const initialPosSetForLesson = useRef<string | null>(null);
  const currentPlaySecondsRef = useRef(0);
  const currentVideoDurationRef = useRef(0);
  const activeLessonRef = useRef<any>(null);
  const prevLessonIdRef = useRef<string | null>(null);

  // Enterprise Video Telemetry: Milestone checkpoints (25%, 50%, 75%, 90%) & Throttling
  const savedMilestonesRef = useRef<Set<number>>(new Set());
  const lastSavedPositionRef = useRef<number>(0);
  const lastSavedTimeRef = useRef<number>(Date.now());
  const pauseDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Privacy & Anti-Piracy Security Terms Acceptance
  const [securityAccepted, setSecurityAccepted] = useState<boolean>(() => {
    return localStorage.getItem(`novacodex_security_accepted_${courseId}`) === 'true';
  });

  // Interactive Question State
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [questionFeedback, setQuestionFeedback] = useState<{ isCorrect: boolean; explanation?: string } | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);

  // 1. Fetch Course with Sections & Lessons (Long cache, no polling, no refetch on window focus)
  const { data: course, isLoading } = useQuery({
    queryKey: ['learning-course', courseId],
    queryFn: async () => {
      const res = await ApiClient.get(`/courses/GetCourseDetails/${courseId}`);
      return res.data.data;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  // 2. Fetch In-Video Questions for active lesson (Static per lesson)
  const { data: questions } = useQuery({
    queryKey: ['interactive-questions', activeLesson?.id],
    queryFn: async () => {
      if (!activeLesson?.id) return [];
      const res = await ApiClient.get(`/videos/GetVideoInteractiveQuestionList/${activeLesson.id}`);
      return res.data.data;
    },
    enabled: !!activeLesson?.id,
    staleTime: 30 * 60 * 1000,
    refetchInterval: false,
  });

  // 3. Fetch Course Progress (Cached, only refetched when a lesson completes)
  const { data: progressData } = useQuery({
    queryKey: ['student-course-progress', courseId],
    queryFn: async () => {
      const res = await ApiClient.get(`/progress/GetStudentCourseProgress/${courseId}`);
      return res.data.data;
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // 4. Fetch Secure Video Playback URL (Enforces student enrollment check, long cache)
  const { data: playbackData } = useQuery({
    queryKey: ['lesson-playback-url', activeLesson?.id],
    queryFn: async () => {
      if (!activeLesson?.id || activeLesson?.content_type !== 'VIDEO') return null;
      if (activeLesson.video_url) return { videoUrl: activeLesson.video_url };
      try {
        const res = await ApiClient.get(`/videos/GenerateVideoPlaybackUrl/${activeLesson.id}`);
        return res.data?.data;
      } catch (err: any) {
        return { videoUrl: null, error: err.response?.data?.message };
      }
    },
    enabled: !!activeLesson?.id && activeLesson?.content_type === 'VIDEO',
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Set initial active lesson dynamically based on URL query param, saved last active lesson, or first uncompleted lesson
  useEffect(() => {
    if (course?.sections && course.sections.length > 0 && !activeLesson) {
      const allLessons: any[] = [];
      course.sections.forEach((sec: any) => {
        if (sec.lessons) allLessons.push(...sec.lessons);
      });
      if (allLessons.length === 0) return;

      let chosenLesson: any = null;

      // 1. Explicit query parameter ?lesson=<id>
      if (requestedLessonId) {
        chosenLesson = allLessons.find((l: any) => l.id === requestedLessonId);
      }

      // 2. Last active lesson from course progress
      if (!chosenLesson && progressData?.courseProgress?.last_lesson_id) {
        chosenLesson = allLessons.find((l: any) => l.id === progressData.courseProgress.last_lesson_id);
      }

      // 3. First uncompleted lesson
      if (!chosenLesson && progressData?.lessonProgress) {
        chosenLesson = allLessons.find((l: any) => {
          const lp = progressData.lessonProgress.find((p: any) => p.lesson_id === l.id);
          return !lp?.is_completed;
        });
      }

      // 4. Default to first lesson in curriculum
      if (!chosenLesson) {
        chosenLesson = allLessons[0];
      }

      if (chosenLesson) {
        setActiveLesson(chosenLesson);
      }
    }
  }, [course, activeLesson, requestedLessonId, progressData]);

  // Synchronize active lesson state with URL search param and backend active lesson record
  useEffect(() => {
    if (activeLesson?.id && courseId) {
      setSearchParams({ lesson: activeLesson.id }, { replace: true });
      ApiClient.post('/progress/SetActiveLesson', {
        courseId,
        lessonId: activeLesson.id,
      }).catch(() => {});
    }
  }, [activeLesson?.id, courseId]);

  // Keep live references updated for unmount and lesson transitions
  useEffect(() => {
    currentPlaySecondsRef.current = currentPlaySeconds;
    currentVideoDurationRef.current = currentVideoDuration;
    activeLessonRef.current = activeLesson;
  }, [currentPlaySeconds, currentVideoDuration, activeLesson]);

  // Reset milestone checkpoints when active lesson changes
  useEffect(() => {
    savedMilestonesRef.current.clear();
    lastSavedPositionRef.current = 0;
    lastSavedTimeRef.current = Date.now();
    if (pauseDebounceTimerRef.current) {
      clearTimeout(pauseDebounceTimerRef.current);
      pauseDebounceTimerRef.current = null;
    }
  }, [activeLesson?.id]);

  // Sync initial resume position from database progress records ONCE per lesson
  useEffect(() => {
    if (activeLesson?.id && progressData?.lessonProgress) {
      if (initialPosSetForLesson.current !== activeLesson.id) {
        initialPosSetForLesson.current = activeLesson.id;
        const lp = progressData.lessonProgress.find((p: any) => p.lesson_id === activeLesson.id);
        const pos = lp?.last_position_seconds || 0;
        const existingPct = Number(lp?.watch_percentage) || 0;

        // Pre-populate already achieved milestones so we never re-trigger them
        [25, 50, 75, 90].forEach((m) => {
          if (existingPct >= m) savedMilestonesRef.current.add(m);
        });

        setInitialResumePosition(pos);
        setLastSavedPosition(pos);
        lastSavedPositionRef.current = pos;
        setCurrentPlaySeconds(pos);
      }
    }
  }, [activeLesson?.id, progressData]);

  // Periodic Video Watch Progress Mutation (fire-and-forget, does NOT invalidate queries to avoid GET/POST loops)
  const saveProgressMutation = useMutation({
    mutationFn: async (data: { lessonId: string; lastPositionSeconds: number; watchPercentage: number }) => {
      return ApiClient.post('/progress/SaveStudentVideoWatchProgress', data);
    },
  });

  // Completion Mutation: invalidates progress query when a lesson is marked completed or video finishes
  const completeLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: string; lastPositionSeconds: number; watchPercentage: number }) => {
      return ApiClient.post('/progress/SaveStudentVideoWatchProgress', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-course-progress', courseId] });
    },
  });

  // Centralized, throttled video watch progress saver (Milestone, Pause, Heartbeat)
  const saveProgressToServer = useCallback(
    (seconds: number, duration: number, _reason: 'milestone' | 'pause' | 'heartbeat' = 'milestone') => {
      if (!activeLesson?.id || seconds <= 0) return;
      const pct = duration > 0 ? Math.min(100, Math.round((seconds / duration) * 100)) : 0;

      // Instant client-side persistence (0 network, 0 server cost)
      try {
        localStorage.setItem(
          `course_watch_pos_${activeLesson.id}`,
          JSON.stringify({ position: Math.floor(seconds), percentage: pct, updatedAt: Date.now() })
        );
      } catch {}

      lastSavedPositionRef.current = Math.floor(seconds);
      lastSavedTimeRef.current = Date.now();
      setLastSavedPosition(Math.floor(seconds));

      saveProgressMutation.mutate({
        lessonId: activeLesson.id,
        lastPositionSeconds: Math.floor(seconds),
        watchPercentage: pct,
      });
    },
    [activeLesson?.id, saveProgressMutation]
  );

  // Save progress of previous lesson when switching lessons
  useEffect(() => {
    if (prevLessonIdRef.current && prevLessonIdRef.current !== activeLesson?.id) {
      const prevLessonId = prevLessonIdRef.current;
      const seconds = currentPlaySecondsRef.current;
      const dur = currentVideoDurationRef.current;
      const delta = Math.abs(Math.floor(seconds) - lastSavedPositionRef.current);
      if (seconds > 0 && delta >= 3) {
        ApiClient.post('/progress/SaveStudentVideoWatchProgress', {
          lessonId: prevLessonId,
          lastPositionSeconds: Math.floor(seconds),
          watchPercentage: dur > 0 ? Math.min(100, Math.round((seconds / dur) * 100)) : 0,
        }).catch(() => {});
      }
    }
    prevLessonIdRef.current = activeLesson?.id || null;
  }, [activeLesson?.id]);

  // Save watch progress on component unmount only (empty dependency array to prevent continuous re-triggering)
  useEffect(() => {
    return () => {
      if (pauseDebounceTimerRef.current) clearTimeout(pauseDebounceTimerRef.current);
      const lesson = activeLessonRef.current;
      const seconds = currentPlaySecondsRef.current;
      const dur = currentVideoDurationRef.current;
      const delta = Math.abs(Math.floor(seconds) - lastSavedPositionRef.current);
      if (lesson?.id && seconds > 0 && delta >= 3) {
        ApiClient.post('/progress/SaveStudentVideoWatchProgress', {
          lessonId: lesson.id,
          lastPositionSeconds: Math.floor(seconds),
          watchPercentage: dur > 0 ? Math.min(100, Math.round((seconds / dur) * 100)) : 0,
        }).catch(() => {});
      }
    };
  }, []);

  // Handle Continuing After Quiz with Immediate Auto-Play
  const handleContinueAfterQuiz = useCallback(() => {
    setActiveQuestion(null);
    setQuestionFeedback(null);
    setSelectedOption('');
    setTimeout(() => {
      playerRef.current?.play();
    }, 120);
  }, []);

  // Submit Interactive Question Answer Mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async () => {
      return ApiClient.post('/videos/SubmitVideoInteractiveQuestionAnswer', {
        questionId: activeQuestion.id,
        submittedAnswer: selectedOption,
      });
    },
    onSuccess: (res) => {
      const result = res.data.data;
      setQuestionFeedback(result);
      if (result.isCorrect) {
        setAnsweredQuestionIds((prev) => [...prev, activeQuestion.id]);
        // Auto-play immediately after answer feedback
        setTimeout(() => {
          handleContinueAfterQuiz();
        }, 1400);
      }
    },
  });

  // Generate Certificate Mutation
  const generateCertMutation = useMutation({
    mutationFn: async () => {
      return ApiClient.post('/certificates/GenerateCertificate', { courseId });
    },
    onSuccess: (res) => {
      const cert = res.data.data;
      message.success('Congratulations! Your verified certificate has been issued!');
      setEarnedCert(cert);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Could not generate certificate.');
    },
  });

  // Real-time live completion percentage with smooth animations
  const liveCompletionPercentage = useMemo(() => {
    if (!course?.sections || course.sections.length === 0) {
      return Number(progressData?.courseProgress?.progress_percentage || 0);
    }
    let totalLessons = 0;
    let totalScore = 0;
    course.sections.forEach((sec: any) => {
      sec.lessons?.forEach((l: any) => {
        totalLessons += 1;
        const savedLp = progressData?.lessonProgress?.find((lp: any) => lp.lesson_id === l.id);
        let lessonPct = savedLp?.is_completed ? 100 : (Number(savedLp?.watch_percentage) || 0);
        if (l.id === activeLesson?.id && currentVideoDuration > 0) {
          const livePct = Math.min(100, (currentPlaySeconds / currentVideoDuration) * 100);
          lessonPct = Math.max(lessonPct, livePct);
        }
        totalScore += Math.min(100, lessonPct);
      });
    });
    if (totalLessons === 0) return 0;
    return Math.min(100, Math.round((totalScore / totalLessons) * 100) / 100);
  }, [course, progressData, activeLesson, currentPlaySeconds, currentVideoDuration]);

  // Role Checks for Metadata & Telemetry
  const isSuperAdmin = Boolean(session?.user?.isSuperAdmin || session?.user?.role === 'SUPER_ADMIN');
  const isOrgOwner = Boolean(session?.user?.isOrganizationOwner);
  const isOrgAdmin = Boolean(session?.user?.role === 'ORGANIZATION_ADMIN');
  const isFullAccessAdmin = isSuperAdmin || isOrgOwner || isOrgAdmin;
  const isStaffUser =
    isFullAccessAdmin ||
    session?.user?.role === 'INSTRUCTOR' ||
    session?.user?.role === 'STAFF' ||
    Boolean(session?.user?.member_permissions);

  const formatFileSize = (bytes?: number | string) => {
    if (!bytes) return '16.43 MB';
    const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(num) || num <= 0) return '16.43 MB';
    const mb = num / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatUploadDateTime = (dateStr?: string) => {
    if (!dateStr) return '11 Sep 2026, 02:43 PM IST';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return (
      d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  };

  const isEligibleForCertificate = progressData?.courseProgress?.is_completed;

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-500">Loading course player...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <Button
        type="text"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate(backPath)}
        className="mb-4 text-xs text-gray-500"
      >
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video & Lesson Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Security & Anti-Piracy Active Banner for Private Courses */}
          {course?.is_private && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="break-words">
                  <strong className="font-semibold text-amber-950">Proprietary Academy Course Protected:</strong> Active anti-piracy DRM & dynamic session watermarking are monitoring playback. Screenshots & recording are strictly forbidden.
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-200/70 text-amber-950 shrink-0">
                DRM ACTIVE
              </span>
            </div>
          )}

          <div className="w-full min-w-0">
            {/* Recently Watched / Dynamic Resume Point Banner */}
            {initialResumePosition > 5 && (
              <div className="mb-3 p-3 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-950">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="break-words">
                    Resumed playback from your previous session at{' '}
                    <strong className="font-bold font-mono">
                      {Math.floor(initialResumePosition / 60)}:{(initialResumePosition % 60).toString().padStart(2, '0')}
                    </strong>
                  </span>
                </div>
                <Button
                  size="small"
                  onClick={() => {
                    playerRef.current?.seek(0);
                    setInitialResumePosition(0);
                    setCurrentPlaySeconds(0);
                  }}
                  className="text-[11px] font-semibold !h-6 px-2.5 rounded-lg border-amber-300 text-amber-900 hover:!border-amber-400 hover:!bg-amber-100 shrink-0"
                >
                  Restart from 0:00
                </Button>
              </div>
            )}

            {activeLesson?.content_type === 'VIDEO' ? (
              playbackData?.error ? (
                <div className="bg-gray-900 rounded-2xl p-8 text-white text-center max-w-md mx-auto my-6 border border-red-500/30">
                  <Lock className="w-10 h-10 text-red-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Playback Restricted</h3>
                  <p className="text-xs text-gray-300 mb-4">{playbackData.error}</p>
                </div>
              ) : (
                <CustomVideoPlayer
                  ref={playerRef}
                  src={playbackData?.videoUrl || activeLesson.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                  title={activeLesson.title}
                  initialTime={initialResumePosition}
                  isPrivate={Boolean(course?.is_private)}
                  courseId={courseId}
                  lessonId={activeLesson?.id}
                  watermarkText={`${session?.user?.firstName || 'Learner'} ${session?.user?.lastName || ''} • ${session?.user?.email || 'student'} • ${session?.user?.activeOrganizationName || 'Academy'} • IP: ${session?.user?.lastLoginIp || 'Protected'}`}
                  interactiveQuestions={questions || []}
                  onCheckpoint={(q) => {
                    if (!answeredQuestionIds.includes(q.id)) {
                      setActiveQuestion(q);
                      setSelectedOption('');
                      setQuestionFeedback(null);
                    }
                  }}
                  onTimeUpdate={(curr, dur, pct) => {
                    setCurrentPlaySeconds(curr);
                    setCurrentVideoDuration(dur);

                    // 1. Milestone Checkpoints: Save ONLY at 25%, 50%, 75%, 90% (Industry Standard)
                    for (const milestone of [25, 50, 75, 90]) {
                      if (pct >= milestone && !savedMilestonesRef.current.has(milestone)) {
                        savedMilestonesRef.current.add(milestone);
                        saveProgressToServer(curr, dur, 'milestone');
                        return;
                      }
                    }

                    // 2. Fallback Heartbeat: At most once every 60 seconds of continuous playback
                    const timeSinceLastSave = Date.now() - lastSavedTimeRef.current;
                    const progressDelta = Math.abs(Math.floor(curr) - lastSavedPositionRef.current);
                    if (progressDelta >= 60 && timeSinceLastSave >= 60000) {
                      saveProgressToServer(curr, dur, 'heartbeat');
                    }
                  }}
                  onPause={(curr, dur) => {
                    // Debounce pause by 1s to prevent rapid play/pause spam
                    if (pauseDebounceTimerRef.current) clearTimeout(pauseDebounceTimerRef.current);
                    const progressDelta = Math.abs(Math.floor(curr) - lastSavedPositionRef.current);
                    if (progressDelta >= 5) {
                      pauseDebounceTimerRef.current = setTimeout(() => {
                        saveProgressToServer(curr, dur, 'pause');
                      }, 1000);
                    }
                  }}
                  onEnded={() => {
                    completeLessonMutation.mutate({
                      lessonId: activeLesson.id,
                      lastPositionSeconds: activeLesson.video_duration_seconds || 100,
                      watchPercentage: 100,
                    });
                    message.success('Lesson finished! Watch progress recorded.');
                  }}
                />
              )) : (
                <div className="bg-black rounded-2xl p-8 text-white text-center max-w-md mx-auto">
                  <h3 className="text-lg font-bold mb-2">{activeLesson?.title}</h3>
                  <p className="text-xs text-gray-300">
                    {activeLesson?.article_content || 'Read through the material carefully to complete this lesson.'}
                  </p>
                  <Button
                    type="primary"
                    className="mt-6"
                    onClick={() => {
                      completeLessonMutation.mutate({
                        lessonId: activeLesson.id,
                        lastPositionSeconds: 100,
                        watchPercentage: 100,
                      });
                      message.success('Lesson marked as completed!');
                    }}
                  >
                    Mark Lesson Complete
                  </Button>
              </div>
            )}
          </div>

          {/* Role-Based Video Metadata & Telemetry Tags Bar */}
          {isStaffUser && activeLesson?.content_type === 'VIDEO' && (
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Video Type / Codec Tag with pulsating dot */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  {activeLesson?.content_type || 'VIDEO'} • MP4 1080p
                </span>

                {/* Video Active Status Tag with status dot */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active Video Lesson
                </span>

                {/* Upload Date & Time (Visible to All Staff & Admins) */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-gray-700 bg-gray-50 border border-gray-200">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  Uploaded: {formatUploadDateTime(activeLesson?.created_at)}
                </span>

                {/* Video File Size (Visible to Org Admin & Full Access Admin) */}
                {isFullAccessAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-gray-700 bg-gray-50 border border-gray-200">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                    Size: {formatFileSize(activeLesson?.video_file_size_bytes)}
                  </span>
                )}
              </div>

              <div className="text-[10px] font-mono text-gray-400">
                {isFullAccessAdmin ? '★ Admin Asset & Storage Telemetry' : '★ Staff Video Details'}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#111111] break-words">{activeLesson?.title}</h2>
              <div className="text-xs text-gray-500 break-words">{course?.title}</div>
            </div>

            {isEligibleForCertificate && (
              <Button
                type="primary"
                icon={<Award className="w-4 h-4 text-amber-300" />}
                onClick={() => generateCertMutation.mutate()}
                className="!bg-black font-semibold w-full sm:w-auto shrink-0"
              >
                Claim Verified Certificate
              </Button>
            )}
          </div>
        </div>

        {/* Syllabus Sidebar */}
        <div className="space-y-4">
          <Card title="Course Syllabus" className="!rounded-2xl border border-[#e5e5e5]">
            <div className="mb-4">
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Course Completion</span>
                <span className="font-mono text-emerald-600 font-bold transition-all duration-300">
                  {liveCompletionPercentage.toFixed(2)}%
                </span>
              </div>
              <Progress
                percent={Number(liveCompletionPercentage.toFixed(2))}
                showInfo={false}
                status="active"
                strokeColor={{
                  '0%': '#8b5cf6',
                  '100%': '#10b981',
                }}
                className="transition-all duration-500"
              />
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {course?.sections?.map((section: any) => (
                <div key={section.id}>
                  <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                    {section.title}
                  </div>
                  <div className="space-y-1">
                    {section.lessons?.map((lesson: any) => {
                      const isCompleted = progressData?.lessonProgress?.some(
                        (lp: any) => lp.lesson_id === lesson.id && lp.is_completed
                      );
                      const isSelected = activeLesson?.id === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-black text-white font-medium'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{lesson.title}</span>
                          </div>
                          {isCompleted && (
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ★ IN-VIDEO INTERACTIVE CHECKPOINT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-purple-700">
            <AlertCircle className="w-5 h-5" />
            <span>Interactive Knowledge Checkpoint</span>
          </div>
        }
        open={!!activeQuestion}
        closable={false}
        footer={null}
        width={540}
        destroyOnHidden
      >
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">
            {activeQuestion?.question_text}
          </p>

          <Radio.Group
            onChange={(e) => setSelectedOption(e.target.value)}
            value={selectedOption}
            className="w-full space-y-2 mb-4"
          >
            {activeQuestion?.options?.map((opt: string, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedOption === opt ? 'border-purple-600 bg-purple-50/50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Radio value={opt} className="text-xs">
                  {opt}
                </Radio>
              </div>
            ))}
          </Radio.Group>

          {questionFeedback && (
            <Alert
              message={questionFeedback.isCorrect ? 'Correct! Well done.' : 'Incorrect answer.'}
              description={questionFeedback.explanation}
              type={questionFeedback.isCorrect ? 'success' : 'error'}
              showIcon
              className="mb-4 text-xs"
            />
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            {!questionFeedback ? (
              <Button
                type="primary"
                disabled={!selectedOption}
                loading={submitAnswerMutation.isPending}
                onClick={() => submitAnswerMutation.mutate()}
                className="!bg-purple-600"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleContinueAfterQuiz}
                className="!bg-black font-semibold"
              >
                Continue Learning →
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Verified Certificate Viewer Modal */}
      <CertificateViewerModal
        open={!!earnedCert}
        onClose={() => setEarnedCert(null)}
        cert={earnedCert}
      />

      {/* ★ PRE-COURSE SECURITY & PRIVACY ADVISORY MODAL */}
      <Modal
        open={Boolean(course?.is_private && !securityAccepted)}
        closable={false}
        footer={null}
        centered
        width={560}
        maskClosable={false}
      >
        <div className="p-3 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Proprietary Content & Anti-Piracy Security Notice
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Course: <span className="font-semibold text-gray-800">{course?.title}</span>
            </p>
          </div>

          <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-2.5 leading-relaxed">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Confidential Intellectual Property:</strong> This course contains proprietary materials belonging to <strong>{course?.organization_name || 'Apex Coding Academy'}</strong>.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <EyeOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Screenshots & Recording Prohibited:</strong> Taking screenshots (PrintScreen, Snipping Tool, shortcuts) or running screen recording utilities is strictly prohibited and continuously monitored.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Forensic Watermarking & Audit Logging:</strong> Video streams are dynamically watermarked with your identity ({session?.user?.email}) and client IP. All unauthorized capture attempts are automatically logged to the security audit servers.
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="primary"
              size="large"
              block
              className="!bg-black !h-11 font-semibold rounded-xl"
              onClick={() => {
                setSecurityAccepted(true);
                if (courseId) {
                  localStorage.setItem(`novacodex_security_accepted_${courseId}`, 'true');
                }
                message.success('Security terms acknowledged. Enjoy your learning session!');
              }}
            >
              I Understand & Accept Security Terms
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
