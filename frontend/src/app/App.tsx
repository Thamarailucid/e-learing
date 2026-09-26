import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Router';
import { AppProviders } from './AppProviders';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};
