import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Divider, Upload } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Image, Trash2, Check, Sparkles, Upload as UploadIcon } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';
import { UserAvatar } from '../common/UserAvatar';

// 8 Handsome default avatar presets for instant 1-click selection
export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
];

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  // Fetch current user profile
  const { data: profileRes, isLoading } = useQuery({
    queryKey: ['authenticated-user-profile'],
    queryFn: async () => {
      const res = await ApiClient.get('/auth/GetAuthenticatedUserProfile');
      return res.data?.data;
    },
    enabled: open,
  });

  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const user = profileRes || session?.user;

  useEffect(() => {
    if (open && user) {
      const avatar = user.avatarUrl || user.avatar_url || null;
      setCurrentAvatarUrl(avatar);
      form.setFieldsValue({
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        phone: user.phone || '',
        avatarUrl: avatar || '',
      });
    }
  }, [open, user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await ApiClient.put('/auth/UpdateUserProfile', {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        avatarUrl: currentAvatarUrl,
      });
      return res.data?.data;
    },
    onSuccess: (updated) => {
      // Sync local storage session
      if (session) {
        session.user = {
          ...session.user,
          firstName: updated.first_name,
          lastName: updated.last_name,
          phone: updated.phone,
          avatarUrl: updated.avatar_url,
          avatar_url: updated.avatar_url,
        };
        SecureStorageService.SetEncryptedValue('session', session);
      }
      queryClient.invalidateQueries({ queryKey: ['authenticated-user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-list'] });
      message.success('Profile and avatar updated successfully.');
      onClose();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update profile.');
    },
  });

  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      const res = await ApiClient.delete('/auth/DeleteProfileAvatar');
      return res.data?.data;
    },
    onSuccess: (updated) => {
      setCurrentAvatarUrl(null);
      form.setFieldValue('avatarUrl', '');
      if (session) {
        session.user = {
          ...session.user,
          avatarUrl: null,
          avatar_url: null,
        };
        SecureStorageService.SetEncryptedValue('session', session);
      }
      queryClient.invalidateQueries({ queryKey: ['authenticated-user-profile'] });
      message.success('Profile avatar removed (using default initials).');
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to remove avatar.');
    },
  });

  const handleCustomUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCurrentAvatarUrl(dataUrl);
        form.setFieldValue('avatarUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    return false; // Prevent automatic HTTP post
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      updateProfileMutation.mutate(values);
    } catch {
      // validation error
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <User className="w-5 h-5 text-blue-600" />
          Edit Profile & Avatar Icon
        </div>
      }
      open={open}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose} className="!rounded-lg text-xs">
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSubmit}
          loading={updateProfileMutation.isPending}
          className="!rounded-lg text-xs"
        >
          Save Changes
        </Button>,
      ]}
    >
      <div className="space-y-5 pt-2">
        {/* Avatar Preview & Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <UserAvatar
            src={currentAvatarUrl}
            name={`${form.getFieldValue('firstName') || user?.firstName || ''} ${form.getFieldValue('lastName') || user?.lastName || ''}`}
            email={user?.email}
            size="xl"
            showTooltip={false}
          />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {form.getFieldValue('firstName') || user?.firstName}{' '}
                {form.getFieldValue('lastName') || user?.lastName}
              </h4>
              <p className="text-xs text-gray-500 font-mono">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <Upload
                beforeUpload={handleCustomUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button size="small" icon={<UploadIcon className="w-3.5 h-3.5" />} className="text-xs !rounded-lg">
                  Upload Photo
                </Button>
              </Upload>
              {currentAvatarUrl && (
                <Button
                  size="small"
                  danger
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => deleteAvatarMutation.mutate()}
                  loading={deleteAvatarMutation.isPending}
                  className="text-xs !rounded-lg"
                >
                  Remove Icon
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Presets Picker */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Choose Preset Avatar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {AVATAR_PRESETS.map((preset, idx) => {
              const isSelected = currentAvatarUrl === preset;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentAvatarUrl(preset);
                    form.setFieldValue('avatarUrl', preset);
                  }}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                    isSelected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-12 object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Divider className="my-2" />

        {/* Form fields */}
        <Form form={form} layout="vertical" className="space-y-1">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input placeholder="First Name" className="!rounded-lg h-9 text-xs" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input placeholder="Last Name" className="!rounded-lg h-9 text-xs" />
            </Form.Item>
          </div>

          <Form.Item name="phone" label="Phone Number">
            <Input placeholder="+91 98765 43210" className="!rounded-lg h-9 text-xs" />
          </Form.Item>

          <Form.Item name="avatarUrl" label="Custom Image URL (Optional)">
            <Input
              placeholder="https://example.com/avatar.png"
              value={currentAvatarUrl || ''}
              onChange={(e) => {
                setCurrentAvatarUrl(e.target.value);
                form.setFieldValue('avatarUrl', e.target.value);
              }}
              allowClear
              className="!rounded-lg h-9 text-xs"
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
