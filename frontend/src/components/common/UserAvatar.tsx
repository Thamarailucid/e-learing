import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string | null;
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
}

const PASTEL_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }, // blue
  { bg: '#fdf4ff', text: '#a21caf', border: '#f5d0fe' }, // fuchsia
  { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // emerald
  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }, // amber
  { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' }, // violet
  { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, // indigo
  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, // rose
  { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' }, // cyan
];

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
};

const getColorPalette = (seed?: string | null) => {
  if (!seed) return PASTEL_COLORS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  email,
  size = 'md',
  status,
  className = '',
  onClick,
  showTooltip = true,
}) => {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 24
      : size === 'sm'
      ? 32
      : size === 'md'
      ? 40
      : size === 'lg'
      ? 52
      : 68;

  const initials = getInitials(name, email);
  const palette = getColorPalette(email || name || 'default');
  const displayName = name || email || 'User';

  const avatarElement = (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {src ? (
        <Avatar
          src={src}
          size={pixelSize}
          className="border border-gray-200 shadow-2xs object-cover"
        />
      ) : (
        <div
          style={{
            width: pixelSize,
            height: pixelSize,
            backgroundColor: palette.bg,
            color: palette.text,
            borderColor: palette.border,
            fontSize: Math.max(10, Math.floor(pixelSize * 0.38)),
          }}
          className="rounded-full border font-bold flex items-center justify-center shadow-2xs"
        >
          {initials || <User style={{ width: pixelSize * 0.5, height: pixelSize * 0.5 }} />}
        </div>
      )}

      {/* Status dot */}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${
            pixelSize >= 40 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
          } ${
            status === 'ACTIVE'
              ? 'bg-emerald-500'
              : status === 'SUSPENDED'
              ? 'bg-rose-500'
              : 'bg-gray-400'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );

  if (showTooltip && (name || email)) {
    return (
      <Tooltip title={`${displayName}${status ? ` (${status})` : ''}`}>
        {avatarElement}
      </Tooltip>
    );
  }

  return avatarElement;
};
