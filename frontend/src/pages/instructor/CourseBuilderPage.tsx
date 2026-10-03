import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Modal, Form, Input, Select, InputNumber, message, Tag, Upload, Tooltip, Radio, Popconfirm } from 'antd';
import { Plus, Video, FileText, HelpCircle, Check, ArrowLeft, UploadCloud, Clock, Image as ImageIcon, CheckCircle, Sparkles, Trash2, Paperclip, Download } from 'lucide-react';
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
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [sectionForm] = Form.useForm();
  const [lessonForm] = Form.useForm();
  const [questionForm] = Form.useForm();

  // Local file & video source state for Add Lesson Modal
  const [selectedLessonFile, setSelectedLessonFile] = useState<File | null>(null);
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload');
  const [lessonContentType, setLessonContentType] = useState<'VIDEO' | 'ARTICLE'>('VIDEO');

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
    if (course?.sections && !previewLesson) {
      for (const section of course.sections) {
        if (section.lessons?.length > 0) {
          setPreviewLesson(section.lessons[0]);
          break;
        }
      }
    }
  }, [course, previewLesson]);

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

      return createdLesson;
    },
    onSuccess: () => {
      message.success(selectedLessonFile ? 'Lesson created and video uploaded to S3!' : 'Lesson added.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setLessonModalOpen(false);
      lessonForm.resetFields();
      setSelectedLessonFile(null);
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
      setPreviewLesson(null);
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
              <Popconfirm title="Generate Coursera-Style Course Flow?" description="This will generate a structured 4-module pedagogical framework: 1. Welcome & Orientation, 2. Core Concepts, 3. Reference Materials & Downloads, 4. Conclusion & Feedback." onConfirm={() => scaffoldMutation.mutate()}>
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
              title={<span className="font-semibold text-sm">{section.title}</span>}
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
                      className={`p-3 bg-gray-50 rounded-lg flex items-center justify-between border transition-colors cursor-pointer ${previewLesson?.id === lesson.id ? 'border-indigo-400 bg-indigo-50/30 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                      onClick={() => setPreviewLesson(lesson)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-white flex items-center justify-center text-gray-600 shadow-2xs">
                          {lesson.content_type === 'VIDEO' ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
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
                            {lesson.content_type} • {lesson.video_duration_seconds ? `${Math.floor(lesson.video_duration_seconds / 60)} mins` : 'Article'}
                          </div>
                          {lesson.attachments && lesson.attachments.length > 0 && (
                            <div className="mt-1 flex flex-col gap-1">
                              {lesson.attachments.map((att: any) => (
                                <div key={att.id} className="text-[10px] flex items-center gap-1 text-gray-600 bg-gray-100 p-1 rounded w-max">
                                  <Paperclip className="w-3 h-3" />
                                  <a href={att.file_url} target="_blank" rel="noreferrer" className="hover:underline">{att.file_name}</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Attachments Section */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Upload
                            showUploadList={false}
                            accept=".pdf,.docx,.zip,.txt,.js,.py,.html,.css"
                            beforeUpload={async (file) => {
                              const formData = new FormData();
                              formData.append('attachment', file);
                              try {
                                await ApiClient.post(`/courses/UploadLessonAttachment/${lesson.id}`, formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                message.success('Attachment uploaded successfully!');
                                queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
                              } catch (err) {
                                message.error('Failed to upload attachment.');
                              }
                              return false;
                            }}
                          >
                            <Button size="small" icon={<Paperclip className="w-3 h-3 text-emerald-600" />} className="text-xs">
                              Add Attachment
                            </Button>
                          </Upload>
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
                        <div onClick={(e) => e.stopPropagation()}>
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

        {/* Video Preview Right Column */}
        <div className="lg:col-span-1">
          <Card 
            title={<span className="text-sm font-semibold text-gray-800">Video Preview</span>} 
            className="!rounded-xl sticky top-6 border-[#e5e5e5]"
            bodyStyle={{ padding: '16px' }}
          >
            {previewLesson ? (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                  {previewLesson.title}
                </div>
                {previewLesson.video_url ? (
                  <video 
                    key={previewLesson.id}
                    controls 
                    className="w-full rounded-lg bg-black aspect-video object-contain"
                    src={previewLesson.video_url}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-xs border border-dashed border-gray-300">
                    No video uploaded for this lesson yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-xs border border-dashed border-gray-200">
                Click a lesson from the curriculum list to preview its video here.
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
          setVideoSourceType('upload');
          setLessonContentType('VIDEO');
          lessonForm.resetFields();
        }}
        onOk={() => lessonForm.validateFields().then((v) => addLessonMutation.mutate(v))}
        confirmLoading={addLessonMutation.isPending}
        okText={
          addLessonMutation.isPending && uploadProgress !== null
            ? `Uploading to S3... ${uploadProgress}%`
            : selectedLessonFile
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
