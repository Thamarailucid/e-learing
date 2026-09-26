import React from 'react';
import { Inbox } from 'lucide-react';

interface RbaEmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const RbaEmptyState: React.FC<RbaEmptyStateProps> = ({
  title = 'No items found',
  description = 'Get started by creating your first entry.',
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#e5e5e5] rounded-xl my-4">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#111111]">{title}</h3>
      <p className="text-sm text-[#666666] mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
