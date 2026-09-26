import React from 'react';

interface RbaPageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const RbaPageHeader: React.FC<RbaPageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 sm:pb-6 mb-5 sm:mb-6 border-b border-[#e5e5e5] gap-3 sm:gap-4 min-w-0 w-full">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] break-words">{title}</h1>
        {subtitle && <div className="text-xs sm:text-sm text-[#666666] mt-1 break-words leading-relaxed">{subtitle}</div>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  );
};
