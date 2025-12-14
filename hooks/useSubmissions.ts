import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useToast } from '@/components/ToastContainer';

/**
 * Hook for fetching submissions with smart caching
 */
export function useSubmissions(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.submissions(params?.status, params?.search),
    queryFn: () => apiClient.getSubmissions(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for fetching reviewed submissions
 */
export function useReviewedSubmissions(search?: string) {
  return useQuery({
    queryKey: queryKeys.reviewedSubmissions(search),
    queryFn: () => apiClient.getReviewedSubmissions({ search }),
    staleTime: 30000,
  });
}

/**
 * Hook for fetching single submission
 */
export function useSubmission(id: string) {
  return useQuery({
    queryKey: queryKeys.submission(id),
    queryFn: () => apiClient.getSubmission(id),
    enabled: !!id,
  });
}

/**
 * Hook for approving submission with optimistic update
 */
export function useApproveSubmission() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.approveSubmission(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['submissions'] });

      const previousSubmissions = queryClient.getQueryData(
        queryKeys.submissions()
      );

      queryClient.setQueryData(
        queryKeys.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.map((s: any) =>
            s.id === id ? { ...s, status: 'APPROVED' } : s
          );
        }
      );

      return { previousSubmissions };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      showToast('Submission approved successfully!', 'success');
    },

    onError: (error: any, variables, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to approve submission', 'error');
    },
  });
}

/**
 * Hook for submitting feedback with optimistic update
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: { feedback: string; accountPostedIn?: string; markEligible: boolean };
    }) => apiClient.submitFeedback(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['submissions'] });

      const previousSubmissions = queryClient.getQueryData(
        queryKeys.submissions()
      );

      queryClient.setQueryData(
        queryKeys.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.map((s: any) =>
            s.id === id
              ? {
                  ...s,
                  status: data.markEligible ? 'ELIGIBLE' : s.status,
                  accountPostedIn: data.accountPostedIn || s.accountPostedIn,
                }
              : s
          );
        }
      );

      return { previousSubmissions };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      showToast('Feedback submitted successfully!', 'success');
    },

    onError: (error: any, variables, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to submit feedback', 'error');
    },
  });
}

/**
 * Hook for deleting submission with optimistic update and undo
 */
export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteSubmission(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['submissions'] });

      const previousSubmissions = queryClient.getQueryData(
        queryKeys.submissions()
      );

      // Optimistically remove
      queryClient.setQueryData(
        queryKeys.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.filter((s: any) => s.id !== id);
        }
      );

      return { previousSubmissions, deletedId: id };
    },

    onSuccess: (_, deletedId, context) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });

      const deletedSubmission = (context.previousSubmissions as any)?.find(
        (s: any) => s.id === deletedId
      );

      if (deletedSubmission) {
        showToast('Submission deleted', 'success', {
          label: 'Undo',
          onClick: () => {
            queryClient.setQueryData(
              queryKeys.submissions(),
              context.previousSubmissions
            );
            showToast('Deletion cancelled', 'info');
          }
        }, 10000);
      }
    },

    onError: (error: any, variables, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to delete submission', 'error');
    },
  });
}

/**
 * Hook for uploading submission
 */
export function useUploadSubmission() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadSubmission(formData),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      showToast('Submission uploaded successfully!', 'success');
    },

    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to upload submission', 'error');
    },
  });
}
