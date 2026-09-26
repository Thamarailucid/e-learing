import React from 'react';

interface RbaStatusBadgeProps {
  status: string;
}

export const RbaStatusBadge: React.FC<RbaStatusBadgeProps> = ({ status }) => {
  const norm = status.toUpperCase();

  let bg = 'bg-gray-100 text-gray-700';
  if (['ACTIVE', 'PUBLISHED', 'COMPLETED', 'PASSED'].includes(norm)) {
    bg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  } else if (['DRAFT', 'PENDING', 'IN_PROGRESS'].includes(norm)) {
    bg = 'bg-amber-50 text-amber-700 border border-amber-200';
  } else if (['SUSPENDED', 'INACTIVE', 'FAILED'].includes(norm)) {
    bg = 'bg-rose-50 text-rose-700 border border-rose-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      {status}
    </span>
  );
};
