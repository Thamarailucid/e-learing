import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-black text-white font-bold text-xl mb-4 shadow-sm">
          R
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#111111]">Novacodex Platform</h2>
        <p className="mt-1 text-sm text-[#666666]">Production Learning Management System</p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-10 shadow-sm border border-[#e5e5e5] rounded-2xl w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
