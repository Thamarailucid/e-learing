import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Modal, Form, Input, Select, InputNumber, message, Tag, Upload, Tooltip } from 'antd';
import { Plus, Video, FileText, HelpCircle, Check, ArrowLeft, UploadCloud, Clock, Image as ImageIcon, CheckCircle } from 'lucide-react';
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
      return ApiClient.post('/courses/CreateLesson', {
        courseId,
        sectionId: activeSectionId,
        title: values.title,
        contentType: values.contentType || 'VIDEO',
        videoUrl: values.videoUrl || '',
        videoDurationSeconds: values.videoDurationSeconds || 600,
        articleContent: values.articleContent,
      });
    },
    onSuccess: () => {
      message.success('Lesson added.');
      queryClient.invalidateQueries({ queryKey: ['course-details', courseId] });
      setLessonModalOpen(false);
      lessonForm.resetFields();
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
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setSectionModalOpen(true)}
          >
            Add Module Section
          </Button>
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
                            {lesson.video_url && (
                              <Tag color="success" className="!text-[10px] !px-1.5 !py-0 !leading-4 rounded">
                                Ready
                              </Tag>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {lesson.content_type} • {lesson.video_duration_seconds ? `${Math.floor(lesson.video_duration_seconds / 60)} mins` : 'Article'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {lesson.content_type === 'VIDEO' && (
                            <div onClick={(e) => e.stopPropagation()}>
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
                                className="text-xs ml-2"
                              >
                                In-Video Question
                              </Button>
                            </div>
                        )}
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
        title="Add Lesson"
        open={lessonModalOpen}
        onCancel={() => setLessonModalOpen(false)}
        onOk={() => lessonForm.validateFields().then((v) => addLessonMutation.mutate(v))}
        confirmLoading={addLessonMutation.isPending}
      >
        <Form form={lessonForm} layout="vertical">
          <Form.Item name="title" label="Lesson Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Architecture Overview" />
          </Form.Item>
          <Form.Item name="contentType" label="Content Type" initialValue="VIDEO">
            <Select>
              <Select.Option value="VIDEO">Video Lecture</Select.Option>
              <Select.Option value="ARTICLE">Article / Text Note</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="videoUrl"
            label="Video URL (optional if uploading directly)"
            tooltip="You can enter an external URL or use the 'Upload Video' button directly on the lesson row"
          >
            <Input placeholder="https://... or upload MP4 file after creating lesson" />
          </Form.Item>
          <Form.Item name="videoDurationSeconds" label="Estimated Duration (seconds)" initialValue={600}>
            <InputNumber min={10} max={10800} className="w-full" />
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
