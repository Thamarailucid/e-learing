import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, message, Tag, Alert } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Award, CheckCircle2, Video, FileCheck, Layers, Lock, Shield } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { taxonomyApi } from '../../services/api/taxonomyApi';

interface CourseCreateEditModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  onClose: () => void;
}

export const CourseCreateEditModal: React.FC<CourseCreateEditModalProps> = ({
  open,
  mode,
  initialData,
  onClose,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Dynamic Categories from DB
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['taxonomy-categories'],
    queryFn: () => taxonomyApi.getCategories(),
    enabled: open,
  });

  // Dynamic Difficulty Levels from DB
  const { data: difficultyLevels = [], isLoading: loadingLevels } = useQuery({
    queryKey: ['taxonomy-difficulty-levels'],
    queryFn: () => taxonomyApi.getDifficultyLevels(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        form.setFieldsValue({
          ...initialData,
          isPrivate: Boolean(initialData.is_private ?? initialData.isPrivate ?? false),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          level: difficultyLevels[0]?.code || 'BEGINNER',
          category: categories[0]?.name || 'Software Engineering',
          isPrivate: false,
          minVideoWatchPercentage: 80,
          passQuizPercentage: 70,
        });
      }
    }
  }, [open, mode, initialData, form, categories, difficultyLevels]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (mode === 'create') {
        return ApiClient.post('/courses/CreateCourse', values);
      } else {
        return ApiClient.put(`/courses/UpdateCourse/${initialData.id}`, values);
      }
    },
    onSuccess: () => {
      message.success(`Course ${mode === 'create' ? 'created' : 'updated'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['course-list'] });
      onClose();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to save course.');
    },
  });

  const handleOk = () => {
    form.validateFields().then((values) => {
      saveMutation.mutate(values);
    });
  };

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span>{mode === 'create' ? 'Create New Course' : 'Edit Course Information'}</span>
        </div>
      }
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={saveMutation.isPending}
      width={840}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN: Course Identity & Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-2 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Course Identity & Syllabus</span>
            </div>

            <Form.Item
              name="title"
              label="Course Title"
              rules={[{ required: true, message: 'Please enter course title' }]}
            >
              <Input placeholder="e.g. Full-Stack Node.js & React Mastery" />
            </Form.Item>

            <Form.Item name="shortDescription" label="Short Summary">
              <Input placeholder="Brief 1-2 sentence overview for the course catalog" />
            </Form.Item>

            <Form.Item name="description" label="Full Course Description">
              <Input.TextArea rows={4} placeholder="Comprehensive syllabus, target audience, learning outcomes and prerequisites..." />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="level"
                label="Difficulty Level (DB-Driven)"
                rules={[{ required: true, message: 'Select difficulty level' }]}
              >
                <Select loading={loadingLevels} placeholder="Select difficulty level">
                  {difficultyLevels.map((lvl) => (
                    <Select.Option key={lvl.id} value={lvl.code}>
                      <div className="flex items-center justify-between">
                        <span>{lvl.name}</span>
                        <Tag color={lvl.badge_color || 'blue'} className="text-[10px] leading-tight m-0">
                          {lvl.code}
                        </Tag>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="category"
                label="Category (DB-Driven)"
                rules={[{ required: true, message: 'Select category' }]}
              >
                <Select loading={loadingCategories} placeholder="Select category">
                  {categories.map((cat) => (
                    <Select.Option key={cat.id} value={cat.name}>
                      <span>{cat.name}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* RIGHT COLUMN: Completion, Certification & Assessment Criteria */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wide">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Certification & Assessment</span>
              </div>
              <Tag color="purple" className="m-0 text-xs font-semibold">
                LMS Rules
              </Tag>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-950">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>Private Proprietary Course</span>
                </div>
                <Form.Item name="isPrivate" valuePropName="checked" noStyle>
                  <Switch checkedChildren="Private" unCheckedChildren="Public" />
                </Form.Item>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed m-0">
                When switched on, this course is hidden from public catalogs. It can only be accessed via shared college outreach links or direct organization enrollment, with anti-piracy screen shielding active.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                <Video className="w-4 h-4 text-blue-600" />
                <span>Minimum Video Watch Requirement</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Prevents skipping: students must watch at least this percentage of lecture duration before a lesson is marked completed.
              </p>
              <Form.Item
                name="minVideoWatchPercentage"
                noStyle
              >
                <InputNumber min={50} max={100} addonAfter="%" className="w-full mt-1" />
              </Form.Item>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Quiz Passing Score Requirement</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Required minimum percentage score on lesson and module assessments to unlock subsequent units and certificates.
              </p>
              <Form.Item
                name="passQuizPercentage"
                noStyle
              >
                <InputNumber min={50} max={100} addonAfter="%" className="w-full mt-1" />
              </Form.Item>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Automated Certificate Issuance:</span> When both the watch threshold and quiz scores are met, a unique cryptographic certificate with QR verification is auto-generated.
              </div>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};
