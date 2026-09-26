import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  message,
  Tooltip,
  Space,
  Radio,
} from 'antd';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  BarChart3,
  ShieldCheck,
  FolderTree,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  taxonomyApi,
  ICourseCategory,
  ICourseDifficultyLevel,
} from '../../services/api/taxonomyApi';

const PRESET_BADGE_COLORS = [
  { label: 'Blue', value: 'blue', hex: '#1677ff' },
  { label: 'Green', value: 'green', hex: '#52c41a' },
  { label: 'Orange', value: 'orange', hex: '#fa8c16' },
  { label: 'Purple', value: 'purple', hex: '#722ed1' },
  { label: 'Red', value: 'red', hex: '#f5222d' },
  { label: 'Cyan', value: 'cyan', hex: '#13c2c2' },
  { label: 'Magenta', value: 'magenta', hex: '#eb2f96' },
  { label: 'Gold', value: 'gold', hex: '#faad14' },
];

export const CourseTaxonomiesManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'levels'>('categories');

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICourseCategory | null>(null);
  const [categoryForm] = Form.useForm();

  // Level Modal State
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ICourseDifficultyLevel | null>(null);
  const [levelForm] = Form.useForm();

  // Queries
  const {
    data: categories = [],
    isLoading: loadingCategories,
  } = useQuery({
    queryKey: ['taxonomy-categories'],
    queryFn: () => taxonomyApi.getCategories(),
  });

  const {
    data: difficultyLevels = [],
    isLoading: loadingLevels,
  } = useQuery({
    queryKey: ['taxonomy-difficulty-levels'],
    queryFn: () => taxonomyApi.getDifficultyLevels(),
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => taxonomyApi.createCategory(data),
    onSuccess: () => {
      message.success('New category added successfully.');
      queryClient.invalidateQueries({ queryKey: ['taxonomy-categories'] });
      setCategoryModalOpen(false);
      categoryForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to create category.');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      taxonomyApi.updateCategory(id, data),
    onSuccess: () => {
      message.success('Category updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['taxonomy-categories'] });
      setCategoryModalOpen(false);
      setEditingCategory(null);
      categoryForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update category.');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => taxonomyApi.deleteCategory(id),
    onSuccess: () => {
      message.success('Category deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['taxonomy-categories'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to delete category.');
    },
  });

  // Difficulty Level Mutations
  const createLevelMutation = useMutation({
    mutationFn: (data: any) => taxonomyApi.createDifficultyLevel(data),
    onSuccess: () => {
      message.success('New difficulty level added successfully.');
      queryClient.invalidateQueries({ queryKey: ['taxonomy-difficulty-levels'] });
      setLevelModalOpen(false);
      levelForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to create difficulty level.');
    },
  });

  const updateLevelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      taxonomyApi.updateDifficultyLevel(id, data),
    onSuccess: () => {
      message.success('Difficulty level updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['taxonomy-difficulty-levels'] });
      setLevelModalOpen(false);
      setEditingLevel(null);
      levelForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update difficulty level.');
    },
  });

  const deleteLevelMutation = useMutation({
    mutationFn: (id: string) => taxonomyApi.deleteDifficultyLevel(id),
    onSuccess: () => {
      message.success('Difficulty level deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['taxonomy-difficulty-levels'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to delete difficulty level.');
    },
  });

  // Category Handlers
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({ displayOrder: (categories.length + 1) * 10, icon: 'book' });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: ICourseCategory) => {
    setEditingCategory(cat);
    categoryForm.setFieldsValue({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon || 'book',
      displayOrder: cat.display_order,
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    categoryForm.validateFields().then((vals) => {
      if (editingCategory) {
        updateCategoryMutation.mutate({ id: editingCategory.id, data: vals });
      } else {
        createCategoryMutation.mutate(vals);
      }
    });
  };

  // Level Handlers
  const handleOpenCreateLevel = () => {
    setEditingLevel(null);
    levelForm.resetFields();
    levelForm.setFieldsValue({
      badgeColor: 'blue',
      displayOrder: (difficultyLevels.length + 1) * 10,
    });
    setLevelModalOpen(true);
  };

  const handleOpenEditLevel = (lvl: ICourseDifficultyLevel) => {
    setEditingLevel(lvl);
    levelForm.setFieldsValue({
      name: lvl.name,
      code: lvl.code,
      description: lvl.description,
      badgeColor: lvl.badge_color || 'blue',
      displayOrder: lvl.display_order,
    });
    setLevelModalOpen(true);
  };

  const handleSaveLevel = () => {
    levelForm.validateFields().then((vals) => {
      if (editingLevel) {
        updateLevelMutation.mutate({ id: editingLevel.id, data: vals });
      } else {
        createLevelMutation.mutate(vals);
      }
    });
  };

  // Table Columns
  const categoryColumns = [
    {
      title: 'Display Order',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 120,
      render: (order: number) => (
        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          #{order}
        </span>
      ),
    },
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ICourseCategory) => (
        <div>
          <div className="font-semibold text-gray-900">{text}</div>
          {record.description && (
            <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'URL Slug',
      dataIndex: 'slug',
      key: 'slug',
      width: 180,
      render: (slug: string) => (
        <code className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
          {slug}
        </code>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'is_system',
      key: 'is_system',
      width: 150,
      render: (isSystem: boolean) =>
        isSystem ? (
          <Tag color="purple" className="flex items-center gap-1 w-fit">
            <ShieldCheck className="w-3 h-3" /> Platform Default
          </Tag>
        ) : (
          <Tag color="green" className="flex items-center gap-1 w-fit">
            <Sparkles className="w-3 h-3" /> Custom Academy
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: ICourseCategory) => (
        <Space size="small">
          <Tooltip title={record.is_system ? 'Edit category details' : 'Edit custom category'}>
            <Button
              type="text"
              size="small"
              icon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => handleOpenEditCategory(record)}
            />
          </Tooltip>

          {record.is_system ? (
            <Tooltip title="System standard categories cannot be deleted">
              <Button
                type="text"
                size="small"
                disabled
                icon={<Trash2 className="w-3.5 h-3.5 text-gray-300" />}
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title="Delete Category"
              description={`Are you sure you want to delete "${record.name}"?`}
              onConfirm={() => deleteCategoryMutation.mutate(record.id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete custom category">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const levelColumns = [
    {
      title: 'Display Order',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 120,
      render: (order: number) => (
        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          #{order}
        </span>
      ),
    },
    {
      title: 'Difficulty Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ICourseDifficultyLevel) => (
        <div className="flex items-center gap-2">
          <Tag color={record.badge_color || 'blue'} className="font-medium text-xs px-2 py-0.5">
            {text}
          </Tag>
          {record.description && (
            <span className="text-xs text-gray-500">({record.description})</span>
          )}
        </div>
      ),
    },
    {
      title: 'System Code',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (code: string) => (
        <code className="text-xs font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
          {code}
        </code>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'is_system',
      key: 'is_system',
      width: 150,
      render: (isSystem: boolean) =>
        isSystem ? (
          <Tag color="purple" className="flex items-center gap-1 w-fit">
            <ShieldCheck className="w-3 h-3" /> Platform Default
          </Tag>
        ) : (
          <Tag color="green" className="flex items-center gap-1 w-fit">
            <Sparkles className="w-3 h-3" /> Custom Academy
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: ICourseDifficultyLevel) => (
        <Space size="small">
          <Tooltip title={record.is_system ? 'Edit level details' : 'Edit custom level'}>
            <Button
              type="text"
              size="small"
              icon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => handleOpenEditLevel(record)}
            />
          </Tooltip>

          {record.is_system ? (
            <Tooltip title="System standard difficulty levels cannot be deleted">
              <Button
                type="text"
                size="small"
                disabled
                icon={<Trash2 className="w-3.5 h-3.5 text-gray-300" />}
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title="Delete Difficulty Level"
              description={`Are you sure you want to delete "${record.name}"?`}
              onConfirm={() => deleteLevelMutation.mutate(record.id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete custom difficulty level">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-slate-900 text-sm mb-1">
            Dynamic Database-Driven Course Taxonomies
          </div>
          <div>
            All course dropdowns (Categories and Difficulty Levels) are 100% database-driven without hardcoded values.
            Your academy inherits platform standard defaults and can create custom categories and levels tailored to your curriculum.
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Radio.Group
            value={activeSubTab}
            onChange={(e) => setActiveSubTab(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="categories">
              <span className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" />
                <span>Categories</span>
                <span className="ml-1 px-1.5 py-0.2 text-[11px] bg-gray-100 rounded-full text-gray-600 font-semibold">
                  {categories.length}
                </span>
              </span>
            </Radio.Button>
            <Radio.Button value="levels">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Difficulty Levels</span>
                <span className="ml-1 px-1.5 py-0.2 text-[11px] bg-gray-100 rounded-full text-gray-600 font-semibold">
                  {difficultyLevels.length}
                </span>
              </span>
            </Radio.Button>
          </Radio.Group>
        </div>

        {activeSubTab === 'categories' ? (
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateCategory}
          >
            Add Custom Category
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateLevel}
          >
            Add Custom Difficulty Level
          </Button>
        )}
      </div>

      {/* Categories View */}
      {activeSubTab === 'categories' && (
        <Card className="!rounded-xl border border-[#e5e5e5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Course Categories</h3>
              <p className="text-xs text-gray-500">
                Categories organize your catalog and filter courses on your public academy storefront.
              </p>
            </div>
          </div>

          <Table
            dataSource={categories}
            columns={categoryColumns}
            rowKey="id"
            loading={loadingCategories}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      )}

      {/* Difficulty Levels View */}
      {activeSubTab === 'levels' && (
        <Card className="!rounded-xl border border-[#e5e5e5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Difficulty Levels</h3>
              <p className="text-xs text-gray-500">
                Levels designate learner prerequisite readiness and display on course overview cards.
              </p>
            </div>
          </div>

          <Table
            dataSource={difficultyLevels}
            columns={levelColumns}
            rowKey="id"
            loading={loadingLevels}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      )}

      {/* Category Modal */}
      <Modal
        open={categoryModalOpen}
        title={editingCategory ? 'Edit Course Category' : 'Create Custom Category'}
        onCancel={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onOk={handleSaveCategory}
        confirmLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g. Artificial Intelligence & Robotics" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="URL Slug (Optional)"
            tooltip="Auto-generated from name if left empty. Used for SEO and routing."
          >
            <Input placeholder="e.g. ai-and-robotics" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Briefly describe what courses belong here..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="icon" label="Icon Identifier">
              <Input placeholder="e.g. cpu, code, book, cloud" />
            </Form.Item>

            <Form.Item name="displayOrder" label="Display Order">
              <InputNumber min={1} max={999} className="w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Difficulty Level Modal */}
      <Modal
        open={levelModalOpen}
        title={editingLevel ? 'Edit Difficulty Level' : 'Create Custom Difficulty Level'}
        onCancel={() => {
          setLevelModalOpen(false);
          setEditingLevel(null);
        }}
        onOk={handleSaveLevel}
        confirmLoading={createLevelMutation.isPending || updateLevelMutation.isPending}
        destroyOnClose
      >
        <Form form={levelForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Level Name"
            rules={[{ required: true, message: 'Please enter level name' }]}
          >
            <Input placeholder="e.g. Professional / Masterclass" />
          </Form.Item>

          <Form.Item
            name="code"
            label="System Code"
            tooltip="Machine-readable code identifier (e.g. MASTERCLASS, ADVANCED)"
            rules={[{ required: true, message: 'Please enter system code' }]}
          >
            <Input placeholder="e.g. MASTERCLASS" />
          </Form.Item>

          <Form.Item
            name="badgeColor"
            label="Badge Color Theme"
            rules={[{ required: true, message: 'Select badge color' }]}
          >
            <Select placeholder="Select a color badge">
              {PRESET_BADGE_COLORS.map((col) => (
                <Select.Option key={col.value} value={col.value}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full inline-block"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span>{col.label}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={2} placeholder="Prerequisites and student readiness..." />
          </Form.Item>

          <Form.Item name="displayOrder" label="Display Order">
            <InputNumber min={1} max={999} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
