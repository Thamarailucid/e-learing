import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../components/theme/ThemeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Fetch fresh data on browser tab switch
      refetchInterval: false, // Ensure NO polling is used (saves server load)
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};
