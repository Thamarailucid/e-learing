import React, { useState } from 'react';
import { Upload, Button, Input, message, Tooltip } from 'antd';
import { Upload as UploadIcon, Trash2, Check, Sparkles, Link as LinkIcon } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

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

interface UserAvatarPickerProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatarPicker: React.FC<UserAvatarPickerProps> = ({
  value,
  onChange,
  name,
  email,
  size = 'md',
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const handleSelectPreset = (preset: string) => {
    if (value === preset) {
      onChange?.(null);
    } else {
      onChange?.(preset);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please upload an image file (PNG, JPG, WebP)');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('Image size must be less than 2MB');
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange?.(result);
        message.success('Custom avatar uploaded!');
      }
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleApplyUrl = () => {
    if (!tempUrl.trim()) return;
    onChange?.(tempUrl.trim());
    setTempUrl('');
    setShowUrlInput(false);
    message.success('Avatar image URL applied!');
  };

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar
          src={value}
          name={name}
          email={email}
          size={size === 'lg' ? 56 : 46}
          showTooltip={false}
        />
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-800">Profile Avatar</div>
          <div className="text-[11px] text-gray-500">
            Select a preset avatar, upload your own photo, or enter an image URL.
          </div>
        </div>
        {value && (
          <Tooltip title="Remove Avatar">
            <Button
              size="small"
              danger
              type="text"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => onChange?.(null)}
            >
              Remove
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Presets Row */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Preset Library</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {AVATAR_PRESETS.map((preset, idx) => {
            const isSelected = value === preset;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`relative rounded-full shrink-0 transition-transform p-0.5 border-2 ${
                  isSelected
                    ? 'border-indigo-600 scale-105 shadow-sm'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={preset}
                  alt={`Preset ${idx + 1}`}
                  className="w-8 h-8 rounded-full object-cover"
                />
                {isSelected && (
                  <span className="absolute inset-0 bg-indigo-600/30 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons: Upload & URL */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-200/80">
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={handleFileUpload}
        >
          <Button size="small" icon={<UploadIcon className="w-3 h-3 text-gray-600" />}>
            Upload Photo
          </Button>
        </Upload>

        <Button
          size="small"
          icon={<LinkIcon className="w-3 h-3 text-gray-600" />}
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          {showUrlInput ? 'Cancel URL' : 'Image URL'}
        </Button>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            size="small"
            placeholder="https://example.com/avatar.jpg"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onPressEnter={handleApplyUrl}
          />
          <Button size="small" type="primary" onClick={handleApplyUrl}>
            Set
          </Button>
        </div>
      )}
    </div>
  );
};
