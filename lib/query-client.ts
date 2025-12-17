import { QueryClient } from '@tanstack/react-query';





export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      
      staleTime: 5 * 60 * 1000, 

      
      gcTime: 10 * 60 * 1000, 

      
      refetchOnWindowFocus: false,

      
      retry: 1,

      
      refetchOnMount: 'always',

      
      refetchOnReconnect: true,
    },
    mutations: {
      
      retry: 1,

      
      gcTime: 5000,
    },
  },
});




export const queryKeys = {
  
  submissions: (status?: string, search?: string) =>
    ['submissions', { status, search }] as const,
  submission: (id: string) => ['submission', id] as const,
  reviewedSubmissions: (search?: string) =>
    ['submissions', 'reviewed', { search }] as const,

  
  projectV: {
    all: ['projectv'] as const,
    submissions: (search?: string) =>
      ['projectv', 'submissions', { search }] as const,
    submission: (id: string) => ['projectv', 'submission', id] as const,
    byStatus: (status: string) =>
      ['projectv', 'submissions', { status }] as const,
  },

  
  users: ['users'] as const,
  user: (id: string) => ['user', id] as const,
  profile: ['profile'] as const,

  
  stats: ['stats'] as const,
  leaderboard: ['leaderboard'] as const,
  logs: (limit?: number) => ['logs', { limit }] as const,
  analytics: ['analytics'] as const,
  auditLogs: (params?: any) => ['audit-logs', params] as const,
};
