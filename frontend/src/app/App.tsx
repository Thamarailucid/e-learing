import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Router';
import { AppProviders } from './AppProviders';
import { VersionUpdatePrompt } from '../components/common/VersionUpdatePrompt';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <VersionUpdatePrompt />
    </AppProviders>
  );
};
