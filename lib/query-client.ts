import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * Optimized for 200+ concurrent users with smart caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering it stale
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Don't refetch on window focus (reduces API calls)
      refetchOnWindowFocus: false,

      // Retry failed requests once
      retry: 1,

      // Show cached data while fetching fresh data in background
      refetchOnMount: 'always',

      // Refetch on network reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,

      // Show error for 5 seconds
      gcTime: 5000,
    },
  },
});

/**
 * Query Keys - Centralized for easy invalidation
 */
export const queryKeys = {
  // Project X
  submissions: (status?: string, search?: string) =>
    ['submissions', { status, search }] as const,
  submission: (id: string) => ['submission', id] as const,
  reviewedSubmissions: (search?: string) =>
    ['submissions', 'reviewed', { search }] as const,

  // Project V
  projectV: {
    all: ['projectv'] as const,
    submissions: (search?: string) =>
      ['projectv', 'submissions', { search }] as const,
    submission: (id: string) => ['projectv', 'submission', id] as const,
    byStatus: (status: string) =>
      ['projectv', 'submissions', { status }] as const,
  },

  // Users
  users: ['users'] as const,
  user: (id: string) => ['user', id] as const,
  profile: ['profile'] as const,

  // Admin
  stats: ['stats'] as const,
  leaderboard: ['leaderboard'] as const,
  logs: (limit?: number) => ['logs', { limit }] as const,
  analytics: ['analytics'] as const,
  auditLogs: (params?: any) => ['audit-logs', params] as const,
};
