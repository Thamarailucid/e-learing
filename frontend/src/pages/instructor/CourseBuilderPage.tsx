import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Modal, Form, Input, Select, InputNumber, message, Tag, Upload, Tooltip, Radio, Popconfirm } from 'antd';
import { Plus, Video, FileText, HelpCircle, Check, ArrowLeft, UploadCloud, Clock, Image as ImageIcon, CheckCircle, Sparkles, Trash2, Paperclip, Download, Star, Pencil } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { RbaStatusBadge } from '../../components/common/RbaStatusBadge';
import { CourseCreateEditModal } from '../../components/modals/CourseCreateEditModal';
import { Settings } from 'lucide-react';

export const CourseBuilderPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingLessonVideoId, setUploadingLessonVideoId] = useState<string | null>(null);
  const [previewSelection, setPreviewSelection] = useState<{ type: 'MODULE' | 'LESSON'; data: any } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [editModuleModalOpen, setEditModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [quizQuestionsModalOpen, setQuizQuestionsModalOpen] = useState(false);
  const [managingQuizContext, setManagingQuizContext] = useState<any>(null);

  // Attachment Manager State
  const [attachmentManagerModalOpen, setAttachmentManagerModalOpen] = useState(false);
  const [managingAttachmentLesson, setManagingAttachmentLesson] = useState<any | null>(null);

  const [sectionForm] = Form.useForm();
  const [lessonForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [editModuleForm] = Form.useForm();
  const [editLessonForm] = Form.useForm();
  const [quizQuestionForm] = Form.useForm();

  // Local file & video source state for Add Lesson Modal
  const [selectedLessonFile, setSelectedLessonFile] = useState<File | null>(null);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload');
  const [lessonContentType, setLessonContentType] = useState<'VIDEO' | 'ARTICLE' | 'QUIZ' | 'REFERENCE' | 'WELCOME'>('VIDEO');

  const handleDeleteLessonAttachment = async (lessonId: string, attachmentUrl: string) => {
    try {
      await ApiClient.post(`/courses/DeleteLessonAttachment/${lessonId}`, { attachmentUrl });
      message.success('Attachment deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete attachment.');
    }
  };

  const getLessonIcon = (type?: string, title?: string) => {
    const t = (type || '').toUpperCase();
    const tit = (title || '').toLowerCase();
    if (t === 'WELCOME' || tit.includes('welcome') || tit.includes('orientation')) return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
    if (t === 'QUIZ' || tit.includes('quiz')) return <HelpCircle className="w-3.5 h-3.5 text-purple-500" />;
    if (t === 'FEEDBACK' || tit.includes('feedback')) return <Star className="w-3.5 h-3.5 text-yellow-500" />;
    if (t === 'REFERENCE' || tit.includes('reference') || tit.includes('cheatsheet')) return <Paperclip className="w-3.5 h-3.5 text-blue-500" />;
    if (t === 'ARTICLE' || tit.includes('reading') || tit.includes('article')) return <FileText className="w-3.5 h-3.5 text-emerald-500" />;
    return <Video className="w-3.5 h-3.5 text-indigo-500" />;
  };

  // 1. Fetch Course Data
  const { data: course, isLoading } = useQuery({
    queryKey: ['course-details', courseId],
    queryFn: async () => {
      const res = await ApiClient.get(`/courses/GetCourseDetails/${courseId}`);
      return res.data?.data;
    },
    enabled: !!courseId,
  });

  // Auto-select first lesson for preview
  React.useEffect(() => {
    if (course?.sections && !previewSelection) {
      for (const section of course.sections) {
        if (section.lessons?.length > 0) {
          setPreviewSelection({ type: 'LESSON', data: section.lessons[0] });
          break;
        }
      }
    }
  }, [course, previewSelection]);

  // 2. Add Section Mutation
  const addSectionMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.post('/courses/CreateCourseSection', {
        courseId,
        title: values.title,
        orderIndex: course?.sections?.length || 0,
      });
    },
    onSuccess: () => {
      message.success('Module section created.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setSectionModalOpen(false);
      sectionForm.resetFields();
    },
  });

  // 3. Add Lesson Mutation
  const addLessonMutation = useMutation({
    mutationFn: async (values: any) => {
      const contentType = values.contentType || 'VIDEO';
      const videoUrl = contentType === 'VIDEO' && videoSourceType === 'url' ? values.videoUrl || '' : '';

      const res = await ApiClient.post('/courses/CreateLesson', {
        courseId,
        sectionId: activeSectionId,
        title: values.title,
        contentType,
        videoUrl,
        videoDurationSeconds: values.videoDurationSeconds || 600,
        articleContent: values.articleContent,
      });

      const createdLesson = res.data?.data;

      // If a local video file was selected in the modal, upload directly to S3!
      if (createdLesson?.id && selectedLessonFile && contentType === 'VIDEO' && videoSourceType === 'upload') {
        await handleUploadLessonVideo(createdLesson.id, selectedLessonFile);
      }

      // If an attachment file was selected in the modal, upload directly to S3!
      if (createdLesson?.id && selectedAttachmentFile) {
        const formData = new FormData();
        formData.append('file', selectedAttachmentFile);
        formData.append('attachment', selectedAttachmentFile);
        try {
          await ApiClient.post(`/courses/UploadLessonAttachment/${createdLesson.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (e) {
          console.error('Failed to upload initial attachment:', e);
        }
      }

      return createdLesson;
    },
    onSuccess: () => {
      message.success(
        selectedLessonFile
          ? 'Lesson created and video uploaded to S3!'
          : selectedAttachmentFile
          ? 'Lesson created and attachment uploaded to S3!'
          : 'Lesson added.'
      );
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setLessonModalOpen(false);
      lessonForm.resetFields();
      setSelectedLessonFile(null);
      setSelectedAttachmentFile(null);
      setVideoSourceType('upload');
      setLessonContentType('VIDEO');
    },
  });

  // 4. Add Interactive Question Mutation
  const addQuestionMutation = useMutation({
    mutationFn: async (values: any) => {
      const options = [values.optionA, values.optionB, values.optionC, values.optionD].filter(Boolean);
      return ApiClient.post('/videos/CreateVideoInteractiveQuestion', {
        lessonId: activeLessonId,
        timestampSeconds: values.timestampSeconds,
        questionText: values.questionText,
        questionType: 'MCQ',
        options,
        correctAnswer: values.correctAnswer,
        explanation: values.explanation,
        isRequired: true,
      });
    },
    onSuccess: () => {
      message.success('In-video interactive question added to timeline!');
      queryClient.invalidateQueries({ queryKey: ['interactive-questions', activeLessonId] });
      setQuestionModalOpen(false);
      questionForm.resetFields();
    },
  });

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // 5. Upload Course Thumbnail
  const handleUploadThumbnail = async (file: File) => {
    setUploadingThumbnail(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      const res = await ApiClient.post(`/courses/UploadCourseThumbnail/${courseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });
      message.success(`Course thumbnail uploaded and converted to: ${res.data?.data?.fileName}`);
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to upload thumbnail.');
    } finally {
      setUploadingThumbnail(false);
      setUploadProgress(null);
    }
  };

  // 6. Upload Lesson Video
  const handleUploadLessonVideo = async (lessonId: string, file: File) => {
    setUploadingLessonVideoId(lessonId);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await ApiClient.post(`/videos/UploadCourseVideo/${lessonId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });
      message.success(`Lecture video uploaded and converted to standardized name: ${res.data?.data?.fileName || 'orgnamecoursevideo.mp4'}`);
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to upload lecture video.');
    } finally {
      setUploadingLessonVideoId(null);
      setUploadProgress(null);
    }
  };

  // 7. Publish / Unpublish Mutation
  const publishMutation = useMutation({
    mutationFn: async (action: 'Publish' | 'Unpublish') => {
      return ApiClient.post(`/courses/${action}Course/${courseId}`);
    },
    onSuccess: (_, action) => {
      message.success(`Course ${action === 'Publish' ? 'published' : 'unpublished'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    },
  });

  // 8. Delete Section Mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      return ApiClient.delete(`/courses/DeleteCourseSection/${sectionId}`);
    },
    onSuccess: () => {
      message.success('Module section deleted.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setActiveSectionId(null);
    },
  });

  // 9. Delete Lesson Mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return ApiClient.delete(`/courses/DeleteLesson/${lessonId}`);
    },
    onSuccess: () => {
      message.success('Lesson deleted.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setPreviewSelection(null);
    },
  });

  // 10. Scaffold Coursera Flow Mutation
  const scaffoldMutation = useMutation({
    mutationFn: async () => {
      return ApiClient.post(`/courses/ScaffoldCourseraFlow/${courseId}`);
    },
    onSuccess: () => {
      message.success('Coursera pedagogical flow generated.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    },
  });

  // 11. Retry Transcoding Mutation
  const retryTranscodingMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return ApiClient.post(`/videos/RetryTranscoding/${lessonId}`);
    },
    onSuccess: () => {
      message.success('Transcoding re-enqueued! Processing in background...');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to retry transcoding.');
    },
  });

  // 12. Update Section Mutation
  const updateSectionMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put(`/courses/UpdateCourseSection/${editingModule.id}`, {
        title: values.title
      });
    },
    onSuccess: () => {
      message.success('Module title updated.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setEditModuleModalOpen(false);
    },
  });

  // 13. Update Lesson Mutation
  const updateLessonMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put(`/courses/UpdateLesson/${editingLesson.id}`, {
        title: values.title,
        videoDurationSeconds: values.videoDurationSeconds,
        articleContent: values.articleContent
      });
    },
    onSuccess: (data, variables) => {
      message.success('Lesson updated.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setEditLessonModalOpen(false);
      // update preview if editing current preview
      if (previewSelection?.data?.id === editingLesson?.id) {
        setPreviewSelection({ type: 'LESSON', data: { ...(previewSelection?.data || {}), ...variables } });
      }
    },
  });

  // Quiz Mutations
  const addQuizQuestionMutation = useMutation({
    mutationFn: async (values: any) => {
      const options = [values.optionA, values.optionB, values.optionC, values.optionD].filter(Boolean);
      const quizId = managingQuizContext?.quiz_id || managingQuizContext?.id;
      return ApiClient.post(`/quizzes/AddQuizQuestion/${quizId}`, {
        questionText: values.questionText,
        options,
        correctAnswer: values.correctAnswer,
        explanation: values.explanation,
        points: values.points || 1
      });
    },
    onSuccess: () => {
      message.success('Quiz question added.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      quizQuestionForm.resetFields();
    },
  });

  const deleteQuizQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      return ApiClient.delete(`/quizzes/DeleteQuizQuestion/${questionId}`);
    },
    onSuccess: () => {
      message.success('Question deleted.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
    },
  });

  const location = useLocation();
  let backPath = '/instructor/dashboard';
  if (location.pathname.startsWith('/organization')) {
    backPath = '/organization/courses';
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-500">Loading curriculum...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <Button
        type="text"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate(backPath)}
        className="mb-4 text-xs text-gray-500"
      >
        Back to Dashboard
      </Button>

      <RbaPageHeader
        title={course?.title || 'Course Builder'}
        subtitle={`Category: ${course?.category || 'General'} • Level: ${course?.level || 'All Levels'}`}
        action={
          <div className="flex items-center gap-3">
            <RbaStatusBadge status={course?.status || 'DRAFT'} />

            {/* Edit Course Details Button */}
            <Button
              icon={<Settings className="w-4 h-4" />}
              onClick={() => setEditModalOpen(true)}
            >
              Edit Details
            </Button>

            {/* Upload Thumbnail Button */}
            <Upload
              showUploadList={false}
              accept="image/*"
              beforeUpload={(file) => {
                handleUploadThumbnail(file);
                return false;
              }}
            >
              <Button
                icon={<ImageIcon className="w-4 h-4" />}
                loading={uploadingThumbnail}
                size="middle"
              >
                {uploadingThumbnail && uploadProgress !== null 
                  ? `Uploading... ${uploadProgress}%`
                  : (course?.thumbnail_url ? 'Change Thumbnail' : 'Upload Thumbnail')}
              </Button>
            </Upload>

            {course?.is_published ? (
              <Button onClick={() => publishMutation.mutate('Unpublish')}>
                Unpublish
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={() => publishMutation.mutate('Publish')}
              >
                Publish Course
              </Button>
            )}
          </div>
        }
      />

      {/* Course Meta Card */}
      {course?.thumbnail_url && (
        <div className="mb-6 p-3 bg-white rounded-xl border border-gray-200 flex items-center gap-4">
          <img
            src={course.thumbnail_url}
            alt="Thumbnail"
            className="w-24 h-16 object-cover rounded-lg border border-gray-100"
          />
          <div>
            <div className="text-xs font-semibold text-gray-800">Standardized Course Thumbnail</div>
            <div className="text-[11px] text-gray-500 font-mono truncate max-w-md">{course.thumbnail_url}</div>
          </div>
        </div>
      )}

      {/* Curriculum Sections & Lessons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Curriculum Structure</h3>
              <p className="text-xs text-gray-500">Organize your course into sections, upload videos, and place interactive checkpoints</p>
            </div>
            <div className="flex gap-2">
              <Popconfirm title="Generate Coursera-Style Course Flow?" description="This will generate a structured 4-module pedagogical framework with 3-question module quizzes (1 try) and a 10-12 question final exam (80% cut-off, unlimited retries)." onConfirm={() => scaffoldMutation.mutate()}>
                <Button icon={<Sparkles className="w-4 h-4 text-amber-500" />}>
                  Scaffold Coursera Flow
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setSectionModalOpen(true)}
              >
                Add Module Section
              </Button>
            </div>
          </div>

        {course?.sections?.length === 0 ? (
          <Card className="!rounded-xl border border-dashed border-[#e5e5e5] text-center p-8">
            <p className="text-sm text-gray-500">No modules created yet. Click "Add Module Section" to start.</p>
          </Card>
        ) : (
          course?.sections?.map((section: any) => (
            <Card
              key={section.id}
              title={<span className="font-semibold text-sm cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setPreviewSelection({ type: 'MODULE', data: section })}>{section.title}</span>}
              extra={
                <div className="flex gap-2 items-center">
                  <Button
                    size="small"
                    type="link"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setActiveSectionId(section.id);
                      setLessonModalOpen(true);
                    }}
                  >
                    Add Lesson
                  </Button>
                  <Button size="small" type="text" icon={<Pencil className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); setEditingModule(section); editModuleForm.setFieldsValue(section); setEditModuleModalOpen(true); }} />
                  <Popconfirm title="Delete Module Section" description="Are you sure? This will permanently delete this module and all lessons within it." onConfirm={() => deleteSectionMutation.mutate(section.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                    <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />}>Delete Module</Button>
                  </Popconfirm>
                </div>
              }
              className="!rounded-xl border border-[#e5e5e5]"
            >
              {section.lessons?.length === 0 ? (
                <div className="text-xs text-gray-400 py-3 text-center">No lessons in this module.</div>
              ) : (
                <div className="space-y-2">
                  {section.lessons?.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className={`p-3 bg-gray-50 rounded-lg flex items-center justify-between border transition-colors cursor-pointer ${previewSelection?.data?.id === lesson.id ? 'border-indigo-400 bg-indigo-50/30 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                      onClick={() => setPreviewSelection({ type: 'LESSON', data: lesson })}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-white flex items-center justify-center text-gray-600 shadow-2xs">
                          {getLessonIcon(lesson.content_type, lesson.title)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                            <span>{lesson.title}</span>
                            {lesson.video_url && !lesson.hls_status && (
                              <Tag color="success" className="!text-[10px] !px-1.5 !py-0 !leading-4 rounded">
                                Ready
                              </Tag>
                            )}
                            {lesson.hls_status === 'COMPLETED' && (
                              <Tag color="success" className="!text-[10px] !px-1.5 !py-0 !leading-4 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> HLS Ready
                              </Tag>
                            )}
                            {lesson.hls_status === 'PROCESSING' && (
                              <Tag color="processing" className="!text-[10px] !px-1.5 !py-0 !leading-4 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Transcoding...
                              </Tag>
                            )}
                            {lesson.hls_status === 'QUEUED' && (
                              <Tag color="warning" className="!text-[10px] !px-1.5 !py-0 !leading-4 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Queued
                              </Tag>
                            )}
                            {lesson.hls_status === 'FAILED' && (
                              <div className="flex items-center gap-1">
                                <Tag color="error" className="!text-[10px] !px-1.5 !py-0 !leading-4 rounded flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Failed
                                </Tag>
                                <Button
                                  size="small"
                                  type="link"
                                  className="!text-[10px] !p-0 !h-auto text-blue-600 font-semibold"
                                  loading={retryTranscodingMutation.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    retryTranscodingMutation.mutate(lesson.id);
                                  }}
                                >
                                  (Retry HLS)
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {lesson.content_type === 'QUIZ' ? (
                              <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 w-fit">
                                <HelpCircle className="w-3 h-3 text-purple-600" />
                                {lesson.title?.toLowerCase().includes('final')
                                  ? 'Final Exam • 80% Cut-off • Unlimited Tries'
                                  : 'Module Quiz • 3 Questions • 1 Try'}
                              </span>
                            ) : (
                              <>{lesson.content_type} • {lesson.video_duration_seconds ? `${Math.floor(lesson.video_duration_seconds / 60)} mins` : 'Article / Resource'}</>
                            )}
                          </div>
                          {lesson.attachments && lesson.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Tag 
                                color="processing" 
                                className="cursor-pointer m-0 flex items-center gap-1 py-0.5 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManagingAttachmentLesson(lesson);
                                  setAttachmentManagerModalOpen(true);
                                }}
                              >
                                <Paperclip className="w-3 h-3" />
                                {lesson.attachments.length} Attached {lesson.attachments.length === 1 ? 'File' : 'Files'}
                              </Tag>
                              
                              {lesson.attachments.map((att: any, idx: number) => {
                                const fileName = att.name || att.file_name || 'Attachment';
                                const fileUrl = att.url || att.file_url || '#';
                                return (
                                  <div
                                    key={att.id || att.url || idx}
                                    className="text-[10px] inline-flex items-center gap-1.5 text-gray-700 bg-white hover:bg-gray-100 px-2 py-0.5 rounded border border-gray-200 shadow-2xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Paperclip className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:underline font-medium truncate max-w-[140px]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {fileName}
                                    </a>
                                    {att.size && <span className="text-gray-400">({(att.size / 1024).toFixed(0)} KB)</span>}
                                    <Popconfirm
                                      title="Delete Attachment?"
                                      description="Are you sure you want to remove this attachment from the lesson?"
                                      onConfirm={async (e) => {
                                        e?.stopPropagation();
                                        await handleDeleteLessonAttachment(lesson.id, fileUrl);
                                      }}
                                      onCancel={(e) => e?.stopPropagation()}
                                      okText="Yes, Delete"
                                      cancelText="Cancel"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <button
                                        type="button"
                                        className="p-0.5 text-gray-400 hover:text-red-600 rounded transition-colors ml-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Delete attachment"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </Popconfirm>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Attachments Section */}
                        <div onClick={(e) => e.stopPropagation()}>
                           <Button 
                             size="small" 
                             icon={<Paperclip className="w-3 h-3 text-emerald-600" />} 
                             className="text-xs"
                             onClick={(e) => {
                               e.stopPropagation();
                               setManagingAttachmentLesson(lesson);
                               setAttachmentManagerModalOpen(true);
                             }}
                           >
                             {lesson.attachments?.length ? `Attachments (${lesson.attachments.length})` : 'Add Attachment'}
                           </Button>
                        </div>
                        {lesson.content_type === 'VIDEO' && (
                            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                              {/* Upload MP4 Video with Standardized Naming */}
                              <Upload
                                showUploadList={false}
                                accept="video/*"
                                beforeUpload={(file) => {
                                  handleUploadLessonVideo(lesson.id, file);
                                  return false;
                                }}
                              >
                                <Button
                                  size="small"
                                  icon={<UploadCloud className="w-3 h-3 text-blue-600" />}
                                  loading={uploadingLessonVideoId === lesson.id}
                                  className="text-xs"
                                >
                                  {uploadingLessonVideoId === lesson.id && uploadProgress !== null 
                                    ? `Uploading... ${uploadProgress}%`
                                    : (lesson.video_url ? 'Replace Video' : 'Upload Video')}
                                </Button>
                              </Upload>

                              {/* In-Video Question Timeline Checkpoint */}
                              <Button
                                size="small"
                                icon={<Clock className="w-3 h-3 text-purple-600" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveLessonId(lesson.id);
                                  setQuestionModalOpen(true);
                                }}
                                className="text-xs"
                              >
                                In-Video Question
                              </Button>
                            </div>
                        )}
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                          <Button size="small" type="text" icon={<Pencil className="w-3.5 h-3.5 text-blue-500" />} onClick={(e) => { e.stopPropagation(); setEditingLesson(lesson); editLessonForm.setFieldsValue(lesson); setEditLessonModalOpen(true); }} />
                          <Popconfirm title="Delete Lesson" description="Are you sure you want to delete this lesson?" onConfirm={() => deleteLessonMutation.mutate(lesson.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                            <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} />
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
        </div>

        
        {/* Universal Preview Studio Right Column */}
        <div className="lg:col-span-1">
          <Card 
            title={<span className="text-sm font-semibold text-gray-800">Universal Preview Studio</span>} 
            className="!rounded-xl sticky top-6 border-[#e5e5e5]"
            bodyStyle={{ padding: '16px' }}
          >
            {!previewSelection ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-xs border border-dashed border-gray-200">
                Select a module or lesson from the curriculum list to preview its contents.
              </div>
            ) : previewSelection.type === 'MODULE' ? (
              <div className="space-y-4">
                <div className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
                  {previewSelection.data.title}
                </div>
                <div className="text-xs text-gray-600">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-semibold text-indigo-700 text-lg">{previewSelection.data.lessons?.length || 0}</div>
                      <div className="text-gray-500">Total Lessons</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-semibold text-emerald-700 text-lg">
                        {Math.floor((previewSelection.data.lessons?.reduce((acc: any, l: any) => acc + (l.video_duration_seconds || 0), 0) || 0) / 60)}
                      </div>
                      <div className="text-gray-500">Video Minutes</div>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-2 mb-1 text-purple-800 font-semibold text-xs">
                    <HelpCircle className="w-3.5 h-3.5" /> Module Quiz Status
                  </div>
                  <div className="text-xs text-purple-600">
                    {previewSelection.data.lessons?.filter((l: any) => l.content_type === 'QUIZ')?.length > 0 
                      ? 'Quiz active (3 Questions • 1 Try)'
                      : 'No quiz assigned to this module.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100 flex items-center justify-between">
                  <span>{previewSelection.data.title}</span>
                  <span className="text-gray-500 font-normal">{previewSelection.data.content_type}</span>
                </div>
                
                {previewSelection.data.content_type === 'VIDEO' && (
                  <div>
                    {previewSelection.data.video_url ? (
                      <video 
                        key={previewSelection.data.id}
                        controls 
                        className="w-full rounded-lg bg-black aspect-video object-contain mb-4"
                        src={previewSelection.data.video_url}
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-xs border border-dashed border-gray-300 mb-4">
                        No video uploaded for this lesson yet.
                      </div>
                    )}
                  </div>
                )}

                {previewSelection.data.content_type === 'ARTICLE' && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4 max-h-[300px] overflow-y-auto text-xs text-gray-700">
                    {previewSelection.data.article_content || 'No article content provided.'}
                  </div>
                )}

                {previewSelection.data.content_type === 'QUIZ' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                      <div className="font-semibold text-xs text-purple-700 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Interactive Quiz Preview
                      </div>
                      <Button size="small" type="primary" onClick={() => {
                        setManagingQuizContext(previewSelection.data);
                        setQuizQuestionsModalOpen(true);
                      }}>
                        Manage Questions
                      </Button>
                    </div>
                    <div className="text-[11px] text-gray-500 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                      Click 'Manage Questions' to view, add, or edit the questions for this assessment.
                    </div>
                  </div>
                )}
                
                {/* Dedicated Lesson Attachments & Resources Section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                      Lesson Attachments & Resources
                    </span>
                    <Button 
                      type="dashed" 
                      size="small" 
                      icon={<Plus className="w-3 h-3" />}
                      className="text-[11px] font-medium"
                      onClick={() => {
                        setManagingAttachmentLesson(previewSelection.data);
                        setAttachmentManagerModalOpen(true);
                      }}
                    >
                      Upload
                    </Button>
                  </div>
                  
                  {!previewSelection.data.attachments || previewSelection.data.attachments.length === 0 ? (
                    <div className="text-[11px] text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-gray-100">
                      No resources attached.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {previewSelection.data.attachments.map((att: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-200 transition-colors group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <a 
                              href={att.url || att.file_url || '#'} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[11px] font-medium text-gray-700 hover:text-indigo-600 truncate max-w-[150px]"
                            >
                              {att.name || att.file_name || `Attachment ${idx + 1}`}
                            </a>
                          </div>
                          <a 
                            href={att.url || att.file_url || '#'} 
                            target="_blank" 
                            rel="noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-indigo-600"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Add Section Modal */}
      <Modal
        title="Add Curriculum Section"
        open={sectionModalOpen}
        onCancel={() => setSectionModalOpen(false)}
        onOk={() => sectionForm.validateFields().then((v) => addSectionMutation.mutate(v))}
        confirmLoading={addSectionMutation.isPending}
      >
        <Form form={sectionForm} layout="vertical">
          <Form.Item name="title" label="Section Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Module 1: Foundational Core" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal
        title="Add Lesson to Module"
        open={lessonModalOpen}
        onCancel={() => {
          setLessonModalOpen(false);
          setSelectedLessonFile(null);
          setSelectedAttachmentFile(null);
          setVideoSourceType('upload');
          setLessonContentType('VIDEO');
          lessonForm.resetFields();
        }}
        onOk={() => lessonForm.validateFields().then((v) => addLessonMutation.mutate(v))}
        confirmLoading={addLessonMutation.isPending}
        okText={
          addLessonMutation.isPending && uploadProgress !== null
            ? `Uploading to S3... ${uploadProgress}%`
            : selectedLessonFile || selectedAttachmentFile
            ? 'Create & Upload to S3'
            : 'Add Lesson'
        }
        width={560}
      >
        <Form
          form={lessonForm}
          layout="vertical"
          initialValues={{
            contentType: 'VIDEO',
            videoDurationSeconds: 600,
          }}
          onValuesChange={(changed) => {
            if (changed.contentType) {
              setLessonContentType(changed.contentType);
            }
          }}
        >
          <Form.Item
            name="title"
            label="Lesson Title"
            rules={[{ required: true, message: 'Please enter lesson title' }]}
          >
            <Input placeholder="e.g. Architecture Overview & Environment Setup" />
          </Form.Item>

          <Form.Item name="contentType" label="Content Type">
            <Select>
              <Select.Option value="VIDEO">Video Lecture (MP4 / WebM)</Select.Option>
              <Select.Option value="ARTICLE">Article / Text Note</Select.Option>
              <Select.Option value="QUIZ">Quiz / Assessment</Select.Option>
              <Select.Option value="REFERENCE">Reference Materials & Cheatsheets</Select.Option>
              <Select.Option value="WELCOME">Welcome & Orientation</Select.Option>
            </Select>
          </Form.Item>

          {lessonContentType === 'VIDEO' && (
            <div className="mb-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Video Source</span>
                <Radio.Group
                  value={videoSourceType}
                  onChange={(e) => setVideoSourceType(e.target.value)}
                  size="small"
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="upload">Upload Local Video (S3)</Radio.Button>
                  <Radio.Button value="url">External Video URL</Radio.Button>
                </Radio.Group>
              </div>

              {videoSourceType === 'upload' ? (
                <div>
                  <Upload.Dragger
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
                        message.error('Please select a valid video file (MP4, WebM, MOV)');
                        return false;
                      }
                      setSelectedLessonFile(file);
                      if (!lessonForm.getFieldValue('title')) {
                        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                        lessonForm.setFieldValue('title', cleanTitle);
                      }
                      return false;
                    }}
                    className="!p-4 !bg-white !rounded-lg border-dashed border-2 border-indigo-200 hover:border-indigo-400 cursor-pointer"
                  >
                    {selectedLessonFile ? (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2.5 overflow-hidden text-left">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-semibold text-gray-900 truncate">
                              {selectedLessonFile.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {(selectedLessonFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to upload to AWS S3
                            </div>
                          </div>
                        </div>
                        <Button
                          size="small"
                          type="text"
                          danger
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLessonFile(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="py-2 text-center">
                        <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-1.5" />
                        <div className="text-xs font-semibold text-gray-800">
                          Click or drag video file here to upload directly to S3
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Supported formats: MP4, WebM, MOV (up to 500MB)
                        </div>
                      </div>
                    )}
                  </Upload.Dragger>
                </div>
              ) : (
                <Form.Item
                  name="videoUrl"
                  label="Direct Video Stream / Embed URL"
                  rules={[{ required: true, message: 'Please enter the video URL' }]}
                  className="!mb-0"
                >
                  <Input placeholder="https://cdn.example.com/video.mp4 or YouTube / Vimeo" />
                </Form.Item>
              )}
            </div>
          )}

          {lessonContentType === 'ARTICLE' && (
            <Form.Item
              name="articleContent"
              label="Article / Reading Content"
              rules={[{ required: true, message: 'Please enter article content' }]}
            >
              <Input.TextArea rows={4} placeholder="Type notes or reading instructions for students..." />
            </Form.Item>
          )}

          {lessonContentType !== 'VIDEO' && (
            <div className="mb-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                <span>Downloadable Reference Material / Document (Optional)</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Attach reference files, notes, cheatsheets, or exercise files for this lesson (PDF, DOCX, ZIP, TXT, etc.). Uploads directly to S3!
              </p>
              <Upload
                accept=".pdf,.docx,.zip,.txt,.js,.py,.html,.css,.md,.csv,.xlsx,.json"
                showUploadList={false}
                beforeUpload={(file) => {
                  setSelectedAttachmentFile(file);
                  return false;
                }}
              >
                {selectedAttachmentFile ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-emerald-800 truncate">{selectedAttachmentFile.name}</span>
                      <span className="text-gray-500">({(selectedAttachmentFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAttachmentFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button size="small" icon={<UploadCloud className="w-3.5 h-3.5 text-indigo-500" />}>
                    Select File to Attach (.pdf, .docx, .zip, etc.)
                  </Button>
                )}
              </Upload>
            </div>
          )}

          <Form.Item name="videoDurationSeconds" label="Estimated Duration (seconds)">
            <InputNumber min={10} max={10800} className="w-full" addonAfter="seconds (e.g. 600 = 10 mins)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add In-Video Interactive Question Modal */}
      <Modal
        title="Place Question on Video Timeline"
        open={questionModalOpen}
        onCancel={() => setQuestionModalOpen(false)}
        onOk={() => questionForm.validateFields().then((v) => addQuestionMutation.mutate(v))}
        confirmLoading={addQuestionMutation.isPending}
        width={600}
      >
        <div className="text-xs text-gray-500 mb-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
          The video will automatically pause when the student reaches this exact timestamp. The student must answer correctly to verify comprehension!
        </div>
        <Form form={questionForm} layout="vertical">
          <Form.Item
            name="timestampSeconds"
            label="Pause Timestamp (in seconds)"
            rules={[{ required: true }]}
            initialValue={60}
            tooltip="e.g. 60 = 01:00 min, 300 = 05:00 min"
          >
            <InputNumber min={5} className="w-full" />
          </Form.Item>

          <Form.Item name="questionText" label="Question Text" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="What is the primary purpose of the hook discussed?" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="optionA" label="Option A" rules={[{ required: true }]}>
              <Input placeholder="Option A" />
            </Form.Item>
            <Form.Item name="optionB" label="Option B" rules={[{ required: true }]}>
              <Input placeholder="Option B" />
            </Form.Item>
            <Form.Item name="optionC" label="Option C">
              <Input placeholder="Option C" />
            </Form.Item>
            <Form.Item name="optionD" label="Option D">
              <Input placeholder="Option D" />
            </Form.Item>
          </div>

          <Form.Item name="correctAnswer" label="Correct Answer Text" rules={[{ required: true }]}>
            <Input placeholder="Enter the exact correct option text" />
          </Form.Item>

          <Form.Item name="explanation" label="Explanation (shown after answering)">
            <Input placeholder="Brief explanation of why this option is correct" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Attachment Manager Modal */}
      <Modal
        title={`Manage Lesson Attachments & Downloads - ${managingAttachmentLesson?.title || ''}`}
        open={attachmentManagerModalOpen}
        onCancel={() => {
          setAttachmentManagerModalOpen(false);
          setManagingAttachmentLesson(null);
        }}
        footer={null}
        width={700}
        destroyOnClose
      >
        <p className="text-xs text-gray-500 mb-4">
          Uploaded course files, cheatsheets, PDFs, and downloadable exercise materials.
        </p>

        <Upload.Dragger
          accept=".pdf,.docx,.zip,.txt,.js,.py,.html,.css,.md,.csv,.xlsx,.json"
          showUploadList={false}
          customRequest={async ({ file, onSuccess, onError, onProgress }) => {
            const formData = new FormData();
            formData.append('file', file as File);
            formData.append('attachment', file as File);
            try {
              await ApiClient.post(`/courses/UploadLessonAttachment/${managingAttachmentLesson.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                  if (e.total) {
                    onProgress?.({ percent: Math.round((e.loaded * 100) / e.total) });
                  }
                },
              });
              message.success('Attachment uploaded successfully!');
              queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
              // Update the local state for managingAttachmentLesson so modal updates without closing
              const res = await ApiClient.get(`/courses/GetCourseDetails/${courseId}`);
              const updatedCourse = res.data?.data;
              if (updatedCourse) {
                const updatedLesson = updatedCourse.sections
                  ?.flatMap((s: any) => s.lessons)
                  ?.find((l: any) => l.id === managingAttachmentLesson.id);
                if (updatedLesson) {
                  setManagingAttachmentLesson(updatedLesson);
                }
              }
              onSuccess?.("ok");
            } catch (err: any) {
              message.error('Failed to upload attachment.');
              onError?.(err);
            }
          }}
          className="mb-6 !bg-gray-50 hover:!bg-indigo-50 border-2 border-dashed border-gray-200 hover:border-indigo-300"
        >
          <div className="py-4">
            <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">Click or drag file to upload</p>
            <p className="text-xs text-gray-500 mt-1">Supports PDF, ZIP, code files, and documents</p>
          </div>
        </Upload.Dragger>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {!managingAttachmentLesson?.attachments || managingAttachmentLesson.attachments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">No attachments uploaded yet for this lesson. Upload PDFs, ZIPs, or notes above.</p>
            </div>
          ) : (
            managingAttachmentLesson.attachments.map((att: any, idx: number) => {
              const fileName = att.name || att.file_name || `Attachment ${idx + 1}`;
              const fileUrl = att.url || att.file_url || '#';
              const formatFileSize = (bytes?: number) => {
                if (!bytes) return 'Unknown size';
                return `${(bytes / 1024).toFixed(0)} KB`;
              };

              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{fileName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{formatFileSize(att.size || att.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(att.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      type="text" 
                      size="small" 
                      onClick={() => window.open(fileUrl, '_blank')}
                      className="text-indigo-600 font-medium text-xs"
                    >
                      Open / Download
                    </Button>
                    <Button 
                      type="text" 
                      size="small" 
                      onClick={() => {
                        navigator.clipboard.writeText(fileUrl);
                        message.success('Link copied!');
                      }}
                      className="text-gray-600 font-medium text-xs"
                    >
                      Copy Link
                    </Button>
                    <Popconfirm
                      title="Delete this attachment?"
                      onConfirm={async () => {
                        await handleDeleteLessonAttachment(managingAttachmentLesson.id, fileUrl);
                        // Refresh managing lesson
                        const res = await ApiClient.get(`/courses/GetCourseDetails/${courseId}`);
                        const updatedCourse = res.data?.data;
                        if (updatedCourse) {
                          const updatedLesson = updatedCourse.sections
                            ?.flatMap((s: any) => s.lessons)
                            ?.find((l: any) => l.id === managingAttachmentLesson.id);
                          setManagingAttachmentLesson(updatedLesson || null);
                        }
                      }}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" danger size="small" icon={<Trash2 className="w-4 h-4" />} />
                    </Popconfirm>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

            {/* Edit Module Modal */}
      <Modal
        title="Edit Module Title"
        open={editModuleModalOpen}
        onCancel={() => {
          setEditModuleModalOpen(false);
          setEditingModule(null);
        }}
        onOk={() => editModuleForm.validateFields().then((v) => updateSectionMutation.mutate(v))}
        confirmLoading={updateSectionMutation.isPending}
      >
        <Form form={editModuleForm} layout="vertical">
          <Form.Item name="title" label="Section Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Module 1: Foundational Core" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal
        title="Edit Lesson"
        open={editLessonModalOpen}
        onCancel={() => {
          setEditLessonModalOpen(false);
          setEditingLesson(null);
        }}
        onOk={() => editLessonForm.validateFields().then((v) => updateLessonMutation.mutate(v))}
        confirmLoading={updateLessonMutation.isPending}
      >
        <Form form={editLessonForm} layout="vertical">
          <Form.Item name="title" label="Lesson Title" rules={[{ required: true }]}>
            <Input placeholder="Lesson Title" />
          </Form.Item>
          {editingLesson?.content_type === 'ARTICLE' && (
            <Form.Item name="articleContent" label="Article Content" rules={[{ required: true }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
          )}
          <Form.Item name="videoDurationSeconds" label="Estimated Duration (seconds)">
            <InputNumber min={10} max={10800} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quiz Questions Modal */}
      <Modal
        title={
          <div className="flex flex-col">
            <span>Manage Quiz Questions</span>
            <span className="text-xs text-gray-500 font-normal mt-0.5">
              {managingQuizContext?.title?.toLowerCase().includes('final') 
                ? 'Final Course Exam (10-12 Questions • 80% Cut-off • Unlimited Tries)' 
                : 'Module Quiz (3 Questions • 1 Try Only)'}
            </span>
          </div>
        }
        open={quizQuestionsModalOpen}
        onCancel={() => {
          setQuizQuestionsModalOpen(false);
          setManagingQuizContext(null);
        }}
        footer={null}
        width={700}
      >
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-sm mb-3">Add New Question</h4>
          <Form form={quizQuestionForm} layout="vertical" onFinish={(values) => addQuizQuestionMutation.mutate(values)}>
            <Form.Item name="questionText" label="Question" rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="optionA" label="Option A" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="optionB" label="Option B" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="optionC" label="Option C"><Input /></Form.Item>
              <Form.Item name="optionD" label="Option D"><Input /></Form.Item>
            </div>
            <Form.Item name="correctAnswer" label="Correct Answer (Exact Match)" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="explanation" label="Explanation">
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={addQuizQuestionMutation.isPending}>
              Add Question
            </Button>
          </Form>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Existing Questions</h4>
          {!managingQuizContext?.questions || managingQuizContext.questions.length === 0 ? (
            <div className="text-gray-500 text-xs text-center py-4 border border-dashed rounded bg-gray-50">
              No questions added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {managingQuizContext.questions.map((q: any, i: number) => (
                <div key={q.id || i} className="p-3 border border-gray-200 rounded-lg relative group">
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="small" type="text" icon={<Pencil className="w-3.5 h-3.5 text-blue-500" />} />
                    <Popconfirm title="Delete question?" onConfirm={() => deleteQuizQuestionMutation.mutate(q.id)} okButtonProps={{ danger: true }}>
                      <Button size="small" type="text" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
                    </Popconfirm>
                  </div>
                  <div className="font-medium text-sm mb-2 pr-16">{i + 1}. {q.question_text || q.questionText}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    {(q.options || []).map((opt: string, j: number) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <span className="font-semibold bg-gray-100 w-5 h-5 flex items-center justify-center rounded">
                          {String.fromCharCode(65 + j)}
                        </span>
                        {opt}
                        {opt === (q.correct_answer || q.correctAnswer) && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    ))}
                  </div>
                  {(q.explanation) && (
                    <div className="text-[11px] text-gray-500 bg-emerald-50 p-2 rounded border border-emerald-100 mt-2">
                      <span className="font-semibold">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Course Meta Modal */}
      <CourseCreateEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        mode="edit"
        initialData={course}
      />
    </div>
  );
};
